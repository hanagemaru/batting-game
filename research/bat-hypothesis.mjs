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
export const BAT_LENGTH_M=.864;
export const SWEET_M=.72;
export const START_FRAME=274; // user-adjustable candidate start; not a measured swing event
export const CONTACT_FRAME=336; // inferred from CMU third-party visualization; not observed impact
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
export function batPose(src,frame,opts={}){
 const profile=opts.profile||'D';
 const rise=Number.isFinite(opts.exitRiseDeg)?opts.exitRiseDeg:8;
 const begin=Number.isFinite(opts.beginFrame)?opts.beginFrame:START_FRAME;
 const impact=Number.isFinite(opts.contactFrame)?opts.contactFrame:CONTACT_FRAME;
 if(!REFERENCE_PRESETS[profile])throw Error('Unknown study profile');
 if(!(begin<impact&&impact<src.frames.length+src.clipStartFrame))
   throw Error('Invalid study frame range');
 const span=impact-begin,rel=frame;
 const{contact,tangent,planeNormal}=contactAndPlane(profile,rise);
 // A single spherical Bezier from upright stance to contact, with no
 // orientation keyframe at the artificial "launch" time.
 const stance=norm([-.19,.93,-.32]);
 const early=norm([-.42,.83,-.35]);
 const control=rotateInPlane(contact,tangent,-70*Math.PI/180);
 let dir;
 if(rel<=impact-src.clipStartFrame){
   const q=clamp((rel-(begin-src.clipStartFrame))/span,0,1);
   dir=bezier(stance,early,control,contact,Math.pow(q,2.7));
 }else{
   const q=clamp((rel-(impact-src.clipStartFrame))/
                   (src.clipEndFrame-impact),0,1);
   const exitAngle=105*Math.PI/180;
   // Choose exponential deceleration coefficient so initial FOLLOW angular
   // velocity matches the precontact spherical-Bezier end tangent.
   const incomingAngularSpeed=3*(70*Math.PI/180)*2.7/span; // radians per source frame
   const targetFactor=incomingAngularSpeed*
      (src.clipEndFrame-impact)/exitAngle;
   let lo=.000001,hi=15;
   for(let i=0;i<50;i++){
      const m=(lo+hi)/2,rate=m/(1-Math.exp(-m));
      if(rate<targetFactor)lo=m;else hi=m;
   }
   const k=(lo+hi)/2;
   const progress=(1-Math.exp(-k*q))/(1-Math.exp(-k));
   dir=rotateInPlane(contact,tangent,exitAngle*progress);
 }
 const grip=inferredGrip(src,frame);
 const barrel=add(grip,mul(dir,BAT_LENGTH_M));
 const sweet=add(grip,mul(dir,SWEET_M));
 return {grip,dir,barrel,sweet,planeNormal,profile,handSeparation:handSeparation(src,frame),
   derived:true,
   confidence:'hypothesis-only: measured wrist midpoint + modeled bat axis'};
}
