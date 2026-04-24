import { ArcMode } from "./arcMode.js";
import { IntegratedMode } from "./integratedMode.js";
import { TriangularMode } from "./triangularMode.js";

const MODE_CLASSES = Object.freeze({
  arc: ArcMode,
  integrated: IntegratedMode,
  triangular: TriangularMode,
});

export function createDeviceMode(mode, metrics) {
  const ModeClass = MODE_CLASSES[mode] || MODE_CLASSES.integrated;
  return new ModeClass(metrics);
}
