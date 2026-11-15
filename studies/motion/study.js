import {Application,Container,Sprite,Texture} from '../../vendor/pixi-8.22.0/pixi.min.mjs';
import {spaces} from '../../scene.js';
import {WIDTH,HEIGHT,cycle,clamp,constrainCenter,layerPose} from './camera.mjs';
const scene=document.querySelector('.scene'),proxy=document.querySelector('.input-proxy'),spacer=document.querySelector('.scroll-space');
const gpuHost=document.querySelector('#gpu'),cssHost=document.querySelector('#classic'),driftButton=document.querySelector('#drift'),caption=document.querySelector('.place-caption');
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),dialog=document.querySelector('dialog');
const order=['base','city','landmarks','left-bank','right-bank','left-tree','right-tree'];
const map=await (await fetch('layers.json')).json();
const media={};await Promise.all(order.map(async name=>{const img=new Image();img.decoding='async';img.src=map[name].url;await img.decode();media[name]=img;}));
const css={},gpu={};let app=null,backend='css',gpuReady=false,contextLost=false;
for(const name of order){const m=map[name],el=document.createElement('div'),im=media[name].cloneNode();el.className='css-group';im.alt='';im.draggable=false;im.style.cssText=`left:${m.x}px;top:${m.y}px;width:${m.width}px;height:${m.height}px`;el.append(im);cssHost.append(el);css[name]=el;}
try{
 app=new Application();await app.init({width:scene.clientWidth,height:scene.clientHeight,preference:'webgl',autoStart:false,sharedTicker:false,antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2),background:0x0e1518});
 app.stage.eventMode='none';gpuHost.append(app.canvas);
 for(const name of order){const m=map[name],texture=Texture.from(media[name]);texture.source.autoGenerateMipmaps=true;texture.source.scaleMode='linear';texture.source.style.mipmapFilter='linear';const group=new Container(),sprite=new Sprite(texture);sprite.position.set(m.x,m.y);sprite.width=m.width;sprite.height=m.height;group.addChild(sprite);app.stage.addChild(group);gpu[name]=group;}
 gpuReady=true;backend='gpu';
 app.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;gpuReady=false;chooseRenderer('css');document.querySelector('[data-renderer="gpu"]').disabled=true;});
 app.canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;gpuReady=true;document.querySelector('[data-renderer="gpu"]').disabled=false;requestDraw();});
}catch(error){console.warn('GPU renderer unavailable; using the CSS comparison.',error);document.querySelector('[data-renderer="gpu"]').disabled=true;}
let view={width:scene.clientWidth,height:scene.clientHeight},camera={center:.5,zoom:1},target={...camera},velocity=0;
let pointer={x:0,y:0},pointerTarget={x:0,y:0},auto=!reduced.matches,autoBase={...camera},autoSeconds=0;
let raf=0,last=0,drag=null,dragged=false,expectedScroll=null,focusTimer=0,releaseTimer=0,active=null;
let metrics=[],metricStart=0,renderCount=0,lastRendered=0,opener=null;
const boxes={tower:[.15,.04,.09,.52],aquarium:[.41,.38,.1,.32],palace:[.77,.26,.14,.48],bridge:[.53,.55,.24,.25]};
function chooseRenderer(mode){backend=mode==='gpu'&&gpuReady&&!contextLost?'gpu':'css';gpuHost.classList.toggle('current',backend==='gpu');cssHost.classList.toggle('current',backend==='css');document.querySelectorAll('[data-renderer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.renderer===backend)));scene.dataset.renderer=backend;requestDraw();}
function requestDraw(){if(!raf&&!document.hidden&&!dialog.open)raf=requestAnimationFrame(frame);}
function syncProxy(){const w=view.height/HEIGHT*WIDTH,value=camera.center*w-view.width/2;expectedScroll=Math.max(0,value);proxy.scrollLeft=expectedScroll;}
function stopAuto(){auto=false;autoSeconds=0;autoBase={...camera};target={...camera};velocity=0;clearTimeout(focusTimer);clearTimeout(releaseTimer);updateMotionButton();}
function updateMotionButton(){driftButton.disabled=reduced.matches;driftButton.textContent=auto?'Pause drift':'Resume drift';driftButton.setAttribute('aria-pressed',String(auto));scene.dataset.auto=String(auto);}
function selectPreview(id,move=true){stopAuto();const s=spaces.find(s=>s.id===id);if(!s)return;active=id;
 document.querySelectorAll('#places a').forEach(a=>a.classList.toggle('active',a.hash==='#'+id));
 if(move&&boxes[id]){const b=boxes[id];target={center:constrainCenter(b[0]+b[2]/2,view),zoom:reduced.matches?1:1.06};if(reduced.matches){camera={...target};syncProxy();}}
 caption.innerHTML=`<b>${s.label}</b><small>${s.name}</small>`;caption.classList.toggle('visible',!!boxes[id]);requestDraw();}
function clearPreview(){active=null;caption.classList.remove('visible');document.querySelectorAll('#places a').forEach(a=>a.classList.remove('active'));target={center:camera.center,zoom:1};velocity=0;requestDraw();}
function manual(){stopAuto();active=null;caption.classList.remove('visible');document.querySelectorAll('#places a').forEach(a=>a.classList.remove('active'));}
function frame(now){raf=0;if(document.hidden||dialog.open){last=0;return;}const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
 let moving=false;
 if(auto&&!reduced.matches){autoSeconds+=dt;const u=cycle(autoSeconds);camera.center=constrainCenter(autoBase.center+u*.008,view);camera.zoom=Math.min(1.08,autoBase.zoom*(1+.025*u));syncProxy();moving=true;if(autoSeconds>=60){auto=false;target={...camera};velocity=0;updateMotionButton();}}
 else{
  const delta=target.center-camera.center;velocity+=(9*delta-6*velocity)*dt;const speed=.25*view.width/(view.height/HEIGHT*WIDTH);velocity=clamp(velocity,-speed,speed);camera.center=constrainCenter(camera.center+velocity*dt,view);
  camera.zoom+=(target.zoom-camera.zoom)*(1-Math.exp(-dt/.7));
  if(Math.abs(delta)<.000015&&Math.abs(velocity)<.00002){camera.center=target.center;velocity=0;}else moving=true;
  if(Math.abs(camera.zoom-target.zoom)<.00002)camera.zoom=target.zoom;else moving=true;
  syncProxy();
 }
 if(!reduced.matches){const ease=1-Math.exp(-dt/.45);pointer.x+=(pointerTarget.x-pointer.x)*ease;pointer.y+=(pointerTarget.y-pointer.y)*ease;if(Math.abs(pointerTarget.x-pointer.x)+Math.abs(pointerTarget.y-pointer.y)>.0008)moving=true;else pointer={...pointerTarget};}else pointer={x:0,y:0};
 draw();
 if(lastRendered&&now-lastRendered<500)metrics.push(now-lastRendered);lastRendered=now;metricStart||=now;
 if(now-metricStart>5000&&metrics.length){const sorted=[...metrics].sort((a,b)=>a-b);scene.dataset.metrics=JSON.stringify({frames:metrics.length,meanMs:metrics.reduce((a,b)=>a+b,0)/metrics.length,p95Ms:sorted[Math.floor(sorted.length*.95)],renderer:backend,resolution:app?.renderer?.resolution??devicePixelRatio});metrics=[];metricStart=now;}
 if(moving)requestDraw();else last=0;
}
function draw(){
 for(const name of order){const pose=layerPose(name,map[name],view,camera,pointer,!reduced.matches);if(backend==='gpu'){gpu[name].position.set(pose.x,pose.y);gpu[name].scale.set(pose.scale);}else css[name].style.transform=`matrix(${pose.scale},0,0,${pose.scale},${pose.x},${pose.y})`;}
 if(backend==='gpu')try{app.render();}catch(error){console.warn('GPU render interrupted; CSS comparison stays available.',error);gpuReady=false;chooseRenderer('css');return;}
 if(active&&boxes[active]){const b=boxes[active],pose=layerPose('landmarks',map.landmarks,view,camera,pointer,!reduced.matches);caption.style.left=`${clamp(pose.x+(b[0]+b[2]/2)*WIDTH*pose.scale,100,view.width-100)}px`;caption.style.top=`${clamp(pose.y+(b[1]+b[3]*.8)*HEIGHT*pose.scale,120,view.height-70)}px`;}
 scene.dataset.center=camera.center.toFixed(6);scene.dataset.zoom=camera.zoom.toFixed(6);scene.dataset.renders=String(++renderCount);
}
function resize(){view={width:scene.clientWidth,height:scene.clientHeight};spacer.style.width=`${Math.max(view.width,view.height/HEIGHT*WIDTH)}px`;camera.center=constrainCenter(camera.center,view);target.center=constrainCenter(target.center,view);autoBase.center=constrainCenter(autoBase.center,view);if(app)app.renderer.resize(view.width,view.height);syncProxy();requestDraw();}
new ResizeObserver(resize).observe(scene);
proxy.addEventListener('scroll',()=>{if(expectedScroll!==null&&Math.abs(proxy.scrollLeft-expectedScroll)<1)return;manual();camera.center=constrainCenter((proxy.scrollLeft+view.width/2)/(view.height/HEIGHT*WIDTH),view);target={...camera};expectedScroll=null;requestDraw();},{passive:true});
proxy.addEventListener('wheel',()=>{manual();expectedScroll=null;},{passive:true});
proxy.addEventListener('pointerdown',e=>{if(e.button!==0)return;manual();if(e.pointerType==='mouse'){drag={x:e.clientX,left:proxy.scrollLeft};dragged=false;}});
window.addEventListener('pointermove',e=>{if(drag){const delta=e.clientX-drag.x;if(Math.abs(delta)>4){dragged=true;proxy.classList.add('dragging');proxy.scrollLeft=drag.left-delta;camera.center=constrainCenter((proxy.scrollLeft+view.width/2)/(view.height/HEIGHT*WIDTH),view);target={...camera};expectedScroll=null;requestDraw();}return;}
 if(e.pointerType!=='mouse'||reduced.matches)return;const r=scene.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){pointerTarget={x:clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:clamp((e.clientY-r.top)/r.height*2-1,-1,1)};requestDraw();}});
window.addEventListener('pointerup',()=>{drag=null;proxy.classList.remove('dragging');});window.addEventListener('pointercancel',()=>{drag=null;proxy.classList.remove('dragging');});
scene.addEventListener('pointerleave',()=>{pointerTarget={x:0,y:0};requestDraw();});proxy.addEventListener('dragstart',e=>e.preventDefault());
proxy.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key)){manual();expectedScroll=null;}});
proxy.addEventListener('click',e=>{if(dragged){dragged=false;return;}const r=scene.getBoundingClientRect(),pose=layerPose('landmarks',map.landmarks,view,camera,pointer,!reduced.matches),x=(e.clientX-r.left-pose.x)/(pose.scale*WIDTH),y=(e.clientY-r.top-pose.y)/(pose.scale*HEIGHT);const id=Object.keys(boxes).find(id=>{const b=boxes[id];return x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]&&y<=b[1]+b[3];});if(id)location.hash=id;});
document.querySelector('#places').innerHTML=spaces.map(s=>`<a href="#${s.id}"><span>${s.label}</span><small>${s.name}</small></a>`).join('');
for(const a of document.querySelectorAll('#places a')){a.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse'||drag)return;clearTimeout(releaseTimer);clearTimeout(focusTimer);focusTimer=setTimeout(()=>selectPreview(a.hash.slice(1)),220);});a.addEventListener('pointerleave',()=>{clearTimeout(focusTimer);releaseTimer=setTimeout(clearPreview,650);});a.addEventListener('focus',()=>selectPreview(a.hash.slice(1)));a.addEventListener('blur',()=>{releaseTimer=setTimeout(clearPreview,650);});}
function route(){const s=spaces.find(s=>s.id===location.hash.slice(1));if(!s)return;stopAuto();if(!dialog.open)opener=document.activeElement;document.querySelector('.dialog-content').innerHTML=`<h2 id="place-title">${s.label}</h2><h3>${s.name}</h3><p>${s.body}</p><ul>${s.details.map(d=>`<li>${d}</li>`).join('')}</ul>`;if(!dialog.open)dialog.showModal();}
function closeDialog(){dialog.close();history.replaceState(null,'',location.pathname);last=0;requestDraw();opener?.focus({preventScroll:true});}
document.querySelector('.close').addEventListener('click',closeDialog);dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});window.addEventListener('hashchange',route);
driftButton.addEventListener('click',()=>{if(auto){stopAuto();}else{clearPreview();auto=true;autoBase={...camera};autoSeconds=0;target={...camera};velocity=0;active=null;caption.classList.remove('visible');updateMotionButton();}requestDraw();});
document.querySelector('#reset').addEventListener('click',()=>{stopAuto();pointerTarget={x:0,y:0};target={center:.5,zoom:1};active=null;caption.classList.remove('visible');requestDraw();});
document.querySelectorAll('[data-renderer]').forEach(b=>b.addEventListener('click',()=>chooseRenderer(b.dataset.renderer)));
reduced.addEventListener('change',()=>{stopAuto();pointerTarget=pointer={x:0,y:0};camera.zoom=target.zoom=1;updateMotionButton();requestDraw();});
document.addEventListener('visibilitychange',()=>{last=0;lastRendered=0;if(!document.hidden)requestDraw();});
resize();chooseRenderer(backend);updateMotionButton();draw();document.body.classList.add('ready');route();requestDraw();
