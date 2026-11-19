// Slow, continuous depth breathing; never writes to the user's scroll position.
export function ambientCamera(camera,seconds,enabled=true){
 if(!enabled)return camera;
 return {center:camera.center+Math.sin(seconds*Math.PI/24)*.00065,zoom:camera.zoom};
}
// Keep the shoreline and texture perimeter fixed. Only the interior reflections
// bend, with horizontal ripples stronger towards the viewer; no frame swapping.
const waterModes={
 calm:{base:.7,depth:2.5,frequency:39,speed:.9,vertical:.35},
 reflections:{base:1,depth:3.4,frequency:23,speed:.4,vertical:.2},
 silk:{base:.4,depth:1.5,frequency:65,speed:.6,vertical:.12}
};
export function ripplePoint(x,y,width,height,seconds,mode='reflections'){
 const u=x/width,v=y/height,edge=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 const w=waterModes[mode]||waterModes.reflections;
 return {x:x+edge*(w.base+v*w.depth)*(Math.sin(v*w.frequency+seconds*w.speed)+.25*Math.sin(u*15-v*24+seconds*.31)),y:y+edge*w.vertical*Math.sin(v*33+seconds*.35)};
}
