# Swing motion study lab — 2026-11-13

## Current corrected model (2026-11-14)

**This section supersedes earlier experimental sections describing the
direct sweet-spot Bezier model and the 40ms complete swing.**
Their numerical benchmarks are obsolete.

### Confirmed fault
- Former independent sweet-spot trajectory solved grip backwards from
  barrel direction, moving the grip X coordinate from approximately +0.60m
  at impact to -1.50m at +110ms: over 2m of lateral displacement.
- The sweet spot lifted by 0.55m at +80ms; this was forced by a hand-
  unconstrained Bezier path.
- Previous geometric checks verified continuity but overlooked the hand
  excursion; this was not a rendering issue.

### Corrected kinematics
- Grip-first: hands follow a short curved path anchored at the exact
  impactBatPose grip location. The motion is constrained near the hitter.
- Bat orientation changes independently in yaw and elevation as the bat
  transitions from upright, loads into the swing plane, then releases.
  The sweet spot is derived from the grip and a rigid bat direction.
- Physical-looking full motion has 110ms loading, 40ms final acceleration,
  110ms follow-through (at the default 2x speed).
- The gameplay input-to-contact latency stays at 40ms. The preparation is
  considered preloaded before the finger release; the game currently renders
  only the last 40ms of acceleration, while the three-camera lab shows all
  150ms from the upright stance through impact.
- Speed adjustments remain developer settings; their extreme values are not
  claimed to be physically representative of real athletes.

### Quantitative validation
Tested center, high-inside, low-outside, at 1x, 2x, and 4x:
- Contact grip and orientation match impactBatPose within floating error.
- Maximum grip distance from impact position: 0.264m (previous: >2m).
- First derivatives are continuous at loading/launch and impact joins.
- At default 2x: bat tip 30.5–31.5m/s and grip about 3.2m/s at contact.
- Over the last 10ms, sweet-spot arc/chord ratio is about 1.01, while the
  complete head path remains curved (no forcibly linear entire swing).
- Sweet-spot height after contact rises about 0.17m at +40ms.
- Both rear (XY) and overhead (XZ) numerical projections were plotted and
  visually compared to research swing diagrams.
- The existing collision and batted-ball physics function bodies stay intact.
  Module syntax and imported/exported symbol references were checked.

### Primary evidence checked
- King et al. (2012), A new technology for resolving the dynamics of a
  swinging bat, DOI 10.1007/s12283-012-0084-9. Measured example:
  approximately 165ms set-to-impact downswing, sweet-spot speed 31.6m/s.
  Figures 7–8 show overhead hand spirals and the inclined swing plane.
  https://baseball.physics.illinois.edu/SwingSensorTechnology.pdf
- Morishita, Hirano, Yanai (2013): segment contributions from torso and
  upper extremities measured at 500Hz.
  https://doi.org/10.32226/jjbse.2013_003
- Milanovich and Nesbit (2014): variable-radius 3D hand and barrel motion
  challenge fixed-pivot and hand-unconstrained representations.
  https://www.jssm.org/hf.php?id=jssm-13-180.xml

The corrected model is a research-informed procedural approximation, NOT
a real player's measured swing. iPhone Safari runtime and subjective visual
accuracy have not yet been validated on-device.

---

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

## 2026-11-14: near-linear incoming sweet-spot path and rising follow-through

### Request and resolution
- User requested the **bat's sweet spot** (not the bat tip or grip)
  to approach the selected ball-contact point more linearly.
- After contact, the center of the sweet spot should ascend in world Y,
  resembling an upward exit from the swing plane.
- The preceding 110ms launch-to-contact time was too long. Restore a shorter
  than original 50ms default: **40ms at the default 2x swing speed**.
  The `BASE_TO_CONTACT_MS` constant is now 80; user-facing duration is
  `BASE_TO_CONTACT_MS / speed`.
- The phrase "50 microseconds" in the request was treated as a likely
  unit slip for the original 50 **milliseconds**, which are the time units
  used throughout the game.

### New geometry (procedural, not empirical motion capture)
- Define the contact core exactly from the existing impact bat pose:
  `impact.hand + impact.dir * (SWEET_START+SWEET_END)/2`.
- Incoming phase: a cubic Bézier path anchored from the batter-side,
  moderately high and behind the contact position, into the impact core.
  Its path is close to a straight line in three dimensions with a shallow
  dip and positive Y velocity at the instant of contact.
- Outgoing phase: a second cubic Bézier follows the same contact velocity
  **in direction and magnitude**, then arcs into upward world Y through
  the finish.
- Direction/elevation of the bat are computed separately, from an
  upright 70-degree launch posture to the exact impact orientation,
  and then into follow-through. Grip position is derived from the chosen
  core and direction, rather than independently animated. Hence the
  collision segment, visible bat and the trajectory display agree.
- Both phases have continuous core position and first time derivative
  at impact. Nominal end behavior eases to rest.
- The new sweep runs through the same `swingPoseAt()` module in both game
  and three-view diagnostic. 3D collision and hit physics function bodies
  were not modified.

### Numeric checks (default 2x speed, center, inside/high, outside/low)
- Release-to-contact: **40ms**.
- At impact: grip and bat orientation agree with original
  `impactBatPose` within floating point precision.
- Starting barrel elevation: **70°** (also 50°/82° diagnostic options).
- Sampled incoming path-length / straight-chord ratio: ~**1.022**.
- Sweet-spot height relative to contact: **+0.26m** at +40ms,
  **+0.55m** at +80ms.
- Core speed through contact: ~**24.9m/s**, tip speed ~**25m/s**.
- Contact core velocity is continuous; first-derivative hand and bat
  orientation continuity is designed by interpolation.
- Physical iPhone/Safari test remains pending; geometric values do not
  establish that the new shape will look natural in the player camera.

### Files
- `swing-kinematics.js` – core Bézier approach and rising finish.
- `swing-view-lab.html` – shows sweet-core Y offset from contact while
  stepping through the swing.
- `playtest-impact-ab.html` – same shared kinematics, same 3D scanner.
