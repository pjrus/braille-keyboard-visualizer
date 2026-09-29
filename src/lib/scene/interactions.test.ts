import type { RuntimeState } from "@/lib/types";
import { createDefaultSettings, createSceneSettings } from "@/lib/visualiser-settings";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInteractionController } from "./interactions";

function createMockState(overrides: Partial<RuntimeState> = {}): RuntimeState {
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

function setupInteraction(overrides: Partial<RuntimeState> = {}) {
  const canvas = document.createElement("canvas");
  const state = createMockState(overrides);
  const device = {
    setDotPressed: vi.fn(),
    restoreSideVisuals: vi.fn(),
    pickObject: vi.fn(),
  } as unknown as Parameters<typeof createInteractionController>[0]["device"];
  const sceneController = {
    camera: new THREE.PerspectiveCamera(),
  } as unknown as Parameters<typeof createInteractionController>[0]["sceneController"];
  const onStateChange = vi.fn();

  const controller = createInteractionController({
    canvas,
    device,
    sceneController,
    state,
    onStateChange,
  });

  return { canvas, controller, device, onStateChange, state };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("interactions", () => {
  it("defaults produce lowercase letters and spaces", () => {
    const { state } = setupInteraction();

    // Type dot 1 (f) -> commits letter 'a' on keyup
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));
    expect(state.typed).toBe("a");

    // Space command key inserts space
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(state.typed).toBe("a ");
  });

  it("triggers default side actions: left = backspace, right = space", () => {
    const { state } = setupInteraction({ typed: "hello" });

    // Left side button key (a) triggers backspace on keyup
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));
    expect(state.typed).toBe("hell");

    // Right side button key (;) triggers space on keyup
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ";" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: ";" }));
    expect(state.typed).toBe("hell ");
  });

  it("handles configured Shift action as a one-shot capitalisation toggle", () => {
    const { state } = setupInteraction({
      sideActions: { left: "shift", right: "space" },
    });

    // Press left side button to toggle Shift
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));
    expect(state.isShiftActive).toBe(true);

    // Typing dot 1 (f) now produces uppercase 'A'
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));
    expect(state.typed).toBe("A");
    expect(state.isShiftActive).toBe(false);

    // Next typed letter is lowercase again
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));
    expect(state.typed).toBe("Aa");
  });

  it("handles configured Enter action by committing chord and appending newline", () => {
    const { state } = setupInteraction({
      sideActions: { left: "backspace", right: "enter" },
    });

    // Hold dot 1 (f)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    expect(state.activeDots.has(1)).toBe(true);

    // Press right side button configured for Enter
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ";" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: ";" }));

    // Chord was committed as 'a' and newline was appended
    expect(state.typed).toBe("a\n");
    expect(state.activeDots.size).toBe(0);
  });

  it("physical Enter key appends newline and commits active chord", () => {
    const { state } = setupInteraction();

    // Type dot 1 (f) and keep it held
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    expect(state.activeDots.has(1)).toBe(true);

    // Enter keydown
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(state.typed).toBe("a\n");
    expect(state.activeDots.size).toBe(0);
  });

  it("supports duplicate actions on both physical buttons", () => {
    const { state } = setupInteraction({
      sideActions: { left: "space", right: "space" },
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ";" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: ";" }));

    expect(state.typed).toBe("  ");
  });

  it("executes the same configured action on 3D pointer click", () => {
    vi.useFakeTimers();
    const { canvas, device, state } = setupInteraction({
      sideActions: { left: "enter", right: "shift" },
    });

    const mockMesh = new THREE.Mesh();
    mockMesh.userData = { kind: "side-left" };
    (device.pickObject as ReturnType<typeof vi.fn>).mockReturnValue(mockMesh);

    // Simulate pointer click on canvas
    firePointerClick(canvas);
    vi.advanceTimersByTime(200);

    expect(state.typed).toBe("\n");
    vi.useRealTimers();
  });
});

function firePointerClick(canvas: HTMLCanvasElement) {
  canvas.dispatchEvent(
    new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, pointerId: 1 }),
  );
  canvas.dispatchEvent(
    new PointerEvent("pointerup", { button: 0, clientX: 10, clientY: 10, pointerId: 1 }),
  );
}
