// Pure mechanics regression checks; no browser, GPU or network required.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, filename);
const T = require('three');
const { Capsule } = require('three/addons/math/Capsule.js');
const { Octree } = require('three/addons/math/Octree.js');
const { Shooter, initialState } = require('../lib/engine.ts');
const { weapons } = require('../lib/arsenal.ts');
const { makeBot, buildWorld } = require('../lib/world.ts');
const { PinkEngine, pedalInitial, makeCyclist } = require('../lib/pink-engine.ts');
global.document = {exitPointerLock(){},createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
global.requestAnimationFrame = () => 1;

function shooter(){
  const e=Object.create(Shooter.prototype), scene=new T.Scene();
  const floor=new T.Mesh(new T.BoxGeometry(60,.6,60));floor.position.y=-.3;scene.add(floor);scene.updateMatrixWorld(true);
  Object.assign(e,{scene,camera:new T.PerspectiveCamera(72,1,.06,180),world:{walls:[floor],ladders:[],octree:new Octree().fromGraphNode(floor)},state:{...initialState,phase:'playing'},config:{volume:0,sensitivity:1,difficulty:'regular'},weapon:{...weapons[0],spread:0},slots:[{id:'m4',ammo:30,reserve:180}],slot:0,gun:new T.Group(),bots:[],effects:[],projectiles:[],charges:[],grenadeReady:0,c4Ready:0,elapsed:1,lastShot:-10,burst:0,burstReady:0,reloadEnd:0,aiming:false,shooting:false,recoil:0,yaw:0,pitch:0,hurtUntil:0,keys:new Set(),touchMove:{x:0,y:0},velocity:new T.Vector3(),capsule:new Capsule(new T.Vector3(0,.4,0),new T.Vector3(0,1.55,0),.35),mantle:null,vertical:0,onState(){},sound(){}});
  e.camera.position.set(0,1.64,6);e.camera.updateMatrixWorld(true);return e;
}
function bot(e,x=0,z=0){const model=makeBot(0),b={...model,hp:100,deadUntil:0,index:0};model.group.position.set(x,0,z);model.group.traverse(o=>o.userData.bot=0);e.scene.add(model.group);e.bots=[b];e.scene.updateMatrixWorld(true);return b;}
{
  const e=shooter();for(let i=0;i<90;i++){e.elapsed+=.1;e.tryShoot(true);}assert.equal(e.state.ammo,30);assert.equal(e.slots[0].ammo,30);assert.equal(e.reloadEnd,0);e.reload();assert.equal(e.reloadEnd,0);
}
{
  const e=shooter(),b=bot(e);e.weapon.damage=1;e.tryShoot(true);assert.ok(b.hp<=0);assert.equal(e.state.kills,1);assert.equal(e.state.score,150);
}
{
  const e=shooter(),b=bot(e);const wall=new T.Mesh(new T.BoxGeometry(4,4,.4));wall.position.set(0,2,3);e.scene.add(wall);e.world.walls.push(wall);e.scene.updateMatrixWorld(true);e.tryShoot(true);assert.equal(b.hp,100);
}
{
  const e=shooter(),b=bot(e);e.weapon=weapons.find(w=>w.id==='rpg');e.tryShoot(true);assert.equal(e.projectiles[0].kind,'rocket');for(let i=0;i<10;i++){e.elapsed+=.02;e.updateProjectiles(.02);}assert.equal(e.projectiles.length,0);assert.ok(b.hp<=0);
  e.grenade();e.grenade();assert.equal(e.projectiles.length,1);e.elapsed+=2;e.updateProjectiles(.02);assert.equal(e.projectiles.length,0);
}
{
  const e=shooter();e.camera.position.set(0,1.64,2);e.camera.updateMatrixWorld(true);bot(e,1,-2);e.c4();assert.equal(e.state.c4,1);assert.equal(e.charges.length,1);e.detonate();assert.equal(e.state.c4,0);assert.equal(e.charges.length,0);assert.ok(e.bots[0].hp<100);
}
{
  const e=shooter();e.fly();e.ascend(1);for(let i=0;i<300;i++)e.updatePlayer(.02);assert.equal(e.capsule.end.y,25);e.ascend(-1);e.updatePlayer(.1);assert.ok(e.capsule.end.y<25);e.fly();assert.equal(e.state.flying,false);
  e.keys.add('KeyA');for(let i=0;i<400;i++)e.updatePlayer(.02);assert.ok(e.capsule.end.x>=-28.7);e.pause();assert.equal(e.vertical,0);
}
{
  const e=shooter();const crate=new T.Mesh(new T.BoxGeometry(3,2,2));crate.position.set(0,1,-2);e.scene.add(crate);e.scene.updateMatrixWorld(true);e.world.walls.push(crate);e.world.octree=new Octree().fromGraphNode(e.scene);e.climb();assert.ok(e.mantle);for(let i=0;i<80;i++)e.updatePlayer(.02);assert.equal(e.mantle,null);assert.ok(e.capsule.end.y>3.4);
}
{
  const e=shooter();e.world.ladders=[{x:0,z:0,top:6,landingZ:-1}];e.climb();assert.equal(e.mantle.to.y,7.57);e.clearEffects();assert.equal(e.projectiles.length,0);
}
{
  const e=Object.create(PinkEngine.prototype),model=makeCyclist(0),r={...model,active:true,lane:0,speed:2,direction:1,returnAt:0,points:75,spin:0};
  Object.assign(e,{scene:new T.Scene(),camera:new T.PerspectiveCamera(44,4/3,.1,100),renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:640,height:480})},render(){}},state:{...pedalInitial,phase:'playing',voices:false},clock:0,quoteUntil:0,voiceReady:0,cryReady:0,reloadAt:0,lastShot:-1,noteUntil:0,flights:[],bursts:[],riders:[r],last:0,accumulator:0,onState(){},tone(){}});
  model.group.traverse(o=>o.userData.rider=0);e.scene.add(model.group);e.camera.position.set(0,9,23);e.camera.lookAt(0,1.8,0);e.camera.updateMatrixWorld(true);
  const p=new T.Vector3(0,2,0).project(e.camera);e.shoot((p.x+1)*320,(-p.y+1)*240);assert.equal(e.flights.length,1);assert.equal(e.state.hits,0);assert.equal(e.state.ammo,6);
  for(let i=1;i<=5;i++)e.tick(i*100);assert.equal(e.flights.length,0);assert.equal(e.state.hits,1);assert.equal(e.state.score,75);assert.ok(e.state.quote.length>0);
  e.selectWeapon('paintball');e.state.ammo=2;e.reload();assert.equal(e.state.reloading,true);e.selectWeapon('schnitzel');assert.equal(e.reloadAt,0);assert.equal(e.state.reloading,false);
  e.start();assert.equal(e.state.score,0);assert.equal(e.state.weapon,'schnitzel');e.pause();const before=e.clock;e.tick(1000);assert.equal(e.clock,before);
}
console.log('PASS: infinite ammo, lethal head/visor hits, cover, RPG, grenade fuse, C4, flight limits, climbing, pause, schnitzel flight/scoring, captions and weapon modes');
for(const map of ['dockyard','relay']){
  const scene=new T.Scene(),world=buildWorld(scene,map);
  for(const p of world.spawns){const capsule=new Capsule(p.clone().add(new T.Vector3(0,.4,0)),p.clone().add(new T.Vector3(0,1.55,0)),.35);assert.equal(world.octree.capsuleIntersect(capsule),false,`${map}: clear spawn ${p.toArray()}`);}
  for(const l of world.ladders){const end=new T.Vector3(l.x,l.top+1.57,l.landingZ),capsule=new Capsule(end.clone().add(new T.Vector3(0,-1.15,0)),end,.35);assert.equal(world.octree.capsuleIntersect(capsule),false,`${map}: clear ladder landing ${l.x}`);}
  assert.ok(world.ladders.length>=3);console.log(`PASS: ${map} spawn collision and ${world.ladders.length} ladder landings`);
}
