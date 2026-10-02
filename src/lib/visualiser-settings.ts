import type { Binding, Geometry, Mode, SceneSettings, Settings, Side, SideAction } from "@/lib/types";
import {
  createDotToKeyMap,
  DEFAULT_KEY_TO_DOT,
  DEFAULT_SIDE_ACTIONS,
  DEFAULT_SIDE_KEYS,
  DOT_NUMBERS,
  normaliseDotKey,
  SIDE_ACTIONS,
  SIDE_NAMES,
} from "../lib/config";

export const STORAGE_KEY = "braille-keyboard-visualiser.settings";
export const MODES: readonly Mode[] = Object.freeze(["triangular", "integrated", "arc", "hable", "chameleon"]);

const DEFAULT_GEOMETRY: Readonly<Geometry> = Object.freeze({
  indent: 0.35,
  angleDeg: 16,
  keyDia: 0.52,
});

export function createDefaultSettings(): Settings {
  // Give each mode and binding map its own copy so later edits cannot change the defaults.
  return {
    mode: "triangular",
    modeGeometry: createDefaultModeGeometry(),
    showSides: true,
    showNumbers: false,
    showLetters: false,
    repeatKeyboardActions: false,
    keyToDot: { ...DEFAULT_KEY_TO_DOT },
    sideKeys: { ...DEFAULT_SIDE_KEYS },
    sideActions: { ...DEFAULT_SIDE_ACTIONS },
  };
}

export function loadSettings() {
  if (typeof window === "undefined") {
    return createDefaultSettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Treat saved JSON as untrusted input: sanitisation also keeps older storage shapes usable.
    return raw ? sanitiseSettings(JSON.parse(raw)) : createDefaultSettings();
  } catch {
    return createDefaultSettings();
  }
}

export function persistSettings(settings: Settings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // Persist the preference schema explicitly; scene/runtime values must stay transient.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: settings.mode,
        modeGeometry: settings.modeGeometry,
        showSides: settings.showSides,
        showNumbers: settings.showNumbers,
        showLetters: settings.showLetters,
        repeatKeyboardActions: settings.repeatKeyboardActions,
        keyToDot: settings.keyToDot,
        sideKeys: settings.sideKeys,
        sideActions: settings.sideActions,
      }),
    );
  } catch {
    // Storage can be unavailable in private or restricted browser sessions.
  }
}

export function getActiveGeometry(settings: Settings): Geometry {
  return settings.modeGeometry[settings.mode] || DEFAULT_GEOMETRY;
}

export function createSceneSettings(settings: Settings): SceneSettings {
  // The renderer consumes one active geometry; React retains all modes' saved values.
  return {
    ...settings,
    ...getActiveGeometry(settings),
  };
}

export function getKeymapValidationError(settings: Settings, binding: Binding, key: string | null) {
  const normalisedKey = normaliseDotKey(key);
  if (!normalisedKey) {
    return "Use a single printable key.";
  }

  const assignedDot = settings.keyToDot[normalisedKey];
  // Keeping a key on its current control is valid; only another control conflicts.
  if (
    assignedDot !== undefined
    && !(binding.type === "dot" && assignedDot === binding.id)
  ) {
    return normalisedKey.toUpperCase() + " is already assigned to dot " + assignedDot + ".";
  }

  const assignedSide = Object.entries(settings.sideKeys).find(function(entry) {
    return entry[1] === normalisedKey;
  })?.[0];

  if (
    assignedSide
    && !(binding.type === "side" && assignedSide === binding.id)
  ) {
    return normalisedKey.toUpperCase() + " is already assigned to the " + assignedSide + " side button.";
  }

  return "";
}

export function updateKeyBinding(settings: Settings, binding: Binding, key: string): Settings {
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
  // Replace this dot's key, then invert the map so its old shortcut is removed.
  dotToKey[binding.id] = key;
  const keyToDot = DOT_NUMBERS.reduce(function(nextMap, dot) {
    nextMap[dotToKey[dot]] = dot;
    return nextMap;
  }, {} as Record<string, number>);

  return {
    ...settings,
    keyToDot,
  };
}

export function updateSideAction(settings: Settings, side: Side, action: SideAction): Settings {
  return {
    ...settings,
    sideActions: {
      ...settings.sideActions,
      [side]: action,
    },
  };
}

function sanitiseSettings(rawSettings: unknown): Settings {
  const defaults = createDefaultSettings();
  if (!rawSettings || typeof rawSettings !== "object") {
    return defaults;
  }

  const stored = rawSettings as Record<string, unknown>;
  const mode = MODES.find((candidate) => candidate === stored.mode) ?? defaults.mode;
  const keyToDot = sanitiseKeyToDot(stored.keyToDot);
  const sideKeys = sanitiseSideKeys(stored.sideKeys);
  const sideActions = sanitiseSideActions(stored.sideActions);
  const hasMappingConflict = Object.keys(keyToDot).some(function(key) {
    return Object.values(sideKeys).includes(key);
  });

  // A cross-category collision makes shortcuts ambiguous, so recover both maps together.
  return {
    ...defaults,
    mode,
    modeGeometry: sanitiseModeGeometry(stored),
    showSides: readBoolean(stored.showSides, defaults.showSides),
    showNumbers: readBoolean(stored.showNumbers, defaults.showNumbers),
    showLetters: readBoolean(stored.showLetters, defaults.showLetters),
    repeatKeyboardActions: readBoolean(stored.repeatKeyboardActions, defaults.repeatKeyboardActions),
    keyToDot: hasMappingConflict ? { ...DEFAULT_KEY_TO_DOT } : keyToDot,
    sideKeys: hasMappingConflict ? { ...DEFAULT_SIDE_KEYS } : sideKeys,
    sideActions,
  };
}

function createDefaultModeGeometry(): Record<Mode, Geometry> {
  return MODES.reduce(function(geometry, mode) {
    geometry[mode] = { ...DEFAULT_GEOMETRY };
    return geometry;
  }, {} as Record<Mode, Geometry>);
}

function sanitiseModeGeometry(rawSettings: Record<string, unknown>): Record<Mode, Geometry> {
  const geometry = createDefaultModeGeometry();
  const storedGeometry = getStoredModeGeometry(rawSettings);

  MODES.forEach(function(mode) {
    // Accept per-mode and older flat geometry, then bound each mode's values.
    const source = readRecord(storedGeometry?.[mode]) || rawSettings;
    geometry[mode] = {
      indent: readNumber(source?.indent, DEFAULT_GEOMETRY.indent, -1, 1),
      angleDeg: readNumber(source?.angleDeg, DEFAULT_GEOMETRY.angleDeg, 0, 35),
      keyDia: readNumber(source?.keyDia, DEFAULT_GEOMETRY.keyDia, 0.4, 0.62),
    };
  });

  return geometry;
}

function getStoredModeGeometry(rawSettings: Record<string, unknown>) {
  // Support both the current nested shape and an older shape keyed directly by mode.
  if (rawSettings?.modeGeometry && typeof rawSettings.modeGeometry === "object") {
    return rawSettings.modeGeometry as Record<string, unknown>;
  }

  return MODES.some(function(mode) {
      return rawSettings?.[mode] && typeof rawSettings[mode] === "object";
    })
    ? rawSettings
    : null;
}

function sanitiseKeyToDot(rawKeyToDot: unknown): Record<string, number> {
  if (!rawKeyToDot || typeof rawKeyToDot !== "object") {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const entries = Object.entries(rawKeyToDot);
  // Require a complete one-to-one dot map; partial maps would silently drop a chord key.
  if (entries.length !== DOT_NUMBERS.length) {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const keyToDot: Record<string, number> = {};
  const seenDots = new Set();
  const seenKeys = new Set();

  for (const [rawKey, rawDot] of entries) {
    const key = normaliseDotKey(rawKey);
    const dot = Number(rawDot);

    if (
      !key
      || !DOT_NUMBERS.includes(dot)
      || seenKeys.has(key)
      || seenDots.has(dot)
    ) {
      return { ...DEFAULT_KEY_TO_DOT };
    }

    keyToDot[key] = dot;
    seenKeys.add(key);
    seenDots.add(dot);
  }

  return keyToDot;
}

function sanitiseSideKeys(rawSideKeys: unknown): Record<Side, string> {
  if (!rawSideKeys || typeof rawSideKeys !== "object") {
    return { ...DEFAULT_SIDE_KEYS };
  }

  const sideKeys: Record<Side, string> = { left: "", right: "" };
  const seenKeys = new Set();

  for (const side of SIDE_NAMES) {
    const key = normaliseDotKey((rawSideKeys as Record<string, unknown>)[side]);
    if (!key || seenKeys.has(key)) {
      return { ...DEFAULT_SIDE_KEYS };
    }

    sideKeys[side] = key;
    seenKeys.add(key);
  }

  return sideKeys;
}

function sanitiseSideActions(rawSideActions: unknown): Record<Side, SideAction> {
  if (!rawSideActions || typeof rawSideActions !== "object") {
    return { ...DEFAULT_SIDE_ACTIONS };
  }

  const actions: Record<Side, SideAction> = { ...DEFAULT_SIDE_ACTIONS };
  const stored = rawSideActions as Record<string, unknown>;

  for (const side of SIDE_NAMES) {
    const action = stored[side];
    if (typeof action === "string" && (SIDE_ACTIONS as readonly string[]).includes(action)) {
      actions[side] = action as SideAction;
    }
  }

  return actions;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  // Reject out-of-range numbers rather than clamp them, keeping corrupt settings on a known default.
  return typeof value === "number" && !Number.isNaN(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
