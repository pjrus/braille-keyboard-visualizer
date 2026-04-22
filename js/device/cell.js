import { THREE } from "../deps.js";
import {
  DOT_POSITIONS,
  KEY_HEIGHT,
  LETTER_TO_DOTS,
  getDotOffset,
} from "../config.js";
import { makeTextSprite } from "../utils.js";

export function buildCell(cellIndex, keyDiameter, materials, options) {
  const cell = new THREE.Group();
  cell.userData = { dots: [], labels: [], letter: null, letterLabel: null };

  const radius = keyDiameter / 2;
  const baseOffset = options && typeof options.baseOffset === "number"
    ? options.baseOffset
    : KEY_HEIGHT / 2;
  const rotationX = options && typeof options.rotationX === "number"
    ? options.rotationX
    : 0;

  DOT_POSITIONS.forEach(function (position) {
    const offset = getDotOffset(position);
    const key = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, KEY_HEIGHT, 48, 1, false),
      materials.key
    );
    key.castShadow = true;
    key.receiveShadow = true;
    key.rotation.x = rotationX;

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.key
    );
    cap.scale.y = 0.18;
    cap.position.y = KEY_HEIGHT / 2;
    cap.castShadow = true;
    cap.receiveShadow = true;
    key.add(cap);

    key.position.set(offset.x, baseOffset, offset.z);
    key.userData = {
      baseY: baseOffset,
      cap,
      cellIndex,
      kind: "dot",
      number: position.number,
      pressed: false,
      targetY: KEY_HEIGHT / 2,
    };
    cell.add(key);
    cell.userData.dots.push(key);

    const numberLabel = makeTextSprite(String(position.number), {
      background: "rgba(255,255,255,0.96)",
      color: "#14161c",
      font: "800 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    });
    numberLabel.position.set(offset.x, 0.6, offset.z);
    numberLabel.visible = false;
    cell.add(numberLabel);
    cell.userData.labels.push(numberLabel);
  });

  const letters = Object.keys(LETTER_TO_DOTS);
  const letter = letters[cellIndex % letters.length];
  const letterLabel = makeTextSprite(letter, {
    background: "rgba(53,98,255,0.96)",
    color: "#ffffff",
    font: "800 66px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  });
  letterLabel.position.set(0, 1.15, 0);
  letterLabel.visible = false;
  cell.add(letterLabel);
  cell.userData.letter = letter;
  cell.userData.letterLabel = letterLabel;

  return cell;
}
