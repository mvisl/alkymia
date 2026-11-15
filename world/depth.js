// Original coloured pixels; masks and hidden plates are shared with the approved study.
const stage=document.querySelector('.world-window'),scene=document.querySelector('.depth-scene');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const get=name=>scene.querySelector('.'+name);
const pause=document.querySelector('.world-motion');let paused=false;
pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-label',paused?'Resume landscape motion':'Pause landscape motion');});
let x=0,y=0,tx=0,ty=0,last=0,clock=0;
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons)return;const r=stage.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1;});
stage.addEventListener('pointerleave',()=>{tx=ty=0;});
function frame(now){const dt=Math.min(.05,(now-(last||now))/1000);last=now;
 if(!document.hidden&&!paused&&!reduced.matches&&document.documentElement.dataset.light==='night'&&document.querySelector('.genesis').hidden){
 clock+=dt;const ease=1-Math.exp(-dt/1.5);x+=(tx-x)*ease;y+=(ty-y)*ease;
 const d=Math.max(0,Math.min(1,(Number(document.querySelector('.world-canvas').dataset.zoom||1)-1)/.08));
 get('city-plane').setAttribute('transform',`translate(${x*1.1} ${y*.25}) translate(836 360) scale(${1+d*.003}) translate(-836 -360)`);
 get('hero-plane').setAttribute('transform',`translate(${x*2.8} ${y*.5}) translate(836 360) scale(${1+d*.007}) translate(-836 -360)`);
 get('left-terrain').setAttribute('transform',`translate(${x*3.7} ${y*.7})`);
 get('right-terrain').setAttribute('transform',`translate(${x*4.7} ${y*.9})`);
 get('left-plane').setAttribute('transform',`translate(${x*6-d*3} ${y*1.1}) translate(0 500) scale(${1+d*.012}) translate(0 -500)`);
 get('branch-plane').setAttribute('transform',`translate(${x*8-d*5} ${y*1.5}) translate(1672 440) scale(${1+d*.015}) translate(-1672 -440)`);
 get('branch-drift').setAttribute('transform',`rotate(${Math.sin(clock/12)*.025} 1660 440)`);
 get('sky-plane').setAttribute('transform',`translate(${Math.sin(clock/38)*1.6} ${Math.sin(clock/47)*.15})`);
 scene.querySelector('#water-ripple feDisplacementMap').setAttribute('scale',String(.75+Math.sin(clock/5)*.4));
 // Slowly advect fine horizontal noise, without moving banks or architecture.
 scene.querySelector('#water-ripple feTurbulence').setAttribute('baseFrequency',`.009 ${.09+Math.sin(clock/19)*.004}`);
 }
 requestAnimationFrame(frame);
}
reduced.addEventListener('change',()=>{if(reduced.matches){['city-plane','hero-plane','left-plane','branch-plane','branch-drift','sky-plane','left-terrain','right-terrain'].forEach(n=>get(n).removeAttribute('transform'));scene.querySelector('#water-ripple feDisplacementMap').setAttribute('scale','0');}});
requestAnimationFrame(frame);
