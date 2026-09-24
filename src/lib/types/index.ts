export type Mode = "triangular" | "integrated" | "arc" | "hable" | "chameleon";
export type Side = "left" | "right";
export type CameraView = "ergonomic" | "top" | "side";
export type OrbitView = "top" | "bottom" | "left" | "right" | "front" | "back" | "iso";
export type GeometryKey = keyof Geometry;
export type OverlayKey = "showSides" | "showNumbers" | "showLetters";
export type Binding = { type: "dot"; id: number; label?: string } | { type: "side"; id: Side; label?: string };
// Geometry is saved per mode; SceneSettings flattens only the currently selected mode's values.
export type Geometry = { indent: number; angleDeg: number; keyDia: number };
export type Settings = {
  mode: Mode;
  modeGeometry: Record<Mode, Geometry>;
  showSides: boolean;
  showNumbers: boolean;
  showLetters: boolean;
  repeatKeyboardActions: boolean;
  keyToDot: Record<string, number>;
  sideKeys: Record<Side, string>;
};
export type SceneSettings = Settings & Geometry;
// These fields belong to the live scene session and are deliberately not saved with settings.
// The sets track physical keyboard state separately from the visible active chord.
export type RuntimeState = SceneSettings & {
  activeDots: Set<number>;
  kbHeld: Set<number>;
  wasKbChording: boolean;
  typed: string;
  sidePressed: Record<Side, boolean>;
};
export type HudState = { dots: number[]; letter: string; typed: string };
export type SceneApi = { saveScreenshot: () => void; setView: (view: CameraView) => void };
export type BindingResult = { error: string; message?: never } | { message: string; error?: never };
