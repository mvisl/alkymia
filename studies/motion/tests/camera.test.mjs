import assert from 'node:assert/strict';
import {cycle,constrainCenter,layerPose} from '../camera.mjs';
for(const [t,u] of [[0,0],[10,1],[20,0],[30,1]])assert.ok(Math.abs(cycle(t)-u)<1e-9);
for(const t of [0,10,20])assert.ok(Math.abs(cycle(t+.001)-cycle(t))<1e-9,'zero-speed turn');
for(let t=0;t<60;t+=.01)assert.ok(cycle(t)>=0&&cycle(t)<=1);
const view={width:1920,height:850},p={x:0,y:0},m={x:0,y:0,width:238,height:435};
assert.ok(constrainCenter(-1,view)>0);assert.ok(constrainCenter(2,view)<1);
const leftA=layerPose('left-tree',m,view,{center:.3,zoom:1},p),leftB=layerPose('left-tree',m,view,{center:.7,zoom:1},p);
assert.deepEqual(leftA,leftB,'foreground frame survives world panning');
const edge=leftA.x+m.width*leftA.scale;assert.ok(edge>view.width*.1&&edge<=view.width*.2);
const look=layerPose('left-tree',m,view,{center:.5,zoom:1},{x:1,y:1});assert.ok(look.x-leftA.x<=12);
for(const id of ['base','city','landmarks','left-bank','right-bank','left-tree','right-tree'])for(const z of [1,1.025,1.08])for(const center of [.2,.5,.8]){
 const pose=layerPose(id,m,view,{center,zoom:z},p);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.scale>0);
}
console.log('Camera cycle, bounds and foreground framing passed');
