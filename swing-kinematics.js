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
export const BASE_TO_CONTACT_MS=80; // 40ms release-to-contact at 2x; gameplay control latency.
export const BASE_PREP_MS=220; // 110ms prelaunch loading at 2x; complete downswing = 150ms.
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
// The grip remains close to the hitter and the barrel rotates about it.
// The earlier model incorrectly drove the sweet spot across the field and
// derived the grip from it (over 2 m of grip displacement). This restores
// a compact hand arc, independently evolving bat azimuth and elevation.
// The game starts the final quick phase on release; the full 3-phase motion
// from upright stance can be inspected in the three-camera lab.

// Cubic Hermite interpolation with endpoint velocities in units per ms.
// This guarantees continuity at the preparation -> launch -> follow joins.
function hermite(a,b,va,vb,elapsed,duration){
  const q=clamp(elapsed/Math.max(.001,duration),0,1);
  const q2=q*q,q3=q2*q,dt=duration;
  return (2*q3-3*q2+1)*a+(q3-2*q2+q)*va*dt
       +(-2*q3+3*q2)*b+(q3-q2)*vb*dt;
}
export function swingPoseBundle(x,y,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  const impact=impactBatPose(x,y);
  // A short curved grip path with the body/arms pivot close to the hitter.
  const handPivot=impact.hand.clone().add(new V3(.32,0,.15));
  const handRadius=impact.hand.clone().sub(handPivot);
  return{impact,handPivot,handRadius,
    stanceElevationDeg:clamp(Number(stanceElevationDeg)||DEFAULT_STANCE_ELEVATION_DEG,45,85)};
}
export function swingPoseAt(ms,sw){
  const t=clamp(ms,sw.motionStart,sw.finishAt??(sw.impactAt+sw.followMs));
  const prepMs=sw.prepMs??(BASE_PREP_MS/2);
  const launchStart=sw.launchStart??(sw.impactAt-sw.toImpactMs);
  const impactElevation=THREE.MathUtils.radToDeg(Math.asin(clamp(sw.bundle.impact.dir.y,-1,1)));
  let gripPhase,yawDeg,elevationDeg,gripLift;
  if(t<=launchStart){
    // Preparation: stand the bat upright, then smoothly slot it down.
    const elapsed=t-sw.motionStart;
    const rate=110/Math.max(1,prepMs);
    gripPhase=hermite(-.75,-.48,0,.002*rate,elapsed,prepMs);
    yawDeg=hermite(100,65,0,-.18*rate,elapsed,prepMs);
    elevationDeg=hermite(sw.bundle.stanceElevationDeg,-10,0,-.25*rate,elapsed,prepMs);
    gripLift=hermite(.05,.015,0,-.0004*rate,elapsed,prepMs);
  }else if(t<=sw.impactAt){
    // The last 40ms at default game speed: wrists release the barrel rapidly.
    const elapsed=t-launchStart,dur=sw.toImpactMs;
    // Scale rates with game speed so changing speed doesn't reshape the arc.
    const rate=40/Math.max(1,dur);
    gripPhase=hermite(-.48,0,.002*rate,.009*rate,elapsed,dur);
    yawDeg=hermite(65,0,-.18*rate,-2.4*rate,elapsed,dur);
    elevationDeg=hermite(-10,impactElevation,-.25*rate,.22*rate,elapsed,dur);
    gripLift=hermite(.015,0,-.0004*rate,0,elapsed,dur);
  }else{
    const elapsed=t-sw.impactAt,dur=sw.followMs;
    const rate=110/Math.max(1,dur);
    gripPhase=hermite(0,.65,.009*rate,0,elapsed,dur);
    yawDeg=hermite(0,-135,-2.4*rate,0,elapsed,dur);
    elevationDeg=hermite(impactElevation,10,.22*rate,0,elapsed,dur);
    gripLift=hermite(0,.04,0,0,elapsed,dur);
  }
  const grip=sw.bundle.handPivot.clone()
    .add(rotateY(sw.bundle.handRadius,gripPhase));
  grip.y+=gripLift;
  const impactDir=sw.bundle.impact.dir;
  const horizontal=rotateY(
    new V3(impactDir.x,0,impactDir.z).normalize(),radians(yawDeg));
  const e=radians(elevationDeg);
  const dir=new V3(
    horizontal.x*Math.cos(e),Math.sin(e),horizontal.z*Math.cos(e)
  ).normalize();
  return{hand:grip,dir,gripPhase,yawDeg,elevationDeg};
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
  const prepMs=BASE_PREP_MS/safeSpeed;
  const followMs=BASE_FOLLOW_THROUGH_MS/safeSpeed;
  const launchStart=impactAt-toImpactMs;
  return{
    motionStart:launchStart-prepMs,launchStart,prepMs,
    impactAt,toImpactMs,followMs,finishAt:impactAt+followMs
  };
}
export function swingAtAim(x,y,speed=2,impactAt=0,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  return{bundle:swingPoseBundle(x,y,stanceElevationDeg),...swingTiming(speed,impactAt)};
}
