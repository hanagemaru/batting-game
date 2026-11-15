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
  // At the selected (x,y) impact depth, the bat points horizontally across
  // the plate in TOP VIEW. Pitch/vertical barrel tilt is preserved.
  const h=Math.cos(tilt);
  const dir=new V3(-h,-Math.sin(tilt),0).normalize();
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

// Quintic Hermite: adjacent phases match position, angular velocity and
// angular acceleration, eliminating the snap of the old cubic keyframes.
function hermite(a,b,va,vb,elapsed,duration){
  const q=clamp(elapsed/Math.max(.001,duration),0,1);
  const dt=duration,d=b-a,
    c3=10*d-(6*va+4*vb)*dt,
    c4=-15*d+(8*va+7*vb)*dt,
    c5=6*d-(3*va+3*vb)*dt;
  return a+va*dt*q+c3*q*q*q+c4*q*q*q*q+c5*q*q*q*q*q;
}
function smootherstep(t){
  const q=clamp(t,0,1);
  return q*q*q*(10+q*(-15+6*q)); // zero velocity and acceleration at endpoints
}
// Construct complete 3D barrel direction poses. Both azimuth and elevation
// are used only for defining *large-scale controls*. Actual motion is a single
// spherical Bézier curve, not separately interpolated Euler angles.
function directionAt(impactDir,yawDeg,elevationDeg){
  const horizontal=rotateY(
    new V3(impactDir.x,0,impactDir.z).normalize(),radians(yawDeg));
  const elevation=radians(elevationDeg);
  return new V3(
    horizontal.x*Math.cos(elevation),Math.sin(elevation),
    horizontal.z*Math.cos(elevation)
  ).normalize();
}
function slerpUnit(a,b,t){
  const dot=clamp(a.dot(b),-1,1);
  if(dot>.99999)return a.clone().lerp(b,t).normalize();
  // All design controls are far from antipodal; extension >1 only occurs
  // when constructing the matched follow-through tangent.
  const angle=Math.acos(dot),invSin=1/Math.sin(angle);
  return a.clone().multiplyScalar(Math.sin((1-t)*angle)*invSin)
    .addScaledVector(b,Math.sin(t*angle)*invSin).normalize();
}
function sphericalBezier(a,b,c,d,q){
  const p=slerpUnit(a,b,q),r=slerpUnit(b,c,q),v=slerpUnit(c,d,q);
  const w=slerpUnit(p,r,q),x=slerpUnit(r,v,q);
  return slerpUnit(w,x,q);
}
export function swingPoseBundle(x,y,stanceElevationDeg=DEFAULT_STANCE_ELEVATION_DEG){
  const impact=impactBatPose(x,y);
  const handPivot=impact.hand.clone().add(new V3(.32,0,.15));
  const handRadius=impact.hand.clone().sub(handPivot);
  const stance=clamp(Number(stanceElevationDeg)||DEFAULT_STANCE_ELEVATION_DEG,45,85);
  const impactElevation=THREE.MathUtils.radToDeg(
    Math.asin(clamp(impact.dir.y,-1,1)));
  const first=directionAt(impact.dir,-100,stance);
  const second=directionAt(impact.dir,-100,stance-4);
  // "Slot" control: slightly below the contact plane and still trailing.
  // This produces a smooth 3D drop-and-turn over the full loading interval.
  // Keep the incoming tangent close to the intended swing plane. A milder
  // approach improves the follow-through slope without changing contact.
  const incomingControl=directionAt(impact.dir,-65,
    clamp(impactElevation+3,-58,-8));
  const contact=impact.dir.clone();
  // Match angular velocity at contact, accounting for different branch
  // durations and time-warp derivatives (1.4 before, 2.0 after).
  const followRatio=BASE_FOLLOW_THROUGH_MS/
    (BASE_PREP_MS+BASE_TO_CONTACT_MS);
  const afterContactControl=slerpUnit(incomingControl,contact,
    1+followRatio*1.4/2);
  // Continue the SAME great-circle swing plane defined by the last
  // incoming control and contact direction. Do not force independent
  // high/east finish orientations that break the preceding swing plane.
  // Retain the exact incoming tangent at contact, then finish in the SAME
  // great-circle plane with a shorter angular sweep. The previous finish
  // ran almost 100 degrees beyond contact, which over-lifted the barrel.
  const followControl=slerpUnit(incomingControl,contact,
    1+followRatio*1.4*.85);
  const followEnd=slerpUnit(incomingControl,contact,
    1+followRatio*1.4*1.10);
  return{
    impact,handPivot,handRadius,stanceElevationDeg:stance,
    orientation:{first,second,incomingControl,contact,afterContactControl,
      followControl,followEnd}
  };
}
export function swingPoseAt(ms,sw){
  const t=clamp(ms,sw.motionStart,sw.finishAt??(sw.impactAt+sw.followMs));
  const prepMs=sw.prepMs??(BASE_PREP_MS/2);
  const launchStart=sw.launchStart??(sw.impactAt-sw.toImpactMs);
  const beforeContact=t<=sw.impactAt;
  let gripPhase,gripLift;
  if(t<=launchStart){
    const elapsed=t-sw.motionStart,rate=110/Math.max(1,prepMs);
    gripPhase=hermite(-.75,-.48,0,.002*rate,elapsed,prepMs);
    gripLift=hermite(.05,.015,0,-.0004*rate,elapsed,prepMs);
  }else if(beforeContact){
    const elapsed=t-launchStart,dur=sw.toImpactMs,
      rate=40/Math.max(1,dur);
    gripPhase=hermite(-.48,0,.002*rate,.009*rate,elapsed,dur);
    gripLift=hermite(.015,0,-.0004*rate,0,elapsed,dur);
  }else{
    const elapsed=t-sw.impactAt,dur=sw.followMs,
      rate=110/Math.max(1,dur);
    gripPhase=hermite(0,.65,.009*rate,0,elapsed,dur);
    gripLift=hermite(0,.04,0,0,elapsed,dur);
  }
  const grip=sw.bundle.handPivot.clone()
    .add(rotateY(sw.bundle.handRadius,gripPhase));
  grip.y+=gripLift;

  const o=sw.bundle.orientation;
  let dir;
  if(beforeContact){
    // One global rotation from upright stance to contact.
    // An accelerated time map keeps contact speed nonzero, while startup
    // is gentle; crucially there is NO orientation keyframe at launchStart.
    const total=Math.max(1,sw.impactAt-sw.motionStart);
    const progress=clamp((t-sw.motionStart)/total,0,1);
    const q=Math.pow(progress,1.4);
    dir=sphericalBezier(o.first,o.second,o.incomingControl,o.contact,q);
  }else{
    const progress=clamp((t-sw.impactAt)/Math.max(1,sw.followMs),0,1);
    // Derivative starts at 2 and finishes at 0, meeting the incoming
    // angular tangent and gently stopping the follow-through.
    const q=2*progress-progress*progress;
    dir=sphericalBezier(o.contact,o.afterContactControl,
      o.followControl,o.followEnd,q);
  }
  return{hand:grip,dir,gripPhase};
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
