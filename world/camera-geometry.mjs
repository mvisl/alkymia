export const WIDTH=1672,HEIGHT=435;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cycle(seconds){const phase=((seconds%20)+20)%20,t=phase<=10?phase/10:(20-phase)/10;return clamp(t*t*t*(t*(t*6-15)+10),0,1);}
export function centerLimit(view){return Math.min(.5,view.width/(2*(view.height/HEIGHT)*WIDTH));}
export function constrainCenter(center,view){const edge=centerLimit(view);return clamp(center,edge,1-edge);}
// Every plane is anchored in scene coordinates. Near silhouettes cross the
// window when panning; none of them follow the viewport as a fixed decoration.
export const depths={
 'sky-backdrop':{zoom:.38,pan:.94,look:1},
 moon:{zoom:.38,pan:.94,look:1},
 'moon-halo':{zoom:.38,pan:.94,look:1},
 'sky-clouds':{zoom:.4,pan:.94,look:1.4},
 'distant-mountains':{zoom:.65,pan:.97,look:2},
 'city-separated':{zoom:1,pan:1,look:3},
 river:{zoom:1,pan:1,look:3},
 landmarks:{zoom:1,pan:1,look:3},
 'left-bank':{zoom:1.08,pan:1.015,look:5},
 'right-bank':{zoom:1.08,pan:1.015,look:5},
 'left-tree':{zoom:1.4,pan:1.08,look:11},
 'right-tree':{zoom:1.4,pan:1.08,look:11}
};
export function layerPose(id,meta,view,camera,pointer,depth=true){
 const {width:w,height:h}=view,s=h/HEIGHT,z=depth?camera.zoom-1:0;
 const d=depths[id]??{zoom:1,pan:1,look:3},scale=s*(1+z*d.zoom);
 const pan=depth?d.pan:1,look=depth?d.look:0;
 // Use source-centred pan, distinct depth ratios and a shared baseline. At
 // center=.5/zoom=1 every cutout retains the exact original pixel placement.
 const x=w/2-WIDTH*scale/2-(camera.center-.5)*WIDTH*s*camera.zoom*pan+pointer.x*look;
 const y=h/2-HEIGHT*scale/2+pointer.y*look*.16;
 return {x,y,scale};
}
