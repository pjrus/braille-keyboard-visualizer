import type { DeviceLayout, DeviceMaterials, DeviceMetrics, DotPosition, Offset, SideButtonSpec } from "@/types/device";
import type { SceneSettings } from "@/types";
import * as THREE from "three";
import { buildCell } from "./cell";

export abstract class DeviceMode {
  readonly metrics: Partial<DeviceMetrics>;
  readonly layout: DeviceLayout;
  constructor(metrics: Partial<DeviceMetrics>) {
    if (new.target === DeviceMode) {
      throw new Error("DeviceMode is abstract and cannot be instantiated directly.");
    }

    this.metrics = metrics;
    this.layout = this.createLayout();
  }

  createControlSurface() {
    const controlSurface = new THREE.Group();
    controlSurface.position.y = this.layout.controlSurfacePositionY;
    controlSurface.rotation.x = this.layout.controlSurfaceRotationX;
    return controlSurface;
  }

  buildCell(cellIndex: number, state: SceneSettings, materials: DeviceMaterials) {
    return buildCell(cellIndex, state.keyDia, materials, {
      baseOffset: this.layout.dotBaseOffset,
      getDotOffset: this.getDotOffset.bind(this),
      rotationX: this.layout.dotRotationX,
    });
  }

  abstract createLayout(): DeviceLayout;

  abstract buildBody(materials: DeviceMaterials): THREE.Mesh;

  getSideBaseY() {
    return this.layout.sideBaseOffset || 0;
  }

  getSideButtonSpec(direction: number, bodyWidth: number, bodyDepth: number): SideButtonSpec {
    const sideWidth = 0.34;
    const sideDepth = Math.min(bodyDepth * 0.62, 1.5);
    const offsetX = bodyWidth / 2 - sideWidth / 2 - 0.22;

    return {
      baseY: this.getSideBaseY(),
      depth: sideDepth,
      height: this.layout.sideHeight,
      offsetX: direction * offsetX,
      offsetZ: this.layout.sideOffsetZ || 0,
      rotationX: this.layout.sideRotationX,
      width: sideWidth,
    };
  }

  getCellPosition(index: number) {
    return {
      x: (this.metrics.originX ?? 0) + index * (this.metrics.pitch ?? 0),
      y: 0,
      z: 0,
    };
  }

  abstract getDotOffset(position: DotPosition): Offset;

  abstract getTiltAngle(angleDeg: number): number;
}
