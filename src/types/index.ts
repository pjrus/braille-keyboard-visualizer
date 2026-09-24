export type Mode = "triangular" | "integrated" | "arc" | "hable" | "chameleon";
export type Side = "left" | "right";
export type CameraView = "ergonomic" | "top" | "side";
export type OrbitView = "top" | "bottom" | "left" | "right" | "front" | "back" | "iso";
export type GeometryKey = keyof Geometry;
export type OverlayKey = "showSides" | "showNumbers" | "showLetters";
export type Binding = { type: "dot"; id: number; label?: string } | { type: "side"; id: Side; label?: string };
export type Geometry = { indent: number; angleDeg: number; keyDia: number };
export type Settings = {
  mode: Mode;
  modeGeometry: Record<Mode, Geometry>;
  showSides: boolean;
  showNumbers: boolean;
  showLetters: boolean;
  keyToDot: Record<string, number>;
  sideKeys: Record<Side, string>;
};
export type SceneSettings = Settings & Geometry;
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
