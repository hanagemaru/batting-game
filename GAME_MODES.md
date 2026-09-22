# BATTER'S READ — Play Modes

Current player-facing prototypes:

- `modes.html` — player-facing mode selection.
- `game.html?mode=score` — 10-pitch Score Attack.
- `game.html?mode=target` — Target Challenge.
- `game.html?mode=survival` — 3-Out Survival.
- `playtest-impact.html` — developer tuning / calibration. Keep this separate from player modes.

## Shared gameplay contract

The player modes intentionally reuse the current 3D swing/contact model from the impact prototype. Player-facing rules should not silently change bat geometry, collision timing, camera calibration, or pitch physics; tune those in `playtest-impact.html` first, then port deliberate changes.

Auto-pitch cadence is readiness-based: after a hit, the camera may track the batted ball and return to the batting view; only once control is available again does the 3-second next-pitch countdown begin. Miss/take paths also enter the same ready/wait state before the next countdown.

The player build does not reveal pitch type, course, or flight time before/during a pitch. The center header is reserved for neutral state feedback such as pitch number, hit tracking, and the next-pitch countdown.

The mode menu is intentionally simple: Score Attack is presented as the recommended first mode, all three local best scores are visible before selection, and the developer playtest is visually separated in the footer.

## 1. 10-pitch Score Attack

**Purpose:** shortest, clearest replay loop.

- 10 pitches.
- A hit scores primarily from contact power/quality (base score up to roughly 100 per hit under the current model).
- Miss/take = 0.
- Local best score is stored.
- Current expected run length is roughly 40–50 seconds because the 3-second interval starts after each play becomes controllable again.

**Future monetization fit:** result-screen interstitial, frequency capped rather than every run. No ads between pitches.

## 2. Target Challenge

**Purpose:** make the 3D spray-direction model matter as a skill.

- 12 pitches.
- Target cycles through PULL → CENTER → OPPOSITE.
- A normal hit earns its contact score.
- Correct direction adds +100; an incorrect direction still keeps the normal contact score.
- A field ring and Japanese HUD label visualize the requested direction.
- Hit feedback explicitly reports TARGET +100 or TARGET MISS.
- Local best score is stored.

Current direction bands:
- PULL: spray >= +10°
- CENTER: -10° < spray < +10°
- OPPOSITE: spray <= -10°

These thresholds are tuning values, not final baseball claims. The +100 bonus is intentionally large enough to make direction control the defining skill; revisit only after playtesting confirms how reliably each band can be reached.

**Future monetization fit:** result-screen interstitial. Avoid rewarded score multipliers because they would undermine score comparison.

## 3. 3-Out Survival

**Purpose:** longer repeatable session with tension and streak mastery.

- Endless pitches.
- Miss/take = 1 out.
- 3 outs ends the run.
- Consecutive hits increase combo multiplier:
  - x1.00, x1.15, x1.30 ... capped at x2.50.
- A miss/take resets combo to zero.
- Pitch mix gets harder every 10 pitches (more breaking balls, no artificial speed-up).
- Local best score is stored.

The x2.50 cap prevents a very long streak from making late hits disproportionately dominant while still rewarding consistency.

**Future monetization fit:** optional rewarded continue can work well, but a continued run should be marked assisted / separated from ranked scores. Standard interstitial can remain result-only.

## Advertising principles

The batting interaction is timing-sensitive, so ads should not interrupt active play.

Preferred placements:
1. Mode-selection / menu surfaces.
2. After a completed session.
3. Optional rewarded continue in unranked or clearly separated Survival runs.

Avoid:
- ads between pitches,
- countdown-delaying ads,
- banners covering the 3D batting viewport,
- paid/rewarded bonuses that mix into the same competitive leaderboard.

Integration hooks currently exist without an ad provider:
- `modes.html` contains a hidden `MENU_AD_SLOT` and dispatches `batting:menu-ready`.
- `game.html` contains a hidden result ad slot and dispatches `batting:session-end` with mode/session summary data.

A future provider should attach to those menu/result surfaces only; active batting should remain uninterrupted.
