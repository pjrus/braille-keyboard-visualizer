import type { DeviceLayout, DeviceMaterials, DeviceMetrics, DotPosition, Offset, SideButtonSpec } from "@/types/device";
import type { SceneSettings } from "@/types";
import * as THREE from "three";
import { getDotOffset as getSharedDotOffset } from "../config";
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

  buildCell(state: SceneSettings, materials: DeviceMaterials) {
    return buildCell(state.keyDia, materials, {
      baseOffset: this.layout.dotBaseOffset,
      getDotOffset: this.getDotOffset.bind(this),
      rotationX: this.layout.dotRotationX,
    });
  }

  abstract createLayout(): DeviceLayout;

  abstract buildBody(materials: DeviceMaterials): THREE.Mesh;

  getSideButtonSpec(direction: number, bodyWidth: number, bodyDepth: number): SideButtonSpec {
    const sideWidth = 0.34;
    const sideDepth = Math.min(bodyDepth * 0.62, 1.5);
    const offsetX = bodyWidth / 2 - sideWidth / 2 - 0.22;

    return {
      baseY: this.layout.sideBaseOffset,
      depth: sideDepth,
      height: this.layout.sideHeight,
      offsetX: direction * offsetX,
      offsetZ: this.layout.sideOffsetZ,
      rotationX: this.layout.sideRotationX,
      width: sideWidth,
    };
  }

  getDotOffset(position: DotPosition): Offset {
    return getSharedDotOffset(position);
  }

  getTiltAngle(angleDeg: number) {
    void angleDeg;
    return 0;
  }
}
