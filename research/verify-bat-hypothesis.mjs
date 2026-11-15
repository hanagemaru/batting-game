// Node regression tests for the RESEARCH bat hypothesis; never measured bat motion.
// Run: node research/verify-bat-hypothesis.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 batPose,REFERENCE_PRESETS,BAT_LENGTH_M,BAT_TOTAL_LENGTH_M,GRIP_OFFSET_M,
 SWEET_M,CONTACT_FRAME,FOLLOW_THROUGH_DEG
} from './bat-hypothesis.mjs';

const src=JSON.parse(readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8'));
const mag=v=>Math.hypot(...v);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
const azimuth=dir=>Math.atan2(dir[2],-dir[0])*180/Math.PI;
const unwrap=(a,b)=>{let d=b-a;while(d>180)d-=360;while(d< -180)d+=360;return d;};
const impact=CONTACT_FRAME-src.clipStartFrame;
assert.equal(CONTACT_FRAME,341);
assert.equal(FOLLOW_THROUGH_DEG,195);
assert.equal(BAT_LENGTH_M,.74);
assert.equal(BAT_TOTAL_LENGTH_M,.864);
assert.equal(SWEET_M,.61);
assert.ok(Math.abs(GRIP_OFFSET_M-.124)<1e-8);
assert.match(src.unavailable,/no measured bat markers/);
let poses=0,maxPlane=0,maxLengthError=0,maxFullBatError=0;
let maxOrientationStep=0,maxImpactSpeedJumpRatio=0,minContactSpeedRatio=1;
let minTopTurn=Infinity,maxTopTurn=-Infinity;
let minPreTurn=Infinity;
const peakHeadFrames=new Set(),peakSweetFrames=new Set();
function tipSpeed(t,profile,rise,key){
 const delta=.05,o={profile,exitRiseDeg:rise};
 const a=batPose(src,t-delta,o)[key],b=batPose(src,t+delta,o)[key];
 return mag(a.map((v,i)=>b[i]-v))*src.fps/(2*delta);
}
for(const profile of Object.keys(REFERENCE_PRESETS)){
 for(const rise of [-10,8,20]){
  const o={profile,exitRiseDeg:rise};
  const states=Array.from({length:src.frames.length},(_,i)=>batPose(src,i,o));
  const plane=states[impact].planeNormal;
  assert.ok(Math.abs(states[impact].dir[2])<1e-12,'Contact direction must be square across plate from overhead');
  assert.ok(states[impact].dir[0]<0,'Contact barrel must face outward');
  const heading=states.map(p=>azimuth(p.dir));
  let postTurn=0;
  for(let i=impact+1;i<heading.length;i++)postTurn+=unwrap(heading[i-1],heading[i]);
  minTopTurn=Math.min(minTopTurn,postTurn);
  maxTopTurn=Math.max(maxTopTurn,postTurn);
  minPreTurn=Math.min(minPreTurn,unwrap(heading[0],heading[impact]));
  assert.ok(postTurn>190&&postTurn<205,'Follow-through overhead turn differs from requested +90 degrees');
  for(let i=0;i<states.length;i++){
   const p=states[i];
   const effective=mag(p.barrel.map((v,j)=>v-p.grip[j]));
   const sweet=mag(p.sweet.map((v,j)=>v-p.grip[j]));
   const full=mag(p.barrel.map((v,j)=>v-p.knob[j]));
   assert.ok(p.grip.every(Number.isFinite)&&p.dir.every(Number.isFinite),'Invalid pose');
   maxLengthError=Math.max(maxLengthError,Math.abs(effective-BAT_LENGTH_M),Math.abs(sweet-SWEET_M));
   maxFullBatError=Math.max(maxFullBatError,Math.abs(full-BAT_TOTAL_LENGTH_M));
   if(i>=impact)maxPlane=Math.max(maxPlane,Math.abs(dot(plane,p.dir)));
   if(i>0)maxOrientationStep=Math.max(maxOrientationStep,angle(p.dir,states[i-1].dir));
   poses++;
  }
  const head=Array.from({length:src.frames.length},(_,i)=>tipSpeed(i,profile,rise,'barrel'));
  const sweet=Array.from({length:src.frames.length},(_,i)=>tipSpeed(i,profile,rise,'sweet'));
  const maxHead=Math.max(...head),maxSweet=Math.max(...sweet);
  const topHeadFrame=src.clipStartFrame+head.indexOf(maxHead);
  const topSweetFrame=src.clipStartFrame+sweet.indexOf(maxSweet);
  peakHeadFrames.add(topHeadFrame);peakSweetFrames.add(topSweetFrame);
  assert.ok(topHeadFrame>=340&&topHeadFrame<=342,'Bat-tip speed should peak at estimated contact');
  assert.ok(topSweetFrame>=340&&topSweetFrame<=342,'Sweet-spot speed should peak at estimated contact');
  minContactSpeedRatio=Math.min(minContactSpeedRatio,head[impact]/maxHead,sweet[impact]/maxSweet);
  const left=tipSpeed(impact-.12,profile,rise,'barrel');
  const right=tipSpeed(impact+.12,profile,rise,'barrel');
  maxImpactSpeedJumpRatio=Math.max(maxImpactSpeedJumpRatio,Math.abs(right-left)/head[impact]);
 }
}
assert.ok(minPreTurn>75,'Precontact overhead turn was not increased');
assert.ok(maxPlane<1e-9,'Bat orientation changed post-contact swing plane');
assert.ok(maxLengthError<1e-9&&maxFullBatError<1e-9,'Rigid bat length or sweet spot changed');
assert.ok(maxOrientationStep<.22,'Angular orientation jumped between frames');
assert.ok(maxImpactSpeedJumpRatio<.02,'Impact speed jumped');
console.log(JSON.stringify({
 status:'PASS',testedPoses:poses,contactFrame:CONTACT_FRAME,
 effectiveTipMeters:BAT_LENGTH_M,sweetMeters:SWEET_M,fullBatMeters:BAT_TOTAL_LENGTH_M,
 followThroughSpatialDegrees:FOLLOW_THROUGH_DEG,
 overheadFollowTurnRangeDeg:[minTopTurn,maxTopTurn],
 minimumOverheadPrecontactTurnDeg:minPreTurn,
 peakHeadFrames:[...peakHeadFrames],peakSweetFrames:[...peakSweetFrames],
 minimumContactToPeakSpeedRatio:minContactSpeedRatio,
 maximumContactSpeedJumpRatio:maxImpactSpeedJumpRatio,
 maximumPostcontactPlaneDotError:maxPlane,
 maximumRigidLengthErrorMeters:Math.max(maxLengthError,maxFullBatError),
 maximumFrameToFrameOrientationDegrees:maxOrientationStep*180/Math.PI,
 qualifier:'This is a geometric hypothesis constrained by real measured body-joint tracks; the bat is NOT mocap'
},null,2));
