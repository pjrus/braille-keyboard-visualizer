import { THREE } from "../deps.js";

export function createDeviceMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0x17181b,
      roughness: 0.78,
      metalness: 0.08,
    }),
    hand: new THREE.MeshStandardMaterial({
      color: 0xffd6be,
      roughness: 0.6,
      metalness: 0,
      opacity: 0.55,
      transparent: true,
    }),
    key: new THREE.MeshStandardMaterial({
      color: 0xf3f3f1,
      roughness: 0.42,
      metalness: 0.06,
    }),
    keyActive: new THREE.MeshStandardMaterial({
      color: 0x3562ff,
      roughness: 0.35,
      metalness: 0.08,
    }),
    sideButton: new THREE.MeshStandardMaterial({
      color: 0x2e3036,
      roughness: 0.55,
      metalness: 0.1,
    }),
    sideButtonActive: new THREE.MeshStandardMaterial({
      color: 0x3562ff,
      roughness: 0.4,
      metalness: 0.08,
    }),
  };
}
