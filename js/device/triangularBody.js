import { THREE } from "../deps.js";

export function buildTriangularBody(metrics, materials) {
  const body = new THREE.Mesh(createTriangularBodyGeometry(metrics), materials.body);
  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}

function createTriangularBodyGeometry(metrics) {
  const halfDepth = metrics.bodyDepth / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfDepth, 0);
  shape.lineTo(halfDepth, 0);
  shape.lineTo(-halfDepth, metrics.bodyHeight);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    curveSegments: 8,
    depth: metrics.bodyWidth,
    steps: 1,
  });

  // The triangle is authored as depth/height, then rotated so extrusion becomes width.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(metrics.bodyWidth / 2, 0, 0);
  geometry.computeVertexNormals();

  return geometry;
}
