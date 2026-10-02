import type * as THREE from "three";

export type DotPosition = { number: number; col: number; row: number };
export type Offset = { x: number; z: number };
export type DeviceMetrics = { bodyDepth: number; bodyHeight: number; bodyWidth: number };
// A mode provides body dimensions and control-surface offsets to the shared builders.
export type DeviceLayout = {
  bodyDepth: number;
  bodyHeight: number;
  controlSurfacePositionY: number;
  controlSurfaceRotationX: number;
  dotBaseOffset: number;
  sideBaseOffset: number;
  sideHeight: number;
  sideIndentFactor: number;
  sideOffsetZ: number;
};
// Geometry is expressed in the control surface's local space, before the deck pivot is applied.
export type SideButtonSpec = {
  baseY: number;
  depth: number;
  height: number;
  label?: string;
  offsetX: number;
  offsetZ: number;
  width: number;
};
// One controller owns these shared materials; rebuilding meshes must not dispose them.
export type DeviceMaterials = {
  body: THREE.MeshStandardMaterial;
  key: THREE.MeshStandardMaterial;
  keyActive: THREE.MeshStandardMaterial;
  sideButton: THREE.MeshStandardMaterial;
  sideButtonActive: THREE.MeshStandardMaterial;
};
// Dot metadata is attached through Object3D.userData at construction time for picking/animation.
export type DotMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
