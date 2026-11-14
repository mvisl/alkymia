import {spaces} from './scene.js';
const art=(space,cls='')=>`<svg class="${cls}" viewBox="${space.crop.join(' ')}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image href="assets/world-day.png" width="1672" height="941" /></svg>`;
document.querySelector('#place-list').innerHTML=spaces.map(s=>`<a class="place" href="#${s.id}">${art(s)}<div class="place-copy"><h2>${s.name}</h2><p>${s.label}</p></div></a>`).join('');
document.querySelector('#hotspots').innerHTML=spaces.map(s=>`<a class="hotspot" href="#${s.id}" style="left:${s.x}%;top:${s.y}%" aria-label="${s.name}: ${s.label}"><span>${s.name}<small>${s.label}</small></span></a>`).join('');
const dialog=document.querySelector('dialog');let opener=null;
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
