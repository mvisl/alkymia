import {spaces} from '../scene.js';
// Canonical panorama coordinates drive HTML navigation and the night renderer.
// Native input and focus flights share one camera; ambient depth is decorative.
const stage=document.querySelector('.world-window');
const canvas=document.querySelector('.world-canvas');
const boxes={passage:[22,46,11,32],tower:[15,4,9,52],aquarium:[41,38,10,32],palace:[77,26,14,48],bridge:[53,55,24,25]};
const links=document.querySelector('#world-landmarks');
links.innerHTML=spaces.filter(s=>s.id!=='passage').map(s=>{const [x,y,w,h]=boxes[s.id];return `<a class="landmark" href="#${s.id}" aria-label="${s.label}: ${s.name}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><span class="landmark-caption"><b>${s.label}</b><small>${s.name}</small></span></a>`;}).join('');
document.querySelector('#world-navigation').innerHTML=spaces.map(s=>`<a href="#${s.id}"><span>${s.label}</span><small>${s.name}</small></a>`).join('');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const camera={center:.5,zoom:1};let cameraFrame=0,panVelocity=0,panTarget=.5,lastCameraTime=0;
let zoomTarget=1,zoomVelocity=0;
let landscapePaused=false;
const motionButton=document.querySelector('.world-motion');
function motionLabel(){motionButton.textContent=landscapePaused?'Resume motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(landscapePaused));motionButton.setAttribute('aria-label',motionButton.textContent+' in the landscape');document.body.dataset.motionPaused=String(landscapePaused);}
function returnToWideView(){if(location.hash==='#passage'||document.querySelector('#alkymia-passage-page')||reduced.matches||document.documentElement.dataset.light!=='night'||!document.querySelector('.genesis').hidden)return;landscapePaused=false;motionLabel();moveCamera(camera.center,1,true);}
let focusTimer,clearTimer;
let manualControl=false,lastWheelAt=-Infinity,pointerPosition=null,lastPhysicalMoveAt=0;
function syncCameraFromScroll(){
 const width=canvas.clientWidth;if(!width)return;
 camera.center=(stage.scrollLeft+stage.clientWidth/2-(1-camera.zoom)*width/2)/(width*camera.zoom);
 panTarget=camera.center;
}
function takeManualControl(){
 manualControl=true;clearTimeout(focusTimer);clearTimeout(clearTimer);
 cancelAnimationFrame(cameraFrame);cameraFrame=0;panVelocity=0;zoomVelocity=0;
 syncCameraFromScroll();
 zoomTarget=camera.zoom;
 delete canvas.dataset.active;document.querySelectorAll('.is-emphasized').forEach(e=>e.classList.remove('is-emphasized'));
}

function drawCamera(){
 const width=canvas.clientWidth;
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(camera.zoom)||!Number.isFinite(camera.center))return;
 canvas.style.transform=`scale(${camera.zoom})`;
 canvas.dataset.zoom=String(camera.zoom);
 const desired=camera.center*width*camera.zoom+(1-camera.zoom)*width/2-stage.clientWidth/2;
 const max=Number.isFinite(stage.scrollWidth)?Math.max(0,stage.scrollWidth-stage.clientWidth):Infinity;
 const target=Math.max(0,Math.min(max,desired));
 stage.scrollLeft=target;
 // Native scrolling rounds to device pixels. Correct the fractional remainder
 // in the same transform so a slowly zooming engraving does not hop sideways.
 const remainder=stage.scrollLeft-target;
 canvas.style.transform=`translateX(${remainder}px) scale(${camera.zoom})`;
 const r=canvas.getBoundingClientRect(),v=stage.getBoundingClientRect();
 window.dispatchEvent(new CustomEvent('alkymia-camera',{detail:{center:(v.width/2-(r.left-v.left))/r.width,zoom:camera.zoom}}));
}
function cameraStep(now){
 const dt=Math.min(.05,Math.max(0,(now-lastCameraTime)/1000));lastCameraTime=now;
 const count=Math.max(1,Math.ceil(dt/(1/120))),h=dt/count;
 // Critically damped horizontal motion keeps velocity when the target changes.
 // Speed and acceleration are bounded in viewport widths, not image widths.
 const ratio=stage.clientWidth/canvas.clientWidth,maxSpeed=.4*ratio,maxAcceleration=.85*ratio;
 for(let n=0;n<count;n++){
  const acceleration=Math.max(-maxAcceleration,Math.min(maxAcceleration,6.25*(panTarget-camera.center)-5*panVelocity));
  panVelocity=Math.max(-maxSpeed,Math.min(maxSpeed,panVelocity+acceleration*h));
  camera.center+=panVelocity*h;
 }
 // One damped zoom trajectory retains velocity across retargets. Switching
 // sections never restarts an ease from zero or briefly targets the wide view.
 for(let n=0;n<count;n++){
  zoomVelocity+=(5.76*(zoomTarget-camera.zoom)-4.8*zoomVelocity)*h;
  camera.zoom+=zoomVelocity*h;
 }
 const zoomSettled=Math.abs(zoomTarget-camera.zoom)<.000005&&Math.abs(zoomVelocity)<.000005;
 if(zoomSettled){camera.zoom=zoomTarget;zoomVelocity=0;}
 const settled=Math.abs(panTarget-camera.center)*canvas.clientWidth<.12&&Math.abs(panVelocity)*canvas.clientWidth<.15;
 if(settled){camera.center=panTarget;panVelocity=0;}
 drawCamera();
 if(!settled||!zoomSettled)cameraFrame=requestAnimationFrame(cameraStep);else cameraFrame=0;
}
function moveCamera(center,zoom=1,animate=true){
 if(!Number.isFinite(center)||!Number.isFinite(zoom))return;
 center=Math.max(0,Math.min(1,center));zoom=Math.max(1,Math.min(1.14,zoom));panTarget=center;
 if(!animate||reduced.matches){cancelAnimationFrame(cameraFrame);cameraFrame=0;panVelocity=0;zoomVelocity=0;camera.center=center;camera.zoom=1;zoomTarget=1;drawCamera();return;}
 zoomTarget=zoom;
 if(!cameraFrame){lastCameraTime=performance.now();cameraFrame=requestAnimationFrame(cameraStep);}
}
function frameSpace(s,animate=true,zoom=1){
 if(s.id==='passage')return;
 const box=boxes[s.id],focus=s.id==='bridge'?.575:(box[0]+box[2]/2)/100;moveCamera(focus,zoom,animate);
}
const dialog=document.querySelector('#space-dialog');let opener=null;
const art=s=>`<svg class="space-art" viewBox="${s.crop.join(' ')}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${['day','sunset','night'].map(mode=>`<image class="light-layer light-${mode}" href="assets/world-${mode}.png" width="1672" height="941" preserveAspectRatio="none"/>`).join('')}</svg>`;
let passagePage=null,routeGeneration=0,passagePending=false;
const sectionVeil=document.createElement('div');sectionVeil.className='section-veil';sectionVeil.setAttribute('aria-hidden','true');document.body.append(sectionVeil);
function veil(covered){sectionVeil.classList.toggle('is-covered',covered);}
async function openPassage(generation){
 if(passagePage||passagePending)return;passagePending=true;
 const previousPaused=landscapePaused;takeManualControl();landscapePaused=true;motionLabel();veil(true);
 try{
  const [{mountPassagePage}]=await Promise.all([import('./space/passage.mjs?v=night-arcade-9'),new Promise(resolve=>setTimeout(resolve,reduced.matches?0:350))]);
  if(generation!==routeGeneration||location.hash!=='#passage'){landscapePaused=previousPaused;motionLabel();return;}
  if(dialog.open)dialog.close();
  const mounted=await mountPassagePage({onExit({reason}){
   passagePage=null;landscapePaused=previousPaused;motionLabel();
   if(reason==='pagehide')return;
   // The old scene is preserved, never reset or flown back to its start.
   veil(true);requestAnimationFrame(()=>requestAnimationFrame(()=>veil(false)));
   if(reason!=='route-change'&&location.hash==='#passage'){
    history.replaceState(null,'',location.pathname);
    document.querySelectorAll('#world-navigation a').forEach(a=>a.removeAttribute('aria-current'));
   }
  }});
  if(generation!==routeGeneration||location.hash!=='#passage')mounted.unmount('route-change');
  else passagePage=mounted.getState().destroyed?null:mounted;
 }catch(error){
  console.error('Passage could not be opened',error);landscapePaused=previousPaused;motionLabel();
  // The existing readable content remains available if the optional module fails.
  if(location.hash==='#passage'){history.replaceState(null,'',location.pathname+'#passage-reading');showSpace(spaces[0],0);}
 }finally{passagePending=false;veil(false);}
}
function route(){
 const generation=++routeGeneration;
 const i=spaces.findIndex(s=>s.id===location.hash.slice(1));
 if(passagePage&&spaces[i]?.id!=='passage')passagePage.unmount('route-change');
 if(i<0){if(dialog.open)dialog.close();return;}
 const s=spaces[i];
 document.querySelectorAll('#world-navigation a').forEach(a=>a.setAttribute('aria-current',a.hash===location.hash?'location':'false'));
 if(s.id==='passage'){openPassage(generation);return;}
 showSpace(s,i);
}
function showSpace(s,i){frameSpace(s,false);if(!dialog.open)opener=document.activeElement;
 document.querySelector('#space-content').innerHTML=`${art(s)}<p class="space-eyebrow">${s.label}</p><h2 id="space-title">${s.name}</h2><p class="space-line">${s.line}</p><p class="space-body">${s.body}</p><ul class="space-details">${s.details.map(d=>`<li>${d}</li>`).join('')}</ul>`;
 document.querySelector('.space-navigation').innerHTML=`<a href="#${spaces[(i+4)%5].id}">← ${spaces[(i+4)%5].name}</a><a href="#${spaces[(i+1)%5].id}">${spaces[(i+1)%5].name} →</a>`;
 document.querySelectorAll('#world-navigation a').forEach(a=>a.setAttribute('aria-current',a.hash===location.hash?'location':'false'));
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
function closeSpace(){dialog.close();history.replaceState(null,'',location.pathname);document.querySelectorAll('#world-navigation a').forEach(a=>a.removeAttribute('aria-current'));}
document.querySelector('.close').addEventListener('click',closeSpace);dialog.addEventListener('cancel',e=>{e.preventDefault();closeSpace();});dialog.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSpace();}});
window.addEventListener('hashchange',route);

document.querySelectorAll('[data-pan]').forEach(b=>b.addEventListener('click',()=>moveCamera(camera.center+Number(b.dataset.pan)*stage.clientWidth*.65/canvas.clientWidth,1,true)));
let drag=null,dragged=false;
stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;takeManualControl();pointerPosition={x:e.clientX,y:e.clientY};if(e.pointerType!=='mouse')return;drag={x:e.clientX,left:stage.scrollLeft};dragged=false;});
stage.addEventListener('wheel',e=>{lastWheelAt=performance.now();pointerPosition={x:e.clientX,y:e.clientY};takeManualControl();},{passive:true});
stage.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))takeManualControl();});
window.addEventListener('keydown',e=>{if(e.key==='Tab')manualControl=false;});
function notePointerIntent(e){
 if(e.pointerType!=='mouse')return;
 const distance=pointerPosition?Math.hypot(e.clientX-pointerPosition.x,e.clientY-pointerPosition.y):Infinity;
 if(distance>.25)lastPhysicalMoveAt=performance.now();
 const moved=pointerPosition&&distance>4;
 if(!drag&&manualControl&&moved&&performance.now()-lastWheelAt>350)manualControl=false;
 if(drag||!manualControl||!pointerPosition)pointerPosition={x:e.clientX,y:e.clientY};
}
// Enter/over can be emitted when scenery moves under a stationary pointer.
// Only a fresh physical pointer displacement may re-arm hover following.
window.addEventListener('pointermove',notePointerIntent,{capture:true});
window.addEventListener('pointerover',notePointerIntent,{capture:true});
window.addEventListener('pointermove',e=>{if(!drag)return;const delta=e.clientX-drag.x;if(Math.abs(delta)>5){dragged=true;stage.classList.add('is-dragging');stage.scrollLeft=drag.left-delta;}});
function finishDrag(e){pointerPosition={x:e.clientX,y:e.clientY};drag=null;stage.classList.remove('is-dragging');}
window.addEventListener('pointerup',finishDrag);window.addEventListener('pointercancel',finishDrag);
stage.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopPropagation();dragged=false;}},true);stage.addEventListener('dragstart',e=>e.preventDefault());
let request=0;document.querySelectorAll('[data-light-choice]').forEach(button=>button.addEventListener('click',async()=>{const id=++request,mode=button.dataset.lightChoice,img=new Image();img.src=`assets/world-${mode}.png`;try{await img.decode();}catch{return;}if(id!==request)return;document.documentElement.dataset.light=mode;document.querySelectorAll('[data-light-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('meta[name="theme-color"]').content={night:'#101619',sunset:'#1a1a1e',day:'#f5ebdb'}[mode];}));
// Keep the source plane proportional to the actual grid space, not a fixed
// height or the full browser height. Preserve the camera center on resize.
function layoutScene(){
 canvas.style.width=`${stage.clientHeight*(1672/435)}px`;
 drawCamera();
}
layoutScene();route();
stage.addEventListener('scroll',()=>{if(cameraFrame)return;syncCameraFromScroll();},{passive:true});
const sceneLayout=new ResizeObserver(layoutScene);sceneLayout.observe(stage);

// Hand-defined silhouettes in the original image coordinate system. The mask
// dims the surroundings, never paints a new glow over the engraving.
const silhouettes={
 tower:'M318 132 C293 131 278 163 270 202 C264 236 262 271 264 301 L366 293 C365 254 361 219 351 187 C341 153 331 133 318 132 Z',
 aquarium:'M712 277 C735 264 787 263 812 276 L812 282 L809 284 L809 354 Q783 362 768 357 L755 355 L747 350 L738 352 L730 356 Q721 359 714 354 L714 284 L712 282 Z',
 palace:'M1309 254 L1321 250 L1399 222 L1402 214 L1405 219 L1405 225 L1472 253 L1474 260 L1470 264 L1470 372 L1391 374 L1314 372 L1314 262 L1309 261 Z',
 bridge:'M790 412 Q810 386 846 378 Q864 372 883 379 Q913 361 940 365 Q976 343 1006 350 Q1033 330 1066 339 Q1100 317 1133 330 Q1160 324 1184 354 L1200 370 L1280 366 L1280 434 L790 440 Z M824 433 Q827 420 840 418 Q851 416 856 433 Z M871 433 Q879 414 901 410 Q914 409 920 433 Z M931 433 Q949 400 980 399 Q1007 400 1017 433 Z M1030 433 Q1040 394 1092 386 Q1140 385 1160 433 Z M1180 433 Q1190 395 1225 382 L1280 376 L1280 433 Z'
};
const silhouette=document.querySelector('#focus-silhouette');
const navigation=document.querySelector('#world-navigation');
function emphasize(id,pan=false){
 if(manualControl||drag)return;
 clearTimeout(clearTimer);
 const s=spaces.find(s=>s.id===id);if(!s)return;
 if(id==='passage'){release();return;}
 silhouette.setAttribute('d',silhouettes[id]);canvas.dataset.active=id;
 navigation.querySelectorAll('a').forEach(a=>a.classList.toggle('is-emphasized',a.hash==='#'+id));
 links.querySelectorAll('a').forEach(a=>a.classList.toggle('is-emphasized',a.hash==='#'+id));
 if(pan)frameSpace(s,true,1.09);else moveCamera(panTarget,1.09,true);
}
function release(){
 clearTimeout(focusTimer);clearTimeout(clearTimer);
 if(manualControl||drag)return;
 clearTimer=setTimeout(()=>{delete canvas.dataset.active;document.querySelectorAll('.is-emphasized').forEach(e=>e.classList.remove('is-emphasized'));moveCamera(panTarget,1,true);},320);
}
for(const a of navigation.querySelectorAll('a')){
 a.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse'||manualControl||drag)return;clearTimeout(focusTimer);clearTimeout(clearTimer);focusTimer=setTimeout(()=>emphasize(a.hash.slice(1),true),140);});
 a.addEventListener('pointerleave',release);
 a.addEventListener('focus',()=>emphasize(a.hash.slice(1),true));a.addEventListener('blur',release);
}
for(const a of links.querySelectorAll('a')){
 a.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&performance.now()-lastPhysicalMoveAt<=150)emphasize(a.hash.slice(1));});
 a.addEventListener('pointerleave',()=>{if(performance.now()-lastPhysicalMoveAt<=150)release();});a.addEventListener('focus',()=>emphasize(a.hash.slice(1),true));a.addEventListener('blur',release);
}
dialog.addEventListener('close',release);

reduced.addEventListener('change',()=>{if(reduced.matches)moveCamera(camera.center,1,false);});

// Pause freezes both the focus camera and decorative depth movement.
motionButton.addEventListener('click',()=>{if(!landscapePaused){cancelAnimationFrame(cameraFrame);cameraFrame=0;panVelocity=0;zoomVelocity=0;landscapePaused=true;motionLabel();}else{landscapePaused=false;motionLabel();returnToWideView();}});
const genesis=document.querySelector('.genesis');
new MutationObserver(()=>{if(genesis.hidden)returnToWideView();else{cancelAnimationFrame(cameraFrame);cameraFrame=0;panVelocity=0;zoomVelocity=0;landscapePaused=true;motionLabel();}}).observe(genesis,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{if(document.documentElement.dataset.light==='night'&&!landscapePaused)returnToWideView();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-light']});
document.addEventListener('visibilitychange',()=>{lastCameraTime=performance.now();});
reduced.addEventListener('change',()=>{if(reduced.matches){landscapePaused=true;motionLabel();}});
motionLabel();if(genesis.hidden&&!location.hash)returnToWideView();

window.addEventListener('alkymia-genesis-reset',()=>{takeManualControl();moveCamera(.5,1,false);});

window.addEventListener('pageshow',event=>{if(event.persisted)route();});
