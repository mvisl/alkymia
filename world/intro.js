const intro=document.querySelector('.genesis');
const vessel=intro.querySelector('.genesis-vessel');
const replay=document.querySelector('.genesis-replay');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let timers=[];
const world=[...document.body.children].filter(el=>el!==intro&&el.tagName!=='SCRIPT');
function later(fn,delay){timers.push(setTimeout(fn,delay));}
function start(){
 timers.forEach(clearTimeout);timers=[];
 intro.hidden=false;intro.classList.remove('is-leaving');delete intro.dataset.phase;
 world.forEach(el=>el.inert=true);
 if(document.activeElement===replay)intro.querySelector('.genesis-skip').focus({preventScroll:true});
 later(()=>intro.dataset.phase='word',reduced.matches?100:650);
 later(()=>intro.dataset.phase='vessel',reduced.matches?500:2300);
}
function enter(){
 timers.forEach(clearTimeout);timers=[];
 intro.classList.add('is-leaving');
 later(()=>{intro.hidden=true;world.forEach(el=>el.inert=false);document.querySelector('.world-window').focus({preventScroll:true});},reduced.matches?220:2900);
}
vessel.addEventListener('click',enter);
intro.querySelector('.genesis-skip').addEventListener('click',enter);
replay.addEventListener('click',start);
intro.addEventListener('keydown',event=>{if(event.key==='Escape')enter();});
// Deep links open their destination immediately; the introduction is always replayable.
if(location.hash){intro.hidden=true;}else start();
