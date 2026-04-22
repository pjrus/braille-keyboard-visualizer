const DRAG_AZIMUTH_SPEED = 0.014;
const DRAG_POLAR_SPEED = 0.014;
const THUMB_RADIUS = 40;
const DEPTH_SCALE_MIN = 0.72;
const DEPTH_SCALE_RANGE = 0.28;

export function createOrbitGizmo(dom, sceneController) {
  if (!dom.orbitSphere || !dom.orbitSphereThumb) {
    return {
      sync() {},
    };
  }

  const dragState = {
    pointerId: null,
    lastX: 0,
    lastY: 0,
  };

  bindOrbitMarkers();
  bindSphereDrag();

  return {
    sync,
  };

  function bindOrbitMarkers() {
    dom.orbitButtons.forEach(function (button) {
      button.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
      });

      button.addEventListener("click", function () {
        sceneController.orbitTo(button.dataset.orbitView);
        button.blur();
      });
    });
  }

  function bindSphereDrag() {
    dom.orbitSphere.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }

      dragState.pointerId = event.pointerId;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dom.orbitSphere.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });

    dom.orbitSphere.addEventListener("pointermove", function (event) {
      if (dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.lastX;
      const deltaY = event.clientY - dragState.lastY;

      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;

      sceneController.nudgeOrbit(-deltaX * DRAG_AZIMUTH_SPEED, deltaY * DRAG_POLAR_SPEED);
      event.preventDefault();
      event.stopPropagation();
    });

    dom.orbitSphere.addEventListener("pointerup", endDrag);
    dom.orbitSphere.addEventListener("pointercancel", endDrag);
  }

  function endDrag(event) {
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    dom.orbitSphere.releasePointerCapture(event.pointerId);
    dragState.pointerId = null;
    event.preventDefault();
    event.stopPropagation();
  }

  function sync() {
    const direction = sceneController.getOrbitDirection();
    const x = direction.x * THUMB_RADIUS;
    const y = -direction.y * THUMB_RADIUS;
    const scale = DEPTH_SCALE_MIN + ((direction.z + 1) / 2) * DEPTH_SCALE_RANGE;

    dom.orbitSphereThumb.style.transform =
      "translate3d(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px, 0) scale(" + scale.toFixed(3) + ")";

    syncActiveMarkers(sceneController.getOrbitView());
  }

  function syncActiveMarkers(activeView) {
    dom.orbitButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.orbitView === activeView);
    });
  }
}
