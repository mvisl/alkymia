/** Fullscreen section page. No public route, framework, Pixi, or global CSS dependency. */
export const PASSAGE_PAGE_ID='passage';
export const PASSAGE_BUILD='2026-11-19-carved-interior-v6-root';
let active=null,pending=null;
export function mountPassagePage(options={}){
 if(active)return Promise.resolve(active);
 if(pending)return pending.then(h=>h.getState().destroyed?mountPassagePage(options):h);
 pending=createPage(options).finally(()=>{pending=null;});return pending;
}
async function createPage(options){
 const parent=options.parent??document.body;
 const base=new URL('.',import.meta.url);
 const responses=await Promise.all(['passage.html','passage.css'].map(p=>{const url=new URL(p,base);url.searchParams.set('v',PASSAGE_BUILD);return fetch(url);}));
 if(responses.some(r=>!r.ok))throw new Error('Passage page assets could not be loaded');
 const [markup,css]=await Promise.all(responses.map(r=>r.text()));
 const opener=document.activeElement;
 const host=document.createElement('section');host.id='alkymia-passage-page';host.setAttribute('role','region');host.setAttribute('aria-label','The Passage — About us and vision');
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<style>${css}</style><div id="passage-scroll" tabindex="-1">${markup}</div>`;
 // Full page replacement: inactive sibling pages are inert until this route exits.
 const siblings=[...parent.children].map(el=>({el,inert:el.inert,hidden:el.getAttribute('aria-hidden')}));
 const oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 for(const x of siblings){x.el.inert=true;x.el.setAttribute('aria-hidden','true');}
 parent.append(host);
 const scroller=root.querySelector('#passage-scroll'),abort=new AbortController();
 scroller.addEventListener('keydown',e=>{
  if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const page=scroller.clientHeight*.85;let delta=0;
  if(e.key==='PageDown')delta=page;else if(e.key==='PageUp')delta=-page;
  else if(e.key==='ArrowDown')delta=40;else if(e.key==='ArrowUp')delta=-40;
  else if(e.key==='Home'){e.preventDefault();scroller.scrollTo({top:0,behavior:'instant'});return;}
  else if(e.key==='End'){e.preventDefault();scroller.scrollTo({top:scroller.scrollHeight,behavior:'instant'});return;}
  if(delta){e.preventDefault();e.stopPropagation();scroller.scrollBy({top:delta,behavior:'instant'});}
 },{signal:abort.signal});
const $=s=>root.querySelector(s);
const sections=[...root.querySelectorAll('.station')],links=[...root.querySelectorAll('.chapters a')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const forcedReduced=options.reducedMotion??reduce.matches;
let paused=forcedReduced,reading=Boolean(options.readingView||forcedReduced),engine=null,disposed=false,loading=false,progress=0;
const canvas=$('#passage');
function currentProgress(){const first=sections[0].offsetTop,last=sections.at(-1).offsetTop;return Math.min(1,Math.max(0,(scroller.scrollTop-first)/Math.max(last-first,1)));}
function sync(){progress=currentProgress();const i=Math.min(4,Math.round(progress*4));links.forEach((l,n)=>{if(n===i)l.setAttribute('aria-current','step');else l.removeAttribute('aria-current');});$('#progress').textContent=String(i).padStart(2,'0');host.dataset.progress=progress.toFixed(4);engine?.invalidate();}
function controls(){$('#still').disabled=reading;host.classList.toggle('reading',reading);$('#flat').setAttribute('aria-pressed',String(reading));$('#flat').textContent=reading?'Spatial view':'Reading view';$('#still').setAttribute('aria-pressed',String(paused));$('#still').textContent=paused?'Resume motion':'Pause motion';if(reading)$('#status').textContent='Reading view';}
$('#still').onclick=()=>{paused=!paused;controls();engine?.invalidate();};
$('#flat').onclick=()=>setReadingView(!reading);
reduce.addEventListener('change',async e=>{paused=e.matches;reading=e.matches;if(reading){engine?.dispose();engine=null;}controls();if(!reading&&!engine&&!disposed)await start();sync();},{signal:abort.signal});
$('#exit').onclick=()=>unmount('back-button');$('#brand').onclick=()=>unmount('brand');$('#return').onclick=()=>unmount('completed');
$('#restart').onclick=()=>goTo(0,{smooth:true});
root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=root.querySelector(a.getAttribute('href'));if(target){e.preventDefault();goTo(sections.indexOf(target),{smooth:true});}}));
scroller.addEventListener('scroll',sync,{passive:true,signal:abort.signal});
window.addEventListener('resize',sync,{passive:true,signal:abort.signal});
window.addEventListener('pagehide',()=>unmount('pagehide'),{once:true,signal:abort.signal});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();unmount('escape');}},{signal:abort.signal});
controls();sync();
async function start(){
 if(loading||engine||reading||disposed)return;loading=true;
 try{
 const T=await import('./vendor/three.module.js');
 if(reading||disposed)return;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const mobile=innerWidth<701;renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setClearColor(0x0b1114);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?64:57,innerWidth/innerHeight,.08,180);
 scene.fog=new T.FogExp2(0x0b1114,.026);
 const resources=[],materials=[];
 const grainTexture=await new T.TextureLoader().loadAsync(new URL('engraving-grain.png',base).href);grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;grainTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(disposed||reading){grainTexture.dispose();renderer.dispose();return;}resources.push(grainTexture);
 const center=z=>Math.sin(z*.035)*1.05+Math.sin(z*.078)*.28;
 const lampStations=[[-1,-17],[1,-52],[-1,-86],[1,-139]];
 function dimensions(z){
   const widening=T.MathUtils.smoothstep(-z,108,150);
   return {
     width:4.35+1.65*Math.exp(-((z+28)**2)/196)+1.1*Math.exp(-((z+91)**2)/169)+widening*2.1,
     rise:4.1+2.2*Math.exp(-((z+57)**2)/225)+widening*1.6
   };
 }
 function section(a,z){
   const {width,rise}=dimensions(z);
   const c=Math.cos(a),sn=Math.sin(a);
   const side=c<0?-1:1;
   let recess=0;
   for(const [wall,station] of lampStations){
     if(wall===side)recess+=1.05*Math.exp(-((z-station)**4)/7)*Math.pow(Math.abs(c),16);
   }
   const x=sn>=0?c:c*Math.min(1.8,1/Math.max(Math.abs(c),.01));
   return new T.Vector3(center(z)+x*(width+recess),.65+sn*(sn>=0?rise:3.4),z);
 }
 const uniform={uLamps:{value:lampStations.map(([side,z])=>new T.Vector3(center(z)+side*(dimensions(z).width-.12),.95,z))},uEye:{value:new T.Vector3()},uFog:{value:new T.Color(0x0b1114)},uGrain:{value:grainTexture},uLight:{value:new T.Vector3()},uFarLight:{value:new T.Vector3(-5,7,-183)},uNormalSign:{value:-1},uFloor:{value:0},uBare:{value:0},uDetail:{value:0}};
 const material=new T.ShaderMaterial({side:T.BackSide,uniforms:uniform,vertexShader:`varying vec3 vP;varying vec3 vN;varying vec2 vUv;varying float vDepth;void main(){vP=position;vN=normal;vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`precision highp float;uniform vec3 uEye;uniform vec3 uLamps[4];uniform vec3 uFog;uniform sampler2D uGrain;uniform vec3 uLight;uniform vec3 uFarLight;uniform float uNormalSign;uniform float uFloor;uniform float uBare;uniform float uDetail;varying vec3 vP;varying vec3 vN;varying vec2 vUv;varying float vDepth;
 void main(){vec3 n=normalize(vN)*uNormalSign;vec3 toLight=uLight-vP;float dist=length(toLight);float key=max(0.,dot(n,normalize(toLight)));float attenuation=pow(clamp(1.-dist/39.,0.,1.),.8);float nearGate=smoothstep(10.,26.,vDepth);float localLight=exp(-pow((vP.z-uLight.z)/9.,2.));float middle=.14*exp(-pow((vDepth-21.)/14.,2.));vec3 toFar=uFarLight-vP;float distant=max(0.,dot(n,normalize(toFar)))*exp(-length(toFar)*.045);float rake=.13*pow(max(0.,dot(n,normalize(vec3(-.6,.7,.3)))),3.)*(1.-smoothstep(10.,24.,vDepth));float rim=uDetail*.28*pow(1.-abs(dot(n,normalize(uEye-vP))),2.);float L=clamp(key*attenuation*1.75*nearGate*localLight+middle*(1.+key*.65)+distant*.7+rake+rim,0.,1.);

 // Light pools are anchored to the stone and alternate sides along the route.
 vec3 lamps[4];
 lamps[0]=uLamps[0];
 lamps[1]=uLamps[1];
 lamps[2]=uLamps[2];
 lamps[3]=uLamps[3];
 float pool=0.;
 for(int i=0;i<4;i++){
   vec3 ray=lamps[i]-vP;
   float r=length(ray);
   pool+=max(0.,dot(n,ray/max(r,.01)))*exp(-r*.18);
 }
 L=clamp(.48*L*smoothstep(1.,19.,vDepth)+1.35*pool+.012,0.,1.);
 vec2 stoneUV=vec2(mix(vUv.x*56.,vP.x*1.3,uFloor),vP.z*.83);
 float grain=texture2D(uGrain,stoneUV).r;
 float cloud=texture2D(uGrain,stoneUV*.24+vec2(.31,.17)).r;
 float wall=pow(abs(cos(vUv.x*6.2831853)),6.)*(1.-uFloor)*(1.-uDetail);
 float surface=mix(vP.y,vP.x,uFloor);
 float course=(surface+.014*sin(vP.z*.81)+.01*sin(vP.z*2.12+surface*3.))*mix(1.24,.59,uFloor);
 float row=floor(course+.5);
 float block=vP.z*mix(.32,.47,uFloor)+mod(row,2.)*.5+.014*sin(surface*5.+row);
 float bed=abs(fract(course)-.5);
 float edge=min(bed,abs(fract(block+.5)-.5));
 float aa=max(fwidth(course),fwidth(vP.z)*.47);
 float joints=(1.-smoothstep(.017,.045+aa,edge))*(1.-smoothstep(.13,.36,aa));
 float masonry=max(wall,uFloor)*(1.-uBare);
 float variation=fract(sin(row*27.1+floor(block+.5)*53.7)*43758.54);
 float stratum=.5+.5*sin(vP.y*8.+vP.z*.19+cloud*1.4);
 vec3 ink=vec3(.007,.005,.004);
 vec3 limestone=mix(vec3(.42,.31,.21),vec3(.51,.39,.27),cloud);
 float tone=(.025+.98*pow(L,1.15))*mix(1.,.86+.26*variation,masonry)*(.97+.03*stratum);
 vec3 stone=mix(ink,limestone,tone);
 float hatch=(1.-smoothstep(.18,.83,grain))*smoothstep(.07,.23,L);
 stone=mix(stone,ink,clamp(hatch*.13+joints*masonry*.35,0.,.85));
 float lip=exp(-pow((edge-.065)*48.,2.))*(1.-smoothstep(.09,.25,aa));
 stone+=limestone*lip*masonry*L*.12;
 float fog=1.-exp(-pow(max(vDepth,0.)*.018,1.4));
 vec3 atmosphere=mix(uFog,vec3(.069,.043,.025),clamp(pool*1.8,0.,.7));
 gl_FragColor=vec4(mix(stone,atmosphere,fog*.83),1.);
#include <colorspace_fragment>\n}`});materials.push(material);
 const around=mobile?64:96,depth=mobile?144:220,vertices=[],uvs=[],indices=[];
 for(let j=0;j<=depth;j++){const z=12-j*182/depth;for(let i=0;i<=around;i++){const a=i/around*Math.PI*2,p=section(a,z);vertices.push(p.x,p.y,p.z);uvs.push(i/around,j/depth);}}
 for(let j=0;j<depth;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));shell.setIndex(indices);shell.computeVertexNormals();resources.push(shell);scene.add(new T.Mesh(shell,material));
 // A continuous grounded path follows the same interior, with ragged engraved edges.
 const floorGeo=new T.PlaneGeometry(16,182,40,220);floorGeo.rotateX(-Math.PI/2);floorGeo.translate(0,-2.45,-79);
 const fp=floorGeo.attributes.position;for(let i=0;i<fp.count;i++){const z=fp.getZ(i),x=fp.getX(i);fp.setX(i,x+center(z));fp.setY(i,-2.45+.035*Math.sin(z*.7+x*2)+.025*Math.sin(x*5.));}floorGeo.computeVertexNormals();resources.push(floorGeo);
 const floorMat=material.clone();floorMat.side=T.DoubleSide;floorMat.uniforms={...uniform,uNormalSign:{value:1},uFloor:{value:1}};materials.push(floorMat);scene.add(new T.Mesh(floorGeo,floorMat));
 // A band of separate voussoirs rests on piers with stepped bases and capitals.
 const ribMaterial=material.clone();
 ribMaterial.side=T.FrontSide;
 ribMaterial.uniforms={...uniform,uNormalSign:{value:1},uDetail:{value:1}};
 materials.push(ribMaterial);
 const lanternMaterial=new T.MeshBasicMaterial({color:0xffce83});
 materials.push(lanternMaterial);

 function addMesh(geometry,mat){
   resources.push(geometry);
   scene.add(new T.Mesh(geometry,mat));
 }
 function block(x,y,z,width,height,depth,mat=ribMaterial){
   const geometry=new T.BoxGeometry(width,height,depth);
   geometry.translate(x,y,z);
   addMesh(geometry,mat);
 }
 function archBand(z,rise,width,thickness,depth){
   const vertices=[],indices=[];
   const count=17,steps=4;
   for(let stone=0;stone<count;stone++){
     const first=vertices.length/3;
     for(let j=0;j<=steps;j++){
       const a=Math.PI*(stone+(j/steps)*.96+.02)/count;
       for(const [inset,d] of [[0,0],[thickness,0],[thickness,depth],[0,depth]]){
         vertices.push(center(z)+Math.cos(a)*(width-inset),.65+Math.sin(a)*(rise-inset),z+d-depth/2);
       }
     }
     for(let j=0;j<steps;j++)for(let k=0;k<4;k++){
       const a=first+j*4+k,b=first+j*4+(k+1)%4;
       indices.push(a,b,a+4,b,b+4,a+4);
     }
     const last=first+steps*4;
     indices.push(first,first+2,first+1,first,first+3,first+2,last,last+1,last+2,last,last+2,last+3);
   }
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
   geometry.setIndex(indices);
   const flat=geometry.toNonIndexed();
   geometry.dispose();
   flat.computeVertexNormals();
   addMesh(flat,ribMaterial);
 }
 const archStations=[-8,-30,-48,-68,-96,-114,-137,-155];
 const ribCount=archStations.length;
 for(const z of archStations){
   const {width,rise}=dimensions(z);
   const thickness=z===-48||z===-137?.68:.43;
   archBand(z,rise+.2,width+.12,thickness,1.12);
   archBand(z+.61,rise+.01,width-.07,thickness*.58,.24);
   for(const side of [-1,1]){
     const x=center(z)+side*(width-.13);
     block(x,-.91,z,thickness+.28,3.12,1.14);
     block(x,-2.24,z,thickness+.73,.42,1.55);
     block(x,.49,z,thickness+.55,.30,1.45);
   }
 }
 for(const [side,z] of lampStations){
   const x=center(z)+side*(dimensions(z).width+.23);
   block(x,-.02,z,.94,.25,1.75);
   block(x,.63,z,.27,1.03,.43);
   block(x,.65,z,.31,.45,.25,lanternMaterial);
   block(x,1.02,z,.43,.13,.46);
   for(const edge of [-.15,.15])block(x-side*.16,.65,z+edge,.06,.58,.046);
 }
 let seed=55109;function rand(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}
 const count=mobile?550:1400,points=[];
 for(let i=0;i<count;i++){const z=8-rand()*170,a=rand()*Math.PI*2,r=i%4===0?.4+rand()*.4:.97;const p=section(a,z);points.push(center(z)+(p.x-center(z))*r,1.1+(p.y-1.1)*r,z);}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));resources.push(dustGeo);
 const dustMat=new T.PointsMaterial({size:.043,sizeAttenuation:true,color:0xb5a180,transparent:true,opacity:.27,depthWrite:false,fog:true});materials.push(dustMat);const dust=new T.Points(dustGeo,dustMat);scene.add(dust);
 // The passage opens into a real wider chamber; no billboard, halo or white blob.
 const roomGeo=new T.SphereGeometry(1,mobile?48:72,mobile?32:48,0,Math.PI*2,.23,Math.PI-.23);roomGeo.scale(17,11,24);roomGeo.translate(center(-183),2,-183);resources.push(roomGeo);const roomMat=material.clone();roomMat.uniforms={...uniform,uNormalSign:{value:-1},uFloor:{value:1},uBare:{value:1}};materials.push(roomMat);scene.add(new T.Mesh(roomGeo,roomMat));
 let raf=0,last=performance.now(),time=0,samples=[],pointer={x:0,y:0},look={x:0,y:0},closed=false;
 const positions=[4,-24,-57,-91,-123],target=new T.Vector3();
 function render(now){raf=0;if(closed||document.hidden||reading)return;const raw=now-last,dt=Math.min(raw/1000,.05);last=now;
 if(!paused){time+=dt;look.x+=(pointer.x-look.x)*.055;look.y+=(pointer.y-look.y)*.055;}
 const u=progress*4,i=Math.min(3,Math.floor(u)),f=u-i,g=T.MathUtils.smoothstep(T.MathUtils.clamp((f-.15)/.70,0,1),0,1),z=T.MathUtils.lerp(positions[i],positions[i+1],g);
 camera.position.set(center(z),.50,z);target.set(center(z-16)+look.x*.42,.55+look.y*.20,z-16);camera.lookAt(target);camera.rotation.z=0;uniform.uEye.value.copy(camera.position);uniform.uLight.value.set(center(z-34)+1.05,4.4,z-34);
 if(!paused)dust.position.y=Math.sin(time*.09)*.018;renderer.render(scene,camera);
 if(!paused&&samples.length<240&&raw>0)samples.push(raw);const mean=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:0;
 const m={renderer:'Three.js r180 / WebGL2',design:'carved-interior-v6',progress:+progress.toFixed(4),camera:camera.position.toArray().map(n=>+n.toFixed(3)),roll:+camera.rotation.z.toFixed(6),frames:samples.length,meanFrameMs:+mean.toFixed(2),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,vaultRibs:ribCount,opaqueDisplayPlanes:0,particles:count,width:innerWidth,height:innerHeight,dpr:renderer.getPixelRatio(),paused,time:+time.toFixed(3)};canvas.dataset.metrics=host.dataset.metrics=JSON.stringify(m);
 $('#status').textContent=paused?'Motion paused':'Scroll to explore';if(!paused)raf=requestAnimationFrame(render);
 }
 function invalidate(){if(!raf&&!closed){last=performance.now();raf=requestAnimationFrame(render);}}
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();samples=[];invalidate();}
 function pointerMove(e){if(e.pointerType==='touch')return;pointer.x=(e.clientX/innerWidth-.5)*2;pointer.y=-(e.clientY/innerHeight-.5)*2;invalidate();}
 function visible(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else invalidate();}
 function contextLost(e){e.preventDefault();reading=true;controls();dispose();engine=null;}
 function dispose(){closed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',pointerMove);document.removeEventListener('visibilitychange',visible);canvas.removeEventListener('webglcontextlost',contextLost);resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();host.dataset.disposed='true';}
 window.addEventListener('resize',resize,{passive:true});window.addEventListener('pointermove',pointerMove,{passive:true});document.addEventListener('visibilitychange',visible);canvas.addEventListener('webglcontextlost',contextLost);engine={invalidate,dispose};host.dataset.disposed='false';resize();invalidate();
 }catch(e){console.error('Passage unavailable',e);reading=true;controls();$('#status').textContent='Reading view · graphics unavailable';}finally{loading=false;}
}


 function goTo(index,{smooth=false}={}){
  if(disposed)return;const i=Math.max(0,Math.min(4,Math.round(Number(index)||0)));
  scroller.scrollTo({top:sections[i].offsetTop,behavior:smooth&&!paused&&!reduce.matches&&!forcedReduced?'smooth':'instant'});sync();
 }
 async function setReadingView(value){
  if(disposed)return;const chapter=Math.round(currentProgress()*4);reading=Boolean(value);
  if(reading){engine?.dispose();engine=null;}controls();goTo(chapter);
  if(!reading&&!engine)await start();sync();
 }
 function getState(){return {id:PASSAGE_PAGE_ID,destroyed:disposed,readingView:reading,paused,chapter:Math.round(progress*4),metrics:host.dataset.metrics?JSON.parse(host.dataset.metrics):null};}
 function unmount(reason='api'){
  if(disposed)return getState();engine?.dispose();engine=null;disposed=true;abort.abort();
  host.dataset.disposed='true';const state=getState();
  host.dispatchEvent(new CustomEvent('alkymia:section-exit',{bubbles:true,composed:true,detail:{id:PASSAGE_PAGE_ID,reason,state}}));
  host.remove();document.documentElement.style.overflow=oldOverflow;
  for(const x of siblings){if(!x.el.isConnected)continue;x.el.inert=x.inert;if(x.hidden===null)x.el.removeAttribute('aria-hidden');else x.el.setAttribute('aria-hidden',x.hidden);}
  if(opener?.isConnected)opener.focus({preventScroll:true});active=null;
  options.onExit?.({id:PASSAGE_PAGE_ID,reason,state});return state;
 }
 const handle={unmount,pause(){paused=true;controls();engine?.invalidate();},resume(){paused=false;controls();engine?.invalidate();},goTo,setReadingView,getState};active=handle;
 host.dispatchEvent(new CustomEvent('alkymia:section-enter',{bubbles:true,composed:true,detail:{id:PASSAGE_PAGE_ID}}));try{options.onEnter?.({id:PASSAGE_PAGE_ID});}catch(error){unmount('enter-error');throw error;}
 goTo(options.initialChapter??0);$('#s1').setAttribute('tabindex','-1');$('#s1').focus({preventScroll:true});
 if(!reading)await start();
 document.fonts.ready.then(()=>{if(!disposed)sync();});
 return handle;
}
