# Swing motion study lab — 2026-11-13

This is a **research-informed, procedural approximation**, not motion capture,
inverse dynamics, a biomechanically validated player model, or a full skeletal simulator.

## Live preview routes (preview-aim-cursor-ab-20261109 branch)

- Swing lab: `swing-view-lab.html`
- Playable A/B: `playtest-impact-ab.html`
- Shared source: `swing-kinematics.js`

## Why the model changed

Old implementation: a single bat direction spinning around the world Y axis,
with a small hand displacement; it used one angular rotation parameter for both
hand and bat movement. Smooth-looking but kinematically artificial.

New approximation:

- **Contact constraint**: at the selected (x,y), hand, bat direction and
  sweet-spot position exactly match `impactBatPose(x,y)`.
- **Grip arc**: a short rotation about a shoulder/torso surrogate pivot moves
  the hands around the batter rather than translating in a straight line.
- **Delayed bat release**: independent smooth angular functions for the
  hand/torso and the bat. Wrist/bat angular speed peaks around contact.
- **Zero launch/finish velocity**: normalized swing time is smoothly remapped
  to start and finish at rest while retaining continuous contact velocity.
- **3D variation**: the vertical tip attitude varies slightly before/after contact.
- **One source of truth**: both collision and 3-view diagnostics import
  `swingPoseAt` from `swing-kinematics.js`.

The timing window in the *game* is still intentionally much more forgiving
than real baseball. The model changes swing geometry, not game balance settings.

## View and comparison controls

- Rear orthographic view: analyze horizontal/vertical motion.
- Overhead orthographic view: analyze batter-to-pitcher and lateral motion.
- Batter's-eye view: reuses saved `batting-camera-v1` settings including FOV,
  but **does not modify** those settings.
- Slow playback, pause, 5 ms stepping, course and height presets.
- Grip, barrel tip, and sweet-spot tracks.
- Optional dashed old-model barrel-tip trace.

## Research references

1. Morishita, Hirano, Yanai. *Kinematic contributions of torso and upper
   extremity for producing bat-head velocity in baseball batting*.
   Japanese Journal of Biomechanics in Sports and Exercise (2013),
   DOI: 10.32226/jjbse.2013_003.
   The study analyzes pelvis, thorax, upper extremity, and bat as multiple
   linked rigid segments and quantifies contributions to tip speed.
   https://www.jstage.jst.go.jp/article/jjbse/17/4/17_2013_003/_article/-char/en

2. Nakashima, Horiuchi, Kimura, Sakurai. *Acceptable range of timing error
   at bat-ball impact in baseball depends on the bat swing path*.
   Frontiers in Sports and Active Living (2025),
   DOI: 10.3389/fspor.2025.1557145.
   Data-driven trajectories consider bat angle and top/side-view swing shape.
   https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1557145/full

3. Crisco, Osvalds, Rainbow. *The Kinetics of Swinging a Baseball Bat*.
   Journal of Applied Biomechanics (2018), DOI: 10.1123/jab.2017-0337.
   Bat applied force and torque evolve differently up to impact.
   https://pubmed.ncbi.nlm.nih.gov/29651903/

## Unresolved: height and inside/outside recognition in batter view

Previously tuned camera position and FOV should be treated as the baseline:
do **not** reset or override. They are already manually adjustable.

Future options to evaluate independently from bat model:
- animated pitcher release and body cues (current pitcher is static);
- ball contrast/size/motion trail tuning without changing pitch coordinates;
- subtle final-stage gaze/head tracking with strict limits and a toggle;
- an optional, low-contrast ball-height/depth cue at plate, if natural visuals
  remain insufficient.

These are **proposals, not implemented** in this iteration.

## Verification completed

- Static syntax tests for shared model, gameplay, and lab modules passed.
- Both pages reference same module; gameplay collision/outgoing-ball formulas
  are not modified.
- Numerical tests across center/high-inside/low-outside show contact pose
  errors near zero and bat-tip speed near 36 m/s at impact for default speed.
- Start/end velocity is ~0.
- Browser page navigation reachable via raw.githack (game -> swing lab).
- **Live 3D canvas behavior on a physical iPhone has not been verified.**
