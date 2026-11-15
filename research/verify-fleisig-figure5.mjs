// Figure 5 digitization confidence check.
// Run from repo root: node research/verify-fleisig-figure5.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync(new URL('./fleisig-figure5-seed.json',import.meta.url),'utf8'));
const top=p=>{
 const a=d.calibration.top;
 return{x:3*(p[0]-a.xPx0)/(a.xPx3-a.xPx0),
 y:-1+3*(a.yPxMinus1-p[1])/(a.yPxMinus1-a.yPx2)};
};
const side=p=>{
 const a=d.calibration.side;
 return{x:3*(p[0]-a.xPx0)/(a.xPx3-a.xPx0),
 z:1.4*(a.zPx0-p[1])/(a.zPx0-a.zPx1_4)};
};
const r=d.initialAnnotation,coords={};
for(const [label,key] of [['grip','gripPx'],['barrel','barrelPx']]){
 const t=top(r.top[key]),s=side(r.side[key]);
 coords[label]={x:(t.x+s.x)/2,y:t.y,z:s.z,xMismatch:Math.abs(t.x-s.x)};
}
const length=Math.hypot(coords.grip.x-coords.barrel.x,
 coords.grip.y-coords.barrel.y,coords.grip.z-coords.barrel.z);
assert.equal(d.confirmedSamples.length,0);
assert.equal(r.pairedSameTime,false);
assert.ok(coords.grip.xMismatch>.06&&coords.barrel.xMismatch>.06,
 'Initial approximate line is not a verified cross-projection pair');
assert.ok(length>.6&&length<1.1);
const out={
 status:'INITIAL MARK IS UNVERIFIED; NOT A 3D TIME SERIES',
 source:d.doi,calibration:'approximate pixel-to-meter',
 gripCrossProjectionMismatchCm:Math.round(coords.grip.xMismatch*1000)/10,
 barrelCrossProjectionMismatchCm:Math.round(coords.barrel.xMismatch*1000)/10,
 nominalCombinedLengthCm:Math.round(length*1000)/10,
 pairedFrameIdentification:'not established',
 confirmedSamples:d.confirmedSamples.length
};
console.log(JSON.stringify(out,null,2));
