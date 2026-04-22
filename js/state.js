import {
  DEFAULT_KEY_TO_DOT,
  DOT_NUMBERS,
  isAssignableDotKey,
  normaliseDotKey,
} from "./config.js";

const STORAGE_KEY = "braille-keyboard-visualiser.settings";
const DEFAULT_SETTINGS = Object.freeze({
  mode: "triangular",
  indent: 0.35,
  angleDeg: 16,
  cells: 1,
  keyDia: 0.52,
  showSides: true,
  showNumbers: false,
  showLetters: false,
  showGrid: false,
  showHand: false,
});

export function createInitialState() {
  const storedSettings = loadStoredSettings();

  return {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    keyToDot: storedSettings.keyToDot || cloneDefaultKeyToDot(),
    activeDots: new Set(),
    kbHeld: new Set(),
    wasKbChording: false,
    typed: "",
    sidePressed: { left: false, right: false },
  };
}

export function persistSettings(state) {
  const settings = {
    mode: state.mode,
    indent: state.indent,
    angleDeg: state.angleDeg,
    keyDia: state.keyDia,
    showSides: state.showSides,
    showNumbers: state.showNumbers,
    showLetters: state.showLetters,
    showGrid: state.showGrid,
    showHand: state.showHand,
    keyToDot: sanitiseKeyToDot(state.keyToDot),
  };

  try {
    const storage = window.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures so the app still works in restricted browsers.
  }
}

function loadStoredSettings() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storage = window.localStorage;
    const rawSettings = storage.getItem(STORAGE_KEY);
    if (!rawSettings) {
      return {};
    }

    return sanitiseSettings(JSON.parse(rawSettings));
  } catch {
    return {};
  }
}

function sanitiseSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== "object") {
    return {};
  }

  const settings = {};

  if (rawSettings.mode === "triangular" || rawSettings.mode === "integrated") {
    settings.mode = rawSettings.mode;
  }

  copyNumberSetting(settings, rawSettings, "indent", -1, 1);
  copyNumberSetting(settings, rawSettings, "angleDeg", 0, 35);
  copyNumberSetting(settings, rawSettings, "keyDia", 0.4, 0.62);
  copyBooleanSetting(settings, rawSettings, "showSides");
  copyBooleanSetting(settings, rawSettings, "showNumbers");
  copyBooleanSetting(settings, rawSettings, "showLetters");
  copyBooleanSetting(settings, rawSettings, "showGrid");
  copyBooleanSetting(settings, rawSettings, "showHand");
  settings.keyToDot = sanitiseKeyToDot(rawSettings.keyToDot);

  return settings;
}

function copyBooleanSetting(target, source, key) {
  if (typeof source[key] === "boolean") {
    target[key] = source[key];
  }
}

function copyNumberSetting(target, source, key, min, max, integerOnly) {
  const value = source[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    return;
  }

  if (value < min || value > max) {
    return;
  }

  if (integerOnly && !Number.isInteger(value)) {
    return;
  }

  target[key] = value;
}

function sanitiseKeyToDot(rawKeyToDot) {
  if (!rawKeyToDot || typeof rawKeyToDot !== "object") {
    return cloneDefaultKeyToDot();
  }

  const entries = Object.entries(rawKeyToDot);
  if (entries.length !== DOT_NUMBERS.length) {
    return cloneDefaultKeyToDot();
  }

  const keyToDot = {};
  const seenDots = new Set();
  const seenKeys = new Set();

  for (const entry of entries) {
    const [rawKey, rawDot] = entry;
    const key = normaliseDotKey(rawKey);
    const dot = Number(rawDot);

    if (!key || !isAssignableDotKey(key) || !DOT_NUMBERS.includes(dot)) {
      return cloneDefaultKeyToDot();
    }

    if (seenKeys.has(key) || seenDots.has(dot)) {
      return cloneDefaultKeyToDot();
    }

    keyToDot[key] = dot;
    seenKeys.add(key);
    seenDots.add(dot);
  }

  return seenDots.size === DOT_NUMBERS.length ? keyToDot : cloneDefaultKeyToDot();
}

function cloneDefaultKeyToDot() {
  return { ...DEFAULT_KEY_TO_DOT };
}
