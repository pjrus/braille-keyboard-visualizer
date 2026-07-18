import { OrbitControls, THREE } from "./deps.js";

const FULL_ORBIT_EPSILON = 0.001;
const ORBIT_VIEWS = Object.freeze({
  back: new THREE.Vector3(0, 0, -1),
  bottom: new THREE.Vector3(0, -1, 0),
  front: new THREE.Vector3(0, 0, 1),
  iso: new THREE.Vector3(1, 1, 1).normalize(),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
});

const CAMERA_VIEWS = Object.freeze({
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
});

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e8ebef");

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.fromArray(CAMERA_VIEWS.ergonomic.position);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.minPolarAngle = FULL_ORBIT_EPSILON;
  controls.maxPolarAngle = Math.PI - FULL_ORBIT_EPSILON;
  controls.target.fromArray(CAMERA_VIEWS.ergonomic.target);

  addLighting(scene);

  const root = new THREE.Group();
  scene.add(root);
  let cameraAnimationFrame = 0;

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
    animateCamera(camera, controls, view, controls.target, function storeAnimationFrame(frame) {
      cameraAnimationFrame = frame;
    });
  }

  function setTarget(target) {
    const delta = target.clone().sub(controls.target);
    camera.position.add(delta);
    controls.target.add(delta);
    controls.update();
  }

  function orbitTo(name) {
    const direction = ORBIT_VIEWS[name];
    if (direction) {
      orbitToDirection(direction);
    }
  }

  function orbitToDirection(direction) {
    const target = controls.target.clone();
    const nextDirection = direction.clone().normalize();
    const distance = Math.max(camera.position.distanceTo(target), controls.minDistance);
    const nextPosition = target.clone().add(nextDirection.multiplyScalar(distance));

    animateCameraTo(
      camera,
      controls,
      nextPosition,
      target,
      undefined,
      undefined,
      function storeAnimationFrame(frame) {
        cameraAnimationFrame = frame;
      }
    );
  }

  function nudgeOrbit(deltaAzimuth, deltaPolar) {
    const offset = camera.position.clone().sub(controls.target);
    if (offset.lengthSq() === 0) {
      return;
    }

    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += deltaAzimuth;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + deltaPolar,
      controls.minPolarAngle,
      controls.maxPolarAngle
    );

    const nextOffset = new THREE.Vector3().setFromSpherical(spherical);
    camera.position.copy(controls.target).add(nextOffset);
    controls.update();
  }

  function getOrbitView() {
    const direction = getOrbitDirection();
    let activeName = "iso";
    let bestScore = -Infinity;

    Object.keys(ORBIT_VIEWS).forEach(function (name) {
      const score = direction.dot(ORBIT_VIEWS[name]);
      if (score > bestScore) {
        bestScore = score;
        activeName = name;
      }
    });

    return activeName;
  }

  function getOrbitDirection() {
    const offset = camera.position.clone().sub(controls.target);
    return offset.lengthSq() === 0 ? ORBIT_VIEWS.iso.clone() : offset.normalize();
  }

  function dispose() {
    window.cancelAnimationFrame(cameraAnimationFrame);
    controls.dispose();
    renderer.dispose();
  }

  return {
    camera,
    controls,
    dispose,
    getOrbitDirection,
    getOrbitView,
    nudgeOrbit,
    orbitTo,
    orbitToDirection,
    render,
    renderer,
    resize,
    root,
    scene,
    setTarget,
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

function animateCamera(camera, controls, view, target, setAnimationFrame) {
  const fromPosition = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toTarget = target ? target.clone() : new THREE.Vector3().fromArray(view.target);
  const toPosition = new THREE.Vector3().fromArray(view.position).add(toTarget);

  animateCameraTo(
    camera,
    controls,
    toPosition,
    toTarget,
    fromPosition,
    fromTarget,
    setAnimationFrame
  );
}

function animateCameraTo(
  camera,
  controls,
  toPosition,
  toTarget,
  fromPosition,
  fromTarget,
  setAnimationFrame
) {
  const startPosition = fromPosition || camera.position.clone();
  const startTarget = fromTarget || controls.target.clone();
  const duration = 600;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    camera.position.lerpVectors(startPosition, toPosition, eased);
    controls.target.lerpVectors(startTarget, toTarget, eased);
    controls.update();

    if (progress < 1) {
      setAnimationFrame(window.requestAnimationFrame(tick));
    }
  }

  tick(performance.now());
}
