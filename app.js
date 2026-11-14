import {spaces} from './scene.js';
const art=(space,cls='')=>`<svg class="${cls}" viewBox="${space.crop.join(' ')}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image class="light-layer light-day" href="assets/world-day.png" width="1672" height="941" preserveAspectRatio="none" /><image class="light-layer light-sunset" href="assets/world-sunset.png" width="1672" height="941" preserveAspectRatio="none" /><image class="light-layer light-night" href="assets/world-night.png" width="1672" height="941" preserveAspectRatio="none" /></svg>`;
document.querySelector('#place-list').innerHTML=spaces.map(s=>`<a class="place" href="#${s.id}">${art(s)}<div class="place-copy"><h2>${s.name}</h2><p>${s.label}</p></div></a>`).join('');
document.querySelector('#hotspots').innerHTML=spaces.map(s=>`<a class="hotspot" href="#${s.id}" style="left:${s.x}%;top:${s.y}%" aria-label="${s.name}: ${s.label}"><span>${s.name}<small>${s.label}</small></span></a>`).join('');
const dialog=document.querySelector('#space-dialog');let opener=null;
function syncRoute(){
 const id=location.hash.slice(1);const i=spaces.findIndex(s=>s.id===id);
 if(i<0){if(dialog.open)dialog.close();return;}
 const s=spaces[i];if(!dialog.open)opener=document.activeElement;
 document.querySelector('#space-content').innerHTML=`${art(s,'space-art')}<p class="space-eyebrow">${s.label}</p><h2 id="space-title">${s.name}</h2><p class="space-line">${s.line}</p><p class="space-body">${s.body}</p><ul class="space-details">${s.details.map(d=>`<li>${d}</li>`).join('')}</ul>`;
 const prev=spaces[(i+4)%5],next=spaces[(i+1)%5];document.querySelector('.space-navigation').innerHTML=`<a href="#${prev.id}">← ${prev.name}</a><a href="#${next.id}">${next.name} →</a>`;
 if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}dialog.scrollTop=0;
}
function closeSpace(){if(dialog.open)dialog.close();history.replaceState(null,'',location.pathname+location.search+'#explore');}
document.querySelector('.close').addEventListener('click',closeSpace);
dialog.addEventListener('cancel',e=>{e.preventDefault();closeSpace();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSpace();}});
dialog.addEventListener('close',()=>{document.body.style.overflow='';if(opener?.isConnected)opener.focus({preventScroll:true});});
window.addEventListener('hashchange',syncRoute);syncRoute();

// Lighting is independent of navigation. All images share one fixed scene viewport.
const lightChoices = [...document.querySelectorAll('[data-light-choice]')];
let lightRequest = 0;
async function setLight(mode){
 if(!['night','sunset','day'].includes(mode))return;
 const request = ++lightRequest;
 const image = new Image();image.src = `assets/world-${mode}.png`;
 try { await image.decode(); } catch { return; }
 if(request!==lightRequest)return;
 document.documentElement.dataset.light=mode;
 document.querySelector('meta[name="theme-color"]').content={night:'#101619',sunset:'#1a1a1e',day:'#f5ebdb'}[mode];
 lightChoices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lightChoice===mode)));
 document.querySelector('#current-light').textContent=mode[0].toUpperCase()+mode.slice(1);
}
lightChoices.forEach(button=>button.addEventListener('click',()=>setLight(button.dataset.lightChoice)));

const menu = document.querySelector('#mobile-menu');
const menuToggle = document.querySelector('.menu-toggle');
function closeMenu(){menu.close();}
menuToggle.addEventListener('click',()=>{menu.showModal();menuToggle.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';});
document.querySelector('.menu-close').addEventListener('click',closeMenu);
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
menu.addEventListener('click',event=>{if(event.target===menu){const box=menu.getBoundingClientRect();if(event.clientX>box.right||event.clientX<box.left)closeMenu();}});
menu.addEventListener('close',()=>{menuToggle.setAttribute('aria-expanded','false');if(!dialog.open)document.body.style.overflow='';});
const mobileLayout = matchMedia('(max-width:650px)');
mobileLayout.addEventListener('change',event=>{if(!event.matches&&menu.open)closeMenu();});
