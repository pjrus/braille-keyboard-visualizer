import { OrbitControls, THREE } from "./deps.js";

const CAMERA_VIEWS = {
  ergonomic: {
    position: [1, 5, 3],
    target: [0, 0, 0],
  },
  top: {
    position: [0.001, 9, 0.001],
    target: [0, 0, 0],
  },
  side: {
    position: [8.5, 1.8, 0.001],
    target: [0, 0.55, 0],
  },
};

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eef0f3");

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.fromArray(CAMERA_VIEWS.ergonomic.position);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.target.fromArray(CAMERA_VIEWS.ergonomic.target);

  addLighting(scene);

  const root = new THREE.Group();
  scene.add(root);

  const handGroup = new THREE.Group();
  handGroup.visible = false;
  scene.add(handGroup);

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  function setView(name) {
    const view = CAMERA_VIEWS[name] || CAMERA_VIEWS.ergonomic;
    animateCamera(camera, controls, view);
  }

  return {
    canvas,
    camera,
    controls,
    handGroup,
    render,
    renderer,
    resize,
    root,
    scene,
    setView,
  };
}

function addLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7bfcb, 0.55));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(4.5, 8, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;

  const shadowSize = 8;
  keyLight.shadow.camera.left = -shadowSize;
  keyLight.shadow.camera.right = shadowSize;
  keyLight.shadow.camera.top = shadowSize;
  keyLight.shadow.camera.bottom = -shadowSize;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdce4ff, 0.7);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xfff0e0, 0.35);
  fillLight.position.set(0, 2, 6);
  scene.add(fillLight);
}

function animateCamera(camera, controls, view) {
  const fromPosition = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toPosition = new THREE.Vector3().fromArray(view.position);
  const toTarget = new THREE.Vector3().fromArray(view.target);
  const duration = 600;
  const start = performance.now();

  (function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    camera.position.lerpVectors(fromPosition, toPosition, eased);
    controls.target.lerpVectors(fromTarget, toTarget, eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  })(performance.now());
}
