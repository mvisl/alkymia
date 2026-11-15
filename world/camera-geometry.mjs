export const WIDTH=1672,HEIGHT=435;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cycle(seconds){const phase=((seconds%20)+20)%20,t=phase<=10?phase/10:(20-phase)/10;return clamp(t*t*t*(t*(t*6-15)+10),0,1);}
export function centerLimit(view){return Math.min(.5,view.width/(2*(view.height/HEIGHT)*WIDTH));}
export function constrainCenter(center,view){const edge=centerLimit(view);return clamp(center,edge,1-edge);}
// Every plane is anchored in scene coordinates. Near silhouettes cross the
// window when panning; none of them follow the viewport as a fixed decoration.
export const depths={
 'sky-backdrop':{zoom:.22,pan:.25,look:1},
 moon:{zoom:.2,pan:.08,look:.25},
 'moon-halo':{zoom:.2,pan:.08,look:.25},
 'sky-clouds':{zoom:.25,pan:.25,look:1.4},
 'distant-mountains':{zoom:.5,pan:.55,look:2},
 'city-separated':{zoom:1,pan:1,look:3},
 'ground-backdrop':{zoom:1,pan:1,look:3},
 river:{zoom:1,pan:1,look:3},
 island:{zoom:1.32,pan:1.12,look:7},
 landmarks:{zoom:1,pan:1,look:3},
 'left-bank':{zoom:1.16,pan:1.025,look:5},
 'right-bank':{zoom:1.16,pan:1.025,look:5},
 'left-tree':{zoom:1.8,pan:1.25,look:11},
 'right-tree':{zoom:1.8,pan:1.25,look:11}
};
export function layerPose(id,meta,view,camera,pointer,depth=true){
 const {width:w,height:h}=view,s=h/HEIGHT,z=depth?camera.zoom-1:0;
 const d=depths[id]??{zoom:1,pan:1,look:3},scale=s*(1+z*d.zoom);
 const celestial=id==='moon'||id==='moon-halo';
 const pan=celestial?Math.min(d.pan,w/(WIDTH*s*camera.zoom)*.12):(depth?d.pan:1),look=depth?d.look:0;
 // Use source-centred pan, distinct depth ratios and a shared baseline. At
 // center=.5/zoom=1 every cutout retains the exact original pixel placement.
 let x=w/2-WIDTH*scale/2-(camera.center-.5)*WIDTH*s*camera.zoom*pan+pointer.x*look;
 let y=h/2-HEIGHT*scale/2+pointer.y*look*.16;
 // Recompose the celestial disc into open sky, clear of the top-left brand.
 // Disc and halo share the same far-distance projection; clouds stay separate.
 if(celestial){x+=260*scale;y+=53*scale;}
 // Source cutouts end at the original panorama boundary. Keep that outer
 // edge offscreen; constrain only at the boundary, not throughout the pan.
 const softenEdge=(value,limit,side)=>{const distance=(value-limit)*side,band=24*s;if(distance<=-band)return value;return limit+side*(-band*Math.exp(-(distance+band)/band));};
 if(id==='left-tree')x=softenEdge(x,-meta.x*scale,1);
 if(id==='right-tree')x=softenEdge(x,w-(meta.x+meta.width)*scale,-1);
 if(id==='left-tree'||id==='right-tree')y=clamp(y,h-(meta.y+meta.height)*scale,-meta.y*scale);
 return {x,y,scale};
}
