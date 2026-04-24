import { THREE } from "../deps.js";
import { buildCell } from "./cell.js";

export class DeviceMode {
  constructor(metrics) {
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

  buildCell(cellIndex, state, materials) {
    return buildCell(cellIndex, state.keyDia, materials, {
      baseOffset: this.layout.dotBaseOffset,
      getDotOffset: this.getDotOffset.bind(this),
      rotationX: this.layout.dotRotationX,
    });
  }

  createLayout() {
    throw new Error("DeviceMode subclasses must implement createLayout().");
  }

  buildBody() {
    throw new Error("DeviceMode subclasses must implement buildBody().");
  }

  getSideBaseY() {
    return this.layout.sideBaseOffset || 0;
  }

  getSideButtonSpec(direction, bodyWidth, bodyDepth) {
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

  getCellPosition(index) {
    return {
      x: this.metrics.originX + index * this.metrics.pitch,
      y: 0,
      z: 0,
    };
  }

  getDotOffset() {
    throw new Error("DeviceMode subclasses must implement getDotOffset().");
  }

  getTiltAngle() {
    throw new Error("DeviceMode subclasses must implement getTiltAngle().");
  }
}
