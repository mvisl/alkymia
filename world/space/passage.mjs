/** Fullscreen section page. No public route, framework, Pixi, or global CSS dependency. */
export const PASSAGE_PAGE_ID='passage';
export const PASSAGE_BUILD='2026-11-19-cinematic1';
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
$('#restart').onclick=()=>goTo(0);
root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=root.querySelector(a.getAttribute('href'));if(target){e.preventDefault();goTo(sections.indexOf(target));}}));
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
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 const mobile=innerWidth<701;renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setClearColor(0x101619);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.2,160);
 const fogColor=new T.Color(0x101619);
 const vertex=`attribute float aKind;varying vec3 vP;varying vec3 vN;varying vec3 vColor;varying float vKind;varying float vDepth;
 void main(){mat4 im=mat4(1.);vec3 col=vec3(.3);\n#ifdef USE_INSTANCING\n im=instanceMatrix;\n#endif\n#ifdef USE_INSTANCING_COLOR\n col=instanceColor;\n#endif\n vec4 obj=im*vec4(position,1.);vec4 world=modelMatrix*obj;vP=world.xyz;mat3 m=mat3(im);vec3 sq=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));vec3 n=m*(normal/max(sq,vec3(.00001)));vN=normalize(mat3(modelMatrix)*n);vColor=col;vKind=aKind;vec4 mv=viewMatrix*world;vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
 const fragment=`precision highp float;uniform vec3 uFog;varying vec3 vP;varying vec3 vN;varying vec3 vColor;varying float vKind;varying float vDepth;
 float inkLine(float p,float along,float width){float aa=max(fwidth(p),.0001);float id=floor(p);float seed=fract(sin(id*12.9898)*43758.5453);float drift=.10*sin(along*5.+seed*9.)+.04*sin(along*13.+id);float pressure=.6+.65*seed;float d=abs(fract(p+drift)-.5);float line=1.-smoothstep(width*pressure-aa,width*pressure+aa,d);float lift=.48+.48*pow(sin(along*1.7+seed*8.),2.);return mix(line*lift,width*1.35,smoothstep(.30,.65,aa));}

 void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 w=pow(abs(n),vec3(8.));w/=max(w.x+w.y+w.z,.001);vec2 p=vP.yz*w.x+vP.xz*w.y+vP.xy*w.z;
 float light=.32+.68*max(0.,dot(n,normalize(vec3(-.4,.8,.6))));float warp=.045*sin(p.x*3.1)+.038*sin(p.y*5.7+p.x*.7);
 float h1=inkLine((p.x*.8+p.y+warp)*12.,p.x-p.y*.8,.115);float h2=inkLine((p.x-p.y*.67-warp)*13.,p.y+p.x*.67,.085);
 float level=.23+.34*step(.50,light)+.25*step(.75,light);float hatch=max(h1,h2*.48*step(.5,1.-light));
 float side=.6+.4*pow(abs(n.z),2.);vec3 bone=vec3(.624,.565,.456)*level*side*.55;
 vec3 base=mix(uFog+vec3(.0035),bone,hatch*.85);
 vec2 q=p*2.9;vec2 df=fwidth(q);float d=length(fract(q)-.5);float aa=max(df.x,df.y);float dotInk=1.-smoothstep(.10-aa,.10+aa,d);dotInk*=1.-smoothstep(.25,.65,aa);
 vec3 plate=mix(uFog+vec3(.007,.012,.013),vec3(.33,.30,.23),dotInk*.65);
 base=mix(base,plate,step(.5,vKind));
 float fog=1.-exp(-pow(max(vDepth,0.)*.065,1.35));base=mix(base,uFog,clamp(fog,0.,1.));gl_FragColor=vec4(base,1.);\n#include <colorspace_fragment>\n}`;
 const mat=new T.ShaderMaterial({uniforms:{uFog:{value:fogColor}},vertexShader:vertex,fragmentShader:fragment,side:T.DoubleSide});
 const boxes=[],frameBatches=[[],[],[]],frameResources=[];let seed=52491;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}function signed(){return rand()*2-1;}
 const temp=new T.Object3D(),parent=new T.Object3D();
 function addBox(list,pos,scale,rotation,color,kind=0){temp.position.copy(pos);temp.scale.copy(scale);temp.rotation.copy(rotation);temp.updateMatrix();list.push({matrix:temp.matrix.clone(),color:new T.Color(color),kind});}
 // Broken, offset frames. They do not form a continuous corridor or a tiled wall.
 for(let i=0;i<14;i++){
 const z=1-i*4.5;
 const cluster=Math.floor(i/7),mult=[1,.55,1.15,.85,1.6][i%5],width=(5.8+rand()*3.8)*mult,height=(5.1+rand()*3.8)*mult;
 parent.position.set(Math.sin(i*.93)*2.3+2.8+signed()*1.1,1.8+signed()*1.7,z);
 parent.rotation.set(signed()*.025,signed()*.16,signed()*.05);parent.scale.setScalar(i%9===4?1.2:1);parent.updateMatrix();
 const local=new T.Matrix4().makeScale(width/2,height/2,2.6+rand()*1.8);
 const fm=new T.Matrix4().multiplyMatrices(parent.matrix,local);
 const colors=[0x687770,0xa2a28b,0x65736e,0x8e9487];
 frameBatches[i%3].push({matrix:fm,color:new T.Color(colors[i%4]),kind:0});
 // A separated plane changes the scale and occlusion every few frames.
 if(i%4===1){addBox(boxes,new T.Vector3(parent.position.x+signed()*5.5,3+signed()*3,z-1.7),new T.Vector3(1.8+rand()*2.5,3.0+rand()*3.5,.07),new T.Euler(signed()*.12,(i%3===0?1.30:signed()*.55),signed()*.28),i%2?0x293c3e:0x414e4a,1);}
 }
 // Discontinuous ground sheets; no stairs, colonnade or ornamental vault.
 for(let i=0;i<7;i++)addBox(boxes,new T.Vector3(signed()*3.5,-3.3+rand()*.35,2-i*10.0),new T.Vector3(6+rand()*7,.10,3+rand()*2),new T.Euler(0,signed()*.2,signed()*.04),i%3?0x3e4a45:0x647068,1);
 // Scale echoes: same shape along a single ray, then scroll reveals different depth.
 const poses=[{x:0,z:12,yaw:.085},{x:.6,z:-3,yaw:.10},{x:-.35,z:-20,yaw:.025},{x:.8,z:-33,yaw:.115},{x:.15,z:-52,yaw:.06}];
 for(let k=0;k<4;k++)for(const scale of [1,3]){const st=poses[k];temp.position.set(st.x+3.2*scale+(scale===3?2.1:0),1.75+1.0*scale,st.z-8*scale);temp.rotation.set(0,.04,k%2?.035:-.035);temp.scale.set(1.9*scale,2.6*scale,.9*scale);temp.updateMatrix();frameBatches[(k+(scale===1?1:2))%3].push({matrix:temp.matrix.clone(),color:new T.Color(scale===1?0x889286:0x646f66),kind:0});}
 // Three slightly different cut, hand-shaped loops. No external model needed.
 function cutLoop(kind){
 const shape=new T.Shape(),steps=94,gap=[.56,1.12,.78][kind],start=[.12,2.3,4.0][kind];
 function pt(t,inner){const c=Math.cos(t),sn=Math.sin(t),power=[.32,.40,.28][kind];const warp=1+.022*Math.sin(t*5+kind)+.012*Math.sin(t*9+.7);const thick=.052+.012*Math.sin(t*3+kind);const r=warp-(inner?thick:0);return [Math.sign(c)*Math.pow(Math.abs(c),power)*r,Math.sign(sn)*Math.pow(Math.abs(sn),power)*r];}
 for(let j=0;j<=steps;j++){const t=start+gap+(Math.PI*2-gap)*j/steps,p=pt(t,false);if(j===0)shape.moveTo(...p);else shape.lineTo(...p);}
 for(let j=steps;j>=0;j--){const t=start+gap+(Math.PI*2-gap)*j/steps;shape.lineTo(...pt(t,true));}
 shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,steps:1,curveSegments:1});g.translate(0,0,-.06);return g;
 }
 frameBatches.forEach((batch,kind)=>{const fg=cutLoop(kind);fg.setAttribute('aKind',new T.InstancedBufferAttribute(new Float32Array(batch.length),1));const fm=new T.InstancedMesh(fg,mat,batch.length);batch.forEach((b,i)=>{fm.setMatrixAt(i,b.matrix);fm.setColorAt(i,b.color);});fm.instanceMatrix.needsUpdate=true;fm.instanceColor.needsUpdate=true;fm.computeBoundingSphere();scene.add(fm);frameResources.push(fg);});
 const geom=new T.BoxGeometry(1,1,1);geom.setAttribute('aKind',new T.InstancedBufferAttribute(new Float32Array(boxes.map(x=>x.kind)),1));
 const mesh=new T.InstancedMesh(geom,mat,boxes.length);boxes.forEach((b,i)=>{mesh.setMatrixAt(i,b.matrix);mesh.setColorAt(i,b.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);
 // Thin brass accents on five isolated faces, not luminous outlines on every frame.
 const edgeMat=new T.MeshBasicMaterial({color:0x9c8961,fog:false});
 const accentGeo=new T.BoxGeometry(1,1,1),accents=new T.InstancedMesh(accentGeo,edgeMat,5);
 for(let i=0;i<5;i++){temp.position.set(4.7+signed()*1.8,2.4+signed()*2,-6-i*14);temp.scale.set(.014,2.4+rand()*1.5,.025);temp.rotation.set(0,0,signed()*.25);temp.updateMatrix();accents.setMatrixAt(i,temp.matrix);}accents.computeBoundingSphere();scene.add(accents);
 const count=mobile?650:1700,pos=new Float32Array(count*3),sizes=new Float32Array(count);
 for(let i=0;i<count;i++){pos[i*3]=signed()*12;pos[i*3+1]=signed()*7+2;pos[i*3+2]=12-rand()*105;sizes[i]=.5+rand()*1.6;}
 const particles=new T.BufferGeometry();particles.setAttribute('position',new T.BufferAttribute(pos,3));particles.setAttribute('aSize',new T.BufferAttribute(sizes,1));
 const dustUniforms={uTime:{value:0},uFog:{value:fogColor}};
 const dustMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:dustUniforms,vertexShader:`attribute float aSize;uniform float uTime;varying float vAlpha;void main(){vec3 p=position;p.y+=sin(p.x*.3+uTime*.09)*.035;vec4 mv=modelViewMatrix*vec4(p,1.);float fixedPoint=step(1.95,aSize);gl_PointSize=mix(clamp(25.*aSize/max(-mv.z,1.),1.,3.),2.1,fixedPoint);vAlpha=(.24+.12*aSize)*mix(exp(-max(-mv.z,0.)*.045),.5,fixedPoint);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.2,.5,d))*vAlpha;gl_FragColor=vec4(.55,.56,.49,a);}`});
 scene.add(new T.Points(particles,dustMat));
 let raf=0,last=performance.now(),time=0,samples=[],smoothP=progress,pointer={x:0,y:0},look={x:0,y:0},closed=false;

 function render(now){raf=0;if(closed||document.hidden||reading)return;
 const raw=now-last,dt=Math.min(raw/1000,.05);last=now;
 // Native scroll owns progress; damping only removes subpixel pointer noise.
 smoothP=progress;

 if(!paused){time+=dt;look.x+=(pointer.x-look.x)*.07;look.y+=(pointer.y-look.y)*.07;}else{look.x=0;look.y=0;}
 const u=smoothP*4,i=Math.min(3,Math.floor(u)),f=u-i;
 const g=T.MathUtils.smoothstep(T.MathUtils.clamp((f-.18)/.64,0,1),0,1),a=poses[i],b=poses[i+1];
 const p=new T.Vector3(T.MathUtils.lerp(a.x,b.x,g),1.75,T.MathUtils.lerp(a.z,b.z,g));camera.position.copy(p);
 const yaw=T.MathUtils.clamp(T.MathUtils.lerp(a.yaw,b.yaw,g)-look.x*.035,-.122,.122);
 camera.rotation.set(-look.y*.017,yaw,0,'YXZ');
 dustUniforms.uTime.value=time;renderer.render(scene,camera);
 if(!paused&&samples.length<240&&raw>0)samples.push(raw);
 const mean=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:0;
 canvas.dataset.metrics=host.dataset.metrics=JSON.stringify({renderer:'Three.js r180 / WebGL2',progress:+progress.toFixed(4),camera:[+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)],roll:+camera.rotation.z.toFixed(6),yaw:+camera.rotation.y.toFixed(4),pitch:+camera.rotation.x.toFixed(4),frames:samples.length,meanFrameMs:+mean.toFixed(2),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,instances:boxes.length+frameBatches.reduce((n,b)=>n+b.length,0),framesInScene:frameBatches.reduce((n,b)=>n+b.length,0),particles:count,width:innerWidth,height:innerHeight,dpr:renderer.getPixelRatio(),paused,time:+time.toFixed(3)});
 $('#status').textContent=paused?'Motion paused · scroll to explore':'Scroll to change your point of view';
 if(!paused){raf=requestAnimationFrame(render);}
 }
 function invalidate(){if(!raf&&!closed){last=performance.now();raf=requestAnimationFrame(render);}}
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();samples=[];invalidate();}
 function pointerMove(e){if(e.pointerType==='touch')return;pointer.x=(e.clientX/innerWidth-.5)*2;pointer.y=-(e.clientY/innerHeight-.5)*2;invalidate();}
 function visible(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else invalidate();}
 function contextLost(e){e.preventDefault();reading=true;controls();$('#status').textContent='Reading view · graphics unavailable';dispose();engine=null;}
 function dispose(){closed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',pointerMove);document.removeEventListener('visibilitychange',visible);canvas.removeEventListener('webglcontextlost',contextLost);geom.dispose();frameResources.forEach(g=>g.dispose());mat.dispose();accentGeo.dispose();edgeMat.dispose();particles.dispose();dustMat.dispose();renderer.dispose();host.dataset.disposed='true';}
 window.addEventListener('resize',resize,{passive:true});window.addEventListener('pointermove',pointerMove,{passive:true});document.addEventListener('visibilitychange',visible);canvas.addEventListener('webglcontextlost',contextLost);
 engine={invalidate,dispose};host.dataset.disposed='false';resize();invalidate();
 }catch(e){console.error('Passage unavailable',e);reading=true;controls();$('#status').textContent='Reading view · graphics unavailable';}finally{loading=false;}
}


 function goTo(index,{smooth=false}={}){
  if(disposed)return;const i=Math.max(0,Math.min(4,Math.round(Number(index)||0)));
  scroller.scrollTo({top:sections[i].offsetTop,behavior:smooth&&!paused?'smooth':'instant'});sync();
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
