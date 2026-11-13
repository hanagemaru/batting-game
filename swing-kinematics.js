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
export const BASE_TO_CONTACT_MS=100;
export const BASE_FOLLOW_THROUGH_MS=220;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const radians=THREE.MathUtils.degToRad;
const V3=THREE.Vector3;
const ZERO_YAW_OFFSET=Math.tanh(1.25*.35);
const ZERO_BARREL_OFFSET=Math.tanh(1.2*.22);

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
export function swingPoseBundle(x,y){
  const impact=impactBatPose(x,y);
  // Shoulder/torso surrogate is offset from impact grip; motion of the grip
  // traces a short curved arc around it instead of translating linearly.
  const pivot=impact.hand.clone().add(new V3(.28,-.035,-.05));
  const radius=impact.hand.clone().sub(pivot);
  return{impact,pivot,radius};
}
export function swingPoseAt(ms,sw){
  const t=clamp(ms,sw.motionStart,sw.impactAt+sw.followMs);
  const u=(t-sw.impactAt)/Math.max(1,sw.toImpactMs);
  // Torso/hand rotation starts sooner; rapid bat release follows. Both
  // curves are continuous in angle AND angular velocity through contact.
  // The offsets pin both curves to zero at the intended contact time.
  const handYaw=radians(42*(Math.tanh(1.25*(u+.35))-ZERO_YAW_OFFSET));
  const batYaw=radians(105*(Math.tanh(1.2*(u-.22))+ZERO_BARREL_OFFSET));
  const hand=sw.bundle.pivot.clone().add(rotateY(sw.bundle.radius,handYaw));
  const dir=rotateY(sw.bundle.impact.dir,batYaw);
  // A mild vertical component (zero at contact) provides a non-planar path.
  dir.y+=.055*Math.tanh(.9*u);
  dir.normalize();
  return{hand,dir,handYaw,batYaw};
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
export function swingAtAim(x,y,speed=2,impactAt=0){
  return{bundle:swingPoseBundle(x,y),...swingTiming(speed,impactAt)};
}
