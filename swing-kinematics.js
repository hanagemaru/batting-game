// Shared, research-informed but simplified 3D bat kinematics.
// Used by BOTH the interactive batting preview and the diagnostic swing lab.
//
// References:
// Morishita, Hirano & Yanai (2013): contributions from trunk, upper extremity,
// and wrist to bat-head velocity (DOI 10.32226/jjbse.2013_003).
// Nakashima et al. (2025): bat swing paths from top and side views alter the
// acceptable contact timing window (DOI 10.3389/fspor.2025.1557145).
//
// This is a procedural 2-link model, NOT a reproduced human motion-capture
// dataset, full skeleton model, or inverse-dynamics simulation.

import * as THREE from 'three';
import {PLATE_HALF,PLATE_FRONT} from './pitch-model.js';

export const IMPACT_SLOPE=.4633;
export const BAT_LENGTH=.864;
export const GRIP_TO_CONTACT=.72;
export const SWEET_START=.56;
export const SWEET_END=.82;
export const BASE_TO_CONTACT_MS=80; // 40 ms to impact at the default 2x game speed.
export const DEFAULT_STANCE_ELEVATION_DEG=70; // Adjustable; no universal batting stance exists.
export const BASE_FOLLOW_THROUGH_MS=220;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const radians=THREE.MathUtils.degToRad;
const V3=THREE.Vector3;
const ZERO_YAW_OFFSET=Math.tanh(1.25*.35);
const ZERO_BARREL_OFFSET=Math.tanh(1.8*.22);

export function idealImpactZ(x){
  return PLATE_FRONT+IMPACT_SLOPE*x;
}
export function barrelAngle(x,y){
  const inside=clamp((x+PLATE_HALF)/(2*PLATE_HALF),0,1);
  const high=clamp((y-.52)/(1.16-.52),0,1);
  return radians(5+20*inside+20*(1-high));
}
export function rotateY(v,a){
  const c=Math.cos(a),s=Math.sin(a);
  return new V3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);
}
export function impactBatPose(x,y){
  const inside=clamp((x+PLATE_HALF)/(2*PLATE_HALF),0,1);
  const tilt=barrelAngle(x,y);
  const forward=radians(10+25*inside);
  const h=Math.cos(tilt);
  const dir=new V3(-h*Math.cos(forward),-Math.sin(tilt),h*Math.sin(forward)).normalize();
  const contact=new V3(x,y,idealImpactZ(x));
  const hand=contact.clone().addScaledVector(dir,-GRIP_TO_CONTACT);
  return{hand,dir,contact};
}
const SWEET_MID=(SWEET_START+SWEET_END)/2;

// Smooth cubic path for the sweet spot. Its control points preserve both a
// nearly straight approach into contact and an ascending finish after contact.
function cubic(p0,p1,p2,p3,t){
  const u=1-t;
  return p0.clone().multiplyScalar(u*u*u)
    .addScaledVector(p1,3*u*u*t)
    .addScaledVector(p2,3*u*t*t)
    .addScaledVector(p3,t*t*t);
}
function smoothstep(t){return t*t*(3-2*t);}
export function swingPoseBundle(x,y,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  const impact=impactBatPose(x,y);
  const core=impact.hand.clone().addScaledVector(impact.dir,SWEET_MID);
  // Right-handed player: launch from the hands/inside and slightly behind,
  // then approach across the plate. +Z is toward the pitcher.
  const approachStart=core.clone().add(new V3(.78,.43,-.34));
  const approachC1=approachStart.clone(); // starts from rest
  // Nearly tangent to the intended swing plane as the core reaches the ball:
  // lateral travel toward the far side plus a small upward component.
  const approachC2=core.clone().add(new V3(.31,-.055,-.105));
  const finish=core.clone().add(new V3(-1.06,.64,.49));
  return{
    impact,core,approachStart,approachC1,approachC2,finish,
    stanceElevationDeg:clamp(Number(stanceElevationDeg)||DEFAULT_STANCE_ELEVATION_DEG,45,85)
  };
}
export function swingPoseAt(ms,sw){
  const t=clamp(ms,sw.motionStart,sw.impactAt+sw.followMs);
  const pre=t<=sw.impactAt;
  const durationIn=Math.max(1,sw.toImpactMs),durationOut=Math.max(1,sw.followMs);
  const q=pre?clamp((t-sw.motionStart)/durationIn,0,1):
    clamp((t-sw.impactAt)/durationOut,0,1);
  const b=sw.bundle;

  let core,yawDeg,elevation;
  const impactElevation=Math.asin(clamp(b.impact.dir.y,-1,1));
  if(pre){
    // Cubic controls make approach near-linear in XZ and smoothly turn upward
    // near the actual impact, rather than traversing a symmetric disc arc.
    core=cubic(b.approachStart,b.approachC1,b.approachC2,b.core,q);
    // Hermite yaw from -60deg to 0deg: zero start velocity, positive contact
    // velocity. Contact yaw velocity will match the follow-through branch.
    const h00=2*q*q*q-3*q*q+1,h11=q*q*q-q*q;
    yawDeg=-60*h00+75*h11;
    elevation=radians(b.stanceElevationDeg)
      +(impactElevation-radians(b.stanceElevationDeg))*smoothstep(q);
  }else{
    // Match cubic first derivatives at the impact point in world time:
    // (C-P2)/toImpactMs == (P1-C)/followMs.
    const continuation=b.core.clone().addScaledVector(
      b.core.clone().sub(b.approachC2),durationOut/durationIn);
    core=cubic(b.core,continuation,b.finish,b.finish,q);
    const h10=q*q*q-2*q*q+q,h01=-2*q*q*q+3*q*q;
    yawDeg=75*durationOut/durationIn*h10+115*h01;
    // Post-contact barrel elevation rises with the upward finish.
    elevation=impactElevation
      +(radians(24)-impactElevation)*smoothstep(q);
  }
  const horizontal=rotateY(
    new V3(b.impact.dir.x,0,b.impact.dir.z).normalize(),radians(yawDeg));
  const dir=new V3(
    horizontal.x*Math.cos(elevation),Math.sin(elevation),
    horizontal.z*Math.cos(elevation)
  ).normalize();
  // Derive hands from the actual sweet-spot trajectory so the visible bat,
  // its core, and the collision segment cannot diverge.
  const hand=core.clone().addScaledVector(dir,-SWEET_MID);
  return{hand,dir,core};
}

export function sweetSegment(pose){
  return{
    a:pose.hand.clone().addScaledVector(pose.dir,SWEET_START),
    b:pose.hand.clone().addScaledVector(pose.dir,SWEET_END)
  };
}
export function pointOnSweet(pose,t){
  const seg=sweetSegment(pose);
  return seg.a.clone().lerp(seg.b,t);
}
export function swingTiming(speed=2,impactAt=0){
  const safeSpeed=clamp(Number(speed)||2,1,4);
  const toImpactMs=BASE_TO_CONTACT_MS/safeSpeed;
  const followMs=BASE_FOLLOW_THROUGH_MS/safeSpeed;
  return{motionStart:impactAt-toImpactMs,impactAt,toImpactMs,followMs,
    finishAt:impactAt+followMs};
}
export function swingAtAim(x,y,speed=2,impactAt=0,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  return{bundle:swingPoseBundle(x,y,stanceElevationDeg),...swingTiming(speed,impactAt)};
}
