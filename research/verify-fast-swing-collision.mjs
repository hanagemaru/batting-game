// Regression: the high-speed Figure-11-B/0 bat must NOT miss a perfect
// aim/release merely because the collider samples every 3 milliseconds.
// Run from repo root: node research/verify-fast-swing-collision.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pitchPoint,PLATE_FRONT,FLIGHT_MS} from '../pitch-model.js';
import {makeGameSwingBundle,gameSwingPose,gameplaySweetSegment} from '../game-swing-bridge.mjs';

const doc=readFileSync(new URL('../playtest-impact-ab.html',import.meta.url),'utf8');
const hitRadius=.033+.0365+.009;
const STEP=.5;
assert.match(doc,/const step=\.5;/,'Game collider no longer uses 0.5ms steps');
assert.match(doc,/const steps=Math\.max\(0,Math\.ceil\(\(end-from\)\/step\)\)/);
assert.match(doc,/const ms=i===steps\?end:Math\.min\(end,from\+i\*step\)/);

const capture=JSON.parse(readFileSync(new URL('./cmu124_07_swing.json',import.meta.url),'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function nearSegment(p,a,b){
 const vec=a.map((x,i)=>b[i]-x);
 const u=Math.max(0,Math.min(1,vec.reduce((sum,x,i)=>sum+x*(p[i]-a[i]),0)/
   vec.reduce((sum,x)=>sum+x*x,0)));
 return distance(p,a.map((x,i)=>x+u*vec[i]));
}
function pitchExtended(pitch,t){
 if(t<=1)return pitchPoint(pitch,Math.max(0,t));
 const a=pitchPoint(pitch,.96),b=pitchPoint(pitch,1),u=(t-1)/.04;
 return {x:b.x+(b.x-a.x)*u,y:b.y+(b.y-a.y)*u,z:b.z+(b.z-a.z)*u};
}
const cases=[
 [0,.84,'FAST'],[.15,.84,'FAST'],[-.15,.84,'FAST'],
 [0,.60,'FAST'],[0,1.07,'FAST'],[.15,1.07,'CURVE'],[-.15,.60,'FORK']
];
function distanceAt(pitch,sw,timeMs,idealTime,timingOffset){
 const elapsed=(idealTime+timingOffset-40+timeMs)/FLIGHT_MS[pitch.type];
 const p=pitchExtended(pitch,elapsed);
 const pose=gameSwingPose(timeMs,sw);
 const segment=gameplaySweetSegment(pose);
 return nearSegment([p.x,p.y,p.z],segment.a,segment.b);
}
function scan(pitch,sw,idealTime,offset,step,phase){
 // Multiple irregular animation-frame boundaries; exact end sample included.
 const ends=[16.7,33.4,50.1,66.8,83.5];
 let prev=phase,min=Infinity;
 for(const end of ends){
   if(end<prev)continue;
   const count=Math.ceil((end-prev)/step);
   for(let i=0;i<=count;i++){
     const t=i===count?end:Math.min(end,prev+i*step);
     min=Math.min(min,distanceAt(pitch,sw,t,idealTime,offset));
   }
   prev=end;
 }
 return min;
}
let checked=0,oldMisses=0,maxMinDistance=0;
for(const [x,y,type]of cases){
 const pitch={type,
  release:{x:.18,y:1.8,z:16.8},
  target:{x,y,z:PLATE_FRONT},dir:1,
  breakX:type==='CURVE'?.22:0,
  breakY:type==='FORK'?.2:.055};
 const aim=[x,y,PLATE_FRONT+.4633*x];
 const bundle=makeGameSwingBundle(capture,aim);
 const sw={bundle,motionStart:0,impactAt:40,toImpactMs:40,followMs:220};
 const u=(pitch.release.z-aim[2])/(pitch.release.z-pitch.target.z);
 const idealTime=u*FLIGHT_MS[type];
 for(const offset of [-12,0,12]){
  for(const phase of [0,.17,.33]){
   const min=scan(pitch,sw,idealTime,offset,STEP,phase);
   assert.ok(min<=hitRadius,
     'False miss for aimed '+type+' ('+x+','+y+'), offset='+offset+', phase='+phase+', min='+min);
   checked++;
   maxMinDistance=Math.max(maxMinDistance,min);
   const coarse=scan(pitch,sw,idealTime,offset,3,phase);
   if(coarse>hitRadius)oldMisses++;
  }
 }
}
assert.ok(oldMisses>0,'Regression did not reproduce the 3ms false-miss problem');
console.log(JSON.stringify({
 result:'PASS',aimedCases:cases.length,scanCases:checked,
 oldFalseMisses:oldMisses,stepMs:STEP,maxActualMinDistanceMeters:maxMinDistance,
 collisionRadiusMeters:hitRadius,
 note:'This tests precise aiming and specified release offsets; user aim errors can still cause real misses.'
},null,2));
