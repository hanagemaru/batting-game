// Shared 3D pitch + batter-eye projection model for BATTER'S READ.
// Coordinates follow debug-3d.html: +Z pitcher, +X third-base/RH-batter side.
// Home plate rear apex is z=0; its 17-inch front edge is z=.4318.

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const PLATE_HALF=.2159;
export const PLATE_FRONT=.4318;
export const RUBBER_Z=18.44;
export const BATTER_EYE=Object.freeze({x:.76,y:1.68,z:-.62});
export const RELEASE_LOOK=Object.freeze({x:.18,y:1.82,z:16.80});
export const BATTER_FOV_DEG=58;

export const FLIGHT_MS=Object.freeze({FAST:520,CURVE:610,FORK:575});
export function flightMs(pitch){return pitch.flightMs??FLIGHT_MS[pitch.type]??FLIGHT_MS.FAST}
export function progressAtElapsed(pitch,elapsedMs){return clamp(elapsedMs/flightMs(pitch),0,1)}

export function pitchPoint(pitch,t){
  const u=clamp(t,0,1),a=pitch.release,b=pitch.target;
  const p={x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),z:lerp(a.z,b.z,u)};
  const arch=4*u*(1-u),late=arch*u;
  if(pitch.type==='CURVE'){
    p.x+=(pitch.breakX??.30)*(pitch.dir??1)*late;
    p.y+=(pitch.breakY??.10)*arch;
  }else if(pitch.type==='FORK'){
    p.y+=(pitch.breakY??.20)*arch*(1-.55*u);
  }else{
    p.y+=(pitch.breakY??.055)*arch;
  }
  return p;
}
export function pointAtElapsed(pitch,elapsedMs){return pitchPoint(pitch,progressAtElapsed(pitch,elapsedMs))}

const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=a=>{const m=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/m,y:a.y/m,z:a.z/m}};

// Returns the same camera basis the game should use. Keeping this here prevents
// debug geometry and gameplay projection from silently drifting apart again.
export function batterCamera(width,height,options={}){
  const eye=options.eye??BATTER_EYE,look=options.look??RELEASE_LOOK;
  const fwd=norm(sub(look,eye));
  const right=norm(cross({x:0,y:1,z:0},fwd));
  const up=norm(cross(fwd,right));
  const fovDeg=options.fovDeg??BATTER_FOV_DEG;
  const focal=(height*.5)/Math.tan((fovDeg*Math.PI/180)*.5);
  return{eye,fwd,right,up,focal,cx:width*.5,cy:height*.48,fovDeg};
}

export function projectFromBatter(point,width,height,options={}){
  const c=batterCamera(width,height,options),r=sub(point,c.eye),depth=dot(r,c.fwd);
  if(depth<=.05)return null;
  return{x:c.cx+c.focal*dot(r,c.right)/depth,y:c.cy-c.focal*dot(r,c.up)/depth,depth};
}

export function strikeZoneCorners(low=.52,high=1.16){
  return[
    {x:-PLATE_HALF,y:high,z:PLATE_FRONT},{x:PLATE_HALF,y:high,z:PLATE_FRONT},
    {x:PLATE_HALF,y:low,z:PLATE_FRONT},{x:-PLATE_HALF,y:low,z:PLATE_FRONT}
  ];
}

export function endpointError(pitch){
  const start=pitchPoint(pitch,0),end=pitchPoint(pitch,1);
  const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
  return{release:dist(start,pitch.release),target:dist(end,pitch.target)};
}
export function isMonotonicTowardPlate(pitch,samples=120){
  let prev=pitchPoint(pitch,0).z;const descending=pitch.target.z<pitch.release.z;
  for(let i=1;i<=samples;i++){const z=pitchPoint(pitch,i/samples).z;if(descending?z>=prev:z<=prev)return false;prev=z}
  return true;
}
export function longitudinalStepSpread(pitch,samples=120){
  const steps=[];let prev=pitchPoint(pitch,0).z;
  for(let i=1;i<=samples;i++){const z=pitchPoint(pitch,i/samples).z;steps.push(Math.abs(z-prev));prev=z}
  return Math.max(...steps)-Math.min(...steps);
}
