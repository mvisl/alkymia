export const WIDTH=1672,HEIGHT=435;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cycle(seconds){const phase=((seconds%20)+20)%20,t=phase<=10?phase/10:(20-phase)/10;return clamp(t*t*t*(t*(t*6-15)+10),0,1);}
export function centerLimit(view){return Math.min(.5,view.width/(2*(view.height/HEIGHT)*WIDTH));}
export function constrainCenter(center,view){const edge=centerLimit(view);return clamp(center,edge,1-edge);}
export function layerPose(id,meta,view,camera,pointer,depth=true){
 const {width:w,height:h}=view,s=h/HEIGHT,d=depth?camera.zoom-1:0;
 const k={base:.35,city:1,landmarks:1,'left-bank':1.06,'right-bank':1.06}[id]??1;
 let scale=s*(1+d*k),x=w/2-camera.center*WIDTH*scale,y=h/2-HEIGHT*scale/2;
 if(depth){const a={base:1,city:3,landmarks:3,'left-bank':5,'right-bank':5}[id]??0;x+=pointer.x*a;y+=pointer.y*a*.2;}
 if(id.endsWith('tree')){
  scale=s*1.025*(1+d*1.35);y=h-HEIGHT*scale;
  const look=depth?pointer.x*Math.min(12,w*.008):0,out=d*w*.7;
  if(id==='left-tree')x=w*.20-(meta.x+meta.width)*scale-out+look;
  else x=w-WIDTH*scale+w*.015+out+look;
 }
 return {x,y,scale};
}
