import {
  DEFAULT_KEY_TO_DOT,
  DOT_NUMBERS,
  RESERVED_DOT_KEYS,
  createDotToKeyMap,
  formatKeyLabel,
  isAssignableDotKey,
  normaliseDotKey,
} from "./config.js";
import { applyModeGeometry, persistSettings, setModeGeometryValue } from "./state.js";

const DEFAULT_KEYMAP_HINT =
  "Select a dot field, then press a printable key. A and ; stay reserved for side actions.";
const DEFAULT_VIEW = "ergonomic";

const RANGE_CONTROLS = [
  {
    inputKey: "indent",
    outputKey: "indentVal",
    stateKey: "indent",
    parseValue: Number.parseFloat,
    formatValue: formatSignedNumber,
    applyChange({ device }) {
      device.applyIndent();
    },
  },
  {
    inputKey: "angle",
    outputKey: "angleVal",
    stateKey: "angleDeg",
    parseValue(value) {
      return Number.parseFloat(value);
    },
    formatValue(value) {
      return value + "\u00B0";
    },
    applyChange({ device, sceneController }) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    },
  },
  {
    inputKey: "keyDia",
    outputKey: "keyDiaVal",
    stateKey: "keyDia",
    parseValue: Number.parseFloat,
    formatValue(value) {
      return value.toFixed(2);
    },
    applyChange({ device, sceneController }) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    },
  },
];

const TOGGLE_CONTROLS = [
  {
    inputKey: "showSides",
    stateKey: "showSides",
    applyChange({ device, sceneController }) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    },
  },
  {
    inputKey: "showNumbers",
    stateKey: "showNumbers",
    applyChange({ device }) {
      device.applyOverlays();
    },
  },
  {
    inputKey: "showLetters",
    stateKey: "showLetters",
    applyChange({ device }) {
      device.applyOverlays();
    },
  },
];

export function collectDom() {
  return {
    angle: byId("angle"),
    angleVal: byId("angleVal"),
    canvas: byId("scene"),
    chordDisplay: byId("chordDisplay"),
    dotKeyInputs: Array.from(document.querySelectorAll(".dot-key-input")),
    indent: byId("indent"),
    indentVal: byId("indentVal"),
    keyDia: byId("keyDia"),
    keyDiaVal: byId("keyDiaVal"),
    keyTokens: Array.from(document.querySelectorAll(".dot-key-token")),
    keymapStatus: byId("keymapStatus"),
    letterDisplay: byId("letterDisplay"),
    modeButtons: Array.from(document.querySelectorAll(".seg-btn")),
    orbitButtons: Array.from(document.querySelectorAll("[data-orbit-view]")),
    orbitSphere: byId("orbitSphere"),
    orbitSphereThumb: byId("orbitSphereThumb"),
    resetKeymap: byId("resetKeymap"),
    showLetters: byId("showLetters"),
    showNumbers: byId("showNumbers"),
    showSides: byId("showSides"),
    snapshot: byId("snapshot"),
    typedDisplay: byId("typedDisplay"),
    viewButtons: Array.from(document.querySelectorAll(".view-btn")),
  };
}

export function syncControls(dom, state) {
  syncRangeControls(dom, state);
  syncToggleControls(dom, state);
  syncKeyMapping(dom, state);
  setKeymapStatus(dom, DEFAULT_KEYMAP_HINT);
  syncActiveButtons(dom.modeButtons, "mode", state.mode);
  syncActiveButtons(dom.viewButtons, "view", DEFAULT_VIEW);
}

export function bindUi({ device, dom, sceneController, state }) {
  const saveSettings = persistState.bind(null, state);

  bindSegmentedButtons(dom.modeButtons, "mode", function (mode, button) {
    state.mode = mode;
    applyModeGeometry(state, mode);
    syncActiveButtons(dom.modeButtons, "mode", mode);
    syncRangeControls(dom, state);
    device.buildDevice();
    sceneController.setTarget(device.getFocusTarget());
    saveSettings();
    button.blur();
  });

  bindSegmentedButtons(dom.viewButtons, "view", function (view, button) {
    syncActiveButtons(dom.viewButtons, "view", view);
    sceneController.setTarget(device.getFocusTarget());
    sceneController.setView(view);
    button.blur();
  });

  RANGE_CONTROLS.forEach(function (control) {
    bindRangeControl(control, { device, dom, saveSettings, state });
  });

  TOGGLE_CONTROLS.forEach(function (control) {
    bindToggleControl(control, { device, dom, saveSettings, state });
  });

  bindKeymapInputs({ dom, saveSettings, state });

  dom.resetKeymap.addEventListener("click", function () {
    state.keyToDot = { ...DEFAULT_KEY_TO_DOT };
    syncKeyMapping(dom, state);
    saveSettings();
    setKeymapStatus(dom, "Dot keys reset to the default layout.");
    dom.resetKeymap.blur();
  });

  dom.snapshot.addEventListener("click", function () {
    sceneController.renderer.render(sceneController.scene, sceneController.camera);

    const downloadUrl = dom.canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "braille-keyboard-" + state.mode + "-" + Date.now() + ".png";
    link.click();
  });
}

function bindRangeControl(control, context) {
  const input = context.dom[control.inputKey];
  const output = context.dom[control.outputKey];

  input.addEventListener("input", function (event) {
    const value = control.parseValue(event.target.value);
    setModeGeometryValue(context.state, control.stateKey, value);
    output.textContent = control.formatValue(value);
    control.applyChange(context);
    context.saveSettings();
  });
}

function bindToggleControl(control, context) {
  const input = context.dom[control.inputKey];

  input.addEventListener("change", function (event) {
    context.state[control.stateKey] = event.target.checked;
    control.applyChange(context);
    context.saveSettings();
  });
}

function bindSegmentedButtons(buttons, dataKey, onSelect) {
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      onSelect(button.dataset[dataKey], button);
    });
  });
}

function bindKeymapInputs({ dom, saveSettings, state }) {
  dom.dotKeyInputs.forEach(function (input) {
    input.addEventListener("focus", function () {
      const dot = getDotNumber(input);
      setKeymapStatus(dom, "Press a printable key for dot " + dot + ".");
      input.select();
    });

    input.addEventListener("click", function () {
      input.select();
    });

    input.addEventListener("keydown", function (event) {
      handleDotKeyInput(event, { dom, input, saveSettings, state });
    });

    input.addEventListener("blur", function () {
      syncKeyMapping(dom, state);
    });
  });
}

function handleDotKeyInput(event, context) {
  const { dom, input, saveSettings, state } = context;

  if (event.key === "Tab") {
    return;
  }

  event.preventDefault();

  if (event.key === "Escape") {
    setKeymapStatus(dom, DEFAULT_KEYMAP_HINT);
    input.blur();
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    setKeymapStatus(dom, "Use a single key on its own, without modifier shortcuts.", true);
    return;
  }

  if (event.shiftKey && !isLetterKey(event.key)) {
    setKeymapStatus(dom, "Use an unshifted printable key, or a letter key.", true);
    return;
  }

  const dot = getDotNumber(input);
  const key = normaliseDotKey(event.key);
  const validationError = getDotKeyValidationError(key, dot, state);

  if (validationError) {
    setKeymapStatus(dom, validationError, true);
    return;
  }

  setDotKey(state, dot, key);
  syncKeyMapping(dom, state);
  saveSettings();
  setKeymapStatus(dom, "Dot " + dot + " now uses " + formatKeyLabel(key) + ".");
  input.blur();
}

function getDotKeyValidationError(key, dot, state) {
  if (!key || !isAssignableDotKey(key)) {
    return (
      "Use a single printable key. " +
      formatReservedKeys() +
      " stay reserved for side actions."
    );
  }

  const assignedDot = state.keyToDot[key];
  if (assignedDot !== undefined && assignedDot !== dot) {
    return formatKeyLabel(key) + " is already assigned to dot " + assignedDot + ".";
  }

  return "";
}

function syncRangeControls(dom, state) {
  RANGE_CONTROLS.forEach(function (control) {
    const value = state[control.stateKey];
    dom[control.inputKey].value = String(value);
    dom[control.outputKey].textContent = control.formatValue(value);
  });
}

function syncToggleControls(dom, state) {
  TOGGLE_CONTROLS.forEach(function (control) {
    dom[control.inputKey].checked = state[control.stateKey];
  });
}

function syncKeyMapping(dom, state) {
  const dotToKey = createDotToKeyMap(state.keyToDot);

  dom.keyTokens.forEach(function (token) {
    token.textContent = formatKeyLabel(dotToKey[getDotNumber(token)]);
  });

  dom.dotKeyInputs.forEach(function (input) {
    input.value = formatKeyLabel(dotToKey[getDotNumber(input)]);
  });
}

function syncActiveButtons(buttons, dataKey, activeValue) {
  buttons.forEach(function (button) {
    button.classList.toggle("is-active", button.dataset[dataKey] === activeValue);
  });
}

function setDotKey(state, dot, key) {
  const dotToKey = createDotToKeyMap(state.keyToDot);
  dotToKey[dot] = key;

  state.keyToDot = DOT_NUMBERS.reduce(function (keyToDot, number) {
    keyToDot[dotToKey[number]] = number;
    return keyToDot;
  }, {});
}

function persistState(state) {
  persistSettings(state);
}

function byId(id) {
  return document.getElementById(id);
}

function getDotNumber(element) {
  return Number.parseInt(element.dataset.dot, 10);
}

function formatSignedNumber(value) {
  return (value >= 0 ? "+" : "") + value.toFixed(2);
}

function formatReservedKeys() {
  return RESERVED_DOT_KEYS.map(formatKeyLabel).join(" and ");
}

function isLetterKey(key) {
  return typeof key === "string" && key.toLowerCase() !== key.toUpperCase();
}

function setKeymapStatus(dom, message, isError) {
  dom.keymapStatus.textContent = message;
  dom.keymapStatus.classList.toggle("is-error", Boolean(isError));
}
