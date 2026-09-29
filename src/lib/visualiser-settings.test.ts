import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_KEY_TO_DOT, DEFAULT_SIDE_ACTIONS, DEFAULT_SIDE_KEYS } from "./config";
import {
  createDefaultSettings,
  loadSettings,
  persistSettings,
  STORAGE_KEY,
  updateSideAction,
} from "./visualiser-settings";

function store(value: unknown) {
  window.localStorage.setItem(STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("loadSettings fallbacks", () => {
  it("returns defaults for missing, unparsable or non-object storage", () => {
    expect(loadSettings()).toEqual(createDefaultSettings());
    for (const raw of ["{not json", "null", "42", "\"text\""]) {
      store(raw);
      expect(loadSettings()).toEqual(createDefaultSettings());
    }
  });

  it("does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadSettings()).toEqual(createDefaultSettings());
    expect(() => persistSettings(createDefaultSettings())).not.toThrow();
  });

  it("falls back to triangular for an unknown mode", () => {
    store({ mode: "bogus" });
    expect(loadSettings().mode).toBe("triangular");
    store({ mode: "arc" });
    expect(loadSettings().mode).toBe("arc");
  });

  it("falls back to defaults for non-boolean overlay flags", () => {
    store({ showSides: "yes", showNumbers: 1, showLetters: null, repeatKeyboardActions: "true" });
    expect(loadSettings()).toMatchObject({
      showSides: true,
      showNumbers: false,
      showLetters: false,
      repeatKeyboardActions: false,
    });
  });
});

describe("geometry", () => {
  const defaults = createDefaultSettings().modeGeometry.arc;

  it("rejects out-of-range, NaN and non-numeric values instead of clamping", () => {
    store({ modeGeometry: { arc: { indent: 5, angleDeg: -1, keyDia: "wide" } } });
    expect(loadSettings().modeGeometry.arc).toEqual(defaults);
    store({ modeGeometry: { arc: { indent: null, angleDeg: 36, keyDia: 0.7 } } });
    expect(loadSettings().modeGeometry.arc).toEqual(defaults);
  });

  it("accepts values on the bounds", () => {
    const edge = { indent: -1, angleDeg: 35, keyDia: 0.4 };
    store({ modeGeometry: { arc: edge } });
    expect(loadSettings().modeGeometry.arc).toEqual(edge);
  });

  it("loads the nested, per-mode and flat legacy shapes", () => {
    const geometry = { indent: 0.5, angleDeg: 20, keyDia: 0.5 };
    store({ modeGeometry: { hable: geometry } });
    expect(loadSettings().modeGeometry.hable).toEqual(geometry);
    store({ hable: geometry });
    expect(loadSettings().modeGeometry.hable).toEqual(geometry);
    store(geometry);
    expect(loadSettings().modeGeometry.hable).toEqual(geometry);
    expect(loadSettings().modeGeometry.arc).toEqual(geometry);
  });
});

describe("key maps", () => {
  const validMap = { q: 1, w: 2, e: 3, r: 4, t: 5, y: 6 };

  it("keeps a valid custom map and normalises key case", () => {
    store({ keyToDot: { Q: 1, w: 2, e: 3, r: 4, t: 5, y: 6 } });
    expect(loadSettings().keyToDot).toEqual(validMap);
  });

  it.each([
    ["partial", { q: 1, w: 2 }],
    ["duplicate dot", { q: 1, w: 1, e: 3, r: 4, t: 5, y: 6 }],
    ["out-of-range dot", { q: 1, w: 2, e: 3, r: 4, t: 5, y: 7 }],
    ["multi-character key", { q: 1, w: 2, e: 3, r: 4, t: 5, Shift: 6 }],
    ["duplicate key after lowercasing", { q: 1, Q: 2, e: 3, r: 4, t: 5, y: 6 }],
  ])("resets a %s dot map to the default", (_name, keyToDot) => {
    store({ keyToDot });
    expect(loadSettings().keyToDot).toEqual(DEFAULT_KEY_TO_DOT);
  });

  it("resets both maps when a dot key collides with a side key", () => {
    store({ keyToDot: { ...validMap, q: 1 }, sideKeys: { left: "q", right: "p" } });
    const settings = loadSettings();
    expect(settings.keyToDot).toEqual(DEFAULT_KEY_TO_DOT);
    expect(settings.sideKeys).toEqual(DEFAULT_SIDE_KEYS);
  });

  it("resets side keys that are duplicated or invalid", () => {
    store({ sideKeys: { left: "x", right: "x" } });
    expect(loadSettings().sideKeys).toEqual(DEFAULT_SIDE_KEYS);
    store({ sideKeys: { left: "x", right: "" } });
    expect(loadSettings().sideKeys).toEqual(DEFAULT_SIDE_KEYS);
  });
});

describe("persistence", () => {
  it("writes only the persisted schema", () => {
    const settings = { ...createDefaultSettings(), activeDots: new Set([1]), typed: "AB", indent: 0.9 };
    persistSettings(settings);
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(Object.keys(saved).sort()).toEqual([
      "keyToDot",
      "mode",
      "modeGeometry",
      "repeatKeyboardActions",
      "showLetters",
      "showNumbers",
      "showSides",
      "sideActions",
      "sideKeys",
    ]);
  });

  it("round-trips through loadSettings", () => {
    const settings = {
      ...createDefaultSettings(),
      mode: "hable" as const,
      showNumbers: true,
      sideActions: { left: "shift" as const, right: "enter" as const },
    };
    persistSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it("returns independent defaults on every call", () => {
    const first = createDefaultSettings();
    first.keyToDot.z = 9;
    first.sideKeys.left = "z";
    first.sideActions.left = "shift";
    first.modeGeometry.arc.indent = 0.9;
    const second = createDefaultSettings();
    expect(second.keyToDot).toEqual(DEFAULT_KEY_TO_DOT);
    expect(second.sideKeys).toEqual(DEFAULT_SIDE_KEYS);
    expect(second.sideActions).toEqual(DEFAULT_SIDE_ACTIONS);
    expect(second.modeGeometry.arc.indent).toBe(0.35);
    expect(second.modeGeometry.hable).not.toBe(second.modeGeometry.arc);
  });
});

describe("side actions", () => {
  it("keeps valid custom side actions and permits duplicate actions", () => {
    store({ sideActions: { left: "enter", right: "enter" } });
    expect(loadSettings().sideActions).toEqual({ left: "enter", right: "enter" });

    store({ sideActions: { left: "shift", right: "space" } });
    expect(loadSettings().sideActions).toEqual({ left: "shift", right: "space" });
  });

  it("falls back to default for invalid side actions", () => {
    store({ sideActions: { left: "invalid", right: "space" } });
    expect(loadSettings().sideActions).toEqual({ left: "backspace", right: "space" });

    store({ sideActions: null });
    expect(loadSettings().sideActions).toEqual(DEFAULT_SIDE_ACTIONS);
  });

  it("updates side action immutably via updateSideAction", () => {
    const initial = createDefaultSettings();
    const updated = updateSideAction(initial, "left", "shift");
    expect(updated.sideActions).toEqual({ left: "shift", right: "space" });
    expect(initial.sideActions).toEqual(DEFAULT_SIDE_ACTIONS);
  });
});
