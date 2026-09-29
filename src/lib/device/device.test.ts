import type { Mode, RuntimeState } from "@/lib/types";
import { createDefaultSettings, createSceneSettings } from "@/lib/visualiser-settings";
import * as THREE from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DOT_NUMBERS, KEY_RISE_MAX, PRESS_DEPTH } from "../config";
import { createDeviceController } from "./controller";
import { DeviceMode } from "./modes/deviceMode";
import { IntegratedMode } from "./modes/integratedMode";
import { createDeviceMode } from "./modes/registry";
import { TriangularMode } from "./modes/triangularMode";

const MODES: Mode[] = ["triangular", "integrated", "arc", "hable", "chameleon"];

// jsdom has no 2D canvas, which the label sprites need; a no-op context is enough here.
beforeAll(() => {
  const context = new Proxy({ measureText: () => ({ width: 10 }) } as Record<string, unknown>, {
    get: (target, key: string) => target[key] ?? vi.fn(),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => context as never);
});

function createState(overrides: Partial<RuntimeState> = {}): RuntimeState {
  return {
    ...createSceneSettings(createDefaultSettings()),
    activeDots: new Set<number>(),
    kbHeld: new Set<number>(),
    wasKbChording: false,
    isShiftActive: false,
    typed: "",
    sidePressed: { left: false, right: false },
    ...overrides,
  };
}

function createDevice(overrides: Partial<RuntimeState> = {}) {
  const root = new THREE.Group();
  const state = createState(overrides);
  const device = createDeviceController({ root, state });
  device.buildDevice();
  return { device, root, state };
}

function meshes(root: THREE.Object3D) {
  const found: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) found.push(object);
  });
  return found;
}

const dots = (root: THREE.Object3D) => meshes(root).filter((mesh) => mesh.userData.kind === "dot");
const sides = (root: THREE.Object3D) => meshes(root).filter((mesh) => String(mesh.userData.kind).startsWith("side-"));
const worldPosition = (mesh: THREE.Object3D) => mesh.getWorldPosition(new THREE.Vector3());

describe("mode registry", () => {
  it.each(MODES)("creates a %s mode with a layout", (mode) => {
    expect(createDeviceMode(mode, {})).toBeInstanceOf(DeviceMode);
    expect(createDeviceMode(mode, {}).layout.bodyDepth).toBeGreaterThan(0);
  });

  it("returns the matching class, and falls back to integrated for unknown modes", () => {
    expect(createDeviceMode("triangular", {})).toBeInstanceOf(TriangularMode);
    expect(createDeviceMode("bogus" as Mode, {})).toBeInstanceOf(IntegratedMode);
  });

  it("refuses to instantiate the abstract base", () => {
    const Base = DeviceMode as unknown as new(metrics: object) => DeviceMode;
    expect(() => new Base({})).toThrow(/abstract/);
  });

  it("applies the incline angle only in triangular mode", () => {
    for (const mode of MODES) {
      const tilt = createDeviceMode(mode, {}).getTiltAngle(20);
      if (mode === "triangular") expect(tilt).toBeCloseTo(THREE.MathUtils.degToRad(20));
      else expect(tilt).toBe(0);
    }
  });
});

describe("built devices", () => {
  it.each(MODES)("%s builds six uniquely numbered dots and two side buttons", (mode) => {
    const { root } = createDevice({ mode });
    expect(dots(root).map((dot) => dot.userData.number).sort()).toEqual(DOT_NUMBERS);
    expect(sides(root).map((button) => button.userData.kind).sort()).toEqual(["side-left", "side-right"]);
  });

  it.each(MODES)("%s builds no side buttons when they are hidden", (mode) => {
    const { root } = createDevice({ mode, showSides: false });
    expect(sides(root)).toHaveLength(0);
    expect(dots(root)).toHaveLength(6);
  });

  it.each(MODES)("%s gives every dot its own position", (mode) => {
    const { root } = createDevice({ mode });
    const positions = dots(root).map((dot) => worldPosition(dot).toArray().map((v) => v.toFixed(3)).join());
    expect(new Set(positions).size).toBe(6);
  });

  it("tilts the deck only in triangular mode", () => {
    const tilted = createDevice({ mode: "triangular", angleDeg: 20 });
    expect(tilted.root.children[0].rotation.x).toBeCloseTo(-THREE.MathUtils.degToRad(20));
    const flat = createDevice({ mode: "arc", angleDeg: 20 });
    expect(flat.root.children[0].rotation.x).toBeCloseTo(0);
  });
});

describe("controller updates", () => {
  it("updates indent and overlays on the existing meshes", () => {
    const { device, root, state } = createDevice();
    const before = dots(root);
    const labels = () => root.getObjectsByProperty("isSprite", true) as THREE.Sprite[];

    state.indent = 1;
    device.applyIndent();
    state.showNumbers = true;
    state.showLetters = true;
    device.applyOverlays();

    expect(dots(root)).toEqual(before);
    expect(labels().every((label) => label.visible)).toBe(true);
  });

  it("raises keys by indent and keeps the pressed offset", () => {
    const { device, root, state } = createDevice({ indent: 0 });
    const flatBase = dots(root)[0].userData.baseY;
    state.indent = 1;
    device.applyIndent();
    expect(dots(root)[0].userData.baseY).toBeCloseTo(flatBase + KEY_RISE_MAX);

    device.setDotPressed(1, true);
    const pressed = dots(root).find((dot) => dot.userData.number === 1)!;
    expect(pressed.userData.targetY).toBeCloseTo(pressed.userData.baseY - PRESS_DEPTH);
    device.setDotPressed(1, false);
    expect(pressed.userData.targetY).toBeCloseTo(pressed.userData.baseY);
  });

  it("restores live pressed state after a rebuild", () => {
    const { device, root, state } = createDevice();
    state.activeDots.add(2);
    state.sidePressed.left = true;
    device.buildDevice();

    const dot = dots(root).find((mesh) => mesh.userData.number === 2)!;
    expect(dot.userData.pressed).toBe(true);
    expect(dot.position.y).toBeCloseTo(dot.userData.targetY);
    const left = sides(root).find((button) => button.userData.kind === "side-left")!;
    expect(left.userData.pressed).toBe(true);
    expect(left.position.y).toBeCloseTo(left.userData.targetY);
  });

  it("replaces meshes when rebuilt for a new mode", () => {
    const { device, root, state } = createDevice();
    const before = dots(root);
    state.mode = "arc";
    device.buildDevice();
    expect(dots(root).some((dot) => before.includes(dot))).toBe(false);
    expect(root.children).toHaveLength(1);
  });
});

describe("disposal", () => {
  it("keeps shared materials across rebuilds but frees geometries", () => {
    const { device, root } = createDevice();
    const geometry = dots(root)[0].geometry;
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const material = dots(root)[0].material as THREE.Material;
    const disposeMaterial = vi.spyOn(material, "dispose");

    device.buildDevice();
    expect(disposeGeometry).toHaveBeenCalled();
    expect(disposeMaterial).not.toHaveBeenCalled();
    expect(root.children).toHaveLength(1);
  });

  it("releases geometries and materials on dispose", () => {
    const { device, root } = createDevice();
    const geometry = dots(root)[0].geometry;
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const material = dots(root)[0].material as THREE.Material;
    const disposeMaterial = vi.spyOn(material, "dispose");

    device.dispose();
    expect(disposeGeometry).toHaveBeenCalled();
    expect(disposeMaterial).toHaveBeenCalled();
    expect(root.children).toHaveLength(0);
  });
});
