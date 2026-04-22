import { createDeviceController } from "./device.js";
import { createInteractionController } from "./interactions.js";
import { createScene } from "./scene.js";
import { createInitialState } from "./state.js";
import { bindUi, collectDom, syncControls } from "./ui.js";

const dom = collectDom();
const state = createInitialState();
const sceneController = createScene(dom.canvas);
const device = createDeviceController({
  handGroup: sceneController.handGroup,
  root: sceneController.root,
  state,
});
const interaction = createInteractionController({
  device,
  dom,
  sceneController,
  state,
});

syncControls(dom, state);
bindUi({ device, dom, sceneController, state });

sceneController.resize();
device.buildDevice();
interaction.updateHUD();
loop();

window.addEventListener("resize", sceneController.resize);

function loop() {
  device.updateAnimations();
  sceneController.render();
  requestAnimationFrame(loop);
}
