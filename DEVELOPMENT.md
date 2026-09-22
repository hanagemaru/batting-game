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
