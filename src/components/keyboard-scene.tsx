"use client";

import { createInteractionController } from "@/lib/scene/interactions";
import { createScene } from "@/lib/scene/scene";
import type { CameraView, HudState, RuntimeState, SceneApi, SceneSettings } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createDeviceController } from "../lib/device/controller";
import type { OrbitGizmoHandle } from "./orbit-gizmo";
import { OrbitGizmo } from "./orbit-gizmo";

export function KeyboardScene(
  { settings, sceneApiRef, onInteractionChange, onReady }: {
    settings: SceneSettings;
    sceneApiRef: RefObject<SceneApi | null>;
    onInteractionChange: (state: HudState) => void;
    onReady: (ready: boolean) => void;
  },
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneControllerRef = useRef<ReturnType<typeof createScene> | null>(null);
  const deviceRef = useRef<ReturnType<typeof createDeviceController> | null>(null);
  const runtimeStateRef = useRef<RuntimeState | null>(null);
  const previousSettingsRef = useRef<SceneSettings | null>(null);
  // The scene is created once; the settings used for that first build seed its mutable runtime state.
  const initialSettingsRef = useRef(settings);
  const orbitGizmoRef = useRef<OrbitGizmoHandle | null>(null);
  const onInteractionChangeRef = useRef(onInteractionChange);
  const onReadyRef = useRef(onReady);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);

  useEffect(function syncInteractionCallback() {
    // Keep the long-lived interaction controller pointed at the latest React callbacks.
    onInteractionChangeRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(function syncReadyCallback() {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(function createKeyboardScene() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    // The imperative renderer and input controller share this mutable state for their lifetime.
    const state = createRuntimeState(initialSettingsRef.current);
    let sceneController: ReturnType<typeof createScene>;

    try {
      sceneController = createScene(canvas);
    } catch {
      // WebGL context creation can fail in restricted or unavailable browser environments.
      const frame = window.requestAnimationFrame(() => setIsWebglUnavailable(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const device = createDeviceController({
      root: sceneController.root,
      state,
    });
    const interaction = createInteractionController({
      canvas,
      device,
      sceneController,
      state,
      onStateChange: function publishInteraction(nextHud) {
        onInteractionChangeRef.current(nextHud);
      },
    });

    runtimeStateRef.current = state;
    sceneControllerRef.current = sceneController;
    deviceRef.current = device;
    previousSettingsRef.current = initialSettingsRef.current;

    device.buildDevice();
    sceneController.setTarget(device.getFocusTarget());
    sceneController.resize();

    const api = {
      saveScreenshot() {
        // Render before capture so the canvas reflects the current camera pose.
        sceneController.render();
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "braille-keyboard-" + state.mode + "-" + Date.now() + ".png";
        link.click();
      },
      setView(view: CameraView) {
        sceneController.setTarget(device.getFocusTarget());
        sceneController.setView(view);
      },
    };
    sceneApiRef.current = api;
    onReadyRef.current(true);

    const resizeTarget = canvas.parentElement;
    // Observe the stage itself because panel/layout changes can resize the canvas without a window resize.
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(sceneController.resize);

    if (resizeObserver && resizeTarget) {
      resizeObserver.observe(resizeTarget);
    } else {
      window.addEventListener("resize", sceneController.resize);
    }

    let animationFrame = 0;
    function renderFrame() {
      device.updateAnimations();
      sceneController.render();
      // Keep the DOM gizmo aligned with the camera even when the user orbits by dragging the canvas.
      orbitGizmoRef.current?.sync(sceneController);
      animationFrame = window.requestAnimationFrame(renderFrame);
    }
    renderFrame();

    return function disposeKeyboardScene() {
      // Tear down every resource created above; development Strict Mode may mount this effect again.
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", sceneController.resize);
      interaction.dispose();
      device.dispose();
      sceneController.dispose();

      if (sceneApiRef.current === api) {
        sceneApiRef.current = null;
      }

      sceneControllerRef.current = null;
      deviceRef.current = null;
      runtimeStateRef.current = null;
      previousSettingsRef.current = null;
      onReadyRef.current(false);
    };
  }, [sceneApiRef]);

  useEffect(function synchroniseSceneSettings() {
    const state = runtimeStateRef.current;
    const device = deviceRef.current;
    const sceneController = sceneControllerRef.current;
    const previousSettings = previousSettingsRef.current;

    if (!state || !device || !sceneController || !previousSettings) {
      return;
    }

    // React owns preferences; this merge forwards them into the shared imperative state read by input and device code.
    Object.assign(state, settings);

    // Geometry changes that affect mesh construction rebuild the device; overlays can update in place.
    if (requiresRebuild(previousSettings, settings)) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    } else {
      if (previousSettings.indent !== settings.indent) {
        device.applyIndent();
      }

      if (
        previousSettings.showNumbers !== settings.showNumbers
        || previousSettings.showLetters !== settings.showLetters
      ) {
        device.applyOverlays();
      }
    }

    previousSettingsRef.current = settings;
  }, [settings]);

  return (
    <div className="keyboard-scene">
      <canvas
        className="keyboard-scene__canvas"
        ref={canvasRef}
        aria-label="3D braille keyboard model"
      />
      {isWebglUnavailable
        ? (
          <div className="webgl-fallback" role="status">
            <strong>3D rendering is unavailable</strong>
            <span>Use a browser with hardware acceleration enabled to explore the keyboard model.</span>
          </div>
        )
        : <OrbitGizmo ref={orbitGizmoRef} sceneControllerRef={sceneControllerRef} />}
    </div>
  );
}

function createRuntimeState(settings: SceneSettings): RuntimeState {
  return {
    ...settings,
    // Chord, held-key and typed-text data belongs to this live scene and is intentionally not persisted.
    activeDots: new Set<number>(),
    kbHeld: new Set<number>(),
    wasKbChording: false,
    typed: "",
    sidePressed: {
      left: false,
      right: false,
    },
  };
}

function requiresRebuild(previousSettings: SceneSettings, nextSettings: SceneSettings) {
  // Keep this structural list aligned with settings synchronisation; indent and overlays update meshes in place.
  return (
    previousSettings.mode !== nextSettings.mode
    || previousSettings.angleDeg !== nextSettings.angleDeg
    || previousSettings.keyDia !== nextSettings.keyDia
    || previousSettings.showSides !== nextSettings.showSides
  );
}
