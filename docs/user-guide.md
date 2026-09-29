# Braille Keyboard Visualiser User Guide

## Overview

The Braille Keyboard Visualiser is an interactive 3D model that helps you explore and test braille keyboard layouts. You can adjust the physical geometry of the keys, toggle overlays, remap keyboard shortcuts, and interact with the model using your mouse or keyboard.

The visualiser displays a real-time braille input status in the top-left corner, showing which dots are currently active, the letter being formed, and the text you have typed.

## Layout modes

Five layout modes are available. Switch between them using the segmented control in the panel:

- **Triangular**: Standard 2×3 braille key grid on a wedge-shaped body that tilts the deck towards you
- **Integrated**: Flat key arrangement
- **Arc**: Keys fanned outward
- **Hable**: Diagonal finger keys with front thumb pads
- **Chameleon**: A shallow 1–6 finger row with two front thumb pads and space for a separate tactile display

## Geometry controls

Three sliders let you adjust the key appearance within your current layout mode:

### Key indent
Range: −1 to 1 (step 0.01, default 0.35)

Controls whether keys are recessed, flush or raised:
- Negative values create recessed dimples
- 0 is flush with the surface
- Positive values create raised domes

### Incline angle
Range: 0–35° (step 0.5, default 16)

Controls the tilt of the keyboard. This slider only affects the **Triangular mode**. In the Integrated, Arc, Hable and Chameleon modes the slider is disabled and a note explains why; your Triangular angle is kept for when you switch back.

### Key diameter
Range: 0.40–0.62 (step 0.01, default 0.52)

Controls the width (diameter) of each key. Key height is fixed — use **Key indent** to change how far keys sit above or below the surface.

## Overlays

Toggle additional visual information:

- **Side action buttons** (default on): Shows the two action buttons. In Triangular and Integrated modes they sit on the left and right edges; in Arc, Hable and Chameleon they are thumb bars or pads at the front of the deck. Turning them off narrows the body in the other modes; Chameleon keeps its full width for the dot row.
- **Dot numbers (1–6)** (default off): Displays the number of each dot
- **Letter mapping (A preview)** (default off): Shows a static reference letter above the braille cell and highlights dot 1. It does not follow the chord you are holding. Use the **Letter** card in the status display for the active chord.

## Typing braille

### Keyboard input

Dots are controlled by six keys. The default layout is:

~~~
F D S  =  Dots 1 · 2 · 3
J K L  =  Dots 4 · 5 · 6
~~~

Plus two physical action buttons:

~~~
A       =  Left side button
;       =  Right side button
~~~

Each button can be assigned to one of four actions:
- **Backspace**: Deletes the previous character
- **Space**: Inserts a space character
- **Enter**: Commits any active chord and inserts a newline
- **Shift**: A one-shot capitalisation toggle that primes uppercase for the next letter, then automatically unprimes

By default, the left button is assigned to Backspace and the right button to Space. Duplicate actions (such as two Space buttons) are supported if desired.

When Shift is active, the HUD displays a **Shift** badge on the Letter card, and the next typed chord produces an uppercase letter (`A`–`Z`). Without Shift, output is lowercase (`a`–`z`).

Chord typing is paused while a control panel field has focus. Press Escape or click the
3D view to return keyboard control to the model. Switching away from the browser window
also clears any chord you were holding.

### Committing a chord

Hold multiple dot keys together, then release the last key to commit the chord and type the corresponding letter. Space is a secondary explicit commit: if you hold dots and press space, the chord commits immediately.

With no dots held, pressing space types a space character.

**Esc** clears the active chord without typing anything.
**Backspace** deletes the previous character.
**Enter** commits any active chord and inserts a newline.

Space, Esc, Backspace and Enter are not remappable keyboard shortcuts.

### Clicking dots in 3D

Click any dot in the 3D model to toggle it on or off. Clicked dots do not auto-commit—press Space to commit them.

Clicking a side button triggers its assigned action directly (Backspace, Space, Enter, or Shift).

## Remapping shortcuts

To remap a key:

1. Click on any of the eight key binding fields (Dots 1–6, Left side, Right side)
2. Press a printable key
3. If the key is already assigned elsewhere, an error message appears
4. Escape cancels the remap

Restrictions:
- Each key can only be assigned once
- Ctrl, Alt and Cmd combinations are rejected
- Shift is allowed with letter keys (Shift+F binds the same key as F) but rejected with any other key, so shifted symbols such as `!` cannot be bound
- Only single printable characters can be bound; Space, Esc and Backspace cannot

Press the **Reset keyboard mappings** button to restore the default layout.

## Pointer interaction

**Drag to orbit**: Click and drag the 3D model to rotate the view around the keyboard.

**Scroll to zoom**: Use the scroll wheel to zoom in and out.

**Right-drag to pan**: Hold the right mouse button and drag to pan the camera.

Clicks are suppressed if the pointer moves more than 8 pixels—this prevents accidental clicks whilst orbiting.

## Camera and screenshots

### Camera presets

Three camera positions are available:

- **Ergonomic**: A tilted view showing the keyboard from an angled perspective
- **Top**: Directly overhead
- **Side**: From the side

### Orbit gizmo

The orbit gizmo in the top-right corner provides six quick-view buttons:

- **T** (top), **L** (left), **R** (right), **B** (bottom), **F** (front), **Bk** (back)
- **Iso**: Isometric view
- Drag the sphere to manually orbit the view

### Save screenshot

Press **Save screenshot** to download a PNG of the 3D model. The screenshot captures only the scene—the HUD and orbit gizmo overlays are not included. The button is disabled until the scene is ready.

## Saved settings

All settings are saved in your browser's local storage:

- Layout mode, geometry values, overlay toggles, keyboard mappings
- Geometry values are stored separately for each layout mode

The camera view and zoom level are **not** saved — the view resets to Ergonomic each time you reload.

Your other settings persist even after closing the browser.

## Limitations

- WebGL is required. If your browser does not support it, the visualiser displays "3D rendering is unavailable"
- Only the 26 letters A–Z are mapped to braille chords
- Unmapped chords are typed as a literal token; for example dots 1 + 6 produce `[1,6]`. While such a chord is still held, the **Letter** card shows `?`
- No numbers, punctuation, contractions or other braille features are included
