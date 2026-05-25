import {
  DEFAULT_KEY_TO_DOT,
  DEFAULT_SIDE_KEYS,
  DOT_NUMBERS,
  SIDE_NAMES,
  isAssignableDotKey,
  normaliseDotKey,
} from "./config.js";

const STORAGE_KEY = "braille-keyboard-visualiser.settings";
const MODES = Object.freeze(["triangular", "integrated", "arc", "hable"]);
const GEOMETRY_KEYS = Object.freeze(["indent", "angleDeg", "keyDia"]);
const DEFAULT_SETTINGS = Object.freeze({
  mode: "triangular",
  indent: 0.35,
  angleDeg: 16,
  cells: 1,
  keyDia: 0.52,
  showSides: true,
  showNumbers: false,
  showLetters: false,
});

export function createInitialState() {
  const storedSettings = loadStoredSettings();
  const mode = storedSettings.mode || DEFAULT_SETTINGS.mode;
  const modeGeometry = sanitiseModeGeometry(storedSettings.modeGeometry);

  return {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    ...modeGeometry[mode],
    mode,
    modeGeometry,
    keyToDot: storedSettings.keyToDot || cloneDefaultKeyToDot(),
    sideKeys: storedSettings.sideKeys || cloneDefaultSideKeys(),
    activeDots: new Set(),
    kbHeld: new Set(),
    wasKbChording: false,
    typed: "",
    sidePressed: { left: false, right: false },
  };
}

export function persistSettings(state) {
  syncActiveModeGeometry(state);

  const settings = {
    mode: state.mode,
    modeGeometry: sanitiseModeGeometry(state.modeGeometry),
    showSides: state.showSides,
    showNumbers: state.showNumbers,
    showLetters: state.showLetters,
    keyToDot: sanitiseKeyToDot(state.keyToDot),
    sideKeys: sanitiseSideKeys(state.sideKeys),
  };

  try {
    const storage = window.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures so the app still works in restricted browsers.
  }
}

export function applyModeGeometry(state, mode) {
  const modeGeometry = sanitiseModeGeometry(state.modeGeometry);
  const geometry = modeGeometry[mode] || modeGeometry[DEFAULT_SETTINGS.mode];

  state.modeGeometry = modeGeometry;
  state.indent = geometry.indent;
  state.angleDeg = geometry.angleDeg;
  state.keyDia = geometry.keyDia;
}

export function setModeGeometryValue(state, key, value) {
  if (!GEOMETRY_KEYS.includes(key)) {
    return;
  }

  const mode = MODES.includes(state.mode) ? state.mode : DEFAULT_SETTINGS.mode;
  const modeGeometry = sanitiseModeGeometry(state.modeGeometry);

  modeGeometry[mode][key] = value;
  state.modeGeometry = modeGeometry;
  state[key] = value;
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

  if (MODES.includes(rawSettings.mode)) {
    settings.mode = rawSettings.mode;
  }

  settings.modeGeometry = sanitiseModeGeometry(rawSettings);
  copyBooleanSetting(settings, rawSettings, "showSides");
  copyBooleanSetting(settings, rawSettings, "showNumbers");
  copyBooleanSetting(settings, rawSettings, "showLetters");

  const sideKeys = sanitiseSideKeys(rawSettings.sideKeys);
  const keyToDot = sanitiseKeyToDot(rawSettings.keyToDot);

  if (hasKeyMappingConflict(keyToDot, sideKeys)) {
    settings.keyToDot = cloneDefaultKeyToDot();
    settings.sideKeys = cloneDefaultSideKeys();
    return settings;
  }

  settings.keyToDot = keyToDot;
  settings.sideKeys = sideKeys;

  return settings;
}

function sanitiseModeGeometry(rawSettings) {
  const modeGeometry = createDefaultModeGeometry();
  if (!rawSettings || typeof rawSettings !== "object") {
    return modeGeometry;
  }

  const rawModeGeometry = getRawModeGeometry(rawSettings);
  let hasStoredModeGeometry = false;

  if (rawModeGeometry && typeof rawModeGeometry === "object") {
    MODES.forEach(function (mode) {
      const rawGeometry = rawModeGeometry[mode];
      if (!rawGeometry || typeof rawGeometry !== "object") {
        return;
      }

      hasStoredModeGeometry = true;
      copyNumberSetting(modeGeometry[mode], rawGeometry, "indent", -1, 1);
      copyNumberSetting(modeGeometry[mode], rawGeometry, "angleDeg", 0, 35);
      copyNumberSetting(modeGeometry[mode], rawGeometry, "keyDia", 0.4, 0.62);
    });
  }

  if (hasStoredModeGeometry) {
    return modeGeometry;
  }

  MODES.forEach(function (mode) {
    copyNumberSetting(modeGeometry[mode], rawSettings, "indent", -1, 1);
    copyNumberSetting(modeGeometry[mode], rawSettings, "angleDeg", 0, 35);
    copyNumberSetting(modeGeometry[mode], rawSettings, "keyDia", 0.4, 0.62);
  });

  return modeGeometry;
}

function getRawModeGeometry(rawSettings) {
  if (!rawSettings || typeof rawSettings !== "object") {
    return null;
  }

  if (rawSettings.modeGeometry && typeof rawSettings.modeGeometry === "object") {
    return rawSettings.modeGeometry;
  }

  return MODES.some(function (mode) {
    return rawSettings[mode] && typeof rawSettings[mode] === "object";
  })
    ? rawSettings
    : null;
}

function createDefaultModeGeometry() {
  return MODES.reduce(function (modeGeometry, mode) {
    modeGeometry[mode] = {
      indent: DEFAULT_SETTINGS.indent,
      angleDeg: DEFAULT_SETTINGS.angleDeg,
      keyDia: DEFAULT_SETTINGS.keyDia,
    };

    return modeGeometry;
  }, {});
}

function syncActiveModeGeometry(state) {
  const mode = MODES.includes(state.mode) ? state.mode : DEFAULT_SETTINGS.mode;
  const modeGeometry = sanitiseModeGeometry(state.modeGeometry);

  GEOMETRY_KEYS.forEach(function (key) {
    modeGeometry[mode][key] = state[key];
  });

  state.modeGeometry = modeGeometry;
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

function sanitiseSideKeys(rawSideKeys) {
  if (!rawSideKeys || typeof rawSideKeys !== "object") {
    return cloneDefaultSideKeys();
  }

  const sideKeys = {};
  const seenKeys = new Set();

  for (const side of SIDE_NAMES) {
    const key = normaliseDotKey(rawSideKeys[side]);

    if (!key || !isAssignableDotKey(key) || seenKeys.has(key)) {
      return cloneDefaultSideKeys();
    }

    sideKeys[side] = key;
    seenKeys.add(key);
  }

  return sideKeys;
}

function hasKeyMappingConflict(keyToDot, sideKeys) {
  return Object.keys(keyToDot).some(function (key) {
    return Object.values(sideKeys).includes(key);
  });
}

function cloneDefaultKeyToDot() {
  return { ...DEFAULT_KEY_TO_DOT };
}

function cloneDefaultSideKeys() {
  return { ...DEFAULT_SIDE_KEYS };
}
