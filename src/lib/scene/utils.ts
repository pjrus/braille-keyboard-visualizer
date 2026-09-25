import * as THREE from "three";

export function roundedRectShape(width: number, depth: number, radius: number) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  // Keep adjacent corner arcs separate when the body is smaller than the requested radius.
  const safeRadius = Math.min(radius, halfWidth - 0.01, halfDepth - 0.01);

  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + safeRadius, -halfDepth);
  shape.lineTo(halfWidth - safeRadius, -halfDepth);
  shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + safeRadius);
  shape.lineTo(halfWidth, halfDepth - safeRadius);
  shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - safeRadius, halfDepth);
  shape.lineTo(-halfWidth + safeRadius, halfDepth);
  shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - safeRadius);
  shape.lineTo(-halfWidth, -halfDepth + safeRadius);
  shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + safeRadius, -halfDepth);

  return shape;
}

export function extrudedSlab(shape: THREE.Shape, height: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 24,
  });

  // ExtrudeGeometry grows along Z; rotate it so the slab's height follows the device's Y axis.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height, 0);

  return geometry;
}

export function makeTextSprite(
  text: string,
  options: { font?: string; color?: string; background?: string; padding?: number; radius?: number } = {},
) {
  const {
    font = "700 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color = "#14161c",
    background = "rgba(255,255,255,0.94)",
    padding = 16,
    radius = 24,
  } = options || {};

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.font = font;
  const width = Math.ceil(context.measureText(text).width + padding * 2);
  const height = 84;

  canvas.width = width * 2;
  canvas.height = height * 2;

  // Draw at double resolution so labels stay crisp when mapped onto small 3D sprites.
  context.scale(2, 2);
  // Setting canvas dimensions resets the 2D context, so restore the font measured above.
  context.font = font;
  context.textBaseline = "middle";
  context.fillStyle = background;
  context.beginPath();
  context.moveTo(radius, 0);
  context.arcTo(width, 0, width, height, radius);
  context.arcTo(width, height, 0, height, radius);
  context.arcTo(0, height, 0, 0, radius);
  context.arcTo(0, 0, width, 0, radius);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(20,24,35,0.1)";
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = color;
  context.fillText(text, padding, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const scale = 0.0055;
  sprite.scale.set(width * scale, height * scale, 1);
  sprite.renderOrder = 999;

  return sprite;
}

export function disposeGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);

    child.traverse(function(object) {
      if (object instanceof THREE.Mesh) {
        // Mesh materials are shared by the device controller, so only per-mesh geometry is owned here.
        object.geometry.dispose();
      }

      if (object instanceof THREE.Sprite) {
        // Sprite textures wrap their source canvas and are not reclaimed with the scene graph node.
        if (object.material.map) {
          object.material.map.dispose();
        }
        object.material.dispose();
      }
    });
  }
}
