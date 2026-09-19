// Shared 3D pitch trajectory model for BATTER'S READ.
// Coordinates follow debug-3d.html: +Z pitcher, +X third-base/RH-batter side.
// Curve terms are zero at t=0 and t=1, so release and plate-crossing
// coordinates remain exact.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// MVP visual flight times. These are deliberately centralized so gameplay,
// calibration and future animation use one clock. They are not claimed to be
// a full aerodynamic reconstruction of a specific real pitch speed.
export const FLIGHT_MS = Object.freeze({
  FAST: 520,
  CURVE: 610,
  FORK: 575
});

export function flightMs(pitch) {
  return pitch.flightMs ?? FLIGHT_MS[pitch.type] ?? FLIGHT_MS.FAST;
}

export function progressAtElapsed(pitch, elapsedMs) {
  return clamp(elapsedMs / flightMs(pitch), 0, 1);
}

export function pitchPoint(pitch, t) {
  const u = clamp(t, 0, 1);
  const a = pitch.release;
  const b = pitch.target;

  // Longitudinal progress is linear. The previous game prototype used a
  // smoothstep here, which made the ball unrealistically start and finish
  // with zero forward speed. Break shape is handled separately below.
  const p = {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    z: lerp(a.z, b.z, u)
  };

  // 4u(1-u) peaks midway and is exactly zero at release/plate.
  const arch = 4 * u * (1 - u);
  const late = arch * u;

  if (pitch.type === 'CURVE') {
    p.x += (pitch.breakX ?? 0.30) * (pitch.dir ?? 1) * late;
    p.y += (pitch.breakY ?? 0.10) * arch;
  } else if (pitch.type === 'FORK') {
    // Relative to the release→target chord, this stays higher early and
    // converges late, producing a readable late drop without endpoint drift.
    p.y += (pitch.breakY ?? 0.20) * arch * (1 - 0.55 * u);
  } else {
    p.y += (pitch.breakY ?? 0.055) * arch;
  }

  return p;
}

export function pointAtElapsed(pitch, elapsedMs) {
  return pitchPoint(pitch, progressAtElapsed(pitch, elapsedMs));
}

export function endpointError(pitch) {
  const start = pitchPoint(pitch, 0);
  const end = pitchPoint(pitch, 1);
  const dist = (p, q) => Math.hypot(p.x-q.x, p.y-q.y, p.z-q.z);
  return {
    release: dist(start, pitch.release),
    target: dist(end, pitch.target)
  };
}

export function isMonotonicTowardPlate(pitch, samples = 120) {
  let prev = pitchPoint(pitch, 0).z;
  const descending = pitch.target.z < pitch.release.z;
  for (let i = 1; i <= samples; i++) {
    const z = pitchPoint(pitch, i / samples).z;
    if (descending ? z >= prev : z <= prev) return false;
    prev = z;
  }
  return true;
}

export function longitudinalStepSpread(pitch, samples = 120) {
  // A value near zero means equal time steps advance equally toward home.
  const steps=[];
  let prev=pitchPoint(pitch,0).z;
  for(let i=1;i<=samples;i++){
    const z=pitchPoint(pitch,i/samples).z;
    steps.push(Math.abs(z-prev));
    prev=z;
  }
  const min=Math.min(...steps),max=Math.max(...steps);
  return max-min;
}
