import { extrudedSlab, roundedRectShape } from "@/lib/scene/utils";
import type { DeviceMaterials, DeviceMetrics } from "@/lib/types/device";
import * as THREE from "three";

export function buildIntegratedBody(metrics: Partial<DeviceMetrics>, materials: DeviceMaterials) {
  // Integrated layouts share a rounded slab; each mode supplies its own dimensions and key placement.
  const body = new THREE.Mesh(
    extrudedSlab(
      roundedRectShape(metrics.bodyWidth ?? 0, metrics.bodyDepth ?? 0, 0.38),
      metrics.bodyHeight ?? 0,
      0.07,
    ),
    materials.body,
  );
  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}
