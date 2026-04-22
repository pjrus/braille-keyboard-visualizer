import { THREE } from "../deps.js";
import {
  CELL_GAP,
  CELL_HEIGHT,
  CELL_WIDTH,
  KEY_RISE_MAX,
  LETTER_TO_DOTS,
  PRESS_DEPTH,
} from "../config.js";
import { disposeGroup } from "../utils.js";
import { buildCell } from "./cell.js";
import {
  animateMeshY,
  buildInteractiveTargets,
  buildSideButtons,
  getTiltAngle,
} from "./layout.js";
import { createDeviceMaterials } from "./materials.js";
import { buildIntegratedBody } from "./integratedBody.js";
import { createModeLayout } from "./modes.js";
import { buildTriangularBody } from "./triangularBody.js";

const SIDE_BUTTON_PRESS_DEPTH = 0.05;

export function createDeviceController({ root, state }) {
  const materials = createDeviceMaterials();
  let built = null;

  return {
    applyIndent,
    applyOverlays,
    buildDevice,
    pickObject,
    restoreSideVisuals,
    setDotPressed,
    updateAnimations,
  };

  function buildDevice() {
    disposeGroup(root);

    const metrics = getDeviceMetrics(state);
    const modeLayout = createModeLayout(state.mode, metrics);
    const deck = new THREE.Group();
    deck.add(buildBody(state, metrics, materials));

    const controlSurface = buildControlSurface(modeLayout);
    deck.add(controlSurface);

    const cellsGroup = buildCellsGroup(metrics, state, materials, modeLayout);
    controlSurface.add(cellsGroup);

    const sideButtons = buildSideButtons({
      bodyDepth: metrics.bodyDepth,
      bodyWidth: metrics.bodyWidth,
      mode: state.mode,
      parent: controlSurface,
      materials,
      showSides: state.showSides,
      modeLayout,
    });

    const pivot = buildPivot(deck, metrics.bodyDepth, state);
    root.add(pivot);

    built = {
      cellsGroup,
      interactiveTargets: buildInteractiveTargets(cellsGroup, sideButtons),
      metrics,
      modeLayout,
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
    const dotBaseOffset = built.modeLayout.dotBaseOffset;

    forEachDot(function (dot) {
      dot.userData.baseY = dotBaseOffset + rise;
      dot.userData.targetY = getDotTargetY(dot.userData.baseY, dot.userData.pressed);
      dot.scale.y = scaleY;

      if (dot.userData.cap) {
        dot.userData.cap.visible = showCap;
      }
    });

    built.sideButtons.forEach(function (button) {
      const indentFactor = built.modeLayout.sideIndentFactor;
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
  const sidePadding = state.showSides ? 1.1 : 0.45;
  const modeLayout = createModeLayout(state.mode, {});

  return {
    bodyDepth: modeLayout.bodyDepth,
    bodyHeight: modeLayout.bodyHeight,
    bodyWidth: cellsWidth + sidePadding * 2 + 0.3,
    cellsWidth,
    originX: -cellsWidth / 2 + CELL_WIDTH / 2,
    pitch,
  };
}

function buildControlSurface(modeLayout) {
  const controlSurface = new THREE.Group();
  controlSurface.position.y = modeLayout.controlSurfacePositionY;
  controlSurface.rotation.x = modeLayout.controlSurfaceRotationX;
  return controlSurface;
}

function buildBody(state, metrics, materials) {
  if (state.mode === "triangular") {
    return buildTriangularBody(metrics, materials);
  }

  return buildIntegratedBody(metrics, materials);
}

function buildCellsGroup(metrics, state, materials, modeLayout) {
  const cellsGroup = new THREE.Group();

  for (let index = 0; index < state.cells; index += 1) {
    const centreX = metrics.originX + index * metrics.pitch;
    const cell = buildCell(index, state.keyDia, materials, {
      baseOffset: modeLayout.dotBaseOffset,
      rotationX: modeLayout.dotRotationX,
    });
    cell.position.set(centreX, 0, 0);
    cellsGroup.add(cell);
  }

  return cellsGroup;
}

function buildPivot(deck, bodyDepth, state) {
  const tiltAngle = getTiltAngle(state.mode, state.angleDeg);
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
