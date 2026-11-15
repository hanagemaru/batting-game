// Node regression tests: research-only body mocap + inferred bat azimuth.
// Run: node research/verify-bat-hypothesis.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 batPose,REFERENCE_PRESETS,BAT_LENGTH_M,BAT_TOTAL_LENGTH_M,GRIP_OFFSET_M,
 SWEET_M,CONTACT_FRAME,FOLLOW_THROUGH_DEG,overheadAngleDegrees
} from './bat-hypothesis.mjs';

const src=JSON.parse(readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8'));
const mag=v=>Math.hypot(...v);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
const azimuth=dir=>Math.atan2(dir[2],-dir[0])*180/Math.PI;
const unwrap=(a,b)=>{let diff=b-a;while(diff>180)diff-=360;while(diff< -180)diff+=360;return diff;};
const impact=CONTACT_FRAME-src.clipStartFrame;
assert.equal(CONTACT_FRAME,341);assert.equal(FOLLOW_THROUGH_DEG,195);
assert.equal(BAT_LENGTH_M,.74);assert.equal(BAT_TOTAL_LENGTH_M,.864);assert.equal(SWEET_M,.61);
assert.ok(Math.abs(GRIP_OFFSET_M-.124)<1e-8);
assert.match(src.unavailable,/no measured bat markers/);
for(const [frame,degree]of [[334,-90],[341,0],[346,90],[390,195]]){
 assert.ok(Math.abs(overheadAngleDegrees(frame)-degree)<1e-8,frame+' azimuth differs');
}
let checked=0,maxPlane=0,maxLengthError=0,maxFullBatError=0,maxHandMovement=0;
let maxOrientationStep=0,maxImpactSpeedJumpRatio=0,minContactSpeedRatio=1;
let minTopTurn=Infinity,maxTopTurn=-Infinity,maxTipSpeed=0;
const peakHeadFrames=new Set(),peakSweetFrames=new Set();
function tipSpeed(t,profile,rise,key){
 const delta=.05,o={profile,exitRiseDeg:rise};
 const a=batPose(src,t-delta,o)[key],b=batPose(src,t+delta,o)[key];
 return mag(a.map((v,i)=>b[i]-v))*src.fps/(2*delta);
}
const ki=name=>src.jointNames.indexOf(name)*3;
for(const profile of Object.keys(REFERENCE_PRESETS)){
 for(const rise of [-10,8,20]){
  const o={profile,exitRiseDeg:rise};
  const states=Array.from({length:src.frames.length},(_,i)=>batPose(src,i,o));
  const plane=states[impact].planeNormal;
  const az=states.map(p=>azimuth(p.dir));
  for(const [frame,expected] of [[334,-90],[341,0],[346,90]]){
   assert.ok(Math.abs(az[frame-src.clipStartFrame]-expected)<1e-8,
     frame+' overhead view is not exact at profile '+profile+'/'+rise);
  }
  let turn=0;
  for(let i=impact+1;i<az.length;i++)turn+=unwrap(az[i-1],az[i]);
  minTopTurn=Math.min(minTopTurn,turn);maxTopTurn=Math.max(maxTopTurn,turn);
  assert.ok(Math.abs(turn-195)<1e-7,'Follow-through overhead turn is not +195 degrees');
  for(let i=0;i<states.length;i++){
   const p=states[i],row=src.frames[i];
   const left=row.slice(ki('handL'),ki('handL')+3);
   const right=row.slice(ki('handR'),ki('handR')+3);
   const gripReference=left.map((v,k)=>(v+right[k])/2);
   maxHandMovement=Math.max(maxHandMovement,mag(p.grip.map((v,k)=>v-gripReference[k])));
   const effective=mag(p.barrel.map((v,k)=>v-p.grip[k]));
   const sweet=mag(p.sweet.map((v,k)=>v-p.grip[k]));
   const full=mag(p.barrel.map((v,k)=>v-p.knob[k]));
   assert.ok(p.grip.every(Number.isFinite)&&p.dir.every(Number.isFinite),'Invalid pose');
   maxLengthError=Math.max(maxLengthError,Math.abs(effective-BAT_LENGTH_M),Math.abs(sweet-SWEET_M));
   maxFullBatError=Math.max(maxFullBatError,Math.abs(full-BAT_TOTAL_LENGTH_M));
   if(i>=impact)maxPlane=Math.max(maxPlane,Math.abs(dot(plane,p.dir)));
   if(i>0)maxOrientationStep=Math.max(maxOrientationStep,angle(p.dir,states[i-1].dir));
   checked++;
  }
  const tip=Array.from({length:src.frames.length},(_,i)=>tipSpeed(i,profile,rise,'barrel'));
  const sweet=Array.from({length:src.frames.length},(_,i)=>tipSpeed(i,profile,rise,'sweet'));
  const peakHead=Math.max(...tip),peakSweet=Math.max(...sweet);
  maxTipSpeed=Math.max(maxTipSpeed,peakHead);
  const peakHeadFrame=src.clipStartFrame+tip.indexOf(peakHead);
  const peakSweetFrame=src.clipStartFrame+sweet.indexOf(peakSweet);
  peakHeadFrames.add(peakHeadFrame);peakSweetFrames.add(peakSweetFrame);
  assert.ok(peakHeadFrame>=340&&peakHeadFrame<=342,'Tip speed no longer peaks near frame 341');
  assert.ok(peakSweetFrame>=340&&peakSweetFrame<=342,'Sweet spot speed no longer peaks near frame 341');
  minContactSpeedRatio=Math.min(minContactSpeedRatio,tip[impact]/peakHead,sweet[impact]/peakSweet);
  const before=tipSpeed(impact-.05,profile,rise,'barrel');
  const after=tipSpeed(impact+.05,profile,rise,'barrel');
  maxImpactSpeedJumpRatio=Math.max(maxImpactSpeedJumpRatio,Math.abs(before-after)/tip[impact]);
 }
}
assert.ok(maxPlane<1e-9,'Bat leaves chosen post-contact rotation plane');
assert.ok(maxLengthError<1e-9&&maxFullBatError<1e-9,'Rigid bat geometry changed');
assert.ok(maxHandMovement<1e-9,'CMU-derived wrist-midpoint trajectory changed');
assert.ok(maxOrientationStep<.5,'Excessive angular discontinuity');
assert.ok(minContactSpeedRatio>.97,'Velocity too far below peak at frame 341');
assert.ok(maxImpactSpeedJumpRatio<.02,'Impact speed has discontinuity');
console.log(JSON.stringify({
 status:'PASS',testedPoses:checked,
 overheadAt334:-90,overheadAt341:0,overheadAt346:90,
 followThroughOverheadRangeDeg:[minTopTurn,maxTopTurn],
 peakHeadFrames:[...peakHeadFrames],peakSweetFrames:[...peakSweetFrames],
 minimumContactToPeakSpeedRatio:minContactSpeedRatio,
 maximumEstimatedTipSpeedMs:maxTipSpeed,
 maximumImpactSpeedJumpRatio:maxImpactSpeedJumpRatio,
 maxInterframeAngleDeg:maxOrientationStep*180/Math.PI,
 maxHandMidpointDifferenceMeters:maxHandMovement,
 maxRigidLengthDifferenceMeters:Math.max(maxLengthError,maxFullBatError),
 qualification:'Only the model bat azimuth changed. The CMU skeletal motion and hand trajectories remain unchanged.'
},null,2));
