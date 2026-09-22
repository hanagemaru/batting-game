# BATTER'S READ — Play Modes

Current player-facing prototypes:

- `modes.html` — mode selection.
- `game.html?mode=score` — 10-pitch Score Attack.
- `game.html?mode=target` — Target Challenge.
- `game.html?mode=survival` — 3-Out Survival.
- `playtest-impact.html` — developer tuning / calibration. Keep this separate from player modes.

## 1. 10-pitch Score Attack

**Purpose:** shortest, clearest replay loop.

- 10 pitches.
- A hit scores primarily from contact power/quality.
- Miss/take = 0.
- Local best score is stored.
- Expected run length is roughly tens of seconds.

**Future monetization fit:** result-screen interstitial, frequency capped rather than every run. No ads between pitches.

## 2. Target Challenge

**Purpose:** make the 3D spray-direction model matter as a skill.

- 12 pitches.
- Target cycles through PULL → CENTER → OPPOSITE.
- A normal hit earns its contact score.
- Correct direction adds +100.
- A field ring visualizes the requested direction.
- Local best score is stored.

Current direction bands:
- PULL: spray >= +10°
- CENTER: -10° < spray < +10°
- OPPOSITE: spray <= -10°

These thresholds are tuning values, not final baseball claims.

**Future monetization fit:** result-screen interstitial. Avoid rewarded score multipliers because they would undermine score comparison.

## 3. 3-Out Survival

**Purpose:** longer repeatable session with tension and streak mastery.

- Endless pitches.
- Miss/take = 1 out.
- 3 outs ends the run.
- Consecutive hits increase combo multiplier:
  - x1.00, x1.15, x1.30 ... capped at x2.50.
- Local best score is stored.

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

`game.html` currently dispatches a `batting:session-end` browser event as a clean future integration point. No ad provider is wired into the prototype.
