// Adapter between the preserved 2026-11-14 playtest UI and the newer
// Figure 11-B (−22.4°), 0° follow-plane swing research model.
// No independent trajectory is generated here: both bat rendering and
// contact physics use the same transformed research batPose.
// Three.js is imported because the existing playtest expects Vector3 poses.
import * as THREE from 'three';
import {PLATE_FRONT} from './pitch-model.js';
import {
  GAME_SWING_CONFIG,validateSwingSource,makeGameSwingBundle,
  researchPoseAt,gameSwingPose
} from './game-swing-bridge.mjs';

export const IMPACT_SLOPE=.4633; // preserve PR #2 shallow contact surface
export const BAT_LENGTH=GAME_SWING_CONFIG.physicalBatLengthM;
export const GRIP_TO_CONTACT=GAME_SWING_CONFIG.gripToSweetM;
export const SWEET_START=GAME_SWING_CONFIG.sweetStartM;
export const SWEET_END=GAME_SWING_CONFIG.sweetEndM;
export const BAT_GRIP_OFFSET=GAME_SWING_CONFIG.gripToKnobM;
export const BAT_EFFECTIVE_TIP=GAME_SWING_CONFIG.gripToTipM;

// Legacy playtest supports an invisible/preloaded preparation phase.
export const BASE_PREP_MS=220; // 110ms at 2x; source 250..334
export const BASE_TO_CONTACT_MS=80; // 40ms at 2x; source 334..341
export const BASE_FOLLOW_THROUGH_MS=440; // 220ms at 2x; source 341..390

let capture=null;
export function installCapturedMotion(data){
  capture=validateSwingSource(data);
  return capture;
}
export function isCapturedMotionReady(){return capture!==null;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function idealImpactZ(x){return PLATE_FRONT+IMPACT_SLOPE*x;}

// This reference angle is for the game-selected contact pose only.
// The actual bat axis at all other frames comes from batPose in research.
export function barrelAngle(){return THREE.MathUtils.degToRad(22.4);}

function toVector(v){return new THREE.Vector3(v[0],v[1],v[2]);}
function asThreePose(data){
  return {
    hand:toVector(data.hand),
    dir:toVector(data.dir),
    barrel:data.barrel&&toVector(data.barrel),
    sweet:data.sweet&&toVector(data.sweet),
    sourceFrame:data.sourceFrame
  };
}
export function swingPoseBundle(x,y){
  if(!capture)throw Error('CMU source not yet loaded');
  return makeGameSwingBundle(capture,[x,y,idealImpactZ(x)]);
}
export function impactBatPose(x,y){
  const bundle=swingPoseBundle(x,y);
  const model=researchPoseAt(capture,GAME_SWING_CONFIG.contactFrame);
  return {
    hand:toVector(model.grip.map((v,i)=>v+bundle.translation[i])),
    dir:toVector(model.dir),
    contact:new THREE.Vector3(x,y,idealImpactZ(x))
  };
}

// The PR#2 input model keeps its 110ms preloaded preparation. At finger
// release we are already at source frame 334, and 40ms later we reach 341.
// This playback retiming is a GAME assumption, not the CMU capture timing.
export function swingPoseAt(ms,sw){
  if(!sw||!sw.bundle||!sw.bundle.data)throw Error('Motion bundle missing');
  const launch=Number.isFinite(sw.launchStart)?sw.launchStart:
      (sw.impactAt-sw.toImpactMs);
  if(ms<launch){
    const q=clamp((ms-sw.motionStart)/
      Math.max(.001,launch-sw.motionStart),0,1);
    const originalFrame=sw.bundle.data.clipStartFrame+
      q*(GAME_SWING_CONFIG.releaseFrame-sw.bundle.data.clipStartFrame);
    const pose=researchPoseAt(sw.bundle.data,originalFrame);
    const hand=pose.grip.map((v,i)=>v+sw.bundle.translation[i]);
    return asThreePose({
      hand,dir:pose.dir,
      barrel:pose.barrel.map((v,i)=>v+sw.bundle.translation[i]),
      sweet:pose.sweet.map((v,i)=>v+sw.bundle.translation[i]),
      sourceFrame:originalFrame
    });
  }
  // Use the exact shared gameplay bridge from release to end of follow-through.
  return asThreePose(gameSwingPose(ms,{...sw,motionStart:launch}));
}
export function sweetSegment(pose){
  return {
    a:pose.hand.clone().addScaledVector(pose.dir,SWEET_START),
    b:pose.hand.clone().addScaledVector(pose.dir,SWEET_END)
  };
}
export function pointOnSweet(pose,t){
  const s=sweetSegment(pose);
  return s.a.clone().lerp(s.b,clamp(t,0,1));
}
