import type { DeviceMaterials, DeviceMetrics } from "@/types/device";
import * as THREE from "three";
import { extrudedSlab, roundedRectShape } from "../utils";

export function buildIntegratedBody(metrics: Partial<DeviceMetrics>, materials: DeviceMaterials) {
  const body = new THREE.Mesh(
    extrudedSlab(
      roundedRectShape(metrics.bodyWidth ?? 0, metrics.bodyDepth ?? 0, 0.38),
      metrics.bodyHeight ?? 0,
      0.07
    ),
    materials.body
  );
  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}
