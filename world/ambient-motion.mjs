// Slow, continuous depth breathing; never writes to the user's scroll position.
export function ambientCamera(camera,seconds,enabled=true){
 if(!enabled)return camera;
 const breath=(1-Math.cos(seconds*Math.PI/18))*.5;
 return {center:camera.center+Math.sin(seconds*Math.PI/24)*.00065,zoom:camera.zoom+breath*.006};
}
// Keep the shoreline and texture perimeter fixed. Only the interior reflections
// bend, with horizontal ripples stronger towards the viewer; no frame swapping.
export function ripplePoint(x,y,width,height,seconds){
 const u=x/width,v=y/height,edge=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 return {x:x+edge*(.7+v*2.5)*(Math.sin(v*39+seconds*.9)+.3*Math.sin(u*15-v*24+seconds*.63)),y:y+edge*.35*Math.sin(v*33+seconds*.7)};
}
