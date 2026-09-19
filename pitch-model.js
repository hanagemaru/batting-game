// Shared 3D pitch trajectory model for BATTER'S READ.
// Coordinates follow debug-3d.html: +Z pitcher, +X third-base/RH-batter side.
// All curve terms are zero at t=0 and t=1 so release and plate-crossing
// coordinates remain exact. This avoids the previous model's endpoint drift.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function pitchPoint(pitch, t) {
  const u = clamp(t, 0, 1);
  const a = pitch.release;
  const b = pitch.target;

  // Longitudinal progress stays monotonic and non-zero at both ends.
  // This is intentionally geometric rather than a full aerodynamics solver.
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
    // Positive early lift relative to the release→target chord, then it
    // disappears at the target; visually this produces a late drop.
    p.y += (pitch.breakY ?? 0.20) * arch * (1 - 0.55 * u);
  } else {
    p.y += (pitch.breakY ?? 0.055) * arch;
  }

  return p;
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
