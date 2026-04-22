import { createDeviceController } from "./device.js";
import { createInteractionController } from "./interactions.js";
import { createOrbitGizmo } from "./orbitGizmo.js";
import { createScene } from "./scene.js";
import { createInitialState } from "./state.js";
import { bindUi, collectDom, syncControls } from "./ui.js";

const dom = collectDom();
const state = createInitialState();
const sceneController = createScene(dom.canvas);
const device = createDeviceController({
  root: sceneController.root,
  state,
});
const interaction = createInteractionController({
  device,
  dom,
  sceneController,
  state,
});
const orbitGizmo = createOrbitGizmo(dom, sceneController);

syncControls(dom, state);
bindUi({ device, dom, sceneController, state });

sceneController.resize();
device.buildDevice();
sceneController.setTarget(device.getFocusTarget());
interaction.updateHUD();
orbitGizmo.sync();
loop();

window.addEventListener("resize", sceneController.resize);

function loop() {
  device.updateAnimations();
  sceneController.render();
  orbitGizmo.sync();
  requestAnimationFrame(loop);
}
