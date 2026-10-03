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
const { makeBot, buildWorld, setWorldQuality } = require('../lib/world.ts');
const { graphicsPresets, isGraphicsQuality, effectiveQuality, graphicsPixelRatio } = require('../lib/graphics-settings.ts');
const { GraphicsPipeline } = require('../lib/graphics-pipeline.ts');
const { CombatVisuals } = require('../lib/combat-visuals.ts');
const { SurfaceMaterials } = require('../lib/surface-materials.ts');
const { PinkEngine, pedalInitial, makeCyclist } = require('../lib/pink-engine.ts');
const { ParkCanvasRenderer, createParkRenderer } = require('../lib/park-canvas-renderer.ts');
const { createShooterRenderer, WebGLUnavailableError } = require('../lib/shooter-renderer.ts');
const drawingContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]??(()=>{})});
global.document = {exitPointerLock(){},createElement:()=>({width:0,height:0,getContext:drawingContext})};
global.requestAnimationFrame = () => 1;

{
  const Original=T.WebGLRenderer, calls=[];
  try{
    T.WebGLRenderer=class {constructor(options){calls.push(options);}};
    assert.equal(createShooterRenderer().reduced,false);assert.equal(calls.length,1);assert.equal(calls[0].powerPreference,'default');
    calls.length=0;T.WebGLRenderer=class {constructor(options){calls.push(options);if(options.antialias)throw new Error('MSAA unavailable');}};
    assert.equal(createShooterRenderer().reduced,true);assert.equal(calls.length,2);assert.equal(calls[1].antialias,false);assert.equal(calls[1].depth,true);
    calls.length=0;const failure=new Error('Error creating WebGL context.');
    T.WebGLRenderer=class {constructor(options){calls.push(options);throw failure;}};
    assert.throws(()=>createShooterRenderer(),error=>error instanceof WebGLUnavailableError&&error.cause===failure);assert.equal(calls.length,2);
    console.log('PASS: default GPU selection, reduced graphics retry and explicit unavailable-WebGL error');
  }finally{T.WebGLRenderer=Original;}
}

function shooter(){
  const e=Object.create(Shooter.prototype), scene=new T.Scene();
  const floor=new T.Mesh(new T.BoxGeometry(60,.6,60));floor.position.y=-.3;scene.add(floor);scene.updateMatrixWorld(true);
  Object.assign(e,{scene,camera:new T.PerspectiveCamera(72,1,.06,180),world:{walls:[floor],ladders:[],octree:new Octree().fromGraphNode(floor)},state:{...initialState,phase:'playing'},config:{volume:0,sensitivity:1,difficulty:'regular'},weapon:{...weapons[0],spread:0},slots:[{id:'m4',ammo:30,reserve:180}],slot:0,gun:new T.Group(),bots:[],effects:[],projectiles:[],charges:[],grenadeReady:0,c4Ready:0,elapsed:1,lastShot:-10,burst:0,burstReady:0,reloadEnd:0,aiming:false,shooting:false,recoil:0,yaw:0,pitch:0,hurtUntil:0,keys:new Set(),touchMove:{x:0,y:0},velocity:new T.Vector3(),capsule:new Capsule(new T.Vector3(0,.4,0),new T.Vector3(0,1.55,0),.35),mantle:null,vertical:0,onState(){},sound(){}});
  e.camera.position.set(0,1.64,6);e.camera.updateMatrixWorld(true);return e;
}
function bot(e,x=0,z=0){const model=makeBot(0),b={...model,hp:100,deadUntil:0,index:0};model.group.position.set(x,0,z);model.group.traverse(o=>o.userData.bot=0);e.scene.add(model.group);e.bots=[b];e.scene.updateMatrixWorld(true);return b;}
{
  const e=shooter(),events=[],previous=global.cancelAnimationFrame;
  global.cancelAnimationFrame=()=>events.push('cancel');
  Object.assign(e,{abort:{abort:()=>events.push('listeners')},observer:{disconnect:()=>events.push('resize')},renderer:{domElement:{remove:()=>events.push('remove')},dispose:()=>events.push('dispose'),forceContextLoss:()=>events.push('release')}});
  e.world.group=new T.Group();
  try{e.destroy();assert.deepEqual(events,['cancel','listeners','resize','remove','dispose','release']);}finally{if(previous===undefined)delete global.cancelAnimationFrame;else global.cancelAnimationFrame=previous;}
}
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
{
  const savedDocument=global.document, savedWarn=console.warn, savedError=console.error;
  const globalKeys=['window','ResizeObserver','devicePixelRatio','cancelAnimationFrame'],savedGlobals=Object.fromEntries(globalKeys.map(key=>[key,global[key]]));
  let paints=0, webglAttempts=0;
  const context=new Proxy({}, {get:(target,key)=>target[key]??(()=>{paints++;})});
  const canvas=()=>({width:0,height:0,style:{},dataset:{},remove(){},addEventListener(){},removeEventListener(){},setAttribute(){},getBoundingClientRect:()=>({left:20,top:10,width:640,height:480}),getContext(type){if(type==='2d')return context;webglAttempts++;return null;}});
  global.document={...savedDocument,createElement:canvas,createElementNS:canvas,addEventListener(){}};
  global.window={addEventListener(){}};global.ResizeObserver=class{observe(){}disconnect(){}};global.devicePixelRatio=2;global.cancelAnimationFrame=()=>{};
  console.warn=()=>{};console.error=()=>{};
  try{
    const renderer=createParkRenderer();assert.ok(renderer instanceof ParkCanvasRenderer);assert.ok(webglAttempts>0);assert.equal(renderer.domElement.dataset.renderer,'canvas2d');
    webglAttempts=0;const forced=createParkRenderer(true);assert.equal(webglAttempts,0);forced.dispose();
    const initialized=new PinkEngine({clientWidth:640,clientHeight:480,appendChild(){}},()=>{});
    assert.ok(initialized.renderer instanceof ParkCanvasRenderer);assert.equal(initialized.riders.length,6);initialized.tick(100);initialized.destroy();
    renderer.setPixelRatio(2);renderer.setSize(640,480);assert.equal(renderer.domElement.width,1280);
    const e=Object.create(PinkEngine.prototype),model=makeCyclist(0),r={...model,active:true,lane:0,speed:2,direction:1,returnAt:0,points:75,spin:0};
    model.group.traverse(o=>o.userData.rider=0);
    Object.assign(e,{scene:new T.Scene(),camera:new T.PerspectiveCamera(44,4/3,.1,100),renderer,state:{...pedalInitial,phase:'playing',voices:false},clock:0,quoteUntil:0,voiceReady:0,cryReady:0,reloadAt:0,lastShot:-1,noteUntil:0,flights:[],bursts:[],riders:[r],last:0,accumulator:0,onState(){},tone(){}});
    e.scene.add(model.group);e.camera.position.set(0,9,23);e.camera.lookAt(0,1.8,0);renderer.render(e.scene,e.camera);assert.ok(paints>100);
    const p=new T.Vector3(0,2,0).project(e.camera),x=(p.x+1)*320+20,y=(1-p.y)*240+10;
    assert.equal(renderer.hitTest(x,y).object,model.group);assert.equal(renderer.hitTest(21,11),undefined);
    e.shoot(x,y);assert.equal(e.flights.length,1);for(let i=1;i<=5;i++)e.tick(i*100);assert.equal(e.state.hits,1);assert.equal(e.state.score,75);
    model.group.visible=false;assert.equal(renderer.hitTest(x,y),undefined);renderer.render(e.scene,e.camera);assert.equal(renderer.hitTest(x,y),undefined);
    renderer.dispose();assert.equal(renderer.domElement.width,1);
    console.log('PASS: unavailable WebGL fallback, forced 2D, drawing commands, scaled hit tests, 2D schnitzel scoring and cleanup');
  }finally{global.document=savedDocument;console.warn=savedWarn;console.error=savedError;for(const key of globalKeys){if(savedGlobals[key]===undefined)delete global[key];else global[key]=savedGlobals[key];}}
}
for(const map of ['dockyard','relay']){
  const scene=new T.Scene(),world=buildWorld(scene,map);
  for(const p of world.spawns){const capsule=new Capsule(p.clone().add(new T.Vector3(0,.4,0)),p.clone().add(new T.Vector3(0,1.55,0)),.35);assert.equal(world.octree.capsuleIntersect(capsule),false,`${map}: clear spawn ${p.toArray()}`);}
  for(const l of world.ladders){const end=new T.Vector3(l.x,l.top+1.57,l.landingZ),capsule=new Capsule(end.clone().add(new T.Vector3(0,-1.15,0)),end,.35);assert.equal(world.octree.capsuleIntersect(capsule),false,`${map}: clear ladder landing ${l.x}`);}
  assert.ok(world.ladders.length>=3);console.log(`PASS: ${map} spawn collision and ${world.ladders.length} ladder landings`);
  const visibleMeshes=()=>{let count=0;world.group.traverseVisible(o=>{if(o instanceof T.Mesh)count++;});return count;};
  const geometry=world.walls[0].geometry,spawns=world.spawns.map(p=>p.toArray());
  world.sun.shadow.map=new T.WebGLRenderTarget(1024,1024);let shadowReleased=0;world.sun.shadow.map.addEventListener('dispose',()=>shadowReleased++);
  setWorldQuality(world,'low',1);const low=visibleMeshes();assert.equal(world.sun.castShadow,false);assert.equal(shadowReleased,1);assert.equal(world.sun.shadow.map,null);assert.ok(world.details.every(g=>!g.visible));
  setWorldQuality(world,'medium',4);const medium=visibleMeshes();assert.equal(world.sun.shadow.mapSize.x,1024);assert.equal(world.details[1].visible,false);
  setWorldQuality(world,'high',8);assert.equal(world.sun.shadow.mapSize.x,2048);assert.ok(world.details.every(g=>g.visible));assert.ok(visibleMeshes()>medium&&medium>low);
  assert.equal(world.walls[0].geometry,geometry);assert.deepEqual(world.spawns.map(p=>p.toArray()),spawns);
  assert.ok(world.surfaces.textures.size<60,'shared textures stay bounded');
  const e=shooter();e.world=world;e.scene=scene;
  const counts=new Map();for(const tex of world.surfaces.textures)tex.addEventListener('dispose',()=>counts.set(tex,(counts.get(tex)||0)+1));
  let skyDisposed=0;world.sky.addEventListener('dispose',()=>skyDisposed++);e.disposeWorld();assert.equal(scene.environment,null);assert.equal(skyDisposed,1);assert.ok([...counts.values()].every(count=>count===1));assert.equal(world.surfaces.textures.size,0);
  console.log(`PASS: ${map} quality details/shadows, unchanged collision, batched scenery, bounded textures and disposal`);
}

{
  for(const quality of ['low','medium','high']){
    assert.ok(isGraphicsQuality(quality));assert.equal(effectiveQuality(quality,true),'low');
    assert.equal(effectiveQuality(quality,false),quality);
    for(const [width,height] of [[390,844],[1280,800],[3840,2160],[7680,4320]]){
      const ratio=graphicsPixelRatio(quality,3,width,height);assert.ok(Number.isFinite(ratio)&&ratio>0);assert.ok(width*height*ratio*ratio<=graphicsPresets[quality].maxPixels+1);
    }
  }
  for(const value of [null,undefined,'ultra','HIGH',{},0])assert.equal(isGraphicsQuality(value),false);
  const scene=new T.Scene(),fx=new CombatVisuals(scene);fx.update(.016);
  for(const quality of ['low','medium','high']){
    fx.setQuality(quality);assert.equal(fx.particles.geometry.drawRange.count,graphicsPresets[quality].particles);assert.equal(fx.weather.geometry.drawRange.count,graphicsPresets[quality].weather);
    for(let i=0;i<150;i++)fx.impact(new T.Vector3(0,1,0),new T.Vector3(0,1,0),false);
    fx.explosion(new T.Vector3(0,1,0));fx.muzzle(new T.Vector3(0,1,0),new T.Vector3(0,0,-1));fx.trail(new T.Vector3(),.04);
    assert.equal(fx.marks.length,48);assert.ok(fx.data.filter(Boolean).length<=graphicsPresets[quality].particles);
    fx.setMap('relay');fx.resize(800,1);fx.update(.02);assert.ok([...fx.particles.geometry.attributes.position.array].every(Number.isFinite));
    fx.update(5);assert.equal(fx.data.filter(Boolean).length,0);assert.ok([...fx.particles.geometry.attributes.alpha.array].every(a=>a===0));
    fx.clear();assert.equal(fx.marks.length,0);
  }
  fx.dispose();assert.equal(scene.children.length,0);
  const surfaces=new SurfaceMaterials(),a=surfaces.get('#445566','metal'),b=surfaces.get('#aabbcc','metal');assert.equal(a.map,b.map);assert.equal(surfaces.textures.size,2);assert.notEqual(a.map.colorSpace,a.bumpMap.colorSpace);surfaces.setAnisotropy(4);assert.equal(a.map.anisotropy,4);surfaces.dispose();assert.equal(surfaces.textures.size,0);
  console.log('PASS: quality validation, 4K/8K pixel budgets, bounded particle/mark pools, expiration, weather and shared surface cleanup');
}

{
  let ratio=1.25,directRenders=0;
  const renderer={getPixelRatio:()=>ratio,setRenderTarget(){},render(){directRenders++;}},pipeline=new GraphicsPipeline(renderer,new T.Scene(),new T.PerspectiveCamera());
  pipeline.resize(1280,800);pipeline.setQuality('medium');
  assert.deepEqual(pipeline.composer.passes.map(p=>p.constructor.name),['RenderPass','UnrealBloomPass','OutputPass','ShaderPass','ShaderPass']);
  assert.equal(pipeline.composer.renderTarget1.width,1600);assert.equal(pipeline.composer.renderTarget1.texture.type,T.UnsignedByteType);
  assert.equal(pipeline.aa.uniforms.resolution.value.x,1/1600);
  const oldTarget=pipeline.composer.renderTarget1;let disposed=0;oldTarget.addEventListener('dispose',()=>disposed++);
  pipeline.setQuality('high');assert.ok(disposed>=1);
  assert.deepEqual(pipeline.composer.passes.slice(0,3).map(p=>p.constructor.name),['RenderPass','SSAOPass','UnrealBloomPass']);
  const ao=pipeline.composer.passes[1];assert.equal(ao.normalRenderTarget.texture.type,T.UnsignedByteType);assert.equal(ao.ssaoRenderTarget.width,1600);
  ratio=.5;pipeline.resize(3840,2160);assert.equal(pipeline.composer.renderTarget1.width,1920);assert.equal(pipeline.aa.uniforms.resolution.value.x,1/1920);
  pipeline.composer.render=()=>{throw new Error('unsupported postprocessing');};const warn=console.warn;console.warn=()=>{};
  try{pipeline.render(.016);pipeline.render(.016);}finally{console.warn=warn;}
  assert.equal(directRenders,2);assert.equal(pipeline.composer,null);
  pipeline.setQuality('medium');assert.ok(pipeline.composer);pipeline.setQuality('low');assert.equal(pipeline.composer,null);pipeline.render(.016);assert.equal(directRenders,3);pipeline.dispose();
  console.log('PASS: real Three.js pass order, byte render targets, resized FXAA, buffer disposal, direct-render fallback and Low bypass');
}

{
  const e=shooter();e.host={clientWidth:3840,clientHeight:2160};e.world=buildWorld(e.scene,'dockyard');let ratio=1;const ratios=[];
  e.renderer={shadowMap:{enabled:true},setPixelRatio(value){ratio=value;ratios.push(value);},getPixelRatio(){return ratio;},setSize(){},capabilities:{getMaxAnisotropy:()=>4}};
  e.visuals=new CombatVisuals(e.scene);e.pipeline=new GraphicsPipeline(e.renderer,e.scene,e.camera);global.devicePixelRatio=2;
  const health=e.state.health,projectiles=e.projectiles;e.setGraphicsQuality('high');assert.equal(e.graphicsQuality,'high');assert.equal(e.config.graphics,'high');assert.equal(e.state.health,health);assert.equal(e.projectiles,projectiles);assert.equal(e.world.sun.shadow.mapSize.x,2048);assert.ok(ratios.every(r=>r*r*3840*2160<=graphicsPresets.high.maxPixels+1),'every intermediate allocation respects the pixel budget');
  e.reducedGraphics=true;e.setGraphicsQuality('high');assert.equal(e.graphicsQuality,'low');assert.equal(e.config.graphics,'high');assert.equal(e.renderer.shadowMap.enabled,false);assert.equal(e.pipeline.composer,null);
  e.visuals.dispose();e.pipeline.dispose();e.disposeWorld();delete global.devicePixelRatio;
  console.log('PASS: live quality switch preserves gameplay; reduced contexts enforce Low');
}
