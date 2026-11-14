// Node regression checks; data and orientation hypotheses are kept separate.
// Run: node research/verify-bat-hypothesis.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batPose,REFERENCE_PRESETS,BAT_LENGTH_M,CONTACT_FRAME} from './bat-hypothesis.mjs';

const src=JSON.parse(readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8'));
const mag=v=>Math.hypot(...v);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const unitAngle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
const contact=CONTACT_FRAME-src.clipStartFrame;
let checked=0,maxPlane=0,maxLengthError=0,maxOrientationStep=0;
let minimumTipSpeed=Infinity,maximumTipSpeed=0,maxImpactSpeedGapRatio=0;
assert.match(src.unavailable,/no measured bat markers/);
for(const profile of Object.keys(REFERENCE_PRESETS)){
 for(const rise of [-10,8,20]){
  const options={profile,exitRiseDeg:rise};
  const states=Array.from({length:src.frames.length},(_,i)=>batPose(src,i,options));
  const plane=states[contact].planeNormal;
  for(let i=0;i<states.length;i++){
   const p=states[i],length=mag(p.barrel.map((v,j)=>v-p.grip[j]));
   const deviation=Math.abs(dot(plane,p.dir));
   if(i>=contact)maxPlane=Math.max(maxPlane,deviation);
   maxLengthError=Math.max(maxLengthError,Math.abs(length-BAT_LENGTH_M));
   assert.ok(p.barrel.every(Number.isFinite),'No NaN in bat-tip hypotheses');
   assert.ok(p.grip.every(Number.isFinite),'No NaN in measured-hand midpoint');
   assert.ok(p.sweet.every(Number.isFinite),'No NaN in estimated sweet spot');
   if(i>0)maxOrientationStep=Math.max(maxOrientationStep,unitAngle(p.dir,states[i-1].dir));
   checked++;
  }
  function speed(t){
   const dt=.05;
   const a=batPose(src,t-dt,options).barrel,b=batPose(src,t+dt,options).barrel;
   return mag(a.map((v,i)=>b[i]-v))*src.fps/(2*dt);
  }
  const inSpeed=speed(contact-.25),outSpeed=speed(contact+.25);
  const centerSpeed=speed(contact);
  minimumTipSpeed=Math.min(minimumTipSpeed,centerSpeed);
  maximumTipSpeed=Math.max(maximumTipSpeed,centerSpeed);
  maxImpactSpeedGapRatio=Math.max(maxImpactSpeedGapRatio,
    Math.abs(inSpeed-outSpeed)/centerSpeed);
 }
}
assert.ok(maxPlane<1e-9,'After contact, bat changes swing plane');
assert.ok(maxLengthError<1e-9,'Bat length not rigid');
assert.ok(maxOrientationStep<.25,'Large discontinuity between frames');
assert.ok(maxImpactSpeedGapRatio<.025,'Impact speed discontinuity');
assert.ok(minimumTipSpeed>10&&maximumTipSpeed<45,'Model speed outside broad plausibility bound');
console.log(JSON.stringify({
 status:'PASS',testedPoses:checked,
 maxPlaneDeparture:maxPlane,maxBatLengthErrorMeters:maxLengthError,
 maxInterframeAngularStepDeg:maxOrientationStep*180/Math.PI,
 assumedContactSpeedRangeMs:[minimumTipSpeed,maximumTipSpeed],
 maxContactSpeedGapRatio:maxImpactSpeedGapRatio,
 qualification:'Bat positions, swing phase and contact time are estimated, not measured'
},null,2));
