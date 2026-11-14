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

## 2026-11-14: first-pitch freeze, upright launch, and pitch trails

### Incident and root cause
- During the previous refactor, `idealImpactU(pitch)` was inadvertently removed
  from `playtest-impact-ab.html` when eliminating a duplicate definition of
  `idealImpactZ`. It is still called in both `showPlateMarker` and
  `idealImpactTimeMs`; when the first pitch reached the plate, this caused
  a JavaScript `ReferenceError` and stopped subsequent animation frames.
- Restored `idealImpactU` while preserving the slope-based contact plane.
- Added post-refactor verification for missing cross-module imports and
  required gameplay functions, not merely syntax.

### Upright loading stance (research-informed, NOT motion capture)
- The default launch bat elevation is 70° above horizontal, with 50°/70°/82°
  selectable in the three-view diagnostic only.
- The bat's elevation transitions smoothly into the existing exact
  `impactBatPose` orientation while grip rotation and delayed bat yaw
  continue. The spatial contact location, sweet spot and strike-plane
  definition are unchanged.
- To support a physically less abrupt barrel lowering phase, the default
  onset-to-contact interval changed from 50ms to 110ms at the existing
  2x speed setting. **This changes release timing and needs playtesting.**
- Peak local instantaneous barrel-tip speed at the intended contact point
  was tested at roughly 26m/s (default speed) for center/high-inside/
  low-outside. Starts and finishes close to rest.
- Bat holding angles differ between real athletes, and published preparation
  positions are not uniformly vertical. The angle is intentionally adjustable
  and is not presented as measured universal data.

### Pitch information and persistent trajectory
- The game now labels pitch type in Japanese
  (`ストレート`, `カーブ`, `フォーク`) in the pitch header and per-pitch
  result. The developer's pitch selector retains FAST/CURVE/FORK IDs.
- The real pitch path is sampled on the same 3D `pitchPoint` / `pitchPointExtended`
  coordinates used by the ball, drawn progressively, and remains for 1.8s
  after the pitch reaches the plate, fading toward zero.
- The three-view lab now has pitch-type selector and matching static
  reference pitch path (not time-synchronized to swing), with visibility toggle.

### Literature specifically supporting this revision
- King et al., *Swing Sensor Technology for Baseball* (Sports Engineering);
  3D bat orientation series captures rest, backswing, set, downswing,
  follow-through, and changing elevation:
  https://baseball.physics.illinois.edu/SwingSensorTechnology.pdf
- *Return to Hitting: An Interval Hitting Progression and Overview of Hitting
  Mechanics Following Injury* (2015). Notes stance variability, upper-body
  loading, and ~45° bat orientation in the frontal plane after drive:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4675191/
- Cross (2009), *Mechanics of swinging a bat*, DOI 10.1119/1.2983146:
  https://www.physics.sydney.edu.au/~cross/PUBLICATIONS/44.BatSwing.pdf

### Validation status
Static JavaScript syntax of the gameplay, swing model, lab and pitch model:
all valid. All imported names resolve to exported names; all referenced DOM
IDs exist. The exact collision scanner and batted-ball physics functions
remain unchanged. Numerical pose tests confirm exact contact alignment,
near-zero start/end velocities, upright starting elevation, and expected
contact speeds. **iPhone Safari runtime has not yet been retested.**
