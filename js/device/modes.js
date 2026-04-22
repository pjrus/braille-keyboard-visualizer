import { createIntegratedLayout } from "./integratedLayout.js";
import { createTriangularLayout } from "./triangularLayout.js";

const MODE_BUILDERS = Object.freeze({
  integrated: createIntegratedModeLayout,
  triangular: createTriangularModeLayout,
});

export function createModeLayout(mode, metrics) {
  const builder = MODE_BUILDERS[mode] || MODE_BUILDERS.integrated;
  return builder(metrics);
}

function createIntegratedModeLayout(metrics) {
  return createIntegratedLayout(metrics);
}

function createTriangularModeLayout(metrics) {
  return createTriangularLayout(metrics);
}
