// Shared swing risk/reward model for BATTER'S READ.
// Holding gives the player more spatial tolerance, but continuously trades away power.
// This module is deliberately independent of rendering so it can be calibrated/tested.

export const HOLD_MS = 850;
export const CONTACT_RADIUS_MIN = 15;
export const CONTACT_RADIUS_MAX = 54;
export const POWER_MAX = 1.0;
export const POWER_MIN = 0.34;

export const clamp01 = v => Math.max(0, Math.min(1, v));
export const lerp = (a,b,t) => a + (b-a)*t;

export function holdState(elapsedMs) {
  const u = clamp01(elapsedMs / HOLD_MS);
  return {
    u,
    contactRadius: lerp(CONTACT_RADIUS_MIN, CONTACT_RADIUS_MAX, Math.pow(u, .70)),
    power: lerp(POWER_MAX, POWER_MIN, Math.pow(u, .90))
  };
}

// Timing is evaluated independently from aim. This keeps the central decision legible:
// early commitment preserves power; waiting buys aim tolerance but does not buy timing.
export function swingQuality({distancePx, timingError, holdMs, timingWindow=.19}) {
  const state = holdState(holdMs);
  const spatial = clamp01(1 - distancePx / (state.contactRadius + 10));
  const timing = clamp01(1 - Math.abs(timingError) / timingWindow);
  const contactQuality = spatial * timing;
  return {...state, spatial, timing, contactQuality};
}

export function contactLabel(q) {
  if (q > .77) return 'PERFECT';
  if (q > .52) return 'SOLID';
  if (q > .28) return 'CONTACT';
  if (q > .08) return 'FOUL';
  return 'MISS';
}

export function basePoints(q) {
  if (q > .77) return 100;
  if (q > .52) return 50;
  if (q > .28) return 30;
  if (q > .08) return 10;
  return 0;
}

// Intended future scoring hook: quality determines whether contact happened;
// retained power determines how valuable that contact can become.
export function poweredContact(q, power) {
  return basePoints(q) * (0.45 + 0.55 * clamp01(power));
}
