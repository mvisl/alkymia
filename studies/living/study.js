const stage=document.querySelector('.stage'),motion=document.querySelector('#motion'),compare=document.querySelector('#compare'),slider=document.querySelector('#approach');
const ripple=document.querySelector('#water-ripple feDisplacementMap');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const layer=Object.fromEntries(['camera','far-plane','sky-plane','city-plane','left-plane','branch-plane','branch-drift'].map(id=>[id,document.querySelector('#'+id)||document.querySelector('.'+id)]));
let running=!reduced.matches,targetX=0,targetY=0,x=0,y=0,depth=0,targetDepth=0,last=0,clock=0;
function setMotion(value){running=value&&!reduced.matches;motion.disabled=reduced.matches;slider.disabled=reduced.matches;motion.setAttribute('aria-pressed',String(running));motion.textContent=running?'Motion on':'Motion paused';document.body.classList.toggle('paused',!running);}
setMotion(running);
function frame(now){if(document.hidden){last=now;requestAnimationFrame(frame);return;}const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(running)clock+=dt;
 const ease=1-Math.exp(-dt/1.5);x+=((running?targetX:0)-x)*ease;y+=((running?targetY:0)-y)*ease;depth+=(targetDepth-depth)*(1-Math.exp(-dt/2));
 const d=reduced.matches?0:depth;
 layer.camera.setAttribute('transform',`translate(836 300) scale(${1+d*.035}) translate(-836 -300)`);
 layer['far-plane'].setAttribute('transform',`translate(0 0)`);
 layer['sky-plane'].setAttribute('transform',`translate(${Math.sin(clock/30)*.65} ${Math.cos(clock/35)*.1})`);
 layer['city-plane'].setAttribute('transform',`translate(${x*1.8} ${y*.35}) translate(836 360) scale(${1+d*.004}) translate(-836 -360)`);
 ripple.setAttribute('scale',running?String(.8+Math.sin(clock/7)*.4):'0');
 layer['left-plane'].setAttribute('transform',`translate(${x*6-d*5} ${y*1.1}) translate(0 500) scale(${1+d*.025}) translate(0 -500)`);
 layer['branch-plane'].setAttribute('transform',`translate(${x*8-d*10} ${y*1.5}) translate(1672 100) scale(${1+d*.035}) translate(-1672 -100)`);
 layer['branch-drift'].setAttribute('transform',`rotate(${Math.sin(clock/12)*.025} 1660 440)`);
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=stage.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width*2-1;targetY=(e.clientY-r.top)/r.height*2-1;});stage.addEventListener('pointerleave',()=>{targetX=targetY=0;});
motion.addEventListener('click',()=>setMotion(!running));slider.addEventListener('input',()=>targetDepth=Number(slider.value)/100);
document.querySelector('#reset').addEventListener('click',()=>{slider.value=0;targetDepth=targetX=targetY=0;});
function comparison(value){stage.classList.toggle('comparing',value);compare.setAttribute('aria-pressed',String(value));}
compare.addEventListener('pointerdown',e=>{compare.setPointerCapture(e.pointerId);comparison(true);});compare.addEventListener('pointerup',()=>comparison(false));compare.addEventListener('pointercancel',()=>comparison(false));compare.addEventListener('blur',()=>comparison(false));compare.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();comparison(true);}});compare.addEventListener('keyup',()=>comparison(false));
stage.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();setMotion(!running);}if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();slider.value=Math.max(0,Math.min(100,Number(slider.value)+(e.key==='ArrowUp'?10:-10)));targetDepth=Number(slider.value)/100;}});
reduced.addEventListener('change',()=>{setMotion(running);if(reduced.matches){slider.value=0;targetDepth=0;}});

const maskView=document.querySelector('#mask-view');maskView.addEventListener('click',()=>{const value=stage.classList.toggle('show-mask');maskView.setAttribute('aria-pressed',String(value));});
