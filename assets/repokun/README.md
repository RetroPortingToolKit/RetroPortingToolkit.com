# RepoKun

Reusable 3D version of the Retro Porting Toolkit mascot, modeled from the two
owner-supplied images in `references/`. This is a first authored 3D interpretation
of those illustrations, with editable geometry and materials.

## Files

| Path | Purpose |
| --- | --- |
| `model/repokun.blend` | Neutral character library: meshes, materials, skeleton and actions |
| `model/repokun.glb` | Portable skinned character with Idle, Wave and Hop animation clips |
| `scenes/repokun-launch.blend` | Launch composition with editable camera, lights and pose |
| `scenes/repokun-*.blend` | Other standalone studio scenes |
| `renders/repokun-launch.png` | First launch-blog illustration; space for a headline at left |
| `renders/repokun-front.png` | Front studio view |
| `renders/repokun-three-quarter.png` | Three-quarter studio view |
| `renders/repokun-back.png` | Back studio view |
| `renders/repokun-transparent.png` | RGBA cutout for compositing |
| `build.py` | Reproducible model builder, renderer and additive scene loader |
| `verify.py` | Geometry, animation, GLB round-trip and image-dimension checks |

Every delivered PNG is **2000 × 1334 pixels**. The launch render has no baked-in
headline, so it can be reused with different posts or overlays. Scene files embed
the model and materials; no texture downloads or external add-ons are needed.
The original references keep their original dimensions.

## Use in Blender

Built with **Blender 4.5.9 LTS**. Open a scene and press F12 to render, or:

1. In your scene, choose **File → Append**.
2. Open `model/repokun.blend`, enter **Collection**, and append **RepoKun**.
3. Select `RepoKun.Rig` to move, rotate or scale the whole character.
4. Enter Pose Mode to pose the named bones. Choose an action in the Action Editor,
   or unmute one named track in the NLA Editor, to play an animation.

Alternatively, add this `assets/repokun` folder under Preferences → File Paths →
Asset Libraries. The RepoKun collection is marked as an asset in **Characters**.
Use Append when you need to pose the rig. For Blender library links, create a
Library Override before editing the pose.

The neutral library has no camera or floor. The scene files are self-contained
snapshots, so rebuilding the library does not silently modify an existing scene.
Re-run the scene builder to incorporate updated model geometry into its renders.

## Rig and clips

There is one body, two arms and two feet. Face parts follow the body bone.
The mouth, tongue, cheeks, button sockets, red buttons and D-pad remain separately
named meshes and can be edited individually.

Arms and legs have full-width stems extending inside the shell, with rounded
outer ends—not oval pieces touching at their tips. The separate skinned meshes
remain poseable; the attachment rings stay buried through the supplied clips.
The launch and front cameras face the mascot straight on, against a seamless
curved studio backdrop.

| Bone | Control |
| --- | --- |
| `root` | Whole-character movement and hops |
| `body` | Body tilt and gentle vertical movement; face and arms follow |
| `arm.L`, `arm.R` | Short, rounded arms rotating at their shoulders |
| `leg.L`, `leg.R` | Independent feet |

`L` and `R` mean **RepoKun's own** left and right. In a frontal image, his left
arm is on the viewer's right. The face matches the references: D-pad on the
viewer's left, two red buttons diagonally on the viewer's right.

Blender coordinates: front is **−Y**, up is **+Z**, ground is **Z = 0**. The model
is about 3.22 Blender units tall. Scale the rig uniformly to fit your scene.
GLB uses the standard glTF Y-up coordinate conversion.

At 24 fps, **Idle** loops over frames 1–96, **Wave** plays over 1–72, and **Hop**
over 1–48. The neutral library starts in its rest pose, with all NLA tracks muted.
Select one action or unmute one track; do not stack all three at full influence.
The GLB contains separate clips ready for an animation mixer in Three.js, Godot
or another glTF-capable application.

This is a simple mascot rig with rigid skin weights, intended for waving,
bouncing and gentle body motion. It does not yet have fingers, a walk cycle,
facial expression shape keys or an IK control rig.

## Add multiple animated characters from Python

Run inside Blender's Python console or a Blender script:

```python
import importlib.util
from pathlib import Path

asset = Path('/absolute/path/to/retroportingtoolkit.com/assets/repokun')
spec = importlib.util.spec_from_file_location('repokun', asset / 'build.py')
repokun = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repokun)

first = repokun.append_character('Greeting', location=(-3, 0, 0), action='Wave')
second = repokun.append_character('Listening', location=(3, 0, 0), action='Idle')
```

This preserves the scene and gives each character its own rig and animation
state. Leave out `action` for a neutral character you can pose by hand.

## Rebuild and render

From the repository root, using your Blender executable:

```sh
blender -b --python assets/repokun/build.py -- --build
blender -b --python assets/repokun/build.py -- --render all
blender -b --python assets/repokun/verify.py
```

On macOS a normal Blender installation's executable is
`/Applications/Blender.app/Contents/MacOS/Blender`.

`--render launch --preview` makes a faster, ignored preview at 45% resolution;
omit `--preview` for the exact delivery size. Rebuilds overwrite generated files
in this folder. Save manually edited variants under new names first.

Blender materials include a subtle procedural surface texture. GLB preserves
base colors, roughness and the skin/animations; Blender's procedural micro-bump
is not baked into the portable file. The PNG renders come from Cycles and AgX.

These are source assets for the project. Merely committing this folder does not
replace a live page's cover. Select a render and copy an optimized version into
the relevant article folder when publishing it.
