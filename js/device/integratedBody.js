import { THREE } from "../deps.js";
import { extrudedSlab, roundedRectShape } from "../utils.js";

export function buildIntegratedBody(metrics, materials) {
  const body = new THREE.Mesh(
    extrudedSlab(
      roundedRectShape(metrics.bodyWidth, metrics.bodyDepth, 0.38),
      metrics.bodyHeight,
      0.07
    ),
    materials.body
  );
  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}
