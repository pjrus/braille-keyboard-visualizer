import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createScene } from "./scene";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    shadowMap = { enabled: false, type: 0 };
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 0;
    constructor(parameters?: { canvas?: HTMLCanvasElement }) {
      this.domElement = parameters?.canvas || document.createElement("canvas");
    }
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
  }
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

describe("scene - camera animation regressions (PR #10)", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.useFakeTimers();

    canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("a new camera destination takes over an active animation", () => {
    const scene = createScene(canvas);

    // Initial position is ergonomic: [1, 5, 3]
    expect(scene.camera.position.x).toBeCloseTo(1);
    expect(scene.camera.position.y).toBeCloseTo(5);
    expect(scene.camera.position.z).toBeCloseTo(3);

    // Start animating toward "top": position [0.001, 9, 0.001], target [0, 0, 0]
    scene.setView("top");

    // Advance time partially (300ms of 600ms duration)
    vi.advanceTimersByTime(300);

    // Camera is mid-flight toward top
    expect(scene.camera.position.y).toBeGreaterThan(5);
    expect(scene.camera.position.y).toBeLessThan(9);

    // While in-flight, request a new destination: "side"
    // side preset: position [8.5, 1.8, 0.001] around target [0, 0.55, 0] => pos [8.5, 1.8, 0.001]
    scene.setView("side");

    // Advance time past the new animation's duration to complete it
    vi.advanceTimersByTime(700);

    // The camera must reach the new "side" destination, not the overridden "top" destination
    expect(scene.camera.position.x).toBeCloseTo(8.5, 1);
    expect(scene.camera.position.y).toBeCloseTo(1.8, 1);
    expect(scene.camera.position.z).toBeCloseTo(0.001, 1);
    expect(scene.controls.target.y).toBeCloseTo(0, 1);

    scene.dispose();
  });

  it("manual orbit input interrupts an active camera animation", () => {
    const scene = createScene(canvas);

    // Start animating toward "top"
    scene.setView("top");

    // Advance partially
    vi.advanceTimersByTime(150);

    const interruptedPos = scene.camera.position.clone();
    expect(interruptedPos.y).toBeGreaterThan(5);
    expect(interruptedPos.y).toBeLessThan(9);

    // User starts manual orbit drag -> controls dispatch "start"
    scene.controls.dispatchEvent({ type: "start" });

    // Advance remaining time
    vi.advanceTimersByTime(800);

    // Animation was cancelled: camera position did not continue advancing to top (y = 9)
    expect(scene.camera.position.y).toBeCloseTo(interruptedPos.y, 2);
    expect(scene.camera.position.y).not.toBeCloseTo(9, 1);

    scene.dispose();
  });

  it("scene disposal cancels any pending camera animation frame and listener", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const scene = createScene(canvas);

    // Start camera animation
    scene.setView("top");

    // Dispose scene while animation is pending
    scene.dispose();

    expect(cancelSpy).toHaveBeenCalled();

    // Advancing timers after disposal should not throw or advance camera
    const disposedPos = scene.camera.position.clone();
    expect(() => vi.advanceTimersByTime(800)).not.toThrow();
    expect(scene.camera.position.distanceTo(disposedPos)).toBe(0);
  });
});
