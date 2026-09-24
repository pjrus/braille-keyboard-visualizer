"use client";

import { normaliseDotKey } from "@/lib/config";
import type {
  Binding,
  BindingResult,
  CameraView,
  GeometryKey,
  HudState,
  Mode,
  OverlayKey,
  SceneApi,
} from "@/lib/types";
import {
  createDefaultSettings,
  createSceneSettings,
  getActiveGeometry,
  getKeymapValidationError,
  loadSettings,
  persistSettings,
  updateKeyBinding,
} from "@/lib/visualiser-settings";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlPanel } from "./control-panel";
import { KeyboardHud } from "./keyboard-hud";

const KeyboardScene = dynamic(
  function loadKeyboardScene() {
    return import("./keyboard-scene").then(function(module) {
      return module.KeyboardScene;
    });
  },
  {
    ssr: false,
    loading: function SceneLoadingState() {
      return (
        <div className="scene-loading" role="status">
          Preparing the 3D keyboard…
        </div>
      );
    },
  },
);

const INITIAL_HUD: HudState = Object.freeze({
  dots: [],
  letter: "—",
  typed: "",
});

export function BrailleKeyboardVisualiser() {
  const [settings, setSettings] = useState(createDefaultSettings);
  const [hud, setHud] = useState(INITIAL_HUD);
  const [cameraView, setCameraView] = useState<CameraView>("ergonomic");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const sceneApiRef = useRef<SceneApi | null>(null);

  useEffect(function loadPersistedSettings() {
    const frame = window.requestAnimationFrame(() => {
      setSettings(loadSettings());
      setHasLoadedSettings(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(function savePersistedSettings() {
    if (hasLoadedSettings) {
      persistSettings(settings);
    }
  }, [hasLoadedSettings, settings]);

  const geometry = getActiveGeometry(settings);
  const sceneSettings = useMemo(function createCurrentSceneSettings() {
    return createSceneSettings(settings);
  }, [settings]);

  const handleInteractionChange = useCallback(function handleInteractionChange(nextHud: HudState) {
    setHud(nextHud);
  }, []);

  const handleModeChange = useCallback(function handleModeChange(mode: Mode) {
    setSettings(function updateMode(currentSettings) {
      return {
        ...currentSettings,
        mode,
      };
    });
  }, []);

  const handleGeometryChange = useCallback(function handleGeometryChange(key: GeometryKey, value: number) {
    setSettings(function updateGeometry(currentSettings) {
      return {
        ...currentSettings,
        modeGeometry: {
          ...currentSettings.modeGeometry,
          [currentSettings.mode]: {
            ...currentSettings.modeGeometry[currentSettings.mode],
            [key]: value,
          },
        },
      };
    });
  }, []);

  const handleOverlayChange = useCallback(function handleOverlayChange(key: OverlayKey, value: boolean) {
    setSettings(function updateOverlay(currentSettings) {
      return {
        ...currentSettings,
        [key]: value,
      };
    });
  }, []);

  const handleKeyBinding = useCallback(function handleKeyBinding(binding: Binding, rawKey: string): BindingResult {
    const key = normaliseDotKey(rawKey);
    const error = getKeymapValidationError(settings, binding, key);

    if (error || !key) {
      return { error: error || "Use a single printable key." };
    }

    setSettings(function applyKeyBinding(currentSettings) {
      return updateKeyBinding(currentSettings, binding, key);
    });

    const label = binding.type === "dot"
      ? "Dot " + binding.id
      : "The " + binding.id + " side button";

    return {
      message: label + " now uses " + key.toUpperCase() + ".",
    };
  }, [settings]);

  const handleResetKeymap = useCallback(function handleResetKeymap() {
    setSettings(function resetKeymap(currentSettings) {
      const defaults = createDefaultSettings();
      return {
        ...currentSettings,
        keyToDot: defaults.keyToDot,
        sideKeys: defaults.sideKeys,
      };
    });
  }, []);

  const handleCameraView = useCallback(function handleCameraView(view: CameraView) {
    sceneApiRef.current?.setView(view);
    setCameraView(view);
  }, []);

  const handleSceneReady = useCallback(function handleSceneReady(ready: boolean) {
    setIsSceneReady(ready);
  }, []);

  const handleSnapshot = useCallback(function handleSnapshot() {
    sceneApiRef.current?.saveScreenshot();
  }, []);

  return (
    <main className="visualiser-app">
      <section className="scene-stage" aria-label="Interactive braille keyboard">
        <KeyboardScene
          settings={sceneSettings}
          sceneApiRef={sceneApiRef}
          onInteractionChange={handleInteractionChange}
          onReady={handleSceneReady}
        />
        <KeyboardHud dots={hud.dots} letter={hud.letter} typed={hud.typed} />
      </section>

      <ControlPanel
        settings={settings}
        geometry={geometry}
        cameraView={cameraView}
        isSceneReady={isSceneReady}
        onModeChange={handleModeChange}
        onGeometryChange={handleGeometryChange}
        onOverlayChange={handleOverlayChange}
        onKeyBinding={handleKeyBinding}
        onResetKeymap={handleResetKeymap}
        onCameraView={handleCameraView}
        onSnapshot={handleSnapshot}
      />
    </main>
  );
}
