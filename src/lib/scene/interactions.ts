import type { HudState, RuntimeState, Side } from "@/types";
import type { createDeviceController } from "@/lib/device/controller";
import type { createScene } from "./scene";
import * as THREE from "three";
import { BRAILLE_MAP } from "@/lib/config";

const EMPTY_DISPLAY = "—";
const SIDE_HOLD_MS = 180;
const TAP_MOVE_THRESHOLD = 8;

export function createInteractionController({
  canvas,
  device,
  sceneController,
  state,
  onStateChange,
}: { canvas: HTMLCanvasElement; device: ReturnType<typeof createDeviceController>; sceneController: ReturnType<typeof createScene>; state: RuntimeState; onStateChange: (state: HudState) => void }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const sideHoldTimers: Record<Side, number | null> = { left: null, right: null };
  const pointerSession = {
    id: null as number | null,
    moved: false,
    startX: 0,
    startY: 0,
  };
  const listeners: (() => void)[] = [];

  bindKeyboardEvents();
  bindPointerEvents();
  publishState();

  return {
    appendSpace,
    backspace,
    clearChord,
    commitChord,
    dispose,
    pressDot,
    releaseDot,
    toggleDot,
  };

  function listen<E extends Event>(target: EventTarget, eventName: string, handler: (event: E) => void) {
    const listener = (event: Event) => handler(event as E);
    target.addEventListener(eventName, listener);
    listeners.push(() => target.removeEventListener(eventName, listener));
  }

  function dispose() {
    listeners.forEach(function removeListener(remove) {
      remove();
    });
    clearSideHoldTimer("left");
    clearSideHoldTimer("right");
    canvas.classList.remove("hit");
  }

  function pressDot(number: number, options?: { skipStatePublish?: boolean }) {
    return setDotActive(number, true, options);
  }

  function releaseDot(number: number, options?: { skipStatePublish?: boolean }) {
    return setDotActive(number, false, options);
  }

  function toggleDot(number: number) {
    if (state.activeDots.has(number)) {
      releaseDot(number);
      return;
    }

    pressDot(number);
  }

  function setDotActive(number: number, pressed: boolean, options?: { skipStatePublish?: boolean }) {
    const shouldPublish = !(options && options.skipStatePublish);
    const isActive = state.activeDots.has(number);

    if (pressed === isActive) {
      return false;
    }

    if (pressed) {
      state.activeDots.add(number);
    } else {
      state.activeDots.delete(number);
    }

    device.setDotPressed(number, pressed);

    if (shouldPublish) {
      publishState();
    }

    return true;
  }

  function pressSide(side: Side) {
    clearSideHoldTimer(side);
    state.sidePressed[side] = true;
    device.restoreSideVisuals();
  }

  function releaseSide(side: Side, shouldTriggerAction: boolean) {
    clearSideHoldTimer(side);

    const wasPressed = state.sidePressed[side];
    state.sidePressed[side] = false;
    device.restoreSideVisuals();

    if (!wasPressed || !shouldTriggerAction) {
      return;
    }

    if (side === "left") {
      backspace();
      return;
    }

    appendSpace();
  }

  function backspace() {
    if (state.typed.length === 0) {
      return;
    }

    state.typed = state.typed.slice(0, -1);
    publishState();
  }

  function appendSpace() {
    state.typed += " ";
    publishState();
  }

  function activeChordString() {
    return Array.from(state.activeDots).sort((a, b) => a - b).join("");
  }

  function commitChord() {
    const chord = activeChordString();
    if (!chord) {
      return;
    }

    state.typed += BRAILLE_MAP[chord] || formatUnknownChord(chord);
    clearChord();
  }

  function clearChord() {
    Array.from(state.activeDots).forEach(function (number) {
      releaseDot(number, { skipStatePublish: true });
    });

    state.kbHeld.clear();
    state.wasKbChording = false;
    publishState();
  }

  function cancelKeyboardChord() {
    if (state.kbHeld.size === 0 && !state.wasKbChording) {
      return;
    }

    state.kbHeld.forEach(function releaseHeldDot(number) {
      releaseDot(number, { skipStatePublish: true });
    });
    state.kbHeld.clear();
    state.wasKbChording = false;
    publishState();
  }

  function publishState() {
    const dots = Array.from(state.activeDots).sort((a, b) => a - b);
    const chord = dots.join("");
    const letter = BRAILLE_MAP[chord];

    onStateChange({
      dots,
      letter: letter || (dots.length ? "?" : EMPTY_DISPLAY),
      typed: state.typed,
    });
  }

  function bindKeyboardEvents() {
    listen(window, "keydown", handleKeydown);
    listen(window, "keyup", handleKeyup);
    listen(window, "blur", handleWindowBlur);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isInteractiveContext(event) || event.repeat) {
      return;
    }

    const key = normaliseKeyboardKey(event);

    if (handleDotKeydown(key, event)) {
      return;
    }

    if (handleSideKeydown(key, event)) {
      return;
    }

    handleCommandKeydown(key, event);
  }

  function handleKeyup(event: KeyboardEvent) {
    const key = normaliseKeyboardKey(event);

    if (isInteractiveContext(event)) {
      const dot = state.keyToDot[key];
      if (dot !== undefined && state.kbHeld.has(dot)) {
        cancelKeyboardChord();
      }

      const side = getSideForKey(state.sideKeys, key);
      if (side && state.sidePressed[side]) {
        releaseSide(side, false);
      }

      return;
    }

    if (handleDotKeyup(key)) {
      return;
    }

    handleSideKeyup(key);
  }

  function handleWindowBlur() {
    clearChord();
    releaseSide("left", false);
    releaseSide("right", false);
  }

  function handleDotKeydown(key: string, event: KeyboardEvent) {
    const dot = state.keyToDot[key];
    if (dot === undefined) {
      return false;
    }

    if (!state.kbHeld.has(dot)) {
      state.kbHeld.add(dot);
      state.wasKbChording = true;
      pressDot(dot);
    }

    event.preventDefault();
    return true;
  }

  function handleDotKeyup(key: string) {
    const dot = state.keyToDot[key];
    if (dot === undefined) {
      return false;
    }

    state.kbHeld.delete(dot);

    if (state.kbHeld.size === 0 && state.wasKbChording) {
      state.wasKbChording = false;
      commitChord();
    }

    return true;
  }

  function handleSideKeydown(key: string, event: KeyboardEvent) {
    const side = getSideForKey(state.sideKeys, key);
    if (!side) {
      return false;
    }

    pressSide(side);
    event.preventDefault();
    return true;
  }

  function handleSideKeyup(key: string) {
    const side = getSideForKey(state.sideKeys, key);
    if (!side) {
      return false;
    }

    releaseSide(side, true);
    return true;
  }

  function handleCommandKeydown(key: string, event: KeyboardEvent) {
    if (key === " ") {
      if (state.activeDots.size > 0) {
        commitChord();
      } else {
        appendSpace();
      }
      event.preventDefault();
      return;
    }

    if (key === "Escape") {
      clearChord();
      event.preventDefault();
      return;
    }

    if (key === "Backspace") {
      backspace();
      event.preventDefault();
    }
  }

  function bindPointerEvents() {
    listen(canvas, "pointerdown", handlePointerDown);
    listen(canvas, "pointermove", handlePointerMove);
    listen(canvas, "pointerup", handlePointerUp);
    listen(canvas, "pointercancel", handlePointerCancel);
    listen(canvas, "pointerleave", handlePointerLeave);
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    pointerSession.id = event.pointerId;
    pointerSession.moved = false;
    pointerSession.startX = event.clientX;
    pointerSession.startY = event.clientY;
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerSession.id === event.pointerId) {
      const deltaX = event.clientX - pointerSession.startX;
      const deltaY = event.clientY - pointerSession.startY;
      pointerSession.moved =
        pointerSession.moved ||
        Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD;
    }

    if (event.buttons !== 0) {
      canvas.classList.remove("hit");
      return;
    }

    const object = pickAtEvent(event);
    canvas.classList.toggle("hit", Boolean(object));
  }

  function handlePointerUp(event: PointerEvent) {
    const isTrackedPointer = pointerSession.id === event.pointerId;
    const shouldActivate = isTrackedPointer && !pointerSession.moved && event.button === 0;

    resetPointerSession();
    canvas.classList.remove("hit");

    if (!shouldActivate) {
      return;
    }

    const object = pickAtEvent(event);
    if (!object) {
      return;
    }

    if (object.userData.kind === "dot") {
      toggleDot(object.userData.number);
      event.stopPropagation();
      return;
    }

    const side = getSideFromObject(object);
    if (!side) {
      return;
    }

    pressSide(side);
    sideHoldTimers[side] = window.setTimeout(function releasePointerSide() {
      releaseSide(side, true);
    }, SIDE_HOLD_MS);
    event.stopPropagation();
  }

  function handlePointerCancel() {
    resetPointerSession();
    canvas.classList.remove("hit");
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.buttons === 0) {
      canvas.classList.remove("hit");
    }
  }

  function pickAtEvent(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    return device.pickObject(raycaster, sceneController.camera, pointer);
  }

  function resetPointerSession() {
    pointerSession.id = null;
    pointerSession.moved = false;
    pointerSession.startX = 0;
    pointerSession.startY = 0;
  }

  function clearSideHoldTimer(side: Side) {
    if (sideHoldTimers[side] === null) {
      return;
    }

    window.clearTimeout(sideHoldTimers[side]);
    sideHoldTimers[side] = null;
  }
}

function formatUnknownChord(chord: string) {
  return "[" + chord.split("").join(",") + "]";
}

function getSideFromObject(object: THREE.Object3D): Side | null {
  if (object.userData.kind === "side-left") {
    return "left";
  }

  if (object.userData.kind === "side-right") {
    return "right";
  }

  return null;
}

function normaliseKeyboardKey(event: KeyboardEvent) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function getSideForKey(sideKeys: Record<Side, string>, key: string): Side | null {
  return sideKeys.left === key ? "left" : sideKeys.right === key ? "right" : null;
}

function isInteractiveContext(event: KeyboardEvent) {
  return isInteractiveElement(document.activeElement) || isInteractiveElement(event.target);
}

function isInteractiveElement(element: EventTarget | null) {
  return element instanceof HTMLElement && (
    element.isContentEditable ||
    element.matches("a[href], button, input, select, textarea, [role=button], [role=link]")
  );
}
