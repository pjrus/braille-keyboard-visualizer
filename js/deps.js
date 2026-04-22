const { THREE } = window;

if (!THREE || !THREE.OrbitControls) {
  throw new Error("Three.js dependencies did not load.");
}

const OrbitControls = THREE.OrbitControls;

export { OrbitControls, THREE };
