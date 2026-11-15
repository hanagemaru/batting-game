// Browser-independent regression test for CMU-driven batting game.
// Run at repository root: node research/verify-game-b0.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLATE_FRONT,FLIGHT_MS,pitchPoint} from '../pitch-model.js';
import {BAT_TOTAL_LENGTH_M,REFERENCE_PRESETS,batPose} from './bat-hypothesis.mjs';
import {
 GAME_SWING_CONFIG,validateSwingSource,makeGameSwingBundle,gameSwingPose,
 mapGameSwingFrame,gameplaySweetSegment
} from '../game-swing-bridge.mjs';

const source=validateSwingSource(JSON.parse(
 readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8')));
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=(dir)=>Math.atan2(dir[2],-dir[0])*180/Math.PI;
const closest=(p,a,b)=>{
 const d=a.map((v,i)=>b[i]-v);
 const len2=d.reduce((s,v)=>s+v*v,0);
 const t=Math.max(0,Math.min(1,p.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/len2));
 return dist(p,a.map((v,i)=>v+t*d[i]));
};
assert.equal(GAME_SWING_CONFIG.profile,'B');
assert.equal(GAME_SWING_CONFIG.exitRiseDeg,0);
assert.equal(REFERENCE_PRESETS.B.inclinationDeg,-22.4);
assert.equal(GAME_SWING_CONFIG.contactFrame,341);
assert.equal(GAME_SWING_CONFIG.releaseFrame,334);
assert.equal(GAME_SWING_CONFIG.followEndFrame,390);
assert.equal(GAME_SWING_CONFIG.gripToTipM,.74);
assert.equal(GAME_SWING_CONFIG.gripToSweetM,.61);
assert.equal(GAME_SWING_CONFIG.sweetStartM,.53);
assert.equal(GAME_SWING_CONFIG.sweetEndM,.69);

const aimCourses=[
 [0,.84,'FAST'],[.15,.84,'FAST'],[-.15,.84,'FAST'],
 [0,1.07,'FAST'],[0,.60,'FAST'],
 [.15,.60,'CURVE'],[-.15,1.07,'FORK']
];
let maxAimError=0,maxGripDelta=0,maxRigidLengthError=0;
let maxClosestDistance=0;
let tested=0;
for(const [x,y,type] of aimCourses){
 const aim=[x,y,PLATE_FRONT+1.18*x];
 const bundle=makeGameSwingBundle(source,aim);
 const sw={bundle,motionStart:0,impactAt:40,toImpactMs:40,followMs:220,finishAt:260};
 assert.equal(mapGameSwingFrame(0,sw),334);
 assert.equal(mapGameSwingFrame(40,sw),341);
 assert.equal(mapGameSwingFrame(260,sw),390);
 const at=gameSwingPose(40,sw);
 assert.ok(Math.abs(angle(at.dir))<1e-9,'Game contact is not parallel to plate front');
 assert.ok(Math.abs(Math.asin(at.dir[1])*180/Math.PI+22.4)<1e-9);
 for(const [frame,t]of [[334,0],[341,40],[346,40+220*5/49]]){
   assert.ok(Math.abs(angle(gameSwingPose(t,sw).dir)-(frame-341)*18)<1e-8,
     'Overhead angle mismatch at '+frame);
 }
 maxAimError=Math.max(maxAimError,dist(at.sweet,aim));
 for(let ms=0;ms<=260;ms+=2){
  const q=gameSwingPose(ms,sw);
  const ref=batPose(source,q.sourceFrame-source.clipStartFrame,GAME_SWING_CONFIG);
  const unshifted=q.hand.map((v,i)=>v-bundle.translation[i]);
  maxGripDelta=Math.max(maxGripDelta,dist(unshifted,ref.grip));
  maxRigidLengthError=Math.max(maxRigidLengthError,Math.abs(dist(q.knob,q.barrel)-BAT_TOTAL_LENGTH_M));
  const seg=gameplaySweetSegment(q);
  assert.ok(Math.abs(dist(seg.a,seg.b)-.16)<1e-9,'Wrong collision segment');
  tested++;
 }
 const pitch={type,release:{x:.2,y:1.81,z:16.9},target:{x,y,z:PLATE_FRONT},
   dir:1,breakX:.23,breakY:.08};
 const flight=FLIGHT_MS[type];
 const idealU=(pitch.release.z-aim[2])/(pitch.release.z-pitch.target.z);
 const idealT=idealU*flight;
 let best=Infinity;
 for(let ms=0;ms<=260;ms++){
  const pt=pitchPoint(pitch,(idealT-40+ms)/flight),p=[pt.x,pt.y,pt.z];
  const bat=gameSwingPose(ms,sw),seg=gameplaySweetSegment(bat);
  best=Math.min(best,closest(p,seg.a,seg.b));
 }
 maxClosestDistance=Math.max(maxClosestDistance,best);
 assert.ok(best<=.079,'Centered swing unexpectedly misses ball at '+x+'/'+y);
}
assert.ok(maxAimError<1e-10,'Sweet spot not aligned to the aim point');
assert.ok(maxGripDelta<1e-10,'Source hand trajectory changed');
assert.ok(maxRigidLengthError<1e-10,'Bat geometry is not rigid');
console.log(JSON.stringify({
 result:'PASS',gameProfile:'B',riseDeg:0,
 courses:aimCourses.length,sampledPoseCount:tested,
 maxAimErrorMeters:maxAimError,maxMeasuredGripTrackDeltaMeters:maxGripDelta,
 maxBatLengthErrorMeters:maxRigidLengthError,
 worstClosestBallToCollisionSegmentMeters:maxClosestDistance,
 modelCaveat:'Bat direction is geometric hypothesis; CMU hand positions are measured-derived and translated'
},null,2));
