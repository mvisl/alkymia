// All masks are baked offline. The runtime only composites transparent textures.
const stage=document.querySelector('.world-window');
const scene=document.querySelector('.depth-scene');
const canvas=document.querySelector('.world-canvas');
const intro=document.querySelector('.genesis');
const pause=document.querySelector('.world-motion');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const planes=Object.fromEntries([...scene.querySelectorAll('[data-plane]')].map(e=>[e.dataset.plane,e]));
let paused=false,x=0,y=0,tx=0,ty=0,last=0,clock=0,raf=0;
function active(){return !document.hidden&&!paused&&!reduced.matches&&document.documentElement.dataset.light==='night'&&intro.hidden;}
function schedule(){if(!raf&&active())raf=requestAnimationFrame(frame);}
function setPaused(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-label',paused?'Resume landscape motion':'Pause landscape motion');scene.classList.toggle('motion-paused',!active());if(!paused)schedule();}
pause.addEventListener('click',()=>{paused=!paused;setPaused();});
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons)return;const r=stage.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1;schedule();});
stage.addEventListener('pointerleave',()=>{tx=ty=0;schedule();});
function transform(name,px,py,scale=1){planes[name].style.transform=`translate3d(${px/1672*100}%,${py/435*100}%,0) scale(${scale})`;}
function frame(now){raf=0;if(!active()){last=0;return;}const dt=Math.min(.05,(now-(last||now))/1000);last=now;clock+=dt;
 const ease=1-Math.exp(-dt/1.1);x+=(tx-x)*ease;y+=(ty-y)*ease;
 const d=Math.max(0,Math.min(1,(Number(canvas.dataset.zoom||1)-1)/.08));
 transform('city',x*1.4,y*.3,1+d*.003);
 transform('landmarks',x*3.5,y*.6,1+d*.007);
 transform('left-bank',x*5,y*.9,1+d*.005);
 transform('right-bank',x*6,y,1+d*.005);
 transform('left-tree',x*10-d*3+Math.sin(clock/9)*.5,y*1.4,1+d*.012);
 transform('right-tree',x*13-d*5+Math.sin(clock/11)*.6,y*1.8,1+d*.015);
 // Broad, very slow motion; the stationary moon remains in the base artwork.
 transform('sky',Math.sin(clock/32)*3,Math.sin(clock/43)*.2);
 schedule();
}
function adaptMotion(){if(reduced.matches){for(const p of Object.values(planes))p.style.transform='';}setPaused();schedule();}
reduced.addEventListener('change',adaptMotion);
document.addEventListener('visibilitychange',()=>{last=0;setPaused();});
new MutationObserver(()=>{last=0;setPaused();}).observe(intro,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(setPaused).observe(document.documentElement,{attributes:true,attributeFilter:['data-light']});
adaptMotion();
