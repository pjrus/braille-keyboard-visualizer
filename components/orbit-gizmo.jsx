"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

const DRAG_AZIMUTH_SPEED = 0.014;
const DRAG_POLAR_SPEED = 0.014;
const THUMB_RADIUS = 40;
const DEPTH_SCALE_MIN = 0.72;
const DEPTH_SCALE_RANGE = 0.28;

const ORBIT_MARKERS = Object.freeze([
  { name: "top", label: "T", className: "orbit-marker--top" },
  { name: "left", label: "L", className: "orbit-marker--left" },
  { name: "right", label: "R", className: "orbit-marker--right" },
  { name: "bottom", label: "B", className: "orbit-marker--bottom" },
  { name: "front", label: "F", className: "orbit-marker--front" },
  { name: "back", label: "Bk", className: "orbit-marker--back" },
]);

export const OrbitGizmo = forwardRef(function OrbitGizmo({ sceneControllerRef }, ref) {
  const thumbRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const dragRef = useRef({
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  useImperativeHandle(ref, function exposeGizmoSync() {
    return {
      sync(sceneController) {
        const thumb = thumbRef.current;
        if (!thumb) {
          return;
        }

        const direction = sceneController.getOrbitDirection();
        const x = direction.x * THUMB_RADIUS;
        const y = -direction.y * THUMB_RADIUS;
        const scale = DEPTH_SCALE_MIN + ((direction.z + 1) / 2) * DEPTH_SCALE_RANGE;
        const activeView = sceneController.getOrbitView();

        thumb.style.transform =
          "translate3d(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px, 0) scale(" + scale.toFixed(3) + ")";

        buttonRefs.current.forEach(function syncButton(button, view) {
          const isActive = view === activeView;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });
      },
    };
  }, []);

  function registerButton(view, element) {
    if (element) {
      buttonRefs.current.set(view, element);
      return;
    }

    buttonRefs.current.delete(view);
  }

  function selectOrbitView(view, event) {
    event.currentTarget.blur();
    sceneControllerRef.current?.orbitTo(view);
  }

  function startDrag(event) {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function dragSphere(event) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    sceneControllerRef.current?.nudgeOrbit(
      -deltaX * DRAG_AZIMUTH_SPEED,
      deltaY * DRAG_POLAR_SPEED
    );
    event.preventDefault();
  }

  function endDrag(event) {
    if (dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current.pointerId = null;
    event.preventDefault();
  }

  return (
    <aside className="orbit-gizmo" aria-label="Orbit controls">
      <div className="orbit-gizmo__card">
        <span className="orbit-gizmo__label">Orbit</span>
        <div
          className="orbit-sphere"
          role="group"
          aria-label="Drag to rotate the keyboard"
          onPointerDown={startDrag}
          onPointerMove={dragSphere}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="orbit-sphere__face" aria-hidden="true" />
          <span className="orbit-sphere__thumb" ref={thumbRef} aria-hidden="true" />
          {ORBIT_MARKERS.map(function renderOrbitMarker(marker) {
            return (
              <button
                className={"orbit-marker " + marker.className}
                type="button"
                key={marker.name}
                aria-label={"View from " + marker.name}
                aria-pressed={marker.name === "iso"}
                ref={function setMarkerRef(element) {
                  registerButton(marker.name, element);
                }}
                onPointerDown={function stopOrbitDrag(event) {
                  event.stopPropagation();
                }}
                onClick={function chooseOrbitView(event) {
                  selectOrbitView(marker.name, event);
                }}
              >
                {marker.label}
              </button>
            );
          })}
        </div>
        <div className="orbit-gizmo__footer">
          <button
            className="orbit-chip"
            type="button"
            ref={function setIsoRef(element) {
              registerButton("iso", element);
            }}
            aria-pressed
            onClick={function chooseIsometricView(event) {
              selectOrbitView("iso", event);
            }}
          >
            Iso
          </button>
          <span>Drag sphere</span>
        </div>
      </div>
    </aside>
  );
});
