import * as T from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import PF from "pathfinding";
import { buildWorld, makeWeapon, makeBot, type World } from "./world";
import { weapons, type MatchConfig, type GameState, type Weapon, type MapId } from "./arsenal";

export const initialState:GameState={phase:"lobby",health:100,ammo:30,reserve:180,kills:0,deaths:0,time:180,weapon:"m4",reloading:false,reloadProgress:0,hit:false,hurt:false,notice:"",streak:0,score:0,grenades:2,aiming:false,radar:[],yaw:0};
type Bot = ReturnType<typeof makeBot> & {hp:number;deadUntil:number;fireAt:number;path:number[][];planAt:number;index:number};
type Effect={mesh:T.Object3D;until:number};
export class Shooter {
  renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(72,1,.06,180);world:World;
  state={...initialState};config:MatchConfig;weapon:Weapon;gun=new T.Group();bots:Bot[]=[];
  private capsule=new Capsule(new T.Vector3(0,.4,0),new T.Vector3(0,1.55,0),.35);
  private velocity=new T.Vector3();private grounded=false;private keys=new Set<string>();private yaw=0;private pitch=0;
  private shooting=false;private aiming=false;private lastShot=-10;private burst=0;private burstReady=0;private reloadEnd=0;
  private elapsed=0;private lastTime=0;private frame=0;private lastHud=0;private hurtUntil=0;private hitUntil=0;private noticeUntil=0;private diedAt=0;
  private effects:Effect[]=[];private slots:{id:string;ammo:number;reserve:number}[]=[];private slot=0;private audio:AudioContext|null=null;
  private observer:ResizeObserver;private abort=new AbortController();private recoil=0;private touchMove={x:0,y:0};private onState:(s:GameState)=>void;
  constructor(private host:HTMLElement,config:MatchConfig,onState:(s:GameState)=>void){
    this.config=config;this.onState=onState;this.weapon=weapons.find(w=>w.id===config.weapon)!;
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    // Map geometry is static; keep its shadow map cached between frames.
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.13;host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-label","3D-Spielfeld");this.scene.add(this.camera);this.world=buildWorld(this.scene,config.map);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();this.bind();this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setMap(map:MapId){if(this.state.phase!=="lobby"||map===this.config.map)return;this.config.map=map;this.disposeWorld();this.world=buildWorld(this.scene,map);this.renderer.shadowMap.needsUpdate=true;}
  private disposeObject(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if("map" in m)(m.map as T.Texture|null)?.dispose();m.dispose();});}});root.removeFromParent();}
  private disposeWorld(){this.disposeObject(this.world.group);}
  start(config:MatchConfig){
    if(this.config.map!==config.map){this.disposeWorld();this.world=buildWorld(this.scene,config.map);this.renderer.shadowMap.needsUpdate=true;}this.config={...config};
    this.bots.forEach(b=>this.disposeObject(b.group));this.bots=[];
    this.state={...initialState,phase:"playing",weapon:config.weapon};this.elapsed=0;this.lastShot=-10;this.burst=0;this.burstReady=0;this.clearEffects();this.resetSlots();this.spawnPlayer();
    for(let i=0;i<5;i++){const model=makeBot(i);const b:Bot={...model,hp:100,deadUntil:0,fireAt:1+i*.3,path:[],planAt:0,index:i};model.group.traverse(o=>{o.userData.bot=i;});this.scene.add(b.group);this.bots.push(b);this.spawnBot(b);}
    this.sound(180,.12,"sine",.15);this.capture();this.emit();
  }
  private resetSlots(){this.slots=[this.config.weapon,this.config.sidearm].map(id=>{const w=weapons.find(w=>w.id===id)!;return{id,ammo:w.mag,reserve:w.mag*6};});this.slot=0;this.equip();}
  private equip(){this.weapon=weapons.find(w=>w.id===this.slots[this.slot].id)!;this.disposeObject(this.gun);this.gun=makeWeapon(this.weapon);this.camera.add(this.gun);this.gun.position.set(.28,-.26,-.47);this.reloadEnd=0;this.burst=0;this.state.weapon=this.weapon.id;this.syncAmmo();}
  private syncAmmo(){this.state.ammo=this.slots[this.slot].ammo;this.state.reserve=this.slots[this.slot].reserve;}
  switchWeapon(){if(this.state.phase!=="playing")return;this.slot=1-this.slot;this.equip();this.sound(380,.06,"triangle",.05);}
  private spawnPlayer(){
    const p=this.world.spawns.reduce((best,p)=>{const dist=(v:T.Vector3)=>Math.min(...this.bots.filter(b=>b.hp>0).map(b=>b.group.position.distanceTo(v)),100);return dist(p)>dist(best)?p:best;},this.world.spawns[0]);
    this.capsule.start.copy(p).add(new T.Vector3(0,.4,0));this.capsule.end.copy(p).add(new T.Vector3(0,1.55,0));this.velocity.set(0,0,0);
    this.yaw=Math.atan2(p.x,p.z);this.pitch=0;this.state.health=100;this.hurtUntil=0;this.reloadEnd=0;this.diedAt=0;
  }
  private spawnBot(b:Bot){
    const candidates=this.world.spawns.filter(p=>p.distanceTo(this.capsule.end)>14);
    const p=candidates[(b.index+Math.floor(this.elapsed))%candidates.length]||this.world.spawns[(b.index+2)%8];b.group.position.copy(p);b.hp=100;b.group.visible=true;b.path=[];b.planAt=this.elapsed;b.fireAt=this.elapsed+1.4;
  }
  private capture(){if(matchMedia("(pointer:fine)").matches){this.renderer.domElement.requestPointerLock()?.catch(()=>{this.pause();this.notice("Mausfreigabe nicht moeglich. Erneut fortsetzen.");});}}
  pause(){if(this.state.phase!=="playing")return;this.state.phase="paused";this.shooting=false;this.aiming=false;this.keys.clear();this.touchMove={x:0,y:0};document.exitPointerLock();this.emit();}
  resume(){if(this.state.phase!=="paused")return;this.state.phase="playing";this.capture();this.emit();}
  lobby(){this.state.phase="lobby";document.exitPointerLock();this.keys.clear();this.shooting=false;this.aiming=false;this.bots.forEach(b=>this.disposeObject(b.group));this.bots=[];this.clearEffects();this.gun.visible=false;this.emit();}
  reload(){if(this.state.phase!=="playing"||this.reloadEnd||this.state.ammo===this.weapon.mag||this.state.reserve===0)return;this.reloadEnd=this.elapsed+this.weapon.reload;this.burst=0;this.sound(240,.15,"triangle",.1);}
  move(x:number,y:number){this.touchMove={x,y};}
  look(x:number,y:number){if(this.state.phase!=="playing")return;const sens=.002*this.config.sensitivity*(this.aiming?.5:1);this.yaw-=x*sens;this.pitch=T.MathUtils.clamp(this.pitch-y*sens,-1.45,1.45);}
  fire(value:boolean){this.shooting=value;if(value&&this.state.phase==="playing")this.tryShoot(true);}
  aim(value:boolean){this.aiming=value;}
  jump(){if(this.grounded&&this.state.phase==="playing"){this.velocity.y=7;this.grounded=false;}}
  grenade(){
    if(this.state.phase!=="playing"||this.state.grenades<1)return;this.state.grenades--;
    const direction=this.camera.getWorldDirection(new T.Vector3()),ray=new T.Raycaster(this.camera.position,direction,0,18),wall=ray.intersectObjects(this.world.walls,false)[0];
    const target=this.camera.position.clone().addScaledVector(direction,wall?Math.max(1,wall.distance-.6):17);target.y=.5;
    const ball=new T.Mesh(new T.SphereGeometry(.15,8,8),new T.MeshStandardMaterial({color:0xb8cb69}));ball.position.copy(target);this.scene.add(ball);
    this.effects.push({mesh:ball,until:this.elapsed+.85});ball.userData.explode=target;
    this.sound(400,.06,"triangle",.1);
  }
  private explode(target:T.Vector3){
    const mesh=new T.Mesh(new T.SphereGeometry(4,16,12),new T.MeshBasicMaterial({color:0xffbd63,transparent:true,opacity:.65,wireframe:true}));mesh.position.copy(target);this.scene.add(mesh);this.effects.push({mesh,until:this.elapsed+.22});
    for(const b of this.bots){const distance=b.group.position.distanceTo(target);if(b.hp>0&&distance<8&&this.lineOfSight(target.clone().setY(1),b.group.position.clone().setY(1.2)))this.damageBot(b,150*(1-distance/8),false);}
    this.sound(65,.4,"sawtooth",.25);
  }
  private bind(){
    const opt={signal:this.abort.signal};
    document.addEventListener("keydown",e=>{if(this.state.phase!=="playing")return;if(["Space","Tab","KeyW","KeyS","KeyA","KeyD"].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.repeat)return;if(e.code==="KeyR")this.reload();if(["Digit1","Digit2","KeyQ"].includes(e.code))this.switchWeapon();if(e.code==="Space")this.jump();if(e.code==="KeyG")this.grenade();if(e.code==="Escape")this.pause();},opt);
    document.addEventListener("keyup",e=>this.keys.delete(e.code),opt);
    document.addEventListener("mousemove",e=>{if(document.pointerLockElement===this.renderer.domElement)this.look(e.movementX,e.movementY);},opt);
    document.addEventListener("mousedown",e=>{if(document.pointerLockElement!==this.renderer.domElement)return;if(e.button===0)this.fire(true);if(e.button===2)this.aim(true);},opt);
    document.addEventListener("mouseup",e=>{if(e.button===0)this.fire(false);if(e.button===2)this.aim(false);},opt);
    this.renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault(),opt);
    document.addEventListener("pointerlockchange",()=>{if(!document.pointerLockElement&&this.state.phase==="playing"&&matchMedia("(pointer:fine)").matches)this.pause();},opt);
    window.addEventListener("blur",()=>this.pause(),opt);document.addEventListener("visibilitychange",()=>{if(document.hidden)this.pause();},opt);
  }
  private tryShoot(pressed=false){
    if(this.state.phase!=="playing"||this.reloadEnd)return;
    const w=this.weapon;
    if(w.mode==="burst"&&pressed&&this.elapsed>=this.burstReady)this.burst=3;
    if(w.mode!=="auto"&&w.mode!=="burst"&&!pressed)return;
    if(w.mode==="burst"&&this.burst<=0)return;
    if(this.elapsed-this.lastShot<60/w.rpm)return;
    if(this.state.ammo<=0){this.reload();return;}
    this.lastShot=this.elapsed;this.slots[this.slot].ammo--;this.syncAmmo();if(w.mode==="burst"){this.burst--;if(!this.burst)this.burstReady=this.elapsed+.24;}
    this.recoil=.06+(w.damage/1400);this.pitch=Math.min(1.4,this.pitch+.008+w.damage/14000);
    this.sound(w.category==="Scharfschuetzen"?70:120+Math.random()*80,.08,"sawtooth",.15);
    const origin=this.camera.position.clone(),direction=this.camera.getWorldDirection(new T.Vector3());
    for(let i=0;i<(w.pellets||1);i++){
      const spread=w.spread*(this.aiming?.16:1);const dir=direction.clone().add(new T.Vector3((Math.random()-.5)*spread,(Math.random()-.5)*spread,(Math.random()-.5)*spread)).normalize();
      const ray=new T.Raycaster(origin,dir,0,150);const surfaces=[...this.world.walls,...this.bots.filter(b=>b.hp>0).map(b=>b.group)];const hit=ray.intersectObjects(surfaces,true)[0];
      const end=hit?.point||origin.clone().addScaledVector(dir,80);
      if(hit&&typeof hit.object.userData.bot==="number"){
        const head=!!hit.object.userData.head;const damage=w.damage*(head?1.7:1)*Math.max(.45,1-Math.max(0,hit.distance-w.range)/90);this.damageBot(this.bots[hit.object.userData.bot],damage,head);
      }
      if(i===0)this.tracer(origin.clone().add(new T.Vector3(.1,-.13,0)),end,0xffe5a3);
    }
  }
  private damageBot(b:Bot,damage:number,head:boolean){if(b.hp<=0)return;b.hp-=damage;this.hitUntil=this.elapsed+.15;if(b.hp<=0){b.group.visible=false;b.deadUntil=this.elapsed+2.8;this.state.kills++;this.state.streak++;this.state.score+=head?150:100;this.notice(head?"HEADSHOT +150":"ELIMINIERUNG +100");this.sound(800,.06,"sine",.07);if(this.state.kills>=25)this.finish();}}
  private tracer(from:T.Vector3,to:T.Vector3,color:number){const line=new T.Line(new T.BufferGeometry().setFromPoints([from,to]),new T.LineBasicMaterial({color,transparent:true,opacity:.65}));this.scene.add(line);this.effects.push({mesh:line,until:this.elapsed+.045});}
  private lineOfSight(from:T.Vector3,to:T.Vector3){const d=to.clone().sub(from),dist=d.length();return new T.Raycaster(from,d.normalize(),0,dist).intersectObjects(this.world.walls,false).length===0;}
  private updateBots(dt:number){
    for(const b of this.bots){
      if(b.hp<=0){if(this.elapsed>=b.deadUntil)this.spawnBot(b);continue;}
      const pos=b.group.position,player=this.capsule.end,dist=pos.distanceTo(player);b.group.rotation.y=Math.atan2(player.x-pos.x,player.z-pos.z);
      const eye=pos.clone().setY(1.5),visible=dist<32&&this.lineOfSight(eye,player);
      if(this.elapsed>b.planAt){
        b.planAt=this.elapsed+.75+b.index*.05;
        const sx=T.MathUtils.clamp(Math.floor(pos.x+30),0,59),sz=T.MathUtils.clamp(Math.floor(pos.z+30),0,59),tx=T.MathUtils.clamp(Math.floor(player.x+30),0,59),tz=T.MathUtils.clamp(Math.floor(player.z+30),0,59);
        const grid=this.world.grid.clone();grid.setWalkableAt(sx,sz,true);grid.setWalkableAt(tx,tz,true);b.path=new PF.AStarFinder({diagonalMovement:PF.DiagonalMovement.OnlyWhenNoObstacles}).findPath(sx,sz,tx,tz,grid).slice(1);
      }
      if((!visible||dist>11)&&b.path.length){const [gx,gz]=b.path[0],target=new T.Vector3(gx-29.5,0,gz-29.5),delta=target.sub(pos);if(delta.length()<.15)b.path.shift();else pos.addScaledVector(delta.normalize(),Math.min(dt*(this.config.difficulty==="veteran"?3.2:2.3),delta.length()));b.left.rotation.x=Math.sin(this.elapsed*9)*.55;b.right.rotation.x=-b.left.rotation.x;}
      else {b.left.rotation.x=0;b.right.rotation.x=0;}
      if(visible&&this.elapsed>b.fireAt&&this.state.phase==="playing"){
        const difficulty=this.config.difficulty;b.fireAt=this.elapsed+(difficulty==="recruit"?.85:difficulty==="regular"?.6:.36)+Math.random()*.35;
        this.tracer(eye,player.clone().add(new T.Vector3((Math.random()-.5)*1.2,0,0)),0xf99172);
        if(Math.random()<(difficulty==="recruit"?.28:difficulty==="regular"?.44:.64)*Math.max(.45,1-dist/65)){
          this.state.health=Math.max(0,this.state.health-(difficulty==="veteran"?15:10));this.hurtUntil=this.elapsed+.3;
          if(this.state.health<=0){this.state.phase="dead";this.state.deaths++;this.state.streak=0;this.diedAt=this.elapsed;this.shooting=false;this.aiming=false;this.notice("GEFALLEN");}
        }
      }
    }
  }
  private updatePlayer(dt:number){
    const forward=new T.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),right=new T.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    let x=(this.keys.has("KeyD")?1:0)-(this.keys.has("KeyA")?1:0)+this.touchMove.x;
    let z=(this.keys.has("KeyW")?1:0)-(this.keys.has("KeyS")?1:0)-this.touchMove.y;
    const move=forward.multiplyScalar(z).addScaledVector(right,x);if(move.length()>1)move.normalize();const crouch=this.keys.has("ControlLeft")||this.keys.has("KeyC");
    const speed=crouch?2.4:this.aiming?3:this.keys.has("ShiftLeft")?8:5.4;this.velocity.x=move.x*speed;this.velocity.z=move.z*speed;this.velocity.y-=22*dt;
    for(let i=0;i<3;i++){this.capsule.translate(this.velocity.clone().multiplyScalar(dt/3));const collision=this.world.octree.capsuleIntersect(this.capsule);this.grounded=false;if(collision){this.grounded=collision.normal.y>.5;if(this.grounded)this.velocity.y=Math.max(0,this.velocity.y);else this.velocity.addScaledVector(collision.normal,-collision.normal.dot(this.velocity));this.capsule.translate(collision.normal.multiplyScalar(collision.depth));}}
    this.camera.position.copy(this.capsule.end);this.camera.position.y+=.08-(crouch?.45:0);if(move.lengthSq()>.1&&this.grounded)this.camera.position.y+=Math.sin(this.elapsed*12)*.025;
    this.camera.rotation.set(this.pitch,this.yaw,0,"YXZ");
    if(this.shooting||this.burst>0)this.tryShoot();
    if(this.reloadEnd&&this.elapsed>=this.reloadEnd){const s=this.slots[this.slot],amount=Math.min(this.weapon.mag-s.ammo,s.reserve);s.ammo+=amount;s.reserve-=amount;this.reloadEnd=0;this.syncAmmo();}
    if(this.elapsed-this.hurtUntil>4&&this.state.health<100)this.state.health=Math.min(100,this.state.health+dt*9);
    this.recoil*=Math.exp(-dt*15);
    const targetX=this.aiming?0:.28,targetY=this.aiming?-.17:-.26;
    this.gun.position.lerp(new T.Vector3(targetX,targetY-(this.reloadEnd?Math.sin((this.reloadEnd-this.elapsed)/this.weapon.reload*Math.PI)*.24:0),-.47+this.recoil),Math.min(1,dt*12));
    this.gun.rotation.z=this.reloadEnd?-.45:0;
    this.camera.fov=T.MathUtils.lerp(this.camera.fov,this.aiming?(this.weapon.category==="Scharfschuetzen"?28:51):72,dt*12);this.camera.updateProjectionMatrix();
  }
  private finish(){this.state.phase="finished";this.shooting=false;this.aiming=false;document.exitPointerLock();this.emit();}
  private clearEffects(){this.effects.forEach(e=>this.disposeEffect(e));this.effects=[];}
  private disposeEffect(e:Effect){e.mesh.removeFromParent();if(e.mesh instanceof T.Mesh||e.mesh instanceof T.Line){e.mesh.geometry.dispose();(e.mesh.material as T.Material).dispose();}}
  private tick(now:number){
    this.frame=requestAnimationFrame(t=>this.tick(t));const dt=Math.min((now-this.lastTime)/1000||.016,.04);this.lastTime=now;
    if(this.state.phase==="lobby"){
      const t=now*.000035;this.camera.position.set(Math.sin(t)*24,17,Math.cos(t)*24);this.camera.lookAt(0,1,0);this.camera.fov=62;this.camera.updateProjectionMatrix();this.gun.visible=false;
    }else if(this.state.phase==="playing"||this.state.phase==="dead"){
      this.elapsed+=dt;this.state.time=Math.max(0,180-this.elapsed);this.gun.visible=this.state.phase==="playing";
      if(this.state.phase==="playing"){this.updatePlayer(dt);this.updateBots(dt);}else if(this.elapsed-this.diedAt>2.5){this.spawnPlayer();this.resetSlots();this.state.grenades=2;this.state.phase="playing";}
      if(this.state.time===0)this.finish();
      for(let i=this.effects.length-1;i>=0;i--){const effect=this.effects[i];if(this.elapsed>effect.until){const target=effect.mesh.userData.explode;this.disposeEffect(effect);this.effects.splice(i,1);if(target)this.explode(target);}}
    }
    this.renderer.render(this.scene,this.camera);if(now-this.lastHud>90){this.lastHud=now;this.emit();}
  }
  private notice(text:string){this.state.notice=text;this.noticeUntil=this.elapsed+2;}
  private emit(){this.onState({...this.state,health:Math.ceil(this.state.health),reloading:!!this.reloadEnd,reloadProgress:this.reloadEnd?1-(this.reloadEnd-this.elapsed)/this.weapon.reload:0,hit:this.elapsed<this.hitUntil,hurt:this.elapsed<this.hurtUntil,notice:this.elapsed<this.noticeUntil?this.state.notice:"",aiming:this.aiming,yaw:this.yaw,radar:[{x:this.capsule.end.x,z:this.capsule.end.z,enemy:false},...this.bots.filter(b=>b.hp>0).map(b=>({x:b.group.position.x,z:b.group.position.z,enemy:true}))]});}
  private sound(frequency:number,duration:number,type:OscillatorType,volume:number){try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(35,this.audio.currentTime+duration);gain.gain.setValueAtTime(volume*this.config.volume,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{}}
  destroy(){cancelAnimationFrame(this.frame);this.abort.abort();this.observer.disconnect();if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();this.clearEffects();this.bots.forEach(b=>this.disposeObject(b.group));this.disposeObject(this.gun);this.disposeWorld();void this.audio?.close();this.renderer.dispose();this.renderer.domElement.remove();}
}
