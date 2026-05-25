import { ArcMode } from "./arcMode.js";
import { HableMode } from "./hableMode.js";
import { IntegratedMode } from "./integratedMode.js";
import { TriangularMode } from "./triangularMode.js";

const MODE_CLASSES = Object.freeze({
  arc: ArcMode,
  hable: HableMode,
  integrated: IntegratedMode,
  triangular: TriangularMode,
});

export function createDeviceMode(mode, metrics) {
  const ModeClass = MODE_CLASSES[mode] || MODE_CLASSES.integrated;
  return new ModeClass(metrics);
}
