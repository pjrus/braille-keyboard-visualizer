import { BRAILLE_MAP } from "@/lib/config";
import type { createDeviceController } from "@/lib/device/controller";
import type { HudState, RuntimeState, Side } from "@/lib/types";
import * as THREE from "three";
import type { createScene } from "./scene";

const EMPTY_DISPLAY = "—";
const SIDE_HOLD_MS = 180;
const TAP_MOVE_THRESHOLD = 8;

export function createInteractionController({
  canvas,
  device,
  sceneController,
  state,
  onStateChange,
}: {
  canvas: HTMLCanvasElement;
  device: ReturnType<typeof createDeviceController>;
  sceneController: ReturnType<typeof createScene>;
  state: RuntimeState;
  onStateChange: (state: HudState) => void;
}) {
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
    // The controller owns global keyboard and canvas listeners plus pending pointer actions.
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
    // A pointer click toggles chord membership; unlike a keyboard press, it has no keyup.
    if (state.activeDots.has(number)) {
      releaseDot(number);
      return;
    }

    pressDot(number);
  }

  function setDotActive(number: number, pressed: boolean, options?: { skipStatePublish?: boolean }) {
    // kbHeld tracks physical key releases; activeDots is the visible chord and can also contain
    // pointer-toggled dots. A click therefore does not become a key awaiting keyup.
    const shouldPublish = !(options && options.skipStatePublish);
    const isActive = state.activeDots.has(number);

    // Ignore duplicate transitions (for example repeated keydown) so mesh animation and
    // HUD updates occur only when the chord membership actually changes.
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
    // Keyboard and pointer presses share one visual state; a fresh press supersedes an old timer.
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

    triggerSideAction(side);
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

    // Unknown combinations remain visible in the typed output instead of disappearing.
    state.typed += BRAILLE_MAP[chord] || formatUnknownChord(chord);
    clearChord();
  }

  function clearChord() {
    // Release meshes quietly, then publish once after the full reset to avoid partial HUD states.
    Array.from(state.activeDots).forEach(function(number) {
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

    // A keyup delivered while a control has focus cancels keyboard-held dots without committing.
    // Pointer-only dots remain active; dots shared with the keyboard press are released with it.
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
    // Do not steal control input; repeatKeyboardActions also opts into browser key-repeat events.
    if (isInteractiveContext(event) || (event.repeat && !state.repeatKeyboardActions)) {
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
    // Browsers may omit keyup on blur; clear the chord and side visuals without firing actions.
    clearChord();
    releaseSide("left", false);
    releaseSide("right", false);
  }

  function handleDotKeydown(key: string, event: KeyboardEvent) {
    const dot = state.keyToDot[key];
    if (dot === undefined) {
      return false;
    }

    // Track physical presses separately from activeDots so overlapping keys form one chord,
    // and auto-repeat cannot create duplicate presses.
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
      // A keyboard chord commits only after the final mapped key is released.
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
    if (state.repeatKeyboardActions) {
      // In repeat mode, each repeated keydown acts immediately; otherwise the action waits for keyup.
      triggerSideAction(side);
    }
    event.preventDefault();
    return true;
  }

  function handleSideKeyup(key: string) {
    const side = getSideForKey(state.sideKeys, key);
    if (!side) {
      return false;
    }

    releaseSide(side, !state.repeatKeyboardActions);
    return true;
  }

  function triggerSideAction(side: Side) {
    if (side === "left") {
      backspace();
      return;
    }

    appendSpace();
  }

  function handleCommandKeydown(key: string, event: KeyboardEvent) {
    if (key === " ") {
      // Space commits an in-progress chord, but inserts whitespace when no dots are active.
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

    // Keep one primary-button gesture candidate; OrbitControls still handles the drag itself.
    pointerSession.id = event.pointerId;
    pointerSession.moved = false;
    pointerSession.startX = event.clientX;
    pointerSession.startY = event.clientY;
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerSession.id === event.pointerId) {
      const deltaX = event.clientX - pointerSession.startX;
      const deltaY = event.clientY - pointerSession.startY;
      // Ignore small hand jitter so a short tap still activates a mesh after pointer movement.
      pointerSession.moved = pointerSession.moved
        || Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD;
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
    // Treat only a short primary-button gesture as a pick so orbit drags cannot toggle keys.
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
    // A side-button tap is delayed briefly so a quick gesture fires once while the pressed
    // visual remains visible; disposal or another press clears the pending action.
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
    element.isContentEditable
    || element.matches("a[href], button, input, select, textarea, [role=button], [role=link]")
  );
}
