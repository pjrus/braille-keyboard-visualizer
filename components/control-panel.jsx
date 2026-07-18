"use client";

import { useState } from "react";
import { createDotToKeyMap, formatKeyLabel } from "../js/config.js";

const MODE_OPTIONS = Object.freeze([
  { value: "triangular", label: "Triangular" },
  { value: "integrated", label: "Integrated" },
  { value: "arc", label: "Arc" },
  { value: "hable", label: "Hable" },
]);

const CAMERA_OPTIONS = Object.freeze([
  { value: "ergonomic", label: "Ergonomic" },
  { value: "top", label: "Top" },
  { value: "side", label: "Side" },
]);

const DOT_ROWS = Object.freeze([
  {
    dots: [1, 2, 3],
    description: "Dots 1 · 2 · 3",
  },
  {
    dots: [4, 5, 6],
    description: "Dots 4 · 5 · 6",
  },
]);

const KEY_BINDINGS = Object.freeze([
  { type: "dot", id: 1, label: "Dot 1" },
  { type: "dot", id: 2, label: "Dot 2" },
  { type: "dot", id: 3, label: "Dot 3" },
  { type: "dot", id: 4, label: "Dot 4" },
  { type: "dot", id: 5, label: "Dot 5" },
  { type: "dot", id: 6, label: "Dot 6" },
  { type: "side", id: "left", label: "Left side" },
  { type: "side", id: "right", label: "Right side" },
]);

const DEFAULT_KEYMAP_HINT =
  "Select a field, then press a printable key to remap that control.";

export function ControlPanel({
  settings,
  geometry,
  cameraView,
  isSceneReady,
  onModeChange,
  onGeometryChange,
  onOverlayChange,
  onKeyBinding,
  onResetKeymap,
  onCameraView,
  onSnapshot,
}) {
  const [keymapStatus, setKeymapStatus] = useState(DEFAULT_KEYMAP_HINT);
  const [hasKeymapError, setHasKeymapError] = useState(false);
  const dotToKey = createDotToKeyMap(settings.keyToDot);

  function setStatus(message, isError) {
    setKeymapStatus(message);
    setHasKeymapError(Boolean(isError));
  }

  function handleKeyBinding(binding, event) {
    if (event.key === "Tab") {
      return;
    }

    event.preventDefault();

    if (event.key === "Escape") {
      setStatus(DEFAULT_KEYMAP_HINT, false);
      event.currentTarget.blur();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      setStatus("Use a single key on its own, without modifier shortcuts.", true);
      return;
    }

    if (event.shiftKey && !isLetterKey(event.key)) {
      setStatus("Use an unshifted printable key, or a letter key.", true);
      return;
    }

    const result = onKeyBinding(binding, event.key);
    if (result.error) {
      setStatus(result.error, true);
      return;
    }

    setStatus(result.message, false);
    event.currentTarget.blur();
  }

  function handleResetKeymap() {
    onResetKeymap();
    setStatus("Keyboard mappings reset to the default layout.", false);
  }

  return (
    <aside className="control-panel" aria-label="Keyboard controls">
      <header className="control-panel__header">
        <p className="eyebrow">Braille keyboard visualiser</p>
        <h1>Explore the layout</h1>
        <p>Adjust the model, test chords and find a comfortable keyboard arrangement.</p>
      </header>

      <PanelSection title="Layout mode">
        <div className="segmented-control segmented-control--four" aria-label="Layout mode">
          {MODE_OPTIONS.map(function renderMode(option) {
            return (
              <button
                className={"segmented-control__button" + (settings.mode === option.value ? " is-active" : "")}
                type="button"
                aria-pressed={settings.mode === option.value}
                key={option.value}
                onClick={function selectMode() {
                  onModeChange(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="control-panel__hint">
          Triangular uses a rear tilt. Integrated is flat. Arc fans the keys outward.
          Hable uses diagonal finger keys with front thumb pads.
        </p>
      </PanelSection>

      <PanelSection title="Geometry">
        <RangeControl
          label="Key indent"
          value={geometry.indent}
          min={-1}
          max={1}
          step={0.01}
          displayValue={formatSignedNumber(geometry.indent)}
          onChange={function changeIndent(value) {
            onGeometryChange("indent", value);
          }}
        />
        <p className="control-panel__hint">− recessed dimples · 0 flush · + raised domes</p>
        <RangeControl
          label="Incline angle"
          value={geometry.angleDeg}
          min={0}
          max={35}
          step={0.5}
          displayValue={geometry.angleDeg + "°"}
          onChange={function changeAngle(value) {
            onGeometryChange("angleDeg", value);
          }}
        />
        <RangeControl
          label="Key diameter"
          value={geometry.keyDia}
          min={0.4}
          max={0.62}
          step={0.01}
          displayValue={geometry.keyDia.toFixed(2)}
          onChange={function changeDiameter(value) {
            onGeometryChange("keyDia", value);
          }}
        />
      </PanelSection>

      <PanelSection title="Overlays">
        <CheckboxControl
          label="Side action buttons"
          checked={settings.showSides}
          onChange={function toggleSides(value) {
            onOverlayChange("showSides", value);
          }}
        />
        <CheckboxControl
          label="Dot numbers (1–6)"
          checked={settings.showNumbers}
          onChange={function toggleNumbers(value) {
            onOverlayChange("showNumbers", value);
          }}
        />
        <CheckboxControl
          label="Letter mapping (A–J preview)"
          checked={settings.showLetters}
          onChange={function toggleLetters(value) {
            onOverlayChange("showLetters", value);
          }}
        />
      </PanelSection>

      <PanelSection title="Keyboard typing">
        <p className="control-panel__hint">
          Hold keys together, then release them all to commit a letter. Click dots to toggle them.
        </p>
        <div className="keymap-summary">
          {DOT_ROWS.map(function renderDotRow(row) {
            return (
              <div className="keymap-summary__row" key={row.description}>
                {row.dots.map(function renderToken(dot) {
                  return <kbd key={dot}>{formatKeyLabel(dotToKey[dot])}</kbd>;
                })}
                <span>{row.description}</span>
              </div>
            );
          })}
          <div className="keymap-summary__row">
            <kbd>{formatKeyLabel(settings.sideKeys.left)}</kbd>
            <kbd>{formatKeyLabel(settings.sideKeys.right)}</kbd>
            <span>Side delete · space</span>
          </div>
          <div className="keymap-summary__row">
            <kbd>Space</kbd>
            <span>Commit current chord</span>
          </div>
          <div className="keymap-summary__row">
            <kbd>Esc</kbd>
            <span>Clear chord</span>
          </div>
        </div>

        <div className="keymap-fields">
          {KEY_BINDINGS.map(function renderKeyBinding(binding) {
            const key = binding.type === "dot"
              ? dotToKey[binding.id]
              : settings.sideKeys[binding.id];

            return (
              <KeymapField
                binding={binding}
                key={binding.type + "-" + binding.id}
                value={formatKeyLabel(key)}
                onFocus={function focusKeymapField() {
                  setStatus("Press a printable key for " + binding.label.toLowerCase() + ".", false);
                }}
                onKeyDown={function updateKeymapBinding(event) {
                  handleKeyBinding(binding, event);
                }}
              />
            );
          })}
        </div>
        <p
          className={"control-panel__hint keymap-status" + (hasKeymapError ? " is-error" : "")}
          aria-live="polite"
        >
          {keymapStatus}
        </p>
        <button className="secondary-button" type="button" onClick={handleResetKeymap}>
          Reset keyboard mappings
        </button>
      </PanelSection>

      <PanelSection title="Camera">
        <div className="segmented-control" aria-label="Camera view">
          {CAMERA_OPTIONS.map(function renderCamera(option) {
            return (
              <button
                className={"segmented-control__button" + (cameraView === option.value ? " is-active" : "")}
                type="button"
                aria-pressed={cameraView === option.value}
                key={option.value}
                onClick={function selectCamera() {
                  onCameraView(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!isSceneReady}
          onClick={onSnapshot}
        >
          Save screenshot
        </button>
      </PanelSection>

      <footer className="control-panel__footer">
        Drag the model to orbit · scroll to zoom · right-drag to pan
      </footer>
    </aside>
  );
}

function PanelSection({ title, children }) {
  return (
    <section className="panel-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function RangeControl({ label, value, min, max, step, displayValue, onChange }) {
  return (
    <label className="range-control">
      <span>{label}</span>
      <output>{displayValue}</output>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={function updateRange(event) {
          onChange(Number.parseFloat(event.target.value));
        }}
      />
    </label>
  );
}

function CheckboxControl({ label, checked, onChange }) {
  return (
    <label className="checkbox-control">
      <input
        type="checkbox"
        checked={checked}
        onChange={function updateCheckbox(event) {
          onChange(event.target.checked);
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function KeymapField({ binding, value, onFocus, onKeyDown }) {
  const id = "keymap-" + binding.type + "-" + binding.id;

  return (
    <label className="keymap-field" htmlFor={id}>
      <span>{binding.label}</span>
      <input
        id={id}
        value={value}
        readOnly
        aria-label={"Keyboard shortcut for " + binding.label}
        onFocus={onFocus}
        onClick={function selectValue(event) {
          event.currentTarget.select();
        }}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

function formatSignedNumber(value) {
  return (value >= 0 ? "+" : "") + value.toFixed(2);
}

function isLetterKey(key) {
  return typeof key === "string" && key.toLowerCase() !== key.toUpperCase();
}
