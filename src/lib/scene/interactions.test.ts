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
    expect(state.typed).toBe("B");
    expect(state.activeDots.size).toBe(0);
  });
});
