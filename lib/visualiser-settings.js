import {
  DEFAULT_KEY_TO_DOT,
  DEFAULT_SIDE_KEYS,
  DOT_NUMBERS,
  SIDE_NAMES,
  createDotToKeyMap,
  isAssignableDotKey,
  normaliseDotKey,
} from "../js/config.js";

export const STORAGE_KEY = "braille-keyboard-visualiser.settings";
export const MODES = Object.freeze(["triangular", "integrated", "arc", "hable"]);

const DEFAULT_GEOMETRY = Object.freeze({
  indent: 0.35,
  angleDeg: 16,
  keyDia: 0.52,
});

export function createDefaultSettings() {
  return {
    mode: "triangular",
    modeGeometry: createDefaultModeGeometry(),
    cells: 1,
    showSides: true,
    showNumbers: false,
    showLetters: false,
    keyToDot: { ...DEFAULT_KEY_TO_DOT },
    sideKeys: { ...DEFAULT_SIDE_KEYS },
  };
}

export function loadSettings() {
  if (typeof window === "undefined") {
    return createDefaultSettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitiseSettings(JSON.parse(raw)) : createDefaultSettings();
  } catch {
    return createDefaultSettings();
  }
}

export function persistSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: settings.mode,
      modeGeometry: settings.modeGeometry,
      showSides: settings.showSides,
      showNumbers: settings.showNumbers,
      showLetters: settings.showLetters,
      keyToDot: settings.keyToDot,
      sideKeys: settings.sideKeys,
    }));
  } catch {
    // Storage can be unavailable in private or restricted browser sessions.
  }
}

export function getActiveGeometry(settings) {
  return settings.modeGeometry[settings.mode] || DEFAULT_GEOMETRY;
}

export function createSceneSettings(settings) {
  return {
    ...settings,
    ...getActiveGeometry(settings),
  };
}

export function getKeymapValidationError(settings, binding, key) {
  if (!key || !isAssignableDotKey(key)) {
    return "Use a single printable key.";
  }

  const assignedDot = settings.keyToDot[key];
  if (
    assignedDot !== undefined &&
    !(binding.type === "dot" && assignedDot === binding.id)
  ) {
    return key.toUpperCase() + " is already assigned to dot " + assignedDot + ".";
  }

  const assignedSide = Object.entries(settings.sideKeys).find(function (entry) {
    return entry[1] === key;
  })?.[0];

  if (
    assignedSide &&
    !(binding.type === "side" && assignedSide === binding.id)
  ) {
    return key.toUpperCase() + " is already assigned to the " + assignedSide + " side button.";
  }

  return "";
}

export function normaliseKeyBinding(key) {
  return normaliseDotKey(key);
}

export function updateKeyBinding(settings, binding, key) {
  if (binding.type === "side") {
    return {
      ...settings,
      sideKeys: {
        ...settings.sideKeys,
        [binding.id]: key,
      },
    };
  }

  const dotToKey = createDotToKeyMap(settings.keyToDot);
  dotToKey[binding.id] = key;
  const keyToDot = DOT_NUMBERS.reduce(function (nextMap, dot) {
    nextMap[dotToKey[dot]] = dot;
    return nextMap;
  }, {});

  return {
    ...settings,
    keyToDot,
  };
}

function sanitiseSettings(rawSettings) {
  const defaults = createDefaultSettings();
  if (!rawSettings || typeof rawSettings !== "object") {
    return defaults;
  }

  const mode = MODES.includes(rawSettings.mode) ? rawSettings.mode : defaults.mode;
  const keyToDot = sanitiseKeyToDot(rawSettings.keyToDot);
  const sideKeys = sanitiseSideKeys(rawSettings.sideKeys);
  const hasMappingConflict = Object.keys(keyToDot).some(function (key) {
    return Object.values(sideKeys).includes(key);
  });

  return {
    ...defaults,
    mode,
    modeGeometry: sanitiseModeGeometry(rawSettings),
    showSides: readBoolean(rawSettings.showSides, defaults.showSides),
    showNumbers: readBoolean(rawSettings.showNumbers, defaults.showNumbers),
    showLetters: readBoolean(rawSettings.showLetters, defaults.showLetters),
    keyToDot: hasMappingConflict ? { ...DEFAULT_KEY_TO_DOT } : keyToDot,
    sideKeys: hasMappingConflict ? { ...DEFAULT_SIDE_KEYS } : sideKeys,
  };
}

function createDefaultModeGeometry() {
  return MODES.reduce(function (geometry, mode) {
    geometry[mode] = { ...DEFAULT_GEOMETRY };
    return geometry;
  }, {});
}

function sanitiseModeGeometry(rawSettings) {
  const geometry = createDefaultModeGeometry();
  const storedGeometry = getStoredModeGeometry(rawSettings);

  MODES.forEach(function (mode) {
    const source = storedGeometry?.[mode] || rawSettings;
    geometry[mode] = {
      indent: readNumber(source?.indent, DEFAULT_GEOMETRY.indent, -1, 1),
      angleDeg: readNumber(source?.angleDeg, DEFAULT_GEOMETRY.angleDeg, 0, 35),
      keyDia: readNumber(source?.keyDia, DEFAULT_GEOMETRY.keyDia, 0.4, 0.62),
    };
  });

  return geometry;
}

function getStoredModeGeometry(rawSettings) {
  if (rawSettings?.modeGeometry && typeof rawSettings.modeGeometry === "object") {
    return rawSettings.modeGeometry;
  }

  return MODES.some(function (mode) {
    return rawSettings?.[mode] && typeof rawSettings[mode] === "object";
  })
    ? rawSettings
    : null;
}

function sanitiseKeyToDot(rawKeyToDot) {
  if (!rawKeyToDot || typeof rawKeyToDot !== "object") {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const entries = Object.entries(rawKeyToDot);
  if (entries.length !== DOT_NUMBERS.length) {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const keyToDot = {};
  const seenDots = new Set();
  const seenKeys = new Set();

  for (const [rawKey, rawDot] of entries) {
    const key = normaliseDotKey(rawKey);
    const dot = Number(rawDot);

    if (
      !key ||
      !isAssignableDotKey(key) ||
      !DOT_NUMBERS.includes(dot) ||
      seenKeys.has(key) ||
      seenDots.has(dot)
    ) {
      return { ...DEFAULT_KEY_TO_DOT };
    }

    keyToDot[key] = dot;
    seenKeys.add(key);
    seenDots.add(dot);
  }

  return keyToDot;
}

function sanitiseSideKeys(rawSideKeys) {
  if (!rawSideKeys || typeof rawSideKeys !== "object") {
    return { ...DEFAULT_SIDE_KEYS };
  }

  const sideKeys = {};
  const seenKeys = new Set();

  for (const side of SIDE_NAMES) {
    const key = normaliseDotKey(rawSideKeys[side]);
    if (!key || !isAssignableDotKey(key) || seenKeys.has(key)) {
      return { ...DEFAULT_SIDE_KEYS };
    }

    sideKeys[side] = key;
    seenKeys.add(key);
  }

  return sideKeys;
}

function readBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value, fallback, minimum, maximum) {
  return typeof value === "number" && !Number.isNaN(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}
