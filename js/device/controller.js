import { THREE } from "../deps.js";
import {
  CELL_GAP,
  CELL_WIDTH,
  KEY_RISE_MAX,
  LETTER_TO_DOTS,
  PRESS_DEPTH,
} from "../config.js";
import { disposeGroup } from "../utils.js";
import {
  animateMeshY,
  buildInteractiveTargets,
  buildSideButtons,
} from "./layout.js";
import { createDeviceMaterials } from "./materials.js";
import { ARC_HALF_GAP_X } from "./arcMode.js";
import { createDeviceMode } from "./modes.js";

const SIDE_BUTTON_PRESS_DEPTH = 0.05;

export function createDeviceController({ root, state }) {
  const materials = createDeviceMaterials();
  const bounds = new THREE.Box3();
  const focusTarget = new THREE.Vector3();
  let built = null;

  return {
    applyIndent,
    applyOverlays,
    buildDevice,
    getFocusTarget,
    pickObject,
    restoreSideVisuals,
    setDotPressed,
    updateAnimations,
  };

  function buildDevice() {
    disposeGroup(root);

    const metrics = getDeviceMetrics(state);
    const mode = createDeviceMode(state.mode, metrics);
    const deck = new THREE.Group();
    deck.add(mode.buildBody(materials));

    const controlSurface = mode.createControlSurface();
    deck.add(controlSurface);

    const cellsGroup = buildCellsGroup(metrics, state, materials, mode);
    controlSurface.add(cellsGroup);

    const sideButtons = buildSideButtons({
      bodyDepth: metrics.bodyDepth,
      bodyWidth: metrics.bodyWidth,
      mode,
      parent: controlSurface,
      materials,
      showSides: state.showSides,
    });

    const pivot = buildPivot(deck, metrics.bodyDepth, mode, state.angleDeg);
    root.add(pivot);

    built = {
      cellsGroup,
      interactiveTargets: buildInteractiveTargets(cellsGroup, sideButtons),
      metrics,
      mode,
      sideButtons,
    };

    syncBuiltDevice();
  }

  function applyIndent() {
    if (!built) {
      return;
    }

    const rise = state.indent * KEY_RISE_MAX;
    const scaleY = getDotScaleY(state.indent);
    const showCap = state.indent >= -0.2;
    const dotBaseOffset = built.mode.layout.dotBaseOffset;

    forEachDot(function (dot) {
      dot.userData.baseY = dotBaseOffset + rise;
      dot.userData.targetY = getDotTargetY(dot.userData.baseY, dot.userData.pressed);
      dot.scale.y = scaleY;

      if (dot.userData.cap) {
        dot.userData.cap.visible = showCap;
      }
    });

    built.sideButtons.forEach(function (button) {
      const indentFactor = built.mode.layout.sideIndentFactor;
      button.userData.baseY = button.userData.mountBaseY + rise * indentFactor;
      button.userData.targetY = button.userData.pressed
        ? button.userData.baseY - SIDE_BUTTON_PRESS_DEPTH
        : button.userData.baseY;
    });
  }

  function applyOverlays() {
    if (!built) {
      return;
    }

    forEachCell(function (cell) {
      setCellOverlayVisibility(cell, state);
    });

    refreshAllDots();
  }

  function updateAnimations() {
    if (!built) {
      return;
    }

    forEachDot(function (dot) {
      animateMeshY(dot, 0.28);
    });

    built.sideButtons.forEach(function (button) {
      animateMeshY(button, 0.32);
    });
  }

  function setDotPressed(number, pressed) {
    if (!built) {
      return;
    }

    forEachDotWithNumber(number, function (dot, cell) {
      syncDotPressState(dot, pressed);
      refreshDot(dot, cell);
    });
  }

  function restoreSideVisuals(snapToTarget) {
    if (!built) {
      return;
    }

    built.sideButtons.forEach(function (button) {
      const side = button.userData.kind === "side-left" ? "left" : "right";
      syncSideButton(button, state.sidePressed[side], materials, snapToTarget);
    });
  }

  function pickObject(raycaster, camera, pointer) {
    if (!built) {
      return null;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(built.interactiveTargets, false);
    if (hits.length === 0) {
      return null;
    }

    let object = hits[0].object;
    while (object && !(object.userData && object.userData.kind)) {
      object = object.parent;
    }

    return object && object.userData && object.userData.kind ? object : null;
  }

  function getFocusTarget() {
    if (!built) {
      return new THREE.Vector3();
    }

    root.updateWorldMatrix(true, true);
    bounds.setFromObject(root);

    if (bounds.isEmpty()) {
      return new THREE.Vector3();
    }

    bounds.getCenter(focusTarget);
    return focusTarget.clone();
  }

  function syncBuiltDevice() {
    applyIndent();
    restoreDotVisuals(true);
    applyOverlays();
    restoreSideVisuals(true);
  }

  function restoreDotVisuals(snapToTarget) {
    if (!built) {
      return;
    }

    forEachDot(function (dot, cell) {
      const pressed = state.activeDots.has(dot.userData.number);
      syncDotPressState(dot, pressed);

      if (snapToTarget) {
        dot.position.y = dot.userData.targetY;
      }

      refreshDot(dot, cell);
    });
  }

  function refreshAllDots() {
    if (!built) {
      return;
    }

    forEachDot(function (dot, cell) {
      refreshDot(dot, cell);
    });
  }

  function refreshDot(dot, cell) {
    const material = getDotMaterial(dot, cell, materials, state);
    dot.material = material;

    if (dot.userData.cap) {
      dot.userData.cap.material = material;
    }
  }

  function forEachCell(callback) {
    built.cellsGroup.children.forEach(callback);
  }

  function forEachDot(callback) {
    forEachCell(function (cell) {
      cell.userData.dots.forEach(function (dot) {
        callback(dot, cell);
      });
    });
  }

  function forEachDotWithNumber(number, callback) {
    forEachDot(function (dot, cell) {
      if (dot.userData.number === number) {
        callback(dot, cell);
      }
    });
  }
}

function getDeviceMetrics(state) {
  const pitch = CELL_WIDTH + CELL_GAP;
  const cellsWidth = pitch * (state.cells - 1) + CELL_WIDTH;
  const sidePadding = getSidePadding(state);
  const mode = createDeviceMode(state.mode, {});

  return {
    bodyDepth: mode.layout.bodyDepth,
    bodyHeight: mode.layout.bodyHeight,
    bodyWidth: cellsWidth + sidePadding * 2 + 0.3,
    cellsWidth,
    originX: -cellsWidth / 2 + CELL_WIDTH / 2,
    pitch,
  };
}

function buildCellsGroup(metrics, state, materials, mode) {
  const cellsGroup = new THREE.Group();

  for (let index = 0; index < state.cells; index += 1) {
    const cell = mode.buildCell(index, state, materials);
    const cellPosition = mode.getCellPosition(index);
    cell.position.set(cellPosition.x, cellPosition.y, cellPosition.z);
    cellsGroup.add(cell);
  }

  return cellsGroup;
}

function getSidePadding(state) {
  if (!state.showSides) {
    return 0.45;
  }

  if (state.mode === "arc") {
    // Increase this base value to make the arc body wider overall.
    const arcBodySidePadding = 1.31 + ARC_HALF_GAP_X;
    return arcBodySidePadding;
  }

  // Hable thumb pads are centred, so body width only needs to cover the finger keys.
  if (state.mode === "hable") {
    return 0.75;
  }

  return 1.1;
}

function buildPivot(deck, bodyDepth, mode, angleDeg) {
  const tiltAngle = mode.getTiltAngle(angleDeg);
  const pivot = new THREE.Group();
  const frontZ = bodyDepth / 2;

  deck.position.z = -frontZ;
  pivot.position.set(0, 0, frontZ);
  pivot.add(deck);
  pivot.rotation.x = -tiltAngle;

  return pivot;
}

function setCellOverlayVisibility(cell, state) {
  cell.userData.labels.forEach(function (label) {
    label.visible = state.showNumbers;
  });

  if (cell.userData.letterLabel) {
    cell.userData.letterLabel.visible = state.showLetters;
  }
}

function syncDotPressState(dot, pressed) {
  dot.userData.pressed = pressed;
  dot.userData.targetY = getDotTargetY(dot.userData.baseY, pressed);
}

function getDotTargetY(baseY, pressed) {
  return pressed ? baseY - PRESS_DEPTH : baseY;
}

function getDotScaleY(indent) {
  const flatten = indent < 0 ? 1 + indent * 0.4 : 1;
  return Math.max(0.4, flatten);
}

function getDotMaterial(dot, cell, materials, state) {
  if (dot.userData.pressed) {
    return materials.keyActive;
  }

  if (!state.showLetters) {
    return materials.key;
  }

  const activeDots = LETTER_TO_DOTS[cell.userData.letter] || [];
  return activeDots.includes(dot.userData.number) ? materials.keyActive : materials.key;
}

function syncSideButton(button, pressed, materials, snapToTarget) {
  button.userData.pressed = pressed;
  button.userData.targetY = pressed
    ? button.userData.baseY - SIDE_BUTTON_PRESS_DEPTH
    : button.userData.baseY;
  button.material = pressed ? materials.sideButtonActive : materials.sideButton;

  if (snapToTarget) {
    button.position.y = button.userData.targetY;
  }
}
