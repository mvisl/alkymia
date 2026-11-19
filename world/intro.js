const intro=document.querySelector('.genesis');
const vessel=intro.querySelector('.genesis-vessel');
const replay=document.querySelector('.genesis-replay');
const film=intro.querySelector('.genesis-film');
const status=intro.querySelector('.genesis-status');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const world=[...document.body.children].filter(el=>el!==intro&&el.tagName!=='SCRIPT');
let timers=[],frameCallback=0,playing=false,revealing=false,session=0,resumeOnVisible=false;
function later(fn,delay){const id=setTimeout(fn,delay);timers.push(id);return id;}
function clear(){timers.forEach(clearTimeout);timers=[];if(frameCallback&&film.cancelVideoFrameCallback)film.cancelVideoFrameCallback(frameCallback);frameCallback=0;}
function stop(){playing=false;resumeOnVisible=false;film.pause();intro.classList.remove('is-playing');}
function finish(){clear();stop();intro.hidden=true;document.body.dataset.introState='settling';window.dispatchEvent(new Event('alkymia-genesis-complete'));later(()=>{delete document.body.dataset.introState;},900);intro.style.removeProperty('opacity');intro.style.removeProperty('transition-duration');world.forEach(el=>el.inert=false);document.querySelector('.world-window').focus({preventScroll:true});intro.dataset.playback='complete';}
function reveal(seconds=.85){if(revealing||intro.hidden)return;revealing=true;clear();intro.classList.add('is-leaving');intro.style.transitionDuration=`${seconds}s`;later(finish,seconds*1000+50);}
function start(){session++;clear();stop();document.body.dataset.introState='holding';revealing=false;intro.hidden=false;intro.classList.remove('is-leaving');intro.classList.remove('is-handing-off');intro.style.removeProperty('opacity');intro.style.removeProperty('transition-duration');delete intro.dataset.phase;intro.dataset.playback='poster';status.textContent='';film.currentTime=0;fitFilm();window.dispatchEvent(new Event('alkymia-genesis-reset'));
 world.forEach(el=>el.inert=true);
 if(document.activeElement===replay)intro.querySelector('.genesis-skip').focus({preventScroll:true});
 later(()=>intro.dataset.phase='word',reduced.matches?100:650);
 later(()=>intro.dataset.phase='vessel',reduced.matches?500:2300);
}
function fitFilm(){
 const r=document.querySelector('.world-window').getBoundingClientRect(),width=r.height*32/9;
 film.style.width=`${width}px`;film.style.height=`${r.height}px`;
 film.style.left=`${r.left+(r.width-width)/2}px`;film.style.top=`${r.top}px`;
}
window.addEventListener('resize',fitFilm);
new ResizeObserver(fitFilm).observe(document.querySelector('.world-window'));
function watchFrame(){if(!playing||revealing||intro.hidden)return;

 if(Number.isFinite(film.duration)&&film.duration>0&&film.duration-film.currentTime<=.9){reveal(Math.max(.15,film.duration-film.currentTime));return;}
 if(film.requestVideoFrameCallback)frameCallback=film.requestVideoFrameCallback(watchFrame);
}
async function enter(){if(playing||revealing)return;if(reduced.matches){reveal(.22);return;}
 clear();playing=true;document.body.dataset.introState='playing';intro.dataset.playback='loading';status.textContent='Opening the world…';const current=++session;
 const timeout=later(()=>{if(current===session&&playing&&film.currentTime<.05){status.textContent='';reveal(.65);}},3000);
 try{await film.play();if(current!==session||intro.hidden||revealing){film.pause();return;}clearTimeout(timeout);intro.classList.add('is-playing');intro.dataset.playback='playing';status.textContent='';watchFrame();later(()=>{if(current===session&&!revealing)reveal(.65);},(Number.isFinite(film.duration)?film.duration:16)*1000+5000);}
 catch{if(current===session){status.textContent='';reveal(.65);}}
}
film.addEventListener('timeupdate',()=>{if(!film.requestVideoFrameCallback)watchFrame();});
film.addEventListener('ended',()=>{if(playing&&!revealing)reveal(.25);});
film.addEventListener('error',()=>{intro.dataset.playback='unavailable';if(playing)reveal(.65);});
vessel.addEventListener('click',enter);
intro.querySelector('.genesis-skip').addEventListener('click',()=>{session++;stop();reveal(reduced.matches?.22:.65);});
replay.addEventListener('click',start);
intro.addEventListener('keydown',event=>{if(event.key==='Escape'){session++;stop();reveal(reduced.matches?.22:.65);}});
reduced.addEventListener('change',()=>{if(reduced.matches&&playing)reveal(.22);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeOnVisible=playing&&!revealing;film.pause();}else if(resumeOnVisible){resumeOnVisible=false;film.play().catch(()=>reveal(.35));}});
// Deep links remain immediate. Every visit to the introduction starts on a held
// encoded first frame; the cinematic begins only on explicit Enter.
if(location.hash){intro.hidden=true;}else start();
