import type { Mode } from "@/lib/types";
import type { DeviceMetrics } from "@/lib/types/device";
import { ArcMode } from "./arcMode";
import { ChameleonMode } from "./chameleonMode";
import { HableMode } from "./hableMode";
import { IntegratedMode } from "./integratedMode";
import { TriangularMode } from "./triangularMode";

const MODE_CLASSES = Object.freeze({
  arc: ArcMode,
  chameleon: ChameleonMode,
  hable: HableMode,
  integrated: IntegratedMode,
  triangular: TriangularMode,
});

export function createDeviceMode(mode: Mode, metrics: Partial<DeviceMetrics>) {
  // The fallback keeps scene creation resilient if an unknown mode reaches this boundary.
  const ModeClass = MODE_CLASSES[mode] || MODE_CLASSES.integrated;
  return new ModeClass(metrics);
}
