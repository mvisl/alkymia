// All masks are baked offline. The runtime only composites transparent textures.
const stage=document.querySelector('.world-window');
const scene=document.querySelector('.depth-scene');
const canvas=document.querySelector('.world-canvas');
const intro=document.querySelector('.genesis');
const pause=document.querySelector('.world-motion');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const planes=Object.fromEntries([...document.querySelectorAll('[data-plane]')].map(e=>[e.dataset.plane,e]));
let paused=false,x=0,y=0,tx=0,ty=0,last=0,raf=0;
function active(){return !document.hidden&&!paused&&!reduced.matches&&document.documentElement.dataset.light==='night'&&intro.hidden;}
function schedule(){if(!raf&&active())raf=requestAnimationFrame(frame);}
function setPaused(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-label',paused?'Resume landscape motion':'Pause landscape motion');scene.classList.toggle('motion-paused',!active());if(!paused)schedule();}
pause.addEventListener('click',()=>{paused=!paused;setPaused();});
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons)return;const r=stage.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1;schedule();});
stage.addEventListener('pointerleave',()=>{tx=ty=0;schedule();});
function transform(name,px,py){
 // Keep fractional positions while moving; do not introduce per-frame steps.
 const ratio=canvas.clientWidth/1672;
 const value=`translate(${(px*ratio).toFixed(5)}px,${(py*ratio).toFixed(5)}px)`;
 if(planes[name].style.transform!==value)planes[name].style.transform=value;
}
function frame(now){raf=0;if(!active()){last=0;return;}const dt=Math.min(.05,(now-(last||now))/1000);last=now;
 const ease=1-Math.exp(-dt/1.1);x+=(tx-x)*ease;y+=(ty-y)*ease;
 // Keep architecture aligned with its focus silhouette. Only near silhouettes
 // move independently; no translated copy of sky/water over identical pixels.
 transform('city',0,0);transform('landmarks',0,0);
 transform('left-bank',x*2,y*.3);transform('right-bank',x*2.5,y*.4);

 transform('left-tree',x*4,y*.6);transform('right-tree',x*5,y*.8);
 if(Math.abs(tx-x)<.0005&&Math.abs(ty-y)<.0005){x=tx;y=ty;last=0;return;}

 schedule();
}
function adaptMotion(){if(reduced.matches){for(const p of Object.values(planes))p.style.transform='';}setPaused();schedule();}
reduced.addEventListener('change',adaptMotion);
document.addEventListener('visibilitychange',()=>{last=0;setPaused();});
new MutationObserver(()=>{last=0;setPaused();}).observe(intro,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(setPaused).observe(document.documentElement,{attributes:true,attributeFilter:['data-light']});
adaptMotion();
