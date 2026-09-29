import type { SceneApi } from "@/lib/types";
import { STORAGE_KEY } from "@/lib/visualiser-settings";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrailleKeyboardVisualiser } from "./braille-keyboard-visualiser";

const sceneApi = vi.hoisted(() => ({ saveScreenshot: vi.fn(), setView: vi.fn() }));
const sceneState = vi.hoisted(() => ({ ready: true }));

// The real scene needs WebGL; this stand-in only reports ready and exposes the command API.
vi.mock("./keyboard-scene", async () => {
  const { useEffect } = await import("react");
  return {
    KeyboardScene: (
      { sceneApiRef, onReady }: { sceneApiRef: { current: SceneApi | null }; onReady: (r: boolean) => void },
    ) => {
      useEffect(() => {
        sceneApiRef.current = sceneApi;
        onReady(sceneState.ready);
      }, [sceneApiRef, onReady]);
      return <canvas aria-label="scene stub" />;
    },
  };
});

const saved = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
// The range labels also wrap an <output>, so pick the sliders by their fixed panel order.
const SLIDERS = ["Key indent", "Incline angle", "Key diameter"];
const slider = (name: string) => screen.getAllByRole("slider")[SLIDERS.indexOf(name)] as HTMLInputElement;
const field = (name: string) =>
  screen.getByRole("textbox", { name: "Keyboard shortcut for " + name }) as HTMLInputElement;
const button = (name: string) => screen.getByRole("button", { name });

// Settings load on the next animation frame, so wait for the persisted schema to appear.
async function renderLoaded() {
  const view = render(<BrailleKeyboardVisualiser />);
  await waitFor(() => expect(saved()).not.toBeNull());
  return view;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  sceneState.ready = true;
});
afterEach(cleanup);

describe("loading", () => {
  // next/dynamic caches the chunk once loaded, so this must stay the first render in the file.
  it("shows a status while the scene chunk loads, then the scene", async () => {
    render(<BrailleKeyboardVisualiser />);
    expect(screen.getByText(/Preparing the 3D keyboard/).getAttribute("role")).toBe("status");
    await screen.findByLabelText("scene stub");
    expect(screen.queryByText(/Preparing the 3D keyboard/)).toBeNull();
  });
});

describe("geometry and modes", () => {
  it("enables the incline slider only in Triangular mode and explains why", async () => {
    await renderLoaded();
    expect(slider("Incline angle").disabled).toBe(false);
    expect(screen.queryByText(/Incline applies only to Triangular mode/)).toBeNull();

    fireEvent.click(button("Arc"));
    expect(slider("Incline angle").disabled).toBe(true);
    expect(screen.getByText(/Incline applies only to Triangular mode/)).toBeTruthy();

    fireEvent.click(button("Triangular"));
    expect(slider("Incline angle").disabled).toBe(false);
  });

  it("keeps geometry per mode and restores it on return", async () => {
    await renderLoaded();
    fireEvent.change(slider("Key indent"), { target: { value: "0.8" } });
    fireEvent.change(slider("Incline angle"), { target: { value: "25" } });

    fireEvent.click(button("Arc"));
    expect(slider("Key indent").value).toBe("0.35");
    fireEvent.change(slider("Key diameter"), { target: { value: "0.5" } });

    fireEvent.click(button("Triangular"));
    expect(slider("Key indent").value).toBe("0.8");
    expect(slider("Incline angle").value).toBe("25");
    expect(slider("Key diameter").value).toBe("0.52");

    fireEvent.click(button("Arc"));
    expect(slider("Key diameter").value).toBe("0.5");
  });
});

describe("persistence", () => {
  it("saves overlays, repeat option and bindings, and restores them after a reload", async () => {
    const first = await renderLoaded();
    fireEvent.click(screen.getByRole("checkbox", { name: "Dot numbers (1–6)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Repeat held actions" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Left button action" }), { target: { value: "shift" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Right button action" }), { target: { value: "enter" } });
    fireEvent.keyDown(field("Dot 1"), { key: "q" });
    fireEvent.click(button("Hable"));

    await waitFor(() => expect(saved().mode).toBe("hable"));
    first.unmount();

    await renderLoaded();
    await waitFor(() => expect(button("Hable").getAttribute("aria-pressed")).toBe("true"));
    expect((screen.getByRole("checkbox", { name: "Dot numbers (1–6)" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Repeat held actions" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("combobox", { name: "Left button action" }) as HTMLSelectElement).value).toBe("shift");
    expect((screen.getByRole("combobox", { name: "Right button action" }) as HTMLSelectElement).value).toBe("enter");
    expect(field("Dot 1").value).toBe("Q");
  });
});

describe("keyboard mapping", () => {
  it("reports a duplicate key next to the field and keeps the old binding", async () => {
    await renderLoaded();
    field("Dot 1").focus();
    fireEvent.keyDown(field("Dot 1"), { key: "d" });

    expect(screen.getByText("D is already assigned to dot 2.").className).toMatch(/is-error/);
    expect(field("Dot 1").value).toBe("F");
    expect(field("Dot 2").value).toBe("D");
  });

  it("rejects modifier shortcuts and leaves the binding unchanged", async () => {
    await renderLoaded();
    fireEvent.keyDown(field("Dot 1"), { key: "q", ctrlKey: true });
    expect(screen.getByText(/without modifier shortcuts/)).toBeTruthy();
    expect(field("Dot 1").value).toBe("F");
  });

  it("resets only the keymap and side actions, not geometry or overlays", async () => {
    await renderLoaded();
    fireEvent.keyDown(field("Dot 1"), { key: "q" });
    fireEvent.keyDown(field("Left side"), { key: "z" });
    fireEvent.change(screen.getByRole("combobox", { name: "Left button action" }), { target: { value: "shift" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Dot numbers (1–6)" }));
    fireEvent.change(slider("Key indent"), { target: { value: "0.8" } });
    expect(field("Dot 1").value).toBe("Q");
    expect((screen.getByRole("combobox", { name: "Left button action" }) as HTMLSelectElement).value).toBe("shift");

    fireEvent.click(button("Reset keyboard mappings"));

    expect(field("Dot 1").value).toBe("F");
    expect(field("Left side").value).toBe("A");
    expect((screen.getByRole("combobox", { name: "Left button action" }) as HTMLSelectElement).value).toBe("backspace");
    expect((screen.getByRole("combobox", { name: "Right button action" }) as HTMLSelectElement).value).toBe("space");
    expect((screen.getByRole("checkbox", { name: "Dot numbers (1–6)" }) as HTMLInputElement).checked).toBe(true);
    expect(slider("Key indent").value).toBe("0.8");
  });
});

describe("camera and access", () => {
  it("sends camera views and snapshots to the scene", async () => {
    await renderLoaded();
    await screen.findByLabelText("scene stub");
    fireEvent.click(button("Top"));
    expect(sceneApi.setView).toHaveBeenCalledWith("top");
    expect(button("Top").getAttribute("aria-pressed")).toBe("true");

    await waitFor(() => expect((button("Save screenshot") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button("Save screenshot"));
    expect(sceneApi.saveScreenshot).toHaveBeenCalledOnce();
  });

  it("disables the screenshot button until the scene is ready", async () => {
    sceneState.ready = false;
    await renderLoaded();
    expect((button("Save screenshot") as HTMLButtonElement).disabled).toBe(true);
  });

  it("gives every mapping field, view button and toggle an accessible name and keyboard focus", async () => {
    await renderLoaded();
    for (const name of ["Dot 1", "Dot 2", "Dot 3", "Dot 4", "Dot 5", "Dot 6", "Left side", "Right side"]) {
      const input = field(name);
      expect(input.tabIndex).toBeGreaterThanOrEqual(0);
      act(() => input.focus());
      expect(document.activeElement).toBe(input);
    }
    for (const name of ["Left button action", "Right button action"]) {
      const select = screen.getByRole("combobox", { name }) as HTMLSelectElement;
      expect(select.tabIndex).toBeGreaterThanOrEqual(0);
      act(() => select.focus());
      expect(document.activeElement).toBe(select);
    }
    for (const name of ["Ergonomic", "Top", "Side", "Save screenshot", "Reset keyboard mappings"]) {
      expect((button(name) as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
    }
    expect(screen.getAllByRole("button", { pressed: true }).length).toBeGreaterThanOrEqual(2);
  });
});
