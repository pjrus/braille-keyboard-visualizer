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

describe("interactions - keyboard focus and chord regressions (PR #10)", () => {
  it("Space on a focused UI button activates the button and does not add braille output", () => {
    const { state } = setupInteraction();

    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    expect(document.activeElement).toBe(button);

    // Press Space on focused button
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(state.typed).toBe("");
    expect(state.activeDots.size).toBe(0);

    // Also with an existing chord active (e.g. from pointer), space on a focused button does not commit it
    state.activeDots.add(1);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(state.typed).toBe("");
    expect(state.activeDots.has(1)).toBe(true);

    button.remove();
  });

  it("a chord held before focus moves to a control is cancelled on release without typing; a held side action does not run", () => {
    const { state } = setupInteraction();

    // Start with focus not on an interactive element
    document.body.focus();

    // Press dot keys (f for dot 1, d for dot 2) and left side key (a)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(state.kbHeld.has(1)).toBe(true);
    expect(state.kbHeld.has(2)).toBe(true);
    expect(state.activeDots.has(1)).toBe(true);
    expect(state.activeDots.has(2)).toBe(true);
    expect(state.sidePressed.left).toBe(true);

    // Move focus to a UI control
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    // Release the keys while focus is in the control
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "a" }));

    // Held chord is cancelled without typing
    expect(state.activeDots.size).toBe(0);
    expect(state.kbHeld.size).toBe(0);
    expect(state.wasKbChording).toBe(false);
    expect(state.sidePressed.left).toBe(false);
    expect(state.typed).toBe("");

    input.remove();
  });

  it("a normal chord still commits when its final key is released while focus remains on the visualiser", () => {
    const { state } = setupInteraction();

    document.body.focus();

    // Hold dots 1 & 2 (keys f and d)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));

    expect(state.activeDots.size).toBe(2);
    expect(state.typed).toBe("");

    // Release dot 1 - chord does not commit yet while dot 2 is still held
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));
    expect(state.typed).toBe("");

    // Release dot 2 - final key commits the chord (dots 1,2 = "B")
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
    expect(state.typed).toBe("b");
    expect(state.activeDots.size).toBe(0);
  });
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
