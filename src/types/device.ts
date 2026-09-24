import type * as THREE from "three";

export type DotPosition = { number: number; col: number; row: number };
export type Offset = { x: number; z: number };
export type DeviceMetrics = { bodyDepth: number; bodyHeight: number; bodyWidth: number };
export type DeviceLayout = {
  bodyDepth: number; bodyHeight: number; controlSurfacePositionY: number; controlSurfaceRotationX: number;
  dotBaseOffset: number; dotRotationX: number; sideBaseOffset: number; sideHeight: number;
  sideIndentFactor: number; sideOffsetZ: number; sideRotationX: number;
};
export type SideButtonSpec = { baseY: number; depth: number; height: number; label?: string; offsetX: number; offsetZ: number; rotationX: number; width: number };
export type DeviceMaterials = { body: THREE.MeshStandardMaterial; key: THREE.MeshStandardMaterial; keyActive: THREE.MeshStandardMaterial; sideButton: THREE.MeshStandardMaterial; sideButtonActive: THREE.MeshStandardMaterial };
export type DotMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
