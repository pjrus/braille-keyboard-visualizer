import type { SceneSettings, SideAction } from "@/lib/types";
import type {
  DeviceLayout,
  DeviceMaterials,
  DeviceMetrics,
  DotPosition,
  Offset,
  SideButtonSpec,
} from "@/lib/types/device";
import * as THREE from "three";
import { getDotOffset as getSharedDotOffset } from "../../config";
import { buildIntegratedBody } from "../bodies/integratedBody";
import { buildCell } from "../cell";

export abstract class DeviceMode {
  readonly metrics: Partial<DeviceMetrics>;
  readonly layout: DeviceLayout;
  constructor(metrics: Partial<DeviceMetrics>) {
    if (new.target === DeviceMode) {
      throw new Error("DeviceMode is abstract and cannot be instantiated directly.");
    }

    this.metrics = metrics;
    // Layout is captured once per mode; the controller replaces the mode on structural rebuilds.
    this.layout = this.createLayout();
  }

  createControlSurface() {
    // Keep mode-specific tilt and height on one parent so keys and side buttons move together.
    const controlSurface = new THREE.Group();
    controlSurface.position.y = this.layout.controlSurfacePositionY;
    controlSurface.rotation.x = this.layout.controlSurfaceRotationX;
    return controlSurface;
  }

  buildCell(state: SceneSettings, materials: DeviceMaterials) {
    // All modes use the same six-dot cell; layout and offsets place it on each surface.
    return buildCell(state.keyDia, materials, {
      baseOffset: this.layout.dotBaseOffset,
      getDotOffset: this.getDotOffset.bind(this),
    });
  }

  // Defaults describe the integrated shell; modes override only what differs.
  createLayout(): DeviceLayout {
    const bodyHeight = this.metrics.bodyHeight ?? 0.68;

    return {
      bodyDepth: this.metrics.bodyDepth ?? 2.4,
      bodyHeight,
      controlSurfacePositionY: bodyHeight,
      controlSurfaceRotationX: 0,
      dotBaseOffset: 0.8,
      sideBaseOffset: 0.2,
      sideHeight: 0.3,
      sideIndentFactor: 1,
      sideOffsetZ: 0,
    };
  }

  buildBody(materials: DeviceMaterials): THREE.Mesh {
    return buildIntegratedBody(this.metrics, materials);
  }

  getSideButtonSpec(
    direction: number,
    bodyWidth: number,
    bodyDepth: number,
    action: SideAction,
  ): SideButtonSpec {
    void action;
    const sideWidth = 0.34;
    const sideDepth = Math.min(bodyDepth * 0.62, 1.5);
    // Keep the default pads inset from the body edge to leave a visible rim.
    const offsetX = bodyWidth / 2 - sideWidth / 2 - 0.22;

    return {
      baseY: this.layout.sideBaseOffset,
      depth: sideDepth,
      height: this.layout.sideHeight,
      offsetX: direction * offsetX,
      offsetZ: this.layout.sideOffsetZ,
      width: sideWidth,
    };
  }

  getDotOffset(position: DotPosition): Offset {
    return getSharedDotOffset(position);
  }

  getTiltAngle(angleDeg: number) {
    void angleDeg;
    // Modes keep a level deck by default; the triangular mode overrides this for its angle control.
    return 0;
  }
}
