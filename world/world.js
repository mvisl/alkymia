import {spaces} from '../scene.js';
// One canonical flat plane today. Future sky/architecture/water layers share its
// coordinates; no invented depth transforms or independently regenerated art.
const stage=document.querySelector('.world-window');
const canvas=document.querySelector('.world-canvas');
const boxes={passage:[22,46,11,32],tower:[15,4,9,52],aquarium:[41,38,10,32],palace:[77,26,14,48],bridge:[53,55,24,25]};
const links=document.querySelector('#world-landmarks');
links.innerHTML=spaces.map(s=>{const [x,y,w,h]=boxes[s.id];return `<a class="landmark" href="#${s.id}" aria-label="${s.label}: ${s.name}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><span class="landmark-caption"><b>${s.label}</b><small>${s.name}</small></span></a>`;}).join('');
document.querySelector('#world-navigation').innerHTML=spaces.map(s=>`<a href="#${s.id}"><span>${s.label}</span><small>${s.name}</small></a>`).join('');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
function frameSpace(s,animate=true){const box=boxes[s.id];const center=(box[0]+box[2]/2)/100*canvas.clientWidth;stage.scrollTo({left:center-stage.clientWidth/2,behavior:animate&&!reduced.matches?'smooth':'instant'});}
const dialog=document.querySelector('#space-dialog');let opener=null;
const art=s=>`<svg class="space-art" viewBox="${s.crop.join(' ')}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${['day','sunset','night'].map(mode=>`<image class="light-layer light-${mode}" href="../assets/world-${mode}.png" width="1672" height="941" preserveAspectRatio="none"/>`).join('')}</svg>`;
function route(){const i=spaces.findIndex(s=>s.id===location.hash.slice(1));if(i<0){if(dialog.open)dialog.close();return;}const s=spaces[i];frameSpace(s,false);if(!dialog.open)opener=document.activeElement;
 document.querySelector('#space-content').innerHTML=`${art(s)}<p class="space-eyebrow">${s.label}</p><h2 id="space-title">${s.name}</h2><p class="space-line">${s.line}</p><p class="space-body">${s.body}</p><ul class="space-details">${s.details.map(d=>`<li>${d}</li>`).join('')}</ul>`;
 document.querySelector('.space-navigation').innerHTML=`<a href="#${spaces[(i+4)%5].id}">← ${spaces[(i+4)%5].name}</a><a href="#${spaces[(i+1)%5].id}">${spaces[(i+1)%5].name} →</a>`;
 document.querySelectorAll('#world-navigation a').forEach(a=>a.setAttribute('aria-current',a.hash===location.hash?'location':'false'));
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
function closeSpace(){dialog.close();history.replaceState(null,'',location.pathname);document.querySelectorAll('#world-navigation a').forEach(a=>a.removeAttribute('aria-current'));}
document.querySelector('.close').addEventListener('click',closeSpace);dialog.addEventListener('cancel',e=>{e.preventDefault();closeSpace();});dialog.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSpace();}});
window.addEventListener('hashchange',route);
links.querySelectorAll('a').forEach(a=>a.addEventListener('focus',()=>frameSpace(spaces.find(s=>a.hash==='#'+s.id))));
document.querySelectorAll('[data-pan]').forEach(b=>b.addEventListener('click',()=>stage.scrollBy({left:Number(b.dataset.pan)*stage.clientWidth*.65,behavior:reduced.matches?'instant':'smooth'})));
let drag=null,dragged=false;
stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:stage.scrollLeft};dragged=false;});
window.addEventListener('pointermove',e=>{if(!drag)return;const delta=e.clientX-drag.x;if(Math.abs(delta)>5){dragged=true;stage.classList.add('is-dragging');stage.scrollLeft=drag.left-delta;}});
window.addEventListener('pointerup',()=>{drag=null;stage.classList.remove('is-dragging');});window.addEventListener('pointercancel',()=>{drag=null;});
stage.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopPropagation();dragged=false;}},true);stage.addEventListener('dragstart',e=>e.preventDefault());
let request=0;document.querySelectorAll('[data-light-choice]').forEach(button=>button.addEventListener('click',async()=>{const id=++request,mode=button.dataset.lightChoice,img=new Image();img.src=`../assets/world-${mode}.png`;try{await img.decode();}catch{return;}if(id!==request)return;document.documentElement.dataset.light=mode;document.querySelectorAll('[data-light-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#current-light').textContent=mode[0].toUpperCase()+mode.slice(1);document.querySelector('meta[name="theme-color"]').content={night:'#101619',sunset:'#1a1a1e',day:'#f5ebdb'}[mode];}));
// Start with the complete river crossing centered; every destination remains in
// the persistent text navigation, including when its artwork is outside the crop.
stage.scrollLeft=(canvas.clientWidth-stage.clientWidth)/2;route();
let cameraCenter=(stage.scrollLeft+stage.clientWidth/2)/canvas.clientWidth;
stage.addEventListener('scroll',()=>{cameraCenter=(stage.scrollLeft+stage.clientWidth/2)/canvas.clientWidth;},{passive:true});
window.addEventListener('resize',()=>{const center=cameraCenter;requestAnimationFrame(()=>{stage.scrollLeft=center*canvas.clientWidth-stage.clientWidth/2;});});
