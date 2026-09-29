import { describe, expect, it } from "vitest";
import {
  BRAILLE_MAP,
  createDotToKeyMap,
  DEFAULT_KEY_TO_DOT,
  DEFAULT_SIDE_KEYS,
  DOT_NUMBERS,
  LETTER_TO_DOTS,
  normaliseDotKey,
} from "./config";
import { createDefaultSettings, getKeymapValidationError, updateKeyBinding } from "./visualiser-settings";

const settings = createDefaultSettings();

describe("normaliseDotKey", () => {
  it("rejects non-strings, empty, blank and multi-character values", () => {
    for (const value of [undefined, null, 1, "", " ", "Shift", "ab"]) {
      expect(normaliseDotKey(value)).toBeNull();
    }
  });

  it("lowercases valid keys", () => {
    expect(normaliseDotKey("Q")).toBe("q");
    expect(normaliseDotKey(";")).toBe(";");
  });
});

describe("getKeymapValidationError", () => {
  it("rejects invalid keys", () => {
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, "Shift")).toMatch(/single printable key/);
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, null)).toMatch(/single printable key/);
  });

  it("names the dot that already owns a key, from a dot or a side binding", () => {
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, "d")).toBe("D is already assigned to dot 2.");
    expect(getKeymapValidationError(settings, { type: "side", id: "left" }, "D")).toBe(
      "D is already assigned to dot 2.",
    );
  });

  it("names the side button that already owns a key, from a dot or a side binding", () => {
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, "a")).toBe(
      "A is already assigned to the left side button.",
    );
    expect(getKeymapValidationError(settings, { type: "side", id: "right" }, "a")).toBe(
      "A is already assigned to the left side button.",
    );
  });

  it("allows a control to keep its own key and accepts free keys", () => {
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, "f")).toBe("");
    expect(getKeymapValidationError(settings, { type: "side", id: "left" }, "a")).toBe("");
    expect(getKeymapValidationError(settings, { type: "dot", id: 1 }, "q")).toBe("");
  });
});

describe("updateKeyBinding", () => {
  it("replaces a dot's shortcut, keeping six unique entries, without mutating the input", () => {
    const before = structuredClone(settings);
    const next = updateKeyBinding(settings, { type: "dot", id: 1 }, "q");
    expect(next.keyToDot).toEqual({ q: 1, d: 2, s: 3, j: 4, k: 5, l: 6 });
    expect(Object.keys(next.keyToDot)).toHaveLength(6);
    expect(settings).toEqual(before);
  });

  it("changes only the chosen side button", () => {
    const next = updateKeyBinding(settings, { type: "side", id: "left" }, "z");
    expect(next.sideKeys).toEqual({ left: "z", right: DEFAULT_SIDE_KEYS.right });
    expect(next.keyToDot).toEqual(DEFAULT_KEY_TO_DOT);
  });
});

describe("config data", () => {
  it("keeps BRAILLE_MAP chords sorted, unique and within dots 1-6", () => {
    const chords = Object.keys(BRAILLE_MAP);
    for (const chord of chords) {
      const dots = chord.split("").map(Number);
      expect(dots).toEqual([...dots].sort((a, b) => a - b));
      expect(new Set(dots).size).toBe(dots.length);
      expect(dots.every((dot) => DOT_NUMBERS.includes(dot))).toBe(true);
    }
    expect(new Set(Object.values(BRAILLE_MAP)).size).toBe(chords.length);
  });

  it("round-trips LETTER_TO_DOTS with BRAILLE_MAP", () => {
    for (const [chord, letter] of Object.entries(BRAILLE_MAP)) {
      expect(LETTER_TO_DOTS[letter].join("")).toBe(chord);
    }
  });

  it("has non-colliding defaults that cover every dot", () => {
    const keys = [...Object.keys(DEFAULT_KEY_TO_DOT), ...Object.values(DEFAULT_SIDE_KEYS)];
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.values(DEFAULT_KEY_TO_DOT).sort()).toEqual(DOT_NUMBERS);
  });

  it("inverts a key map", () => {
    expect(createDotToKeyMap({ f: 1, d: 2 })).toEqual({ 1: "f", 2: "d" });
  });
});
