import {Application,Container,Sprite,Texture,MeshPlane} from '../vendor/pixi-8.22.0/pixi.min.mjs';
import {WIDTH,HEIGHT,layerPose} from './camera-geometry.mjs?v=solid-masks-v6';
import {ambientCamera,ripplePoint} from './ambient-motion.mjs?v=solid-masks-v6';
const stage=document.querySelector('.world-window'),shell=document.querySelector('.scene-shell'),canvas=document.querySelector('.world-canvas'),intro=document.querySelector('.genesis');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const host=document.createElement('div');host.className='night-renderer light-layer light-night';host.setAttribute('aria-hidden','true');shell.prepend(host);
const names=['sky-backdrop','moon-halo','moon','sky-clouds','distant-mountains','ground-backdrop','city-separated','river','landmarks','island','left-bank','right-bank','left-tree','right-tree'];
let ready=false,app=null,gpuReady=false,raf=0,last=0,view={width:stage.clientWidth,height:stage.clientHeight},camera={center:.5,zoom:1},pointer={x:0,y:0},target={x:0,y:0},cloudSeconds=0;
const css={},gpu={};let map,waterMesh,waterRest;
function canMove(){return !document.hidden&&intro.hidden&&!document.querySelector('#alkymia-passage-page')&&!reduced.matches&&document.body.dataset.motionPaused!=='true'&&document.documentElement.dataset.light==='night'&&!document.querySelector('dialog').open;}
function schedule(){if(ready&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
function frame(now){raf=0;const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
 if(canMove()){cloudSeconds=cloudSeconds+dt;const e=1-Math.exp(-dt/.45);pointer.x+=(target.x-pointer.x)*e;pointer.y+=(target.y-pointer.y)*e;}
 else if(reduced.matches)pointer={x:0,y:0};
 draw();if(canMove())schedule();else last=0;
}
function draw(){if(!ready)return;
 const movingCamera=ambientCamera(camera,cloudSeconds,!reduced.matches);
 for(const name of names){const p=layerPose(name,map[name],view,movingCamera,pointer,!reduced.matches);if(name==='sky-clouds'){p.x+=(96+Math.sin(cloudSeconds*.025)*48)*p.scale;p.y+=Math.sin(cloudSeconds*.05)*2*p.scale;}if(gpuReady){gpu[name].position.set(p.x,p.y);gpu[name].scale.set(p.scale);}else css[name].style.transform=`matrix(${p.scale},0,0,${p.scale},${p.x},${p.y})`;}
 if(gpuReady){if(waterMesh){const buffer=waterMesh.geometry.buffers[0],points=buffer.data;for(let i=0;i<points.length;i+=2){const q=reduced.matches?{x:waterRest[i],y:waterRest[i+1]}:ripplePoint(waterRest[i],waterRest[i+1],waterMesh.texture.width,waterMesh.texture.height,cloudSeconds);points[i]=q.x;points[i+1]=q.y;}buffer.update();}try{app.render();}catch(error){console.warn('Night renderer switched to CSS.',error);gpuReady=false;host.dataset.backend='css';draw();}}
 host.dataset.ambientZoom=movingCamera.zoom.toFixed(6);host.dataset.water=waterMesh&&gpuReady?'ripple-mesh':'static';host.dataset.cloudSeconds=cloudSeconds.toFixed(3);host.dataset.center=camera.center.toFixed(6);host.dataset.zoom=camera.zoom.toFixed(6);host.dataset.frames=String(Number(host.dataset.frames||0)+1);
}
function sync(){const next={width:stage.clientWidth,height:stage.clientHeight},resized=next.width!==view.width||next.height!==view.height;view=next;const r=canvas.getBoundingClientRect(),v=stage.getBoundingClientRect(),z=Number(canvas.dataset.zoom)||1;if(r.width)camera={center:(v.width/2-(r.left-v.left))/r.width,zoom:z};if(resized&&app?.renderer)app.renderer.resize(view.width,view.height);schedule();}
window.addEventListener('alkymia-camera',e=>{camera=e.detail;schedule();});
stage.addEventListener('scroll',sync,{passive:true});
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons||!canMove())return;const r=stage.getBoundingClientRect();target={x:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))};schedule();});
stage.addEventListener('pointerleave',()=>{target={x:0,y:0};schedule();});
new ResizeObserver(sync).observe(stage);
new MutationObserver(()=>{last=0;schedule();}).observe(intro,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{last=0;schedule();}).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused']});
new MutationObserver(()=>{last=0;schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-light']});
document.querySelector('dialog').addEventListener('close',()=>{last=0;schedule();});
reduced.addEventListener('change',()=>{target=pointer={x:0,y:0};schedule();});document.addEventListener('visibilitychange',()=>{last=0;schedule();});
try{
 map=await (await fetch('night-layers.json?v=solid-masks-v6')).json();const images={};await Promise.all(names.map(async name=>{const img=new Image();img.src=map[name].url;await img.decode();images[name]=img;const m=map[name],el=document.createElement('div');el.className='night-css-plane';img.alt='';img.draggable=false;img.style.cssText=`left:${m.x}px;top:${m.y}px;width:${m.width}px;height:${m.height}px`;el.append(img);host.append(el);css[name]=el;}));
 // Promise completion order must never determine visual stacking.
 for(const name of names)host.append(css[name]);
 try{app=new Application();await app.init({width:view.width,height:view.height,preference:'webgl',autoStart:false,sharedTicker:false,antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2),background:0x0e1518});app.stage.eventMode='none';host.append(app.canvas);
 for(const name of names){const m=map[name],texture=Texture.from(images[name]);texture.source.autoGenerateMipmaps=true;texture.source.scaleMode='linear';texture.source.style.mipmapFilter='linear';const group=new Container(),sprite=name==='river'?new MeshPlane({texture,verticesX:41,verticesY:19}):new Sprite(texture);if(name==='river'){waterMesh=sprite;waterRest=new Float32Array(sprite.geometry.buffers[0].data);}sprite.position.set(m.x,m.y);sprite.width=m.width;sprite.height=m.height;group.addChild(sprite);app.stage.addChild(group);gpu[name]=group;}gpuReady=true;
 app.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gpuReady=false;host.dataset.backend='css';schedule();});
 app.canvas.addEventListener('webglcontextrestored',()=>{gpuReady=true;host.dataset.backend='gpu';schedule();});
 }catch(error){console.warn('WebGL unavailable; using CSS night layers.',error);}
 ready=true;host.dataset.backend=gpuReady?'gpu':'css';shell.classList.add('night-ready');sync();draw();
}catch(error){host.remove();console.warn('Night layers unavailable; retaining the original scene.',error);}

window.addEventListener('alkymia-genesis-reset',()=>{cloudSeconds=0;last=0;camera={center:.5,zoom:1};pointer={x:0,y:0};target={x:0,y:0};schedule();});
