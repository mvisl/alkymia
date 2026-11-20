/** Fullscreen section page. No public route, framework, Pixi, or global CSS dependency. */
export const PASSAGE_PAGE_ID='passage';
export const PASSAGE_BUILD='passage-night-arcade-12';
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
let focusSide='';
const bayStops=[
 {progress:.25,z:-31.5,title:'Two views of the arcade',caption:'From the axis, the arches draw the eye forward. From the side, the same bays frame the valley.',image:'arcade-two-views.webp',ink:true},
 {progress:.50,z:-63.5,title:'Form studies',caption:'We test three profiles for the same span and compare the space each one opens.',image:'form-study.svg',ink:true},
 {progress:.75,z:-97.5,title:'Transformation study',caption:'We carried the vessel’s fragments into the city illustration to connect the opening and the world.',image:'transformation-poster.webp',ink:false}
];
function currentBay(){return bayStops.find(bay=>Math.abs(progress-bay.progress)<.045);}

function updateBay(){
 const bay=currentBay();
 const available=!reading&&Boolean(bay);
 if(bay)$('#study').textContent=bay.title;
 $('.bay-controls').hidden=!available;
 if(!available)focusSide='';
 host.dataset.side=focusSide;
 const caption=focusSide==='study'?bay?.caption:focusSide==='river'?'Moonlight across the valley of Alkymia.':'';
 const note=$('#bay-caption');
 if(note.textContent!==caption)note.textContent=caption;
 note.hidden=!caption;
 for(const id of ['study','river'])$('#'+id).setAttribute('aria-pressed',String(focusSide===id));
}
for(const id of ['study','river'])$('#'+id).onclick=()=>{
 focusSide=focusSide===id?'':id;
 updateBay();engine?.invalidate();
};
function currentProgress(){const first=sections[0].offsetTop,last=sections.at(-1).offsetTop;return Math.min(1,Math.max(0,(scroller.scrollTop-first)/Math.max(last-first,1)));}
function sync(){progress=currentProgress();const i=Math.min(4,Math.round(progress*4));links.forEach((l,n)=>{if(n===i)l.setAttribute('aria-current','step');else l.removeAttribute('aria-current');});$('#progress').textContent=String(i).padStart(2,'0');host.dataset.progress=progress.toFixed(4);updateBay();engine?.invalidate();}
function controls(){updateBay();$('#still').disabled=reading;host.classList.toggle('reading',reading);$('#flat').setAttribute('aria-pressed',String(reading));$('#flat').textContent=reading?'Spatial view':'Reading view';$('#still').setAttribute('aria-pressed',String(paused));$('#still').textContent=paused?'Resume motion':'Pause motion';if(reading)$('#status').textContent='Reading view';}
$('#still').onclick=()=>{paused=!paused;controls();engine?.invalidate();};
$('#flat').onclick=()=>setReadingView(!reading);
reduce.addEventListener('change',async e=>{paused=e.matches;reading=e.matches;if(reading){engine?.dispose();engine=null;}controls();if(!reading&&!engine&&!disposed)await start();sync();},{signal:abort.signal});
$('#exit').onclick=()=>unmount('back-button');$('#brand').onclick=()=>unmount('brand');$('#return').onclick=()=>unmount('completed');
$('#restart').onclick=()=>goTo(0,{smooth:true});
root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=root.querySelector(a.getAttribute('href'));if(target){e.preventDefault();goTo(sections.indexOf(target),{smooth:true});}}));
scroller.addEventListener('scroll',sync,{passive:true,signal:abort.signal});
window.addEventListener('resize',sync,{passive:true,signal:abort.signal});
window.addEventListener('pagehide',()=>unmount('pagehide'),{once:true,signal:abort.signal});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(focusSide){focusSide='';updateBay();engine?.invalidate();}else unmount('escape');}},{signal:abort.signal});
controls();sync();
async function start(){
 if(loading||engine||reading||disposed)return;loading=true;
 try{
 const T=await import('./vendor/three.module.js');
 if(reading||disposed)return;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const mobile=innerWidth<701;renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setClearColor(0x070b15);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?64:57,innerWidth/innerHeight,.08,180);
 scene.fog=new T.FogExp2(0x070b15,.026);
 const resources=[],materials=[];
 const grainTexture=await new T.TextureLoader().loadAsync(new URL('engraving-grain.png',base).href);grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;grainTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(disposed||reading){grainTexture.dispose();renderer.dispose();return;}resources.push(grainTexture);
 const center=z=>Math.sin(z*.035)*1.05+Math.sin(z*.078)*.28;
 const lampStations=[[-1,-17],[1,-52],[-1,-86],[1,-139]];
 function dimensions(z){
   const widening=T.MathUtils.smoothstep(-z,108,150);
   return {
     width:6.05+.65*Math.exp(-((z+28)**2)/196)+1.1*Math.exp(-((z+91)**2)/169)+widening*2.1,
     rise:5.3+1.05*Math.exp(-((z+57)**2)/225)+widening*1.6
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
   // Keep the straight wall legs vertical until they disappear under the paving.
   const x=sn>=0?c:Math.sign(c)*Math.min(1,Math.abs(c)*3.8);
   return new T.Vector3(center(z)+x*(width+recess),1.55+sn*(sn>=0?rise:4.3),z);
 }
 const stoneMap={value:grainTexture};
 const dressedMap={value:grainTexture};
 const ivoryMap={value:grainTexture},pavingMap={value:grainTexture},marbleReady={value:0};
 const vaultMap={value:grainTexture},secondVaultMap={value:grainTexture},secondVaultArt={value:0};
 const vaultArt={value:0};
 const uniform={uStone:stoneMap,uDressed:dressedMap,uIvory:ivoryMap,uPaving:pavingMap,uMarbleReady:marbleReady,uPier:{value:0},uReflection:{value:grainTexture},uReflectionOn:{value:0},uReflectionPass:{value:0},uReflectionMatrix:{value:new T.Matrix4()},uReflectionTexel:{value:new T.Vector2()},uDressedAmount:{value:0},uVault:vaultMap,uVaultArt:vaultArt,uSecondVault:secondVaultMap,uSecondVaultArt:secondVaultArt,uPanel:{value:grainTexture},uPanelAmount:{value:0},uLamps:{value:lampStations.map(([side,z])=>new T.Vector3(center(z)+side*(dimensions(z).width-.12),.95,z))},uEye:{value:new T.Vector3()},uFog:{value:new T.Color(0x070b15)},uGrain:{value:grainTexture},uLight:{value:new T.Vector3()},uFarLight:{value:new T.Vector3(-5,7,-183)},uNormalSign:{value:-1},uFloor:{value:0},uBare:{value:0},uDetail:{value:0}};
 const material=new T.ShaderMaterial({side:T.BackSide,uniforms:uniform,vertexShader:`varying vec3 vP;varying vec3 vN;varying vec2 vUv;varying float vDepth;void main(){vP=position;vN=normal;vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`precision highp float;uniform vec3 uEye;uniform vec3 uLamps[4];uniform vec3 uFog;uniform sampler2D uGrain;uniform sampler2D uStone;uniform sampler2D uDressed;uniform sampler2D uIvory;uniform sampler2D uPaving;uniform float uMarbleReady;uniform float uPier;uniform sampler2D uReflection;uniform float uReflectionOn;uniform float uReflectionPass;uniform mat4 uReflectionMatrix;uniform vec2 uReflectionTexel;uniform float uDressedAmount;uniform sampler2D uVault;uniform float uVaultArt;uniform sampler2D uSecondVault;uniform float uSecondVaultArt;uniform sampler2D uPanel;uniform float uPanelAmount;uniform vec3 uLight;uniform vec3 uFarLight;uniform float uNormalSign;uniform float uFloor;uniform float uBare;uniform float uDetail;varying vec3 vP;varying vec3 vN;varying vec2 vUv;varying float vDepth;
 // Project in world units so the same stone scale holds on walls, mouldings and reveals.
 vec3 limestoneAt(vec3 p,vec3 normal){
   vec3 blend=pow(abs(normal),vec3(5.));
   blend/=max(dot(blend,vec3(1.)),.001);
   if(uDressedAmount>.5){
     return texture2D(uDressed,p.zy*.57).rgb*blend.x
          + texture2D(uDressed,p.xz*.57).rgb*blend.y
          + texture2D(uDressed,p.xy*.57).rgb*blend.z;
   }
   return texture2D(uStone,p.zy*.74).rgb*blend.x
        + texture2D(uStone,p.xz*.74).rgb*blend.y
        + texture2D(uStone,p.xy*.74).rgb*blend.z;
 }
 vec3 stoneNormal(vec3 n,vec3 p,float height){
   vec3 dx=dFdx(p),dy=dFdy(p);
   vec3 tangentX=cross(dy,n),tangentY=cross(n,dx);
   float area=dot(dx,tangentX);
   vec3 slope=sign(area)*(tangentX*dFdx(height)+tangentY*dFdy(height));
   return normalize(max(abs(area),.00001)*n-slope*mix(.008,.0013,uFloor));
 }
 void main(){
 if(uReflectionPass>.5&&vP.y<-2.449)discard;
 float portal=abs(mod(vP.z+26.,11.)-5.5);
 float crown=max(vP.y-1.25,0.);
 if(uNormalSign<0.&&uBare<.5&&vP.x>3.5&&vP.z<1.&&vP.z>-126.&&vP.y>-1.48&&portal*portal/17.64+crown*crown/8.41<1.)discard;
 vec3 surfaceNormal=normalize(vN)*uNormalSign;
 vec3 mineral=limestoneAt(vP,surfaceNormal);
 vec3 n=stoneNormal(surfaceNormal,vP,dot(mineral,vec3(.299,.587,.114)));
 vec3 toLight=uLight-vP;float dist=length(toLight);float key=max(0.,dot(n,normalize(toLight)));float attenuation=pow(clamp(1.-dist/39.,0.,1.),.8);float nearGate=smoothstep(10.,26.,vDepth);float localLight=exp(-pow((vP.z-uLight.z)/9.,2.));float middle=.14*exp(-pow((vDepth-21.)/14.,2.));vec3 toFar=uFarLight-vP;float distant=max(0.,dot(n,normalize(toFar)))*exp(-length(toFar)*.045);float rake=.13*pow(max(0.,dot(n,normalize(vec3(-.6,.7,.3)))),3.)*(1.-smoothstep(10.,24.,vDepth));float rim=uDetail*.28*pow(1.-abs(dot(n,normalize(uEye-vP))),2.);float L=clamp(key*attenuation*1.75*nearGate*localLight+middle*(1.+key*.65)+distant*.7+rake+rim,0.,1.);

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
 L=clamp(.48*L*smoothstep(1.,19.,vDepth)+1.20*pool+.025,0.,1.);
 vec2 stoneUV=vec2(mix(vUv.x*56.,vP.x*1.3,uFloor),vP.z*.83);
 float grain=texture2D(uGrain,stoneUV).r;
 float cloud=texture2D(uGrain,stoneUV*.24+vec2(.31,.17)).r;
 float wall=pow(abs(cos(vUv.x*6.2831853)),6.)*(1.-uFloor)*(1.-uDetail);
 float surface=mix(vP.y,vP.x,uFloor);
 float wallCourse=(surface+.014*sin(vP.z*.81)+.01*sin(vP.z*2.12+surface*3.))*1.24;
 float course=mix(wallCourse,vP.x/1.52,uFloor);
 float row=floor(course);
 float stagger=mod(row,2.)*.5;
 float block=mix(vP.z*.32+.014*sin(surface*5.+row),vP.z/2.36,uFloor)+stagger;
 float bed=min(fract(course),1.-fract(course));
 float edge=min(bed,abs(fract(block+.5)-.5));
 float aa=max(fwidth(course),fwidth(vP.z)*.47);
 float joints=(1.-smoothstep(mix(.017,.005,uFloor),mix(.045,.016,uFloor)+aa,edge))*(1.-smoothstep(.13,.36,aa));
 float masonry=max(wall,uFloor)*(1.-uBare);
 float variation=fract(sin(row*27.1+floor(block+.5)*53.7)*43758.54);
 float stratum=.5+.5*sin(vP.y*8.+vP.z*.19+cloud*1.4);
 vec3 ink=vec3(.004,.006,.012);
 vec3 limestone=mix(vec3(.58,.45,.28),vec3(.80,.66,.44),cloud);
 vec3 albedo=mix(limestone,mineral*vec3(1.12,.98,.78),.52);
 // Honed marble is laid in whole slabs. Its macro-veins stay coherent across mouldings.
 float plinth=wall*(1.-smoothstep(-.98,-.82,vP.y));
 float ivory=uMarbleReady*max(uDetail,plinth*.77)*(1.-uBare);
 float paving=uMarbleReady*uFloor*(1.-uBare);
 vec3 blend=pow(abs(surfaceNormal),vec3(6.));
 blend/=max(dot(blend,vec3(1.)),.001);
 vec3 marble=texture2D(uIvory,vP.zy*.29).rgb*blend.x
            +texture2D(uIvory,vP.xz*.29).rgb*blend.y
            +texture2D(uIvory,vP.xy*.29).rgb*blend.z;
 vec2 pavingUv=vec2(course,block);
 vec2 slab=fract(pavingUv);
 if(mod(row,2.)>.5)slab.x=1.-slab.x;
 if(variation>.5)slab.y=1.-slab.y;
 vec3 slate=texture2D(uPaving,slab*.86+.07).rgb;
 vec3 agedMarble=marble*vec3(.70,.66,.61);
 agedMarble=mix(agedMarble,agedMarble*.71,smoothstep(.08,.35,1.-marble.r));
 albedo=mix(albedo,mix(marble,mineral,.14),ivory*.88);
 albedo=mix(albedo,agedMarble,uPier*ivory*.84);
 // A quiet double fillet in lighter stone defines the width of the central walk.
 float borderDistance=abs(abs(vP.x)-4.56);
 float borderAA=max(fwidth(vP.x),.002);
 float mainFillet=1.-smoothstep(.037,.037+borderAA,borderDistance);
 float outerFillet=1.-smoothstep(.014,.014+borderAA,abs(borderDistance-.16));
 float inlay=max(mainFillet,outerFillet*.58);
 vec3 floorAlbedo=mix(slate*1.52,marble*.67,inlay*.79);
 albedo=mix(albedo,floorAlbedo,paving*.97);
 float tone=(.041+.94*pow(L,1.03))*mix(1.,.86+.28*variation,masonry)*(.98+.02*stratum);
 vec3 stone=mix(ink,albedo,tone);
 stone+=floorAlbedo*.25*paving;
 stone+=marble*.082*plinth*uMarbleReady;
 float plinthLip=exp(-pow((vP.y+.88)*30.,2.))*wall;
 stone+=marble*.14*plinthLip*uMarbleReady;
 // Paving is a darker, cooler slate than the walls, so the two materials separate.
 stone*=mix(vec3(1.),vec3(.74,.75,.76),uFloor*(1.-uBare));
 float windowWash=(1.-smoothstep(1.9,4.7,portal))*exp(-abs(vP.x-5.4)*.30);
 float moonFacing=max(0.,dot(surfaceNormal,normalize(vec3(.72,.34,.42))));
 // The bounce from the open bays stays clearly cool against the lamplit stone.
 stone+=vec3(.015,.037,.080)*windowWash*(.24+.76*moonFacing);
 // Light wedges extend diagonally inward from the open bays, with soft penumbrae.
 float across=clamp(6.-vP.x,0.,15.);
 float beam=abs(mod(vP.z+26.+across*.61,11.)-5.5);
 float penumbra=.36+across*.065;
 float moonspill=(1.-smoothstep(2.15,2.15+penumbra,beam))*exp(-across*.16);
 moonspill*=smoothstep(-128.,-121.,vP.z)*(1.-smoothstep(-5.,2.,vP.z));
 stone+=vec3(.022,.035,.058)*moonspill*uFloor;
 // One pool at the foot of each pier; adjacent pools alternate in strength.
 float pierZ=mod(vP.z+4.+5.5,11.)-5.5;
 float pierDist=abs(pierZ);
 float bayNumber=floor((vP.z+9.5)/11.);
 float zig=mod(bayNumber+step(0.,vP.x),2.);
 float rhythm=mix(.34,1.,zig);
 float edgeX=abs(abs(vP.x)-6.);
 float baseRise=max(0.,vP.y+2.1);
 float radial=exp(-baseRise*.29);
 float basePool=exp(-pierDist*pierDist*.13-edgeX*edgeX*.30)*rhythm;
 vec3 footLamp=vec3(sign(vP.x)*5.6,-1.88,vP.z-pierZ+.68);
 float footGraze=max(0.,dot(n,normalize(footLamp-vP+vec3(.001,0.,0.))));
 // Occlusion at the joint where the stone mass meets the floor and wall.
 // A tight dark core hugs the plinth footprint; a faint wider skirt keeps it from floating.
 float footprint=length(max(vec2(pierDist-.78,edgeX-.52),0.));
 float floorContact=(.72*exp(-footprint*3.4)+.28*exp(-pierDist*pierDist*.82-edgeX*edgeX*2.4))*uFloor;
 float pierGap=max(pierDist-.70,0.);
 float wallContact=exp(-pierGap*2.6-edgeX*edgeX*.95)*(.30+.70*exp(-baseRise*.55))*(1.-uFloor)*(1.-uDetail);
 // Walls and plinths sink into a thin crease where they meet the paving.
 float footCrease=exp(-max(vP.y+2.45,0.)*2.6)*(1.-uFloor)*(1.-uBare)*(1.-.45*uDetail);
 stone*=(1.-.58*floorContact-.40*wallContact)*(1.-.36*footCrease);
 stone+=vec3(.20,.098,.030)*basePool*radial*(.25+.75*footGraze);
 // A concealed low lamp grazes the first arch; the falloff follows the stone, not the camera.
 vec3 entryLamp=vec3(-5.05,-1.48,-2.1);
 vec3 entryRay=entryLamp-vP;
 float entryFalloff=exp(-length(entryRay)*.32)*max(0.,dot(n,normalize(entryRay)));
 float entryBand=exp(-pow((vP.z+4.)/2.6,2.));
 stone+=vec3(.65,.33,.13)*entryFalloff*entryBand;
 // Broad, soft glints on worn stone pick up the same pools without mirror reflections.
 float movingGlint=pow(max(0.,dot(normalize(uEye-vP),normalize(vec3(.18,.14,.98)))),6.);
 float floorRibbon=exp(-edgeX*edgeX*.27-pierDist*pierDist*.11);
 stone+=vec3(.12,.06,.024)*uFloor*floorRibbon*movingGlint*rhythm;
 // Each broad face carries its own in-plane coordinates for weathering and burin strokes.
 vec3 an=abs(surfaceNormal);
 vec2 tc=an.x>max(an.y,an.z)?vP.zy:(an.y>an.z?vP.xz:vP.xy);
 float warmth=clamp(pool*2.4+basePool*radial*.95+entryFalloff*entryBand*3.,0.,1.);
 float stain=texture2D(uStone,tc*.11+vec2(.23,.61)).r;
 float streak=texture2D(uGrain,vec2(tc.x*.55,vP.y*.06+.4)).r;
 float damp=(1.-uFloor)*(1.-smoothstep(-2.4,-1.1,vP.y));
 stone*=mix(1.,.79+.34*stain,.45)*(1.-.07*(1.-uFloor)*smoothstep(.45,.8,streak))*(1.-.26*damp);
 // Lamps graze the stone warmly and pick out its relief; everything else falls to cool night.
 // Near faces fall to a neutral charcoal rather than a blue veil; the blue is kept for distance.
 float nearFace=(1.-smoothstep(5.,24.,vDepth))*(1.-uFloor);
 vec3 coolShade=mix(vec3(.57,.65,.78),vec3(.58,.60,.64),nearFace);
 stone*=mix(coolShade,vec3(1.24,1.02,.75),warmth);
 // Unlit stone drops further so the lamplit faces carry the eye; the floor keeps its polish.
 stone*=1.-.26*(1.-warmth)*(1.-uFloor)*(1.-.7*windowWash);
 stone*=1.+(grain-.5)*1.1*warmth;
 float vault=(1.-uFloor)*smoothstep(1.9,5.2,vP.y)*(1.-warmth);
 stone=mix(stone,stone*mix(vec3(.27,.33,.47),vec3(.29,.31,.37),nearFace),vault*.85);
 float frontGraze=max(0.,dot(n,normalize(vec3(-.32,.46,.83))));
 stone+=vec3(.30,.156,.052)*uDetail*(1.-.36*uPier)*frontGraze*radial*basePool*(.52+.48*warmth)*(.65+.7*grain);
 // Arches and piers: low lamplight climbs the dressed stone, cream at the foot, ochre toward the crown.
 float upGraze=max(0.,dot(n,normalize(vec3(-sign(vP.x)*.35,-.5,.8))));
 float climb=exp(-baseRise*.16);
 float archWarm=uDetail*(1.-.32*uPier)*(.14+.86*upGraze)*mix(.30,1.,zig)*climb;
 vec3 archTint=mix(vec3(.92,.50,.17),vec3(1.10,.74,.34),climb);
 stone+=albedo*archTint*.60*archWarm*(.62+.76*grain);
 // A close lamp catches the carved facing and drops away before the next bay.
 float entryFace=exp(-pow((vP.z+3.35)/1.45,2.))*uDetail;
 float highFace=exp(-pow((vP.y-1.35)/4.4,2.));
 float sideRake=clamp(.18+.82*dot(surfaceNormal,normalize(vec3(-.36,-.18,.92))),0.,1.);
 stone+=vec3(.26,.132,.048)*albedo*entryFace*highFace*sideRake*(1.-.40*uPier)*(.72+.48*grain);
 // Painted warmth: a slanted wash leans up the wall from every second pier, alternating sides,
 // so the eye steps from one lit surface to the next down the walk.
 float lean=pierZ+baseRise*.62;
 float spread=1.5+baseRise*.45;
 float wash=exp(-lean*lean/(spread*spread))*exp(-baseRise*.20)*zig;
 wash*=(1.-uFloor)*(1.-uBare)*(1.-.6*uDetail)*(.25+.75*abs(surfaceNormal.x));
 wash*=(.38+.62*smoothstep(.22,.78,stain))*(.80+.40*streak);
 stone+=albedo*vec3(.98,.56,.20)*.52*wash;
 // Worn paving holds a wet sheen: cool sky at grazing angles, amber drawn out below the lit piers.
 vec3 viewDir=normalize(uEye-vP);
 float fres=pow(1.-clamp(dot(n,viewDir),0.,1.),3.);
 float wet=uFloor*(1.-uBare)*(.73+.12*mineral.r)*(1.-.70*joints);
 stone+=vec3(.028,.040,.061)*fres*wet*(.5+.5*smoothstep(8.,40.,vDepth));
 float warmReflect=exp(-edgeX*edgeX*.09-pierDist*pierDist*.045)*mix(.30,1.,zig);
 stone+=vec3(.10,.062,.035)*fres*wet*warmReflect;
 // Broad highlights follow the viewing angle while the veins remain fixed to the slab.
 vec3 halfRay=normalize(viewDir+normalize(footLamp-vP+vec3(.001,0.,0.)));
 float burnish=pow(max(dot(surfaceNormal,halfRay),0.),mix(24.,58.,paving));
 stone+=vec3(.36,.24,.135)*burnish*basePool*(ivory+paving)*(1.-.74*joints);
 float hatch=(1.-smoothstep(.18,.83,grain))*smoothstep(.07,.23,L);
 float strokeA=dot(tc,vec2(.80,.60))*30.+(grain-.5)*3.;
 float strokeB=dot(tc,vec2(-.55,.83))*26.+(cloud-.5)*3.;
 float strokeFade=1.-smoothstep(.9,2.4,max(fwidth(strokeA),fwidth(strokeB)));
 float shade=1.-smoothstep(.05,.6,L);
 float engraved=(smoothstep(.55,.9,.5+.5*sin(strokeA))*(.35+.65*shade)+smoothstep(.6,.92,.5+.5*sin(strokeB))*smoothstep(.45,.9,shade))*strokeFade;
 stone=mix(stone,ink,clamp((engraved*.045+hatch*.10)*(1.-.9*uFloor)+joints*masonry*mix(.22,.27,uFloor),0.,.85));
 // Two individually painted bays: angle along the stone vault, distance along the passage.
 if(uDetail<.5&&uFloor<.5&&vP.z>-26.&&vP.z<-4.&&vUv.x<.5){
   float nextBay=step(vP.z,-15.);
   vec2 mural=vec2((vUv.x-.012)/.476,(vP.z+15.+11.*nextBay)/11.);
   vec2 inset=smoothstep(vec2(0.),vec2(.043,.075),mural)*smoothstep(vec2(0.),vec2(.043,.075),1.-mural);
   float field=inset.x*inset.y*mix(uVaultArt,uSecondVaultArt,nextBay);
   float scan=nextBay>.5?texture2D(uSecondVault,clamp(mural,0.,1.)).r
                       :texture2D(uVault,clamp(mural,0.,1.)).r;
   // Ivory plaster carries the picture; the ink stays dark in both moonlight and lamplight.
   float plasterWeight=field*(.87+.13*mineral.r);
   float rakingLight=.38+.62*max(warmth,.64*L);
   vec3 plaster=stone*vec3(.81,.76,.69)+vec3(.13,.098,.065)*rakingLight;
   stone=mix(stone,plaster,plasterWeight*.64);
   float printed=1.-smoothstep(.22,.86,scan);
   vec3 pigment=mix(vec3(.017,.021,.028),vec3(.039,.027,.018),warmth);
   stone=mix(stone,pigment,printed*field*.88);
 }
 if(uPanelAmount>.5){
   // Engraved panels: a smooth ivory plate against the rough frame, sepia cuts with a burnished lower lip.
   vec3 lumW=vec3(.299,.587,.114);
   float line=1.-smoothstep(.35,.86,dot(texture2D(uPanel,vUv).rgb,lumW));
   float lineLit=1.-smoothstep(.35,.86,dot(texture2D(uPanel,vUv+vec2(.0016,-.0022)).rgb,lumW));
   vec2 plate=vUv-.5;
   float plateShade=1.-dot(plate,plate)*1.15;
   vec3 panelStone=stone*.50+vec3(.36,.262,.142)*(.80+.20*mineral.r)*plateShade;
   panelStone+=vec3(.16,.105,.040)*pow(1.-clamp(dot(surfaceNormal,viewDir),0.,1.),2.);
   panelStone+=vec3(.40,.26,.09)*clamp(lineLit-line,0.,1.)*.55;
   stone=mix(panelStone,vec3(.022,.013,.008),line*.94);
 }
 float lip=exp(-pow((edge-.065)*48.,2.))*(1.-smoothstep(.09,.25,aa));
 stone+=limestone*lip*masonry*(L+.6*warmth)*.14;
 // A final push of chroma keeps warm and cool apart instead of averaging to grey.
 if(uFloor>.5&&uBare<.5&&uReflectionOn>.5){
   vec4 projected=uReflectionMatrix*vec4(vP,1.);
   vec2 uv=projected.xy/projected.w*.5+.5;
   vec2 boundary=smoothstep(vec2(0.),vec2(.035),uv)*smoothstep(vec2(0.),vec2(.035),1.-uv);
   vec2 dx=vec2(uReflectionTexel.x*2.,0.);
   vec2 dy=vec2(0.,uReflectionTexel.y*2.);
   vec3 reflected=texture2D(uReflection,uv).rgb*.40;
   reflected+=(texture2D(uReflection,uv+dx).rgb+texture2D(uReflection,uv-dx).rgb
              +texture2D(uReflection,uv+dy).rgb+texture2D(uReflection,uv-dy).rgb)*.15;
   float polish=(.065+.36*fres)*(1.-.83*joints)*boundary.x*boundary.y;
   stone=mix(stone,reflected,polish);
 }
 stone=max(mix(vec3(dot(stone,vec3(.299,.587,.114))),stone,1.11),0.);
 float fog=1.-exp(-pow(max(vDepth,0.)*.0095,1.43));
 vec3 atmosphere=mix(uFog,vec3(.098,.052,.020),clamp(pool*1.8+basePool*radial*.35,0.,.7));
 // The far end of the walk stays the brightest thing in the frame.
 float exitGlow=smoothstep(95.,172.,-vP.z);
 atmosphere=mix(atmosphere,vec3(.13,.18,.27),exitGlow*.36);
 stone+=vec3(.028,.040,.069)*exitGlow*(.3+.7*distant);
 gl_FragColor=vec4(mix(stone,atmosphere,fog*.83),1.);
#include <colorspace_fragment>\n}`});materials.push(material);
 const around=mobile?64:96,depth=mobile?144:220,vertices=[],uvs=[],indices=[];
 for(let j=0;j<=depth;j++){const z=12-j*182/depth;for(let i=0;i<=around;i++){const a=i/around*Math.PI*2,p=section(a,z);vertices.push(p.x,p.y,p.z);uvs.push(i/around,j/depth);}}
 for(let j=0;j<depth;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));shell.setIndex(indices);shell.computeVertexNormals();resources.push(shell);scene.add(new T.Mesh(shell,material));
 // One level stone surface meets both walls, including in the widest bays.
 const floorGeo=new T.PlaneGeometry(27,183);
 floorGeo.rotateX(-Math.PI/2);
 floorGeo.translate(0,-2.45,-79);
 resources.push(floorGeo);
 const floorMat=material.clone();
 floorMat.side=T.FrontSide;
 floorMat.uniforms={...uniform,uNormalSign:{value:1},uFloor:{value:1}};
 materials.push(floorMat);
 const floor=new T.Mesh(floorGeo,floorMat);
 scene.add(floor);
 const reflectionCamera=new T.PerspectiveCamera();
 const reflectionTarget=new T.WebGLRenderTarget(1,1,{depthBuffer:true});
 const reflectionAim=new T.Vector3();
 resources.push(reflectionTarget);
 function sizeReflection(){
   const width=Math.min(mobile?300:640,Math.max(1,Math.round(innerWidth*.52)));
   const height=Math.max(1,Math.round(width*innerHeight/innerWidth));
   reflectionTarget.setSize(width,height);
   uniform.uReflectionTexel.value.set(1/width,1/height);
 }
 let lastReflection=-Infinity,lastReflectionZ=Infinity,lastReflectionTurn=Infinity,lastReflectionAimY=Infinity;
 function renderReflection(now,z,turn,target){
   const moved=Math.abs(z-lastReflectionZ)>.025||Math.abs(turn-lastReflectionTurn)>.004||Math.abs(target.y-lastReflectionAimY)>.012;
   const movingSky=!paused&&now-lastReflection>(mobile?180:120);
   if((!moved&&!movingSky)||(!paused&&now-lastReflection<(mobile?65:42)))return;
   lastReflection=now;lastReflectionZ=z;lastReflectionTurn=turn;lastReflectionAimY=target.y;
   reflectionCamera.copy(camera,false);
   reflectionCamera.position.y=-4.90-camera.position.y;
   reflectionCamera.up.set(0,-1,0);
   reflectionAim.copy(target);reflectionAim.y=-4.90-target.y;
   reflectionCamera.lookAt(reflectionAim);
   reflectionCamera.updateMatrixWorld(true);
   uniform.uReflectionMatrix.value.multiplyMatrices(reflectionCamera.projectionMatrix,reflectionCamera.matrixWorldInverse);
   const old=renderer.getRenderTarget();
   floor.visible=false;
   uniform.uReflectionPass.value=1;
   uniform.uReflection.value=grainTexture;
   uniform.uEye.value.copy(reflectionCamera.position);
   try{
     renderer.setRenderTarget(reflectionTarget);
     renderer.render(scene,reflectionCamera);
     uniform.uReflectionOn.value=1;
   }finally{
     renderer.setRenderTarget(old);
     uniform.uEye.value.copy(camera.position);
     uniform.uReflectionPass.value=0;
     uniform.uReflection.value=reflectionTarget.texture;
     floor.visible=true;
   }
 }
 // A band of separate voussoirs rests on piers with stepped bases and capitals.
 const ribMaterial=material.clone();
 ribMaterial.side=T.FrontSide;
 ribMaterial.uniforms={...uniform,uNormalSign:{value:1},uDetail:{value:1}};
 materials.push(ribMaterial);
 const archMaterial=ribMaterial.clone();
 archMaterial.uniforms={...ribMaterial.uniforms,uDressedAmount:{value:1}};
 materials.push(archMaterial);
 const pierMaterial=ribMaterial.clone();
 pierMaterial.uniforms={...ribMaterial.uniforms,uPier:{value:1}};
 materials.push(pierMaterial);
 const lanternMaterial=new T.MeshBasicMaterial({color:0xffc470});
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
 // Small bevels catch grazing light and keep pier edges from reading as flat boxes.
 function dressedBlock(x,y,z,width,height,depth,bevel=.045){
   const face=new T.Shape();
   face.moveTo(-width/2,-height/2);
   face.lineTo(width/2,-height/2);
   face.lineTo(width/2,height/2);
   face.lineTo(-width/2,height/2);
   face.closePath();
   const geometry=new T.ExtrudeGeometry(face,{
     depth:depth-2*bevel,bevelEnabled:true,bevelSize:bevel,
     bevelThickness:bevel,bevelSegments:2,curveSegments:1
   });
   geometry.translate(x,y,z-depth/2+bevel);
   addMesh(geometry,ribMaterial);
 }

 function dressedPier(x,z,width){
   const bevel=.022,depth=1.36;
   const courses=[-2.43,-1.60,-.62,.37,1.53];
   const faces=[];
   for(let i=0;i<courses.length-1;i++){
     const half=width*(i%2===0?.50:.495);
     const base=courses[i]+.030,top=courses[i+1]-.030;
     const face=new T.Shape();
     face.moveTo(-half,base);face.lineTo(half,base);
     face.lineTo(half,top);face.lineTo(-half,top);face.closePath();
     faces.push(face);
   }
   const geometry=new T.ExtrudeGeometry(faces,{
     depth:depth-2*bevel,bevelEnabled:true,bevelSize:bevel,
     bevelThickness:bevel,bevelSegments:2,curveSegments:1
   });
   geometry.translate(x,0,z-depth/2+bevel);
   addMesh(geometry,pierMaterial);
   block(x,-.46,z,width*.94,3.93,depth*.94,pierMaterial);
 }
 function archBand(z,rise,width,thickness,depth){
   const vertices=[],indices=[];
   const count=17,steps=4;
   for(let stone=0;stone<count;stone++){
     const first=vertices.length/3;
     for(let j=0;j<=steps;j++){
       const a=Math.PI*(stone+(j/steps)*.96+.02)/count;
       for(const [inset,d] of [[0,0],[thickness,0],[thickness,depth],[0,depth]]){
         vertices.push(center(z)+Math.cos(a)*(width-inset),1.55+Math.sin(a)*(rise-inset),z+d-depth/2);
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
   addMesh(flat,archMaterial);
 }
 const archStations=[-4,-15,-26,-37,-48,-59,-70,-81,-92,-103,-114,-125,-137,-155];
 const ribCount=archStations.length;
 for(const z of archStations){
   const {width,rise}=dimensions(z);
   const thickness=z===-4||z===-26||z===-137?.74:.52;
   archBand(z,rise+.2,width+.12,thickness,1.12);
   archBand(z+.61,rise+.04,width+.05,thickness*.56,.24);
   if(z===-4||z===-26||z===-48){
     archBand(z+.77,rise+.07,width+.08,thickness*.20,.15);
   }
   for(const side of [-1,1]){
     const x=center(z)+side*(width-.13);
     dressedPier(x,z,thickness+.35);
     dressedBlock(x,-2.25,z,thickness+.72,.33,1.60,.035);
     dressedBlock(x,-2.00,z,thickness+.56,.16,1.49,.032);
     dressedBlock(x,1.40,z,thickness+.61,.23,1.63,.04);
     dressedBlock(x,1.18,z,thickness+.47,.14,1.47,.025);
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
 // Keep the river animated independently of the stationary city and sky.
 const loader=new T.TextureLoader();
 const layers=[
   {name:'distant-sky',distance:51,x:0,y:0,w:1672,h:435},
   {name:'moon',distance:49,x:489,y:6,w:62.5,h:62.5},
   {name:'distant-mountains-depth-clean',distance:44,x:0,y:84.5,w:1672,h:350.5},
   {name:'city-woodland-v15',distance:40,x:64.5,y:45.5,w:1541,h:333.5},
   {name:'river-depth-clean',distance:34,x:555,y:361,w:783.5,h:74}
 ];
 const [landscape,limestone,dressed,ivory,paving,mural,secondMural,clouds,exterior,...studies]=await Promise.all([
   loader.loadAsync(new URL('river-panorama.webp',base)),
   loader.loadAsync(new URL('limestone.webp',base)).catch(()=>null),
   loader.loadAsync(new URL('dressed-stone.webp',base)).catch(()=>null),
   loader.loadAsync(new URL('ivory-marble.webp',base)).catch(()=>null),
   loader.loadAsync(new URL('charcoal-marble.webp',base)).catch(()=>null),
   loader.loadAsync(new URL('celestial-vault.webp',base)).catch(()=>loader.loadAsync(new URL('vault-engraving.webp',base)).catch(()=>null)),
   loader.loadAsync(new URL('river-vault.webp',base)).catch(()=>null),
   loader.loadAsync(new URL('passage-clouds.webp',base)).catch(()=>null),
   Promise.all(layers.map(layer=>loader.loadAsync(new URL(layer.name+'.webp',base)).catch(()=>null))),
   ...bayStops.map(bay=>loader.loadAsync(new URL(bay.image,base)).catch(()=>null))
 ]);
 if(disposed||reading){landscape.dispose();mural?.dispose();secondMural?.dispose();clouds?.dispose();exterior.forEach(texture=>texture?.dispose());studies.forEach(texture=>texture?.dispose());limestone?.dispose();dressed?.dispose();ivory?.dispose();paving?.dispose();resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();return;}
 for(const texture of [landscape,limestone,dressed,ivory,paving,mural,secondMural,clouds,...exterior,...studies]){
   if(!texture)continue;
   resources.push(texture);
   texture.colorSpace=T.SRGBColorSpace;
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 }
 if(dressed){
   dressed.wrapS=dressed.wrapT=T.RepeatWrapping;
   dressedMap.value=dressed;
 }else{
   archMaterial.uniforms.uDressedAmount.value=0;
 }
 if(ivory&&paving){
   ivory.wrapS=ivory.wrapT=T.MirroredRepeatWrapping;
   ivoryMap.value=ivory;pavingMap.value=paving;marbleReady.value=1;
 }
 if(mural){vaultMap.value=mural;vaultArt.value=1;}
 if(secondMural){secondVaultMap.value=secondMural;secondVaultArt.value=1;}
 if(limestone){limestone.wrapS=limestone.wrapT=T.RepeatWrapping;stoneMap.value=limestone;}
 const waterClock={value:0};
 // Night grade for the world outside: deep saturated moon-blue, with the amber town lights kept warm.
 const nightGrade=`
   vec3 night=diffuseColor.rgb;
   float nightLum=dot(night,vec3(.2126,.7152,.0722));
   float ember=smoothstep(.03,.16,night.r-night.b);
   vec3 moonBlue=max(mix(vec3(nightLum),night,1.5),0.)*vec3(.50,.80,1.50);
   moonBlue*=.60+.72*smoothstep(0.,.45,nightLum);
   diffuseColor.rgb=mix(moonBlue,night*vec3(1.35,1.05,.70),ember);
 `;
 function litImage(texture,width,height,x,y,z,rotation,transparent=false,grade=false){
   const geometry=new T.PlaneGeometry(width,height);
   geometry.rotateY(rotation);
   geometry.translate(x,y,z);
   const picture=new T.MeshBasicMaterial({map:texture,transparent,depthWrite:!transparent,polygonOffset:transparent,polygonOffsetFactor:-1,side:T.DoubleSide,fog:false});
   if(grade){
     picture.onBeforeCompile=shader=>{
       shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+nightGrade);
     };
     picture.customProgramCacheKey=()=> 'arcade-night-grade';
   }
   materials.push(picture);
   addMesh(geometry,picture);
   return picture;
 }
 function nightBackdrop(width,height,x,y,z,rotation){
   const plane=new T.PlaneGeometry(width,height);
   plane.rotateY(rotation);plane.translate(x,y,z);
   const sky=new T.ShaderMaterial({
     side:T.DoubleSide,
     vertexShader:`varying vec2 vSky;void main(){vSky=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
     fragmentShader:`varying vec2 vSky;void main(){
       gl_FragColor=vec4(mix(vec3(.017,.031,.052),vec3(.004,.008,.016),smoothstep(.12,.92,vSky.y)),1.);
       #include <colorspace_fragment>
     }`
   });
   materials.push(sky);addMesh(plane,sky);
 }
 function paintedClouds(width,height,x,y,z,rotation,phase,bias=0){
   const material=litImage(clouds,width,height,x,y,z,rotation,true);
   material.onBeforeCompile=shader=>{
     shader.uniforms.uCloudTime=waterClock;
     shader.uniforms.uPhase={value:phase};
     shader.uniforms.uCloudBias={value:bias};
     shader.fragmentShader='uniform float uCloudTime;uniform float uPhase;uniform float uCloudBias;\n'
       +shader.fragmentShader.replace('#include <map_fragment>',`
         float drift=.088*sin(uCloudTime*.067+uPhase);
         vec2 cloudUv=vec2(.10+vMapUv.x*.80+drift+uCloudBias,vMapUv.y);
         vec4 cloud=texture2D(map,cloudUv);
         float edge=smoothstep(0.,.10,vMapUv.x)*(1.-smoothstep(.90,1.,vMapUv.x));
         vec3 moonlitCloud=pow(max(cloud.rgb,0.),vec3(.77))*vec3(.92,1.02,1.16);
         diffuseColor*=vec4(moonlitCloud,min(1.,cloud.a*1.70)*edge);
       `);
   };
   material.customProgramCacheKey=()=> 'arcade-painted-clouds';
 }
 // Anchor all layer coordinates to the same panoramic view at this station.
 // Scale with distance from that camera so the city and sky align at rest and separate in motion.
 if(exterior.every(Boolean)){
   for(const [index,layer] of layers.entries()){
     const scale=.145*(layer.distance/40);
     const z=-76+(layer.x+layer.w/2-836)*scale;
     const y=4+(217.5-layer.y-layer.h/2)*scale;
     if(index===0&&clouds){
       nightBackdrop(layer.w*scale,layer.h*scale,layer.distance,y,z,-Math.PI/2);
       paintedClouds(layer.w*scale*1.16,layer.h*scale,50,y,z,-Math.PI/2,.08);
       continue;
     }
     const surface=litImage(exterior[index],layer.w*scale,layer.h*scale,layer.distance,y,z,-Math.PI/2,index!==0,layer.name!=='moon');
     if(layer.name==='river-depth-clean'){
       surface.onBeforeCompile=shader=>{
         shader.uniforms.uWaterTime=waterClock;
         shader.fragmentShader='uniform float uWaterTime;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
           vec4 stillWater=texture2D(map,vMapUv);
           float wave=sin(vMapUv.y*36.+uWaterTime*.72)*sin(vMapUv.x*26.-uWaterTime*.41);
           vec2 flow=vec2(.0019*wave,.005*sin(vMapUv.x*31.+uWaterTime*.5));
           vec4 movedWater=texture2D(map,clamp(vMapUv+flow,0.,1.));
           vec3 river=mix(stillWater.rgb,movedWater.rgb,movedWater.a*.44);
           diffuseColor*=vec4(river*(1.+.045*wave),stillWater.a);
         `+nightGrade);
       };
       surface.customProgramCacheKey=()=> 'arcade-river-motion';
     }
   }
 }else{
   litImage(landscape,248,65,27,3,-69,-Math.PI/2,false,true);
 }
 // At the end the stone opens onto the ridge, with the city remaining in the side views.
 if(exterior[0]&&exterior[2]){
   const extent=82/1672;
   if(clouds){
     nightBackdrop(96,435*extent,0,-1.2,-169,0);
     paintedClouds(96,435*extent,0,-.85,-168.7,0,-.15,-.17);
   }else{
     litImage(exterior[0],82,435*extent,0,-1.2,-169,0,false,true);
   }
   const mountains=layers[2];
   litImage(exterior[2],82,mountains.h*extent,0,
     -1.2+(217.5-mountains.y-mountains.h/2)*extent,-168,0,true,true);
 }else{
   litImage(landscape,70,27,0,3,-167,0,false,true);
 }
 let transformation=null;
 // The Passage engraving is seated in the left wall of its bay: a recessed field inside a raised stone frame.
 for(const [index,bay] of bayStops.entries()){
   const {z,ink}=bay;
   const study=studies[index];
   const y=.75,wide=4.6,high=3.13;
   const wall=center(z)-dimensions(z).width;
   block(wall+.10,y,z,.36,high+.5,wide+.5);
   for(const v of [-1,1]){
     block(wall+.22,y+v*(high/2+.13),z,.36,.26,wide+.76);
     block(wall+.22,y,z+v*(wide/2+.13),.36,high,.26);
   }
   block(wall+.30,y-high/2-.36,z,.52,.14,wide+1.1);
   if(study&&ink){
     const panelMesh=new T.PlaneGeometry(wide-.24,(wide-.24)*.68);
     panelMesh.rotateY(Math.PI/2);
     panelMesh.translate(wall+.29,y,z);
     const panelMaterial=material.clone();
     panelMaterial.side=T.FrontSide;
     panelMaterial.uniforms={...uniform,uNormalSign:{value:1},uDetail:{value:1},
       uPanel:{value:study},uPanelAmount:{value:1}};
     materials.push(panelMaterial);
     addMesh(panelMesh,panelMaterial);
   }else if(study){
     const panel=litImage(study,wide-.24,(wide-.24)*study.image.height/study.image.width,wall+.285,y,z,Math.PI/2);
     transformation={panel,poster:study,video:null,texture:null,requested:false,unavailable:false};
   }
 }
 // Low solid sills and rounded reveals mark each opening as part of the structure.
 function windowEdge(z,y){
   const {rise}=dimensions(z);
   const angle=Math.asin(T.MathUtils.clamp((y-1.55)/(y<1.55?4.3:rise),-.99,.99));
   const point=section(angle,z);
   point.x-=.15;
   return point;
 }
 const revealDepth=1.25;
 const revealMaterial=material.clone();
 revealMaterial.side=T.DoubleSide;
 revealMaterial.uniforms={...uniform,uNormalSign:{value:1},uDetail:{value:1}};
 materials.push(revealMaterial);
 for(let z=-9.5;z>-126;z-=11){
   const surround=[windowEdge(z+4.2,-1.47),windowEdge(z+4.2,1.25)];
   for(let i=1;i<=36;i++){
     const angle=Math.PI*i/36;
     surround.push(windowEdge(z+4.2*Math.cos(angle),1.25+2.9*Math.sin(angle)));
   }
   surround.push(windowEdge(z-4.2,-1.47));
   addMesh(new T.TubeGeometry(new T.CatmullRomCurve3(surround,false,'centripetal'),64,.2,8,false),ribMaterial);
   const low=windowEdge(z,-1.5);
   block(low.x+revealDepth/2-.05,-1.56,z,revealDepth+.6,.22,8.52);
   reveal(z);
 }
 // Solid jambs and soffit give every opening the thickness of a real stone wall.
 function reveal(z0){
   const halfWidth=4.12,crown=2.84,spring=1.25,foot=-1.47;
   const profile=[[z0+halfWidth,foot,0,-1],[z0+halfWidth,spring,0,-1]];
   for(let i=1;i<36;i++){
     const a=Math.PI*i/36,dz=halfWidth*Math.cos(a),dy=crown*Math.sin(a);
     const ny=-dy/(crown*crown),nz=-dz/(halfWidth*halfWidth),length=Math.hypot(ny,nz);
     profile.push([z0+dz,spring+dy,ny/length,nz/length]);
   }
   profile.push([z0-halfWidth,spring,0,1],[z0-halfWidth,foot,0,1]);
   const position=[],normal=[],uv=[],index=[];
   profile.forEach(([z,y,ny,nz],i)=>{
     const inner=windowEdge(z,y).x-.03;
     for(const x of [inner,inner+revealDepth]){
       position.push(x,y,z);normal.push(0,ny,nz);uv.push(x/56,i/(profile.length-1));
     }
     if(i){const a=i*2-2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
   });
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
   geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
   geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
   geometry.setIndex(index);
   addMesh(geometry,revealMaterial);
 }
 let seed=55109;function rand(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}
 const count=mobile?550:1400,points=[];
 for(let i=0;i<count;i++){const z=8-rand()*170,a=rand()*Math.PI*2,r=i%4===0?.4+rand()*.4:.97;const p=section(a,z);points.push(center(z)+(p.x-center(z))*r,1.1+(p.y-1.1)*r,z);}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));resources.push(dustGeo);
 const dustMat=new T.PointsMaterial({size:.043,sizeAttenuation:true,color:0xd2a66a,transparent:true,opacity:.27,depthWrite:false,fog:true});materials.push(dustMat);const dust=new T.Points(dustGeo,dustMat);scene.add(dust);
 // The passage opens into a real wider chamber; no billboard, halo or white blob.
 const roomGeo=new T.SphereGeometry(1,mobile?48:72,mobile?32:48,0,Math.PI*2,.23,Math.PI-.23);roomGeo.scale(17,11,24);roomGeo.translate(center(-183),2,-183);resources.push(roomGeo);const roomMat=material.clone();roomMat.uniforms={...uniform,uNormalSign:{value:-1},uFloor:{value:1},uBare:{value:1}};materials.push(roomMat);scene.add(new T.Mesh(roomGeo,roomMat));
 let raf=0,last=performance.now(),time=0,samples=[],pointer={x:0,y:0},look={x:0,y:0},closed=false;
 const positions=[4.5,-19.1,-53,-87,-121],target=new T.Vector3();
 let turn=0;
 function updateFilm(shouldPlay){
   const film=transformation;
   if(!film)return;
   if(shouldPlay&&!film.requested&&!film.unavailable){
     if(!film.video){
       const video=document.createElement('video');
       video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;
       video.preload='none';
       video.src=new URL('transformation-loop.mp4',base).href;
       film.video=video;
       const texture=new T.VideoTexture(video);
       texture.colorSpace=T.SRGBColorSpace;
       film.texture=texture;
       resources.push(texture);
     }
     film.requested=true;
     film.video.play().catch(error=>{
       if(error.name!=='AbortError')film.unavailable=true;
     });
   }else if(!shouldPlay&&film.requested){
     film.requested=false;
     film.video.pause();
   }
   const showFilm=shouldPlay&&!film.unavailable&&film.video&&!film.video.paused&&film.video.readyState>=2;
   const map=showFilm?film.texture:film.poster;
   if(film.panel.map!==map){film.panel.map=map;film.panel.needsUpdate=true;}
   host.dataset.film=showFilm?'playing':'poster';
 }
 function render(now){raf=0;if(closed||document.hidden||reading)return;const raw=now-last,dt=Math.max(0,Math.min(raw/1000,.05));last=now;
 if(!paused){time+=dt;waterClock.value=time;look.x+=(pointer.x-look.x)*.055;look.y+=(pointer.y-look.y)*.055;}
 const u=progress*4,i=Math.min(3,Math.floor(u)),f=u-i,g=T.MathUtils.smoothstep(T.MathUtils.clamp((f-.15)/.70,0,1),0,1),z=T.MathUtils.lerp(positions[i],positions[i+1],g);
 updateFilm(!paused&&!reduce.matches&&focusSide==='study'&&currentBay()?.progress===.75);
 const side=focusSide==='river'?1:focusSide==='study'?-1:0;
 const bay=currentBay();
 const studyAngle=bay?Math.atan2(center(bay.z)-dimensions(bay.z).width+.29-center(z),Math.max(1,z-bay.z)):0;
 const angle=side===-1?studyAngle:side===1?.66:look.x*.095;
 turn=paused||forcedReduced?angle:T.MathUtils.lerp(turn,angle,1-Math.exp(-dt*9));
 camera.position.set(center(z),-.72,z);
 target.set(center(z-16)+Math.sin(turn)*16,-.08+look.y*.40,z-Math.cos(turn)*16);camera.lookAt(target);camera.rotation.z=0;uniform.uEye.value.copy(camera.position);uniform.uLight.value.set(center(z-34)+1.05,4.4,z-34);
 if(!paused)dust.position.y=Math.sin(time*.09)*.018;renderReflection(now,z,turn,target);renderer.render(scene,camera);
 if(!paused&&samples.length<240&&raw>0)samples.push(raw);const mean=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:0;
 const m={renderer:'Three.js r180 / WebGL2',design:'night-arcade',progress:+progress.toFixed(4),camera:camera.position.toArray().map(n=>+n.toFixed(3)),roll:+camera.rotation.z.toFixed(6),frames:samples.length,meanFrameMs:+mean.toFixed(2),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,vaultRibs:ribCount,opaqueDisplayPlanes:0,particles:count,width:innerWidth,height:innerHeight,dpr:renderer.getPixelRatio(),paused,time:+time.toFixed(3)};canvas.dataset.metrics=host.dataset.metrics=JSON.stringify(m);
 $('#status').textContent=paused?'Motion paused':'Scroll to explore';if(!paused)raf=requestAnimationFrame(render);
 }
 function invalidate(){if(!raf&&!closed){last=performance.now();raf=requestAnimationFrame(render);}}
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();sizeReflection();lastReflectionZ=Infinity;lastReflection=-Infinity;samples=[];invalidate();}
 function pointerMove(e){if(e.pointerType==='touch')return;pointer.x=(e.clientX/innerWidth-.5)*2;pointer.y=-(e.clientY/innerHeight-.5)*2;invalidate();}
 function visible(){if(document.hidden){updateFilm(false);cancelAnimationFrame(raf);raf=0;}else invalidate();}
 function contextLost(e){e.preventDefault();reading=true;controls();dispose();engine=null;}
 function dispose(){closed=true;cancelAnimationFrame(raf);updateFilm(false);
 if(transformation?.video){transformation.video.removeAttribute('src');transformation.video.load();}
 window.removeEventListener('resize',resize);window.removeEventListener('pointermove',pointerMove);document.removeEventListener('visibilitychange',visible);canvas.removeEventListener('webglcontextlost',contextLost);resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();host.dataset.disposed='true';}
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
