// CMU measured-hand + modeled-bat bridge for batting-game/game.html.
// Settings intentionally frozen in gameplay: Figure 11 B and rise=0°.
// For later adjustments, keep research/swing-constrained-lab.html editable.
// This code consumes EXACTLY the same batPose() output as the collision scanner.
import {batPose, BAT_TOTAL_LENGTH_M, BAT_LENGTH_M, SWEET_M,
  GRIP_OFFSET_M, CONTACT_FRAME, REFERENCE_PRESETS} from './research/bat-hypothesis.mjs';

export const GAME_SWING_CONFIG=Object.freeze({
  profile:'B',exitRiseDeg:0,contactFrame:CONTACT_FRAME,
  releaseFrame:334,followEndFrame:390,
  physicalBatLengthM:BAT_TOTAL_LENGTH_M,
  gripToTipM:BAT_LENGTH,gripToSweetM:SWEET_M,
  gripToKnobM:GRIP_OFFSET_M,
  sweetStartM:.53,sweetEndM:.69
});
if(REFERENCE_PRESETS.B.inclinationDeg!==-22.4)
 throw Error('Figure 11 B reference has changed; review game settings');

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);

export function validateSwingSource(data){
  if(!data||data.subject!==124||data.trial!==7||data.clipStartFrame!==250
    ||data.clipEndFrame!==390||!Array.isArray(data.frames)
    ||data.frames.length!==141||data.jointNames?.length!==15
    ||data.frames.some(row=>row.length!==45||row.some(v=>!Number.isFinite(v)))){
    throw Error('CMU 124_07 motion data failed integrity check');
  }
  return data;
}

// Data samples are numbered as ORIGINAL CMU frames in this API.
export function researchPoseAt(data,sourceFrame){
  return batPose(data,clamp(sourceFrame-data.clipStartFrame,0,data.frames.length-1),
    GAME_SWING_CONFIG);
}

// Translate the entire recorded hand trajectory uniformly to align the
// 341-frame sweet spot with the selected (x,y,z) aiming point.
// No re-sampling, smoothing or independent interpolation of hands.
export function makeGameSwingBundle(data,aim){
  validateSwingSource(data);
  if(!Array.isArray(aim)||aim.length!==3||!aim.every(Number.isFinite))throw Error('Invalid aim');
  const measuredAtImpact=researchPoseAt(data,CONTACT_FRAME);
  const translation=sub(aim,measuredAtImpact.sweet);
  return {data,aim:aim.slice(),translation,profile:'B',exitRiseDeg:0};
}

export function mapGameSwingFrame(ms,sw){
  if(ms<=sw.motionStart)return GAME_SWING_CONFIG.releaseFrame;
  if(ms<=sw.impactAt){
    return GAME_SWING_CONFIG.releaseFrame+
      clamp((ms-sw.motionStart)/Math.max(.001,sw.toImpactMs),0,1)*
      (CONTACT_FRAME-GAME_SWING_CONFIG.releaseFrame);
  }
  return CONTACT_FRAME+
    clamp((ms-sw.impactAt)/Math.max(.001,sw.followMs),0,1)*
    (GAME_SWING_CONFIG.followEndFrame-CONTACT_FRAME);
}

export function gameSwingPose(ms,sw){
  const sourceFrame=mapGameSwingFrame(ms,sw);
  const model=researchPoseAt(sw.bundle.data,sourceFrame);
  return {
    hand:add(model.grip,sw.bundle.translation),
    dir:model.dir.slice(),
    sweet:add(model.sweet,sw.bundle.translation),
    barrel:add(model.barrel,sw.bundle.translation),
    knob:add(model.knob,sw.bundle.translation),
    sourceFrame,poseKind:'modeled-bat-on-CMU-measured-hand-track'
  };
}

export function gameplaySweetSegment(pose){
  return{
    a:add(pose.hand,pose.dir.map(v=>v*GAME_SWING_CONFIG.sweetStartM)),
    b:add(pose.hand,pose.dir.map(v=>v*GAME_SWING_CONFIG.sweetEndM))
  };
}
