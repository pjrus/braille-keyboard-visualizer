import { disposeGroup } from "@/lib/scene/utils";
import type { RuntimeState } from "@/lib/types";
import type { DeviceMaterials, DeviceMetrics, DotMesh } from "@/lib/types/device";
import * as THREE from "three";
import { DOT_SPACING, KEY_RISE_MAX, LETTER_TO_DOTS, PRESS_DEPTH } from "../config";
import { animateMeshY, buildInteractiveTargets, buildSideButtons } from "./layout";
import { createDeviceMaterials } from "./materials";
import { ARC_HALF_GAP_X } from "./modes/arcMode";
import type { DeviceMode } from "./modes/deviceMode";
import { createDeviceMode } from "./modes/registry";

const SIDE_BUTTON_PRESS_DEPTH = 0.05;

export function createDeviceController({ root, state }: { root: THREE.Group; state: RuntimeState }) {
  const materials = createDeviceMaterials();
  const bounds = new THREE.Box3();
  const focusTarget = new THREE.Vector3();
  let built:
    | { cell: THREE.Group; interactiveTargets: THREE.Object3D[]; mode: DeviceMode; sideButtons: THREE.Mesh[] }
    | null = null;

  return {
    applyIndent,
    applyOverlays,
    buildDevice,
    dispose,
    getFocusTarget,
    pickObject,
    restoreSideVisuals,
    setDotPressed,
    updateAnimations,
  };

  function dispose() {
    // Mesh disposal owns geometries; these controller-scoped materials are released separately.
    disposeGroup(root);
    Object.values(materials).forEach(function(material) {
      material.dispose();
    });
    built = null;
  }

  function buildDevice() {
    // Geometry-affecting settings are applied together here so hit targets and meshes stay aligned.
    disposeGroup(root);

    // Metrics feed both body construction and mode placement, keeping layout and hit geometry in sync.
    const metrics = getDeviceMetrics(state);
    const mode = createDeviceMode(state.mode, metrics);
    const deck = new THREE.Group();
    deck.add(mode.buildBody(materials));

    const controlSurface = mode.createControlSurface();
    deck.add(controlSurface);

    const cell = mode.buildCell(state, materials);
    controlSurface.add(cell);

    const sideButtons = buildSideButtons({
      bodyDepth: metrics.bodyDepth,
      bodyWidth: metrics.bodyWidth,
      mode,
      parent: controlSurface,
      materials,
      showSides: state.showSides,
      sideActions: state.sideActions,
    });

    const pivot = buildPivot(deck, metrics.bodyDepth, mode, state.angleDeg);
    root.add(pivot);

    built = {
      cell,
      interactiveTargets: buildInteractiveTargets(cell, sideButtons),
      mode,
      sideButtons,
    };

    syncBuiltDevice();
  }

  function applyIndent() {
    if (!built) {
      return;
    }

    // One indent value raises or recesses the dots and side-button mounts together.
    const rise = state.indent * KEY_RISE_MAX;
    const scaleY = getDotScaleY(state.indent);
    // Hide the dome once a recessed key is flattened enough that the cap would look raised.
    const showCap = state.indent >= -0.2;
    const dotBaseOffset = built.mode.layout.dotBaseOffset;

    forEachDot(function(dot) {
      dot.userData.baseY = dotBaseOffset + rise;
      dot.userData.targetY = getDotTargetY(dot.userData.baseY, dot.userData.pressed);
      dot.scale.y = scaleY;

      if (dot.userData.cap) {
        dot.userData.cap.visible = showCap;
      }
    });

    const indentFactor = built.mode.layout.sideIndentFactor;
    built.sideButtons.forEach(function(button) {
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

    // Overlay toggles reuse current sprites; a rebuild restores their visibility from state.
    setCellOverlayVisibility(built.cell, state);

    refreshAllDots();
  }

  function updateAnimations() {
    if (!built) {
      return;
    }

    // Targets are derived from state immediately; this frame loop only eases meshes toward them.
    forEachDot(function(dot) {
      animateMeshY(dot, 0.28);
    });

    built.sideButtons.forEach(function(button) {
      animateMeshY(button, 0.32);
    });
  }

  function setDotPressed(number: number, pressed: boolean) {
    if (!built) {
      return;
    }

    const dot = (built.cell.userData.dots as DotMesh[]).find(function(candidate) {
      return candidate.userData.number === number;
    });
    if (!dot) return;
    syncDotPressState(dot, pressed);
    refreshDot(dot);
  }

  function restoreSideVisuals(snapToTarget = false) {
    if (!built) {
      return;
    }

    built.sideButtons.forEach(function(button) {
      const side = button.userData.kind === "side-left" ? "left" : "right";
      syncSideButton(button, state.sidePressed[side], materials, snapToTarget);
    });
  }

  function pickObject(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2) {
    if (!built) {
      return null;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(built.interactiveTargets, false);
    if (hits.length === 0) {
      return null;
    }

    // Intersections may land on a child cap; climb to the nearest object carrying interaction metadata.
    let object: THREE.Object3D | null = hits[0].object;
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
    // New meshes inherit live chord, overlay and side-button state rather than resetting the session.
    applyIndent();
    restoreDotVisuals(true);
    applyOverlays();
    restoreSideVisuals(true);
  }

  function restoreDotVisuals(snapToTarget: boolean) {
    if (!built) {
      return;
    }

    forEachDot(function(dot) {
      // Rebuilt meshes must recover their pressed state from the shared runtime state.
      const pressed = state.activeDots.has(dot.userData.number);
      syncDotPressState(dot, pressed);

      if (snapToTarget) {
        dot.position.y = dot.userData.targetY;
      }

      refreshDot(dot);
    });
  }

  function refreshAllDots() {
    if (!built) {
      return;
    }

    forEachDot(refreshDot);
  }

  function refreshDot(dot: DotMesh) {
    const material = getDotMaterial(dot, materials, state);
    dot.material = material;

    if (dot.userData.cap) {
      dot.userData.cap.material = material;
    }
  }

  function forEachDot(callback: (dot: DotMesh) => void) {
    if (built) {
      (built.cell.userData.dots as DotMesh[]).forEach(callback);
    }
  }
}

function getDeviceMetrics(state: RuntimeState): DeviceMetrics {
  const sidePadding = getSidePadding(state);
  // Read the mode's depth and height first; buildDevice then supplies the computed body width.
  const mode = createDeviceMode(state.mode, {});

  return {
    bodyDepth: mode.layout.bodyDepth,
    bodyHeight: mode.layout.bodyHeight,
    bodyWidth: DOT_SPACING + sidePadding * 2 + 0.3,
  };
}

function getSidePadding(state: RuntimeState) {
  if (state.mode === "chameleon") {
    // Its single row spans wider than the standard cell, even when the action pads are hidden.
    return 1.55;
  }

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

function buildPivot(deck: THREE.Group, bodyDepth: number, mode: DeviceMode, angleDeg: number) {
  const tiltAngle = mode.getTiltAngle(angleDeg);
  const pivot = new THREE.Group();
  const frontZ = bodyDepth / 2;

  // Rotate around the front edge rather than the deck centre to model a hinged keyboard.
  deck.position.z = -frontZ;
  pivot.position.set(0, 0, frontZ);
  pivot.add(deck);
  pivot.rotation.x = -tiltAngle;

  return pivot;
}

function setCellOverlayVisibility(cell: THREE.Group, state: RuntimeState) {
  (cell.userData.labels as THREE.Sprite[]).forEach(function(label) {
    label.visible = state.showNumbers;
  });

  if (cell.userData.letterLabel) {
    cell.userData.letterLabel.visible = state.showLetters;
  }
}

function syncDotPressState(dot: DotMesh, pressed: boolean) {
  dot.userData.pressed = pressed;
  dot.userData.targetY = getDotTargetY(dot.userData.baseY, pressed);
}

function getDotTargetY(baseY: number, pressed: boolean) {
  return pressed ? baseY - PRESS_DEPTH : baseY;
}

function getDotScaleY(indent: number) {
  // Negative indent flattens key bodies; the floor guards against extreme values.
  const flatten = indent < 0 ? 1 + indent * 0.4 : 1;
  return Math.max(0.4, flatten);
}

function getDotMaterial(dot: DotMesh, materials: DeviceMaterials, state: RuntimeState) {
  if (dot.userData.pressed) {
    return materials.keyActive;
  }

  if (!state.showLetters) {
    return materials.key;
  }

  // Letter labels also preview the A chord; actual pressed dots remain active independently.
  return LETTER_TO_DOTS.A.includes(dot.userData.number) ? materials.keyActive : materials.key;
}

function syncSideButton(button: THREE.Mesh, pressed: boolean, materials: DeviceMaterials, snapToTarget: boolean) {
  button.userData.pressed = pressed;
  button.userData.targetY = pressed
    ? button.userData.baseY - SIDE_BUTTON_PRESS_DEPTH
    : button.userData.baseY;
  button.material = pressed ? materials.sideButtonActive : materials.sideButton;

  if (snapToTarget) {
    button.position.y = button.userData.targetY;
  }
}
