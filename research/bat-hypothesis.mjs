// Research-only bat hypothesis, never treat calculated barrel locations as mocap.
// Measured body joint arrays: CMU Graphics Lab 124_07 (120Hz).
// Only the impact inclination presets are from Nakashima et al. 2025 Fig.11.
// Original paper: https://doi.org/10.3389/fspor.2025.1557145 (CC BY 4.0).
// All other bat-axis poses, phase durations and plane tangents are PROPOSED
// geometrical assumptions, to be tested against actual high speed video.
export const REFERENCE_PRESETS={
  A:{inclinationDeg:-30.7,upDownDeg:1.4,leftRightDeg:-1.5,allowableDistanceM:.57},
  B:{inclinationDeg:-22.4,upDownDeg:-9.2,leftRightDeg:-11.1,allowableDistanceM:.09},
  C:{inclinationDeg:-34.9,upDownDeg:-1.6,leftRightDeg:-9.3,allowableDistanceM:.19},
  D:{inclinationDeg:-7.4,upDownDeg:-.5,leftRightDeg:-6.1,allowableDistanceM:.57}
};
// 86.4cm full bat includes a short portion extending behind the hands.
// The user-facing effective distances begin at the hand-midpoint grip proxy.
export const BAT_TOTAL_LENGTH_M=.864;
export const BAT_LENGTH_M=.74; // hand proxy -> barrel tip
export const GRIP_OFFSET_M=BAT_TOTAL_LENGTH_M-BAT_LENGTH_M; // knob behind hands
export const SWEET_M=.61; // hand proxy -> estimated sweet spot
export const START_FRAME=274; // hand/body motion uses CMU frames, start unmeasured
export const CONTACT_FRAME=341; // user's visual contact estimate, NOT measured ball contact
export const FOLLOW_THROUGH_DEG=195; // prior 105° + requested ~90°
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const len=a=>Math.hypot(...a);
const norm=a=>mul(a,1/(len(a)||1));
function slerp(a,b,t){
 let d=clamp(dot(a,b),-1,1);
 if(d>.999999)return norm(add(mul(a,1-t),mul(b,t)));
 const theta=Math.acos(d);
 return norm(add(mul(a,Math.sin((1-t)*theta)/Math.sin(theta)),
    mul(b,Math.sin(t*theta)/Math.sin(theta))));
}
function bezier(a,b,c,d,t){
 const e=slerp(a,b,t),f=slerp(b,c,t),g=slerp(c,d,t);
 return slerp(slerp(e,f,t),slerp(f,g,t),t);
}
function contactAndPlane(profile,exitRiseDeg){
 const tilt=REFERENCE_PRESETS[profile].inclinationDeg*Math.PI/180;
 // Explicit convention hypothesis: -X is outward barrel direction and
 // negative Y means bat head lower than grip. Valid only for this mockup.
 const contact=[-Math.cos(tilt),Math.sin(tilt),0];
 const r=exitRiseDeg*Math.PI/180;
 const tangent=norm(sub([0,Math.sin(r),Math.cos(r)],
     mul(contact,dot([0,Math.sin(r),Math.cos(r)],contact))));
 return{contact,tangent,planeNormal:norm([
   contact[1]*tangent[2]-contact[2]*tangent[1],
   contact[2]*tangent[0]-contact[0]*tangent[2],
   contact[0]*tangent[1]-contact[1]*tangent[0]
 ])};
}
function rotateInPlane(contact,tangent,angle){
 return norm(add(mul(contact,Math.cos(angle)),mul(tangent,Math.sin(angle))));
}
export function framePoint(src,frame,name){
 const k=src.jointNames.indexOf(name)*3;
 if(k<0)throw Error('Missing body joint '+name);
 const f=clamp(frame,0,src.frames.length-1),a=Math.floor(f),
   b=Math.min(a+1,src.frames.length-1),q=f-a;
 return [0,1,2].map(j=>src.frames[a][k+j]*(1-q)+src.frames[b][k+j]*q);
}
export function inferredGrip(src,frame){
 // Only a hand-center proxy, NOT the true physical bat grip marker.
 return mul(add(framePoint(src,frame,'handL'),framePoint(src,frame,'handR')),.5);
}
export function handSeparation(src,frame){
 return len(sub(framePoint(src,frame,'handL'),framePoint(src,frame,'handR')));
}
// Exact overhead bat-axis checkpoints relative to home-plate front edge (X):
// 334: -90° (backswing-side perpendicular), 341: 0° (parallel),
// 346: +90° (opposite perpendicular), 390: +195° (full follow-through).
// These are user-requested angular constraints, NOT additional mocap samples.
export const OVERHEAD_ANGLE_KEYFRAMES=Object.freeze([
 {frame:250,deg:-145,degPerFrame:0},
 {frame:313,deg:-145,degPerFrame:0},
 {frame:334,deg:-90,degPerFrame:4},
 {frame:341,deg:0,degPerFrame:28},
 {frame:346,deg:90,degPerFrame:12},
 {frame:390,deg:195,degPerFrame:0}
]);

function hermite(u,p0,p1,tan0,tan1){
 const u2=u*u,u3=u2*u;
 return (2*u3-3*u2+1)*p0 + (u3-2*u2+u)*tan0
   +(-2*u3+3*u2)*p1 +(u3-u2)*tan1;
}

export function overheadAngleDegrees(sourceFrame){
 const knots=OVERHEAD_ANGLE_KEYFRAMES;
 if(sourceFrame<=knots[0].frame)return knots[0].deg;
 // 346 -> 390 uses an exponential slowdown to avoid a cubic overshoot.
 // The decay constant is chosen to integrate exactly 105° and to join
 // continuously at the 346-frame slope of 12°/frame.
 if(sourceFrame>346){
  const span=390-346,total=195-90,initialRate=12;
  let low=.000001,high=2;
  for(let i=0;i<48;i++){
   const lambda=(low+high)/2;
   const area=initialRate*(-Math.expm1(-lambda*span))/lambda;
   if(area>total)low=lambda;else high=lambda;
  }
  const lambda=(low+high)/2;
  return 90 + initialRate*(-Math.expm1(-lambda*(sourceFrame-346)))/lambda;
 }
 let i=0;
 while(i<knots.length-2&&sourceFrame>knots[i+1].frame)i++;
 const A=knots[i],B=knots[i+1],width=B.frame-A.frame;
 return hermite(clamp((sourceFrame-A.frame)/width,0,1),A.deg,B.deg,
  A.degPerFrame*width,B.degPerFrame*width);
}

// Map a requested TOP-VIEW azimuth back onto the previously chosen fixed
// 3D swing plane. This keeps elevation and swing-plane continuity coherent,
// instead of independently animating yaw and pitch after ball contact.
function planeDirectionForAzimuth(contact,tangent,azimuthDeg){
 const rad=azimuthDeg*Math.PI/180;
 // Want horizontal projection [-cos(rad), sin(rad)].
 const Y=Math.sin(rad)/tangent[2];
 const X=(-Math.cos(rad)-tangent[0]*Y)/contact[0];
 let phi=Math.atan2(Y,X);
 while(phi-rad>Math.PI)phi-=2*Math.PI;
 while(phi-rad< -Math.PI)phi+=2*Math.PI;
 return rotateInPlane(contact,tangent,phi);
}

export function batPose(src,frame,opts={}){
 const profile=opts.profile||'D';
 const rise=Number.isFinite(opts.exitRiseDeg)?opts.exitRiseDeg:8;
 const impact=Number.isFinite(opts.contactFrame)?opts.contactFrame:CONTACT_FRAME;
 if(!REFERENCE_PRESETS[profile])throw Error('Unknown study profile');
 if(!(impact>src.clipStartFrame+8&&impact<src.clipEndFrame-8))
   throw Error('Invalid study contact frame');
 const {contact,tangent,planeNormal}=contactAndPlane(profile,rise);
 const sourceFrame=src.clipStartFrame+frame;
 // Keep the selected impact point at the 341-frame anchor if a research
 // caller overrides it; measured hand coordinates are NEVER resampled.
 const shiftedFrame=sourceFrame-(impact-CONTACT_FRAME);
 const desiredYaw=overheadAngleDegrees(shiftedFrame);
 const inPlane=planeDirectionForAzimuth(contact,tangent,desiredYaw);

 // Preserve an upright preparation pose from the previous experiment.
 // Blend only the *bat direction* into the planar high-speed swing over
 // frames 319..334; the measured hand-midpoint trajectory is unchanged.
 const stance=norm([-.08,.94,-.55]);
 const early=norm([-.20,.82,-.55]);
 const control=rotateInPlane(contact,tangent,-70*Math.PI/180);
 const elapsed=impact-START_FRAME;
 const q=clamp((sourceFrame-START_FRAME)/Math.max(1,elapsed),0,1);
 const oldDirection=bezier(stance,early,control,contact,Math.pow(q,2.7));
 const transition=clamp((shiftedFrame-319)/15,0,1);
 const blend=transition*transition*(3-2*transition);
 const dir=slerp(oldDirection,inPlane,blend);

 const grip=inferredGrip(src,frame);
 const barrel=add(grip,mul(dir,BAT_LENGTH_M));
 const sweet=add(grip,mul(dir,SWEET_M));
 const knob=add(grip,mul(dir,-GRIP_OFFSET_M));
 return {grip,dir,barrel,sweet,knob,planeNormal,profile,
   handSeparation:handSeparation(src,frame),
   modeledOverheadAngleDeg:desiredYaw,
   derived:true,
   confidence:'hypothesis-only; CMU hands fixed, bat azimuth anchored at 334/341/346'};
}
