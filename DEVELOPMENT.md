# Development Plan

## Product goal

Mobile batting game built around one core tradeoff:

- Touch early / release quickly: small contact area, little correction time, high power.
- Hold longer: larger contact area and movable aim, but reduced power.
- The intended baseball feeling is that guessing pitch/location enables a full swing, while reacting to speed/location/shape sacrifices power for coverage.

The first complete mode should feel like a batting center / target challenge rather than a full baseball simulation.

## Non-negotiable geometry

The geometry lab at `debug-3d.html` is the calibration source of truth.

World coordinates:

- Rear apex of home plate: origin.
- +Z: pitcher.
- -Z: catcher.
- +X: third-base side / right-handed batter side.
- -X: first-base side.
- Regulation plate front edge faces the pitcher.
- Right-handed batter eye starts inside/above the +X batter's box.
- Game projection should be derived from this geometry, not hand-positioned to merely look plausible.

## Development order

1. Batter-eye geometry and pitch readability
2. Core touch / hold / release tradeoff
3. Pitch variety and fair difficulty
4. Batted-ball direction, launch and power result
5. Batting-center target scoring
6. Feedback: contact sound, vibration, camera/ball feedback, result readability
7. Session flow, restart, score summary
8. Visual polish / pixel-inspired art
9. PWA installability and final mobile QA

## Current pitch set

- FAST
- CURVE
- FORK

Keep the set small until the core read/react decision is fun.

## Self-review checklist for every meaningful change

- Does it still work on a narrow phone screen?
- Does the right-handed batter see the pitch from a lateral eye position rather than plate center?
- Does the ball path come from the same 3D coordinate system as the debug lab?
- Can the player exploit the mechanic in a way that removes the read-vs-power tradeoff?
- Is the change testable without backend/account setup?
- Keep `index.html` playable on GitHub Pages after each commit.
- Preserve `debug-3d.html` as a separate calibration tool.

## Definition of the first strong playable version

A 20-pitch batting-center session where:

- pitches are readable but not trivial,
- quick commitment can create clearly stronger contact,
- holding gives visibly more coverage and adjustment,
- contact quality produces understandable batted-ball outcomes,
- targets / zones make those outcomes matter,
- a full session is satisfying enough to replay for a better score.


## Current prototype architecture

- `debug-3d.html`: geometry / camera calibration source of truth.
- `playtest.html`: playable Three.js batter-view prototype using the same physical field concept, with touch cursor + hold/release swing mechanic.
- `playtest-legacy.html`: archived older 2D-projected playtest.
- `pitch-model.js`: shared pitch trajectory math.
- `swing-model.js`: shared hold/contact/power math.

The playable prototype intentionally keeps a temporary CALIBRATE panel so eye position, gaze target and FOV can be tuned while pitches are moving. Remove or hide it only after the batter view is visually settled.


## Impact-model comparison prototype

- `playtest-impact.html`: alternate batting model prototype.
- Cursor is a translucent barrel/sweet-spot segment on a slanted standard impact surface, not on the strike-zone plane.
- Standard impact depth moves pitcher-side for inside pitches and catcher-side for outside pitches.
- Releasing starts the swing; bat reaches impact about 100 ms later.
- Timing error reduces power and eventually becomes a miss.
- Contact above/below the barrel changes launch angle.
- Actual impact depth controls pull/opposite-field spray direction.
- Pitches outside the strike zone remain hittable within a limited reach margin; max power falls to ~70% at the reach edge.
- Releasing before the pitch does not swing; it only positions the cursor.
- Plate-crossing location is marked after the pitch/result.


## Impact prototype v2 — physical bat path

Current `playtest-impact.html` now tests the following alternatives:

- Cursor display plane can switch between `STRIKE PLANE` and `IMPACT SURFACE`.
- Swing delay is adjustable from 0–180 ms; default is 0 ms for the current comparison.
- Cursor X/Y is the intended pitch-location target. Actual bat contact geometry is always computed in 3D at the course-dependent impact depth.
- The visible bat is a world-space bat whose hand point and barrel direction are derived from the selected location:
  - outside/high produces the flattest barrel,
  - inside/low produces the steepest barrel,
  - inside contact also carries the hands/barrel farther pitcher-side.
- A swing has start, impact, and follow-through poses. Collision is checked along the moving sweet-spot segment rather than at a single arbitrary frame.
- Incoming ball velocity, bat contact-point velocity, collision normal, timing error, location power cap, and sweet-spot position feed the outgoing-ball result.
- The outgoing ball begins at the exact incoming-ball center at the detected collision time.
- A retained incoming trail and outgoing trail meet at the contact point so trajectory discontinuities are visible during debugging.
- A contact marker and numeric contact readout expose the computed x/y/z, bat speed, launch and spray for calibration.


### Impact prototype refinements

- Adult bat geometry now uses a 34 in (0.864 m) model with realistic handle/barrel proportions rather than making the bat unrealistically long.
- Bat/hands are hidden at rest and only enter the frame after the swing starts.
- Swing delay and swing speed are independently adjustable; default speed is 2.0x for current feel testing.
- A hit temporarily turns the camera toward the pitcher/outfield direction, then returns to the calibrated batting view.
- The 3-second auto-pitch countdown starts only after the batting view has returned and player input is available again.
- Batted-ball flight continues independently while the player becomes ready for the next pitch.
