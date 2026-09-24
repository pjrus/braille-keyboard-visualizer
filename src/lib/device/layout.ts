import { extrudedSlab, makeTextSprite, roundedRectShape } from "@/lib/scene/utils";
import type { DeviceMaterials } from "@/lib/types/device";
import * as THREE from "three";
import type { DeviceMode } from "./mode";

export function buildSideButtons(
  options: {
    bodyDepth: number;
    bodyWidth: number;
    materials: DeviceMaterials;
    mode: DeviceMode;
    parent: THREE.Group;
    showSides: boolean;
  },
) {
  const { bodyDepth, bodyWidth, materials, mode, parent, showSides } = options;
  const sideButtons: THREE.Mesh[] = [];

  if (!showSides) {
    return sideButtons;
  }

  [-1, 1].forEach(function(direction) {
    const spec = mode.getSideButtonSpec(direction, bodyWidth, bodyDepth);
    const sideShape = roundedRectShape(
      spec.width,
      spec.depth,
      Math.min(spec.width, spec.depth) / 2,
    );
    const sideGeometry = extrudedSlab(sideShape, spec.height, 0.025);
    const button = new THREE.Mesh(sideGeometry.clone(), materials.sideButton);
    button.castShadow = true;
    button.receiveShadow = true;
    button.rotation.x = spec.rotationX;
    button.position.set(spec.offsetX, spec.baseY, spec.offsetZ);
    button.userData = {
      baseY: spec.baseY,
      kind: direction === -1 ? "side-left" : "side-right",
      mountBaseY: spec.baseY,
      pressed: false,
      targetY: spec.baseY,
    };

    if (spec.label) {
      const label = makeTextSprite(spec.label, {
        background: "#262b34",
        color: "#ffffff",
        font: "700 40px Arial, sans-serif",
      });
      label.scale.multiplyScalar(0.55);
      label.position.y = spec.height * 2 + 0.015;
      button.add(label);
    }

    parent.add(button);
    sideButtons.push(button);
  });

  return sideButtons;
}

export function buildInteractiveTargets(cell: THREE.Group, sideButtons: THREE.Mesh[]) {
  const targets: THREE.Object3D[] = [];

  cell.traverse(function(object) {
    if (object instanceof THREE.Mesh) {
      targets.push(object);
    }
  });

  sideButtons.forEach(function(button) {
    targets.push(button);
  });

  return targets;
}

export function animateMeshY(mesh: THREE.Mesh, speed: number) {
  if (typeof mesh.userData.targetY !== "number") {
    return;
  }

  mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, mesh.userData.targetY, speed);
  if (Math.abs(mesh.position.y - mesh.userData.targetY) < 0.0005) {
    mesh.position.y = mesh.userData.targetY;
  }
}
