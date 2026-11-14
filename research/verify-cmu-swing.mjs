// Reproducible smoke-check for the CMU-derived skeletal research clip.
// Run from repository root: node research/verify-cmu-swing.mjs
// This checks data integrity, NOT the biomechanics or missing bat geometry.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const d=JSON.parse(readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8'));
const names=d.jointNames;
const distance=(fr,a,b)=>{
  const p=names.indexOf(a)*3,q=names.indexOf(b)*3;
  return Math.hypot(fr[p]-fr[q],fr[p+1]-fr[q+1],fr[p+2]-fr[q+2]);
};
assert.equal(d.subject,124);assert.equal(d.trial,7);
assert.equal(d.frames.length,141);
assert.equal(names.length,15);
assert.ok(Math.abs(d.fps-120)<0.01);
assert.ok(d.unavailable.includes('no measured bat markers'));
for(const f of d.frames){
  assert.equal(f.length,names.length*3);
  assert.ok(f.every(Number.isFinite));
}
const rigid=[
 ['shoulderL','elbowL'],['elbowL','handL'],
 ['shoulderR','elbowR'],['elbowR','handR'],
 ['hipL','kneeL'],['kneeL','footL'],
 ['hipR','kneeR'],['kneeR','footR']
];
let maxRigidVariation=0;
for(const [a,b] of rigid){
  const lengths=d.frames.map(f=>distance(f,a,b));
  maxRigidVariation=Math.max(maxRigidVariation,Math.max(...lengths)-Math.min(...lengths));
}
assert.ok(maxRigidVariation<.002,'Rigid bone length changed >2 mm');
const handL=names.indexOf('handL')*3,handR=names.indexOf('handR')*3;
let maxFrameJump=0;
for(let i=1;i<d.frames.length;i++){
  const prev=d.frames[i-1],cur=d.frames[i];
  for(let j=0;j<names.length;j++){
    const k=j*3;
    maxFrameJump=Math.max(maxFrameJump,Math.hypot(...[0,1,2].map(a=>cur[k+a]-prev[k+a])));
  }
}
assert.ok(maxFrameJump<.08,'Sudden jump >8 cm/frame');
const atFrame=i=>Math.hypot(...[0,1,2].map(a=>d.frames[i][handL+a]-d.frames[i][handR+a]));
assert.ok(d.approximateEvents.contactFrame>d.approximateEvents.launchFrame);
console.log(JSON.stringify({
 status:'PASS',frames:d.frames.length,fps:d.fps,
 maxRigidLengthVariationMeters:maxRigidVariation,
 maxInterframeJointMotionMeters:maxFrameJump,
 handSeparationAtStartMeters:atFrame(0),
 handSeparationNearEstimatedContactMeters:atFrame(d.approximateEvents.contactFrame-d.clipStartFrame),
 knownLimitations:d.unavailable
},null,2));
