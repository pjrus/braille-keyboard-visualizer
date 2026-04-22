import { THREE } from "./deps.js";
import { BRAILLE_MAP } from "./config.js";
import { sortNumeric } from "./utils.js";

const EMPTY_DISPLAY = "—";
const TYPED_PLACEHOLDER = "\u00A0";
const SIDE_HOLD_MS = 180;
const HUD_FLASH_MS = 650;
const TAP_MOVE_THRESHOLD = 8;
const SIDE_KEY_TO_NAME = Object.freeze({
  a: "left",
  ";": "right",
});

export function createInteractionController({ device, dom, sceneController, state }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const sideHoldTimers = { left: null, right: null };
  const pointerSession = {
    id: null,
    moved: false,
    startX: 0,
    startY: 0,
  };

  bindKeyboardEvents();
  bindPointerEvents();

  return {
    appendSpace,
    backspace,
    clearChord,
    commitChord,
    pressDot,
    releaseDot,
    toggleDot,
    updateHUD,
  };

  function pressDot(number, options) {
    return setDotActive(number, true, options);
  }

  function releaseDot(number, options) {
    return setDotActive(number, false, options);
  }

  function toggleDot(number) {
    if (state.activeDots.has(number)) {
      releaseDot(number);
      return;
    }

    pressDot(number);
  }

  function setDotActive(number, pressed, options) {
    const shouldUpdateHud = !(options && options.skipHudUpdate);
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

    if (shouldUpdateHud) {
      updateHUD();
    }

    return true;
  }

  function pressSide(side) {
    clearSideHoldTimer(side);
    state.sidePressed[side] = true;
    device.restoreSideVisuals();
  }

  function releaseSide(side, shouldTriggerAction) {
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
    updateHUD();
  }

  function appendSpace() {
    state.typed += " ";
    updateHUD();
  }

  function activeChordString() {
    return Array.from(state.activeDots).sort(sortNumeric).join("");
  }

  function commitChord() {
    const chord = activeChordString();
    if (!chord) {
      return;
    }

    state.typed += BRAILLE_MAP[chord] || formatUnknownChord(chord);
    clearChord();
    flashHUD(dom.typedDisplay);
  }

  function clearChord() {
    Array.from(state.activeDots).forEach(function (number) {
      releaseDot(number, { skipHudUpdate: true });
    });

    state.kbHeld.clear();
    state.wasKbChording = false;
    updateHUD();
  }

  function updateHUD() {
    const sortedDots = Array.from(state.activeDots).sort(sortNumeric);
    const chord = sortedDots.join("");
    const letter = BRAILLE_MAP[chord];

    dom.chordDisplay.textContent = sortedDots.length ? sortedDots.join(",") : EMPTY_DISPLAY;
    dom.letterDisplay.textContent = letter || (sortedDots.length ? "?" : EMPTY_DISPLAY);
    dom.typedDisplay.textContent = state.typed || TYPED_PLACEHOLDER;
  }

  function bindKeyboardEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("blur", handleWindowBlur);
  }

  function handleKeydown(event) {
    if (isTypingContext() || event.repeat) {
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

  function handleKeyup(event) {
    const key = normaliseKeyboardKey(event);

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

  function handleDotKeydown(key, event) {
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

  function handleDotKeyup(key) {
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

  function handleSideKeydown(key, event) {
    const side = SIDE_KEY_TO_NAME[key];
    if (!side) {
      return false;
    }

    pressSide(side);
    event.preventDefault();
    return true;
  }

  function handleSideKeyup(key) {
    const side = SIDE_KEY_TO_NAME[key];
    if (!side) {
      return false;
    }

    releaseSide(side, true);
    return true;
  }

  function handleCommandKeydown(key, event) {
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
    sceneController.canvas.addEventListener("pointerdown", handlePointerDown);
    sceneController.canvas.addEventListener("pointermove", handlePointerMove);
    sceneController.canvas.addEventListener("pointerup", handlePointerUp);
    sceneController.canvas.addEventListener("pointercancel", handlePointerCancel);
    sceneController.canvas.addEventListener("pointerleave", handlePointerLeave);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    pointerSession.id = event.pointerId;
    pointerSession.moved = false;
    pointerSession.startX = event.clientX;
    pointerSession.startY = event.clientY;
  }

  function handlePointerMove(event) {
    if (pointerSession.id === event.pointerId) {
      const deltaX = event.clientX - pointerSession.startX;
      const deltaY = event.clientY - pointerSession.startY;
      pointerSession.moved =
        pointerSession.moved ||
        Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD;
    }

    if (event.buttons !== 0) {
      sceneController.canvas.classList.remove("hit");
      return;
    }

    const object = pickAtEvent(event);
    sceneController.canvas.classList.toggle("hit", Boolean(object));
  }

  function handlePointerUp(event) {
    const isTrackedPointer = pointerSession.id === event.pointerId;
    const shouldActivate = isTrackedPointer && !pointerSession.moved && event.button === 0;

    resetPointerSession();
    sceneController.canvas.classList.remove("hit");

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
    sideHoldTimers[side] = window.setTimeout(function () {
      releaseSide(side, true);
    }, SIDE_HOLD_MS);
    event.stopPropagation();
  }

  function handlePointerCancel() {
    resetPointerSession();
    sceneController.canvas.classList.remove("hit");
  }

  function handlePointerLeave(event) {
    if (event.buttons !== 0) {
      return;
    }

    sceneController.canvas.classList.remove("hit");
  }

  function pickAtEvent(event) {
    const bounds = sceneController.canvas.getBoundingClientRect();
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

  function clearSideHoldTimer(side) {
    if (sideHoldTimers[side] === null) {
      return;
    }

    window.clearTimeout(sideHoldTimers[side]);
    sideHoldTimers[side] = null;
  }
}

function flashHUD(element) {
  if (!element) {
    return;
  }

  element.classList.remove("flash");
  void element.offsetWidth;
  element.classList.add("flash");

  window.setTimeout(function () {
    element.classList.remove("flash");
  }, HUD_FLASH_MS);
}

function formatUnknownChord(chord) {
  return "[" + chord.split("").join(",") + "]";
}

function getSideFromObject(object) {
  if (object.userData.kind === "side-left") {
    return "left";
  }

  if (object.userData.kind === "side-right") {
    return "right";
  }

  return "";
}

function normaliseKeyboardKey(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function isTypingContext() {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return false;
  }

  const tagName = activeElement.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    activeElement.isContentEditable
  );
}
