"use client";

import { useEffect, useRef, useState } from "react";
import { createDeviceController } from "../js/device.js";
import { createInteractionController } from "../js/interactions.js";
import { createScene } from "../js/scene.js";
import { OrbitGizmo } from "./orbit-gizmo";

export function KeyboardScene({ settings, sceneApiRef, onInteractionChange, onReady }) {
  const canvasRef = useRef(null);
  const sceneControllerRef = useRef(null);
  const deviceRef = useRef(null);
  const runtimeStateRef = useRef(null);
  const previousSettingsRef = useRef(null);
  const orbitGizmoRef = useRef(null);
  const onInteractionChangeRef = useRef(onInteractionChange);
  const onReadyRef = useRef(onReady);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);

  useEffect(function syncInteractionCallback() {
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

    if (!supportsWebGL()) {
      setIsWebglUnavailable(true);
      return undefined;
    }

    const state = createRuntimeState(settings);
    let sceneController;

    try {
      sceneController = createScene(canvas);
    } catch {
      setIsWebglUnavailable(true);
      return undefined;
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
    previousSettingsRef.current = settings;

    device.buildDevice();
    sceneController.setTarget(device.getFocusTarget());
    sceneController.resize();

    const api = {
      saveScreenshot() {
        sceneController.render();
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "braille-keyboard-" + state.mode + "-" + Date.now() + ".png";
        link.click();
      },
      setView(view) {
        sceneController.setTarget(device.getFocusTarget());
        sceneController.setView(view);
      },
    };
    sceneApiRef.current = api;
    onReadyRef.current(true);

    const resizeTarget = canvas.parentElement;
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
      orbitGizmoRef.current?.sync(sceneController);
      animationFrame = window.requestAnimationFrame(renderFrame);
    }
    renderFrame();

    return function disposeKeyboardScene() {
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
  }, []);

  useEffect(function synchroniseSceneSettings() {
    const state = runtimeStateRef.current;
    const device = deviceRef.current;
    const sceneController = sceneControllerRef.current;
    const previousSettings = previousSettingsRef.current;

    if (!state || !device || !sceneController || !previousSettings) {
      return;
    }

    Object.assign(state, settings);

    if (requiresRebuild(previousSettings, settings)) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    } else {
      if (previousSettings.indent !== settings.indent) {
        device.applyIndent();
      }

      if (
        previousSettings.showNumbers !== settings.showNumbers ||
        previousSettings.showLetters !== settings.showLetters
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
      {isWebglUnavailable ? (
        <div className="webgl-fallback" role="status">
          <strong>3D rendering is unavailable</strong>
          <span>Use a browser with hardware acceleration enabled to explore the keyboard model.</span>
        </div>
      ) : (
        <OrbitGizmo ref={orbitGizmoRef} sceneControllerRef={sceneControllerRef} />
      )}
    </div>
  );
}

function createRuntimeState(settings) {
  return {
    ...settings,
    activeDots: new Set(),
    kbHeld: new Set(),
    wasKbChording: false,
    typed: "",
    sidePressed: {
      left: false,
      right: false,
    },
  };
}

function requiresRebuild(previousSettings, nextSettings) {
  return (
    previousSettings.mode !== nextSettings.mode ||
    previousSettings.angleDeg !== nextSettings.angleDeg ||
    previousSettings.keyDia !== nextSettings.keyDia ||
    previousSettings.cells !== nextSettings.cells ||
    previousSettings.showSides !== nextSettings.showSides
  );
}

function supportsWebGL() {
  try {
    const testCanvas = document.createElement("canvas");
    const context = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
    const precision = context?.getShaderPrecisionFormat?.(
      context.VERTEX_SHADER,
      context.HIGH_FLOAT
    );

    return Boolean(precision && precision.precision > 0);
  } catch {
    return false;
  }
}
