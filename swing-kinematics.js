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
export const BASE_TO_CONTACT_MS=220; // 110 ms to contact at default 2x; includes barrel drop from launch posture.
export const DEFAULT_STANCE_ELEVATION_DEG=70; // Adjustable; no universal batting stance exists.
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
export function swingPoseBundle(x,y,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  const impact=impactBatPose(x,y);
  // Shoulder/torso surrogate is offset from impact grip; motion of the grip
  // traces a short curved arc around it instead of translating linearly.
  const pivot=impact.hand.clone().add(new V3(.28,-.035,-.05));
  const radius=impact.hand.clone().sub(pivot);
  return{impact,pivot,radius,stanceElevationDeg:clamp(Number(stanceElevationDeg)||DEFAULT_STANCE_ELEVATION_DEG,45,85)};
}
export function swingPoseAt(ms,sw){
  const t=clamp(ms,sw.motionStart,sw.impactAt+sw.followMs);
  const raw=(t-sw.impactAt)/Math.max(1,sw.toImpactMs);
  const followRatio=Math.max(.001,sw.followMs/Math.max(1,sw.toImpactMs));
  // Ease angular motion in/out without changing the contact pose or velocity.
  // f'(motion start)=0, f'(impact)=1, f'(follow finish)=0.
  let u;
  if(raw<0){
    const q=clamp(raw+1,0,1);
    u=-1+2*q*q-q*q*q;
  }else{
    const q=clamp(raw,0,followRatio);
    u=q+q*q/followRatio-q*q*q/(followRatio*followRatio);
  }
  // Torso/hand rotation starts sooner; rapid bat release follows. Both
  // curves are continuous in angle AND angular velocity through contact.
  // The offsets pin both curves to zero at the intended contact time.
  const handYaw=radians(42*(Math.tanh(1.25*(u+.35))-ZERO_YAW_OFFSET));
  const batYaw=radians(105*(Math.tanh(1.2*(u-.22))+ZERO_BARREL_OFFSET));
  const hand=sw.bundle.pivot.clone().add(rotateY(sw.bundle.radius,handYaw));
  // The barrel is cocked high in the loading posture and drops as the torso
  // and hands begin moving. The launch elevation is a stance preference,
  // NOT a fixed value measured for every batter.
  const impactDir=sw.bundle.impact.dir;
  const impactElevation=Math.asin(clamp(impactDir.y,-1,1));
  const stanceElevation=radians(sw.bundle.stanceElevationDeg);
  const loadRatio=clamp(-u,0,1);
  const loadWeight=loadRatio*loadRatio*(3-2*loadRatio); // zero derivative at impact
  // Small up-swing variation after the barrel is lowered; continuous at contact.
  const elevation=impactElevation+(stanceElevation-impactElevation)*loadWeight
    +.04*Math.tanh(u)*(1-loadWeight);
  const horizontal=rotateY(new V3(impactDir.x,0,impactDir.z).normalize(),batYaw);
  const dir=new V3(
    horizontal.x*Math.cos(elevation),Math.sin(elevation),horizontal.z*Math.cos(elevation)
  ).normalize();
  return{hand,dir,handYaw,batYaw,elevation};
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
