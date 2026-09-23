import type { Side } from "@/types";
export const DOT_SPACING = 0.7;
export const CELL_GAP = 0.75;
export const CELL_WIDTH = DOT_SPACING;
export const KEY_HEIGHT = 0.12;
export const KEY_RISE_MAX = 0.14;
export const PRESS_DEPTH = 0.09;
export const DOT_ROW_COUNT = 3;

export const DOT_POSITIONS: { number: number; col: number; row: number }[] = [
  { number: 1, col: 0, row: 0 },
  { number: 2, col: 0, row: 1 },
  { number: 3, col: 0, row: 2 },
  { number: 4, col: 1, row: 0 },
  { number: 5, col: 1, row: 1 },
  { number: 6, col: 1, row: 2 },
];
export const DOT_NUMBERS = DOT_POSITIONS.map(function (position) {
  return position.number;
});

export const BRAILLE_MAP: Record<string, string> = {
  "1": "A",
  "12": "B",
  "14": "C",
  "145": "D",
  "15": "E",
  "124": "F",
  "1245": "G",
  "125": "H",
  "24": "I",
  "245": "J",
  "13": "K",
  "123": "L",
  "134": "M",
  "1345": "N",
  "135": "O",
  "1234": "P",
  "12345": "Q",
  "1235": "R",
  "234": "S",
  "2345": "T",
  "136": "U",
  "1236": "V",
  "2456": "W",
  "1346": "X",
  "13456": "Y",
  "1356": "Z",
};

export const LETTER_TO_DOTS: Record<string, number[]> = Object.fromEntries(
  Object.entries(BRAILLE_MAP).map(([chord, letter]) => [
    letter,
    chord.split("").map(Number),
  ])
);

export const DEFAULT_KEY_TO_DOT: Readonly<Record<string, number>> = Object.freeze({
  f: 1,
  d: 2,
  s: 3,
  j: 4,
  k: 5,
  l: 6,
});

export const DEFAULT_SIDE_KEYS: Readonly<Record<Side, string>> = Object.freeze({
  left: "a",
  right: ";",
});

export const SIDE_NAMES: readonly Side[] = Object.freeze(["left", "right"]);

export function createDotToKeyMap(keyToDot: Record<string, number>) {
  return Object.entries(keyToDot).reduce(function (dotToKey, entry) {
    const [key, dot] = entry;
    dotToKey[dot] = key;
    return dotToKey;
  }, {} as Record<number, string>);
}

export function formatKeyLabel(key: string | undefined) {
  if (!key) {
    return "—";
  }

  return key.length === 1 ? key.toUpperCase() : key;
}

export function normaliseDotKey(key: unknown) {
  if (typeof key !== "string" || key.length !== 1) {
    return null;
  }

  const normalisedKey = key.toLowerCase();
  return normalisedKey.trim() ? normalisedKey : null;
}

export function isAssignableDotKey(key: unknown) {
  const normalisedKey = normaliseDotKey(key);
  return Boolean(normalisedKey);
}

export function getDotOffset(position: { col: number; row: number }) {
  const x = position.col * DOT_SPACING - DOT_SPACING / 2;

  // The deck tilts towards the viewer, so we flip the rendered rows to keep
  // dots 1 and 4 visually at the top of the keyboard.
  const visualRow = DOT_ROW_COUNT - 1 - position.row;
  const z = visualRow * DOT_SPACING - DOT_SPACING;

  return { x, z };
}
