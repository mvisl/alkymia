// Slow, continuous depth breathing; never writes to the user's scroll position.
export function ambientCamera(camera,seconds,enabled=true){
 if(!enabled)return camera;
 return {center:camera.center+Math.sin(seconds*Math.PI/24)*.00065,zoom:camera.zoom};
}
// Keep the shoreline and texture perimeter fixed. Only the interior reflections
// bend, with horizontal ripples stronger towards the viewer; no frame swapping.
const waterModes={
 calm:{base:.7,depth:2.5,frequency:39,speed:.9,vertical:.35},
 reflections:{base:1.8,depth:5.2,frequency:23,speed:1.15,vertical:.65},
 silk:{base:.4,depth:1.5,frequency:65,speed:.6,vertical:.12}
};
export function ripplePoint(x,y,width,height,seconds,mode='reflections'){
 const u=x/width,v=y/height,edge=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 const w=waterModes[mode]||waterModes.reflections;
 return {x:x+edge*(w.base+v*w.depth)*(Math.sin(v*w.frequency+seconds*w.speed)+.25*Math.sin(u*15-v*24+seconds*.76)),y:y+edge*w.vertical*Math.sin(v*33+seconds*.35)};
}

export function wakeOffset(u,v,seconds,wakes){
 let offset=0;
 for(const wake of wakes){
  const age=seconds-wake.time;
  const dx=(u-wake.u)*8,dy=v-wake.v;
  const distance=Math.hypot(dx,dy);
  const front=distance-age*.42;
  offset+=wake.strength*Math.sin(front*22)*Math.exp(-front*front*48)*Math.max(0,1-age/1.5)**2;
 }
 return Math.max(-8,Math.min(8,offset))*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)**2;
}
