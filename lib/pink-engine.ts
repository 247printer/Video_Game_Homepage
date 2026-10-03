import * as T from "three";

export type PedalState={phase:"ready"|"playing"|"paused"|"finished";score:number;time:number;ammo:number;hits:number;shots:number;combo:number;reloading:boolean;message:string};
export const pedalInitial:PedalState={phase:"ready",score:0,time:90,ammo:6,hits:0,shots:0,combo:0,reloading:false,message:""};
export function disposeScene(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if("map" in m)(m.map as T.Texture|null)?.dispose();m.dispose();});}});root.removeFromParent();}
function material(color:number){return new T.MeshStandardMaterial({color,roughness:.8});}
function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:number){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ball(parent:T.Object3D,x:number,y:number,z:number,r:number,color:number,sx=1,sy=1,sz=1){const m=new T.Mesh(new T.SphereGeometry(r,14,10),material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
function tube(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,color:number){const delta=b.clone().sub(a);const m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),material(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.castShadow=true;parent.add(m);return m;}
const v=(x:number,y:number,z=0)=>new T.Vector3(x,y,z);

export function makeCyclist(index:number){
 const group=new T.Group(),wheels:T.Group[]=[];
 const pink=[0xf3429b,0xfb75b2,0xd82779][index%3],skin=[0xe7ad87,0x9a6248,0xf4cba5][index%3],frame=[0x28adad,0xf5dc62,0x534387][index%3];
 for(const x of [-.85,.85]){
   const wheel=new T.Group();wheel.position.set(x,.62,0);const tire=new T.Mesh(new T.TorusGeometry(.57,.078,8,24),material(0x263b42));wheel.add(tire);
   const rim=new T.Mesh(new T.TorusGeometry(.48,.025,6,20),material(0xe2e9dc));wheel.add(rim);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(wheel,v(0,0),v(Math.sin(a)*.48,Math.cos(a)*.48),.011,0xd6e7dc);}group.add(wheel);wheels.push(wheel);
 }
 for(const [a,b] of [[v(-.85,.62),v(-.3,1.4)],[v(-.3,1.4),v(0,.68)],[v(0,.68),v(-.85,.62)],[v(-.3,1.4),v(.6,1.4)],[v(.6,1.4),v(0,.68)],[v(.6,1.4),v(.85,.62)],[v(.6,1.4),v(.55,1.85)]])tube(group,a,b,.055,frame);
 box(group,-.08,.97,.025,.25,.52,.22,0x253b43);box(group,-.35,1.47,0,.48,.11,.28,0x253b43);
 tube(group,v(.55,1.85,-.28),v(.55,1.85,.3),.04,0x263b42);
 const body=ball(group,-.28,2.09,0,.61,pink,1.1,1.2,.78);
 const skirt=new T.Mesh(new T.CylinderGeometry(.44,.78,.75,16),material(pink));skirt.position.set(-.27,1.55,0);group.add(skirt);
 const belt=box(group,-.27,1.96,.01,.98,.1,.74,0xfadba7);belt.rotation.z=-.08;
 ball(group,-.24,2.78,0,.33,skin,1,1.13,.95);ball(group,.035,2.8,.05,.12,skin,1.15,.85,.8);
 ball(group,-.29,3.04,0,.36,0xeee8d3,1,.58,1);box(group,-.12,3.05,.03,.35,.045,.54,0x43aeaf);
 for(const z of [-.18,.18]){ball(group,-.005,2.86,z,.05,0x243b43);}
 // Adult proportions, rounded silhouettes and a clearly visible e-bike battery.
 if(index%2===0){ball(group,-.03,2.63,.015,.19,0x744d43,1,.5,1.2);}
 else {ball(group,-.48,2.83,-.02,.26,0x704137,.7,1.2,1);}
 const legs:T.Group[]=[];
 for(const z of [-.23,.23]){
   tube(group,v(-.56,2.32,z),v(.1,1.99,z),.12,skin);tube(group,v(.1,1.99,z),v(.55,1.85,z),.105,skin);
   const leg=new T.Group();leg.position.set(-.2,1.3,z);tube(leg,v(0,0),v(.25,-.45),.13,skin);tube(leg,v(.25,-.45),v(-.1,-.66),.1,skin);box(leg,-.02,-.71,.02,.34,.14,.23,0xf3e7d6);group.add(leg);legs.push(leg);
 }
 for(let i=0;i<4;i++)ball(group,-.6+i*.2,1.36,.65,.04,0xffe8ee);
 return {group,wheels,legs,body};
}

export function buildPark(scene:T.Scene){
 const root=new T.Group();scene.background=new T.Color(0x8fdaea);scene.fog=new T.Fog(0x9bdbe3,42,90);
 root.add(new T.HemisphereLight(0xfff9df,0x5c9368,3));const sun=new T.DirectionalLight(0xfff2ca,3);sun.position.set(-14,25,15);root.add(sun);
 box(root,0,-.2,0,100,.4,100,0x81b960);
 for(const z of [-6,0,6]){
   box(root,0,.01,z,70,.035,2.8,0xd9ceb0);box(root,0,.035,z-1.52,70,.055,.2,0xf3e6cd);box(root,0,.035,z+1.52,70,.055,.2,0xf3e6cd);
   for(let x=-32;x<34;x+=4)box(root,x,.04,z,1.1,.015,.055,0xf7f1d9);
 }
 for(let i=0;i<11;i++){const x=-30+i*6,z=-14-(i%3)*3;box(root,x,2,z,.4,4,.4,0x8b7150);ball(root,x,5,z,2.6,i%2?0x428b64:0x69a764,1,1.2,.85);ball(root,x+1.4,4,z+.3,1.6,0x78b666);}
 for(let i=0;i<5;i++){ball(root,-30+i*15,1,-30,13,i%2?0x92be79:0x74aa76,1,.65,.6);}
 for(const [x,z] of [[-11,3],[10,-3],[-15,-9],[14,9]]){
   box(root,x,.65,z,2.9,.18,.7,0xe6b780);box(root,x,1.24,z-.3,2.9,.55,.15,0xe6b780);
   for(const dx of [-1,1])box(root,x+dx,.3,z,.12,.6,.55,0x42706c);
 }
 for(let i=0;i<48;i++){
   const x=Math.sin(i*13.77)*22,z=[-10,-3,3,10][i%4]+Math.cos(i*7.2)*.35;
   box(root,x,.16,z,.035,.3,.035,0x448463);ball(root,x,.34,z,.11,[0xf7e06d,0xe976a7,0xecf2de][i%3]);
 }
 for(const x of [-18,18]){box(root,x,2.2,-8,.12,4.4,.12,0x3f7575);ball(root,x,4.45,-8,.4,0xfff0c6);}
 const banner=box(root,0,5,-12,8,1.4,.2,0xfaf0d6);const canvas=document.createElement("canvas");canvas.width=768;canvas.height=128;const c=canvas.getContext("2d")!;c.fillStyle="#fff0d6";c.fillRect(0,0,768,128);c.fillStyle="#bf3675";c.font="900 74px Arial";c.textAlign="center";c.fillText("PINK PEDAL PARK",384,91);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(7.8,1.3),new T.MeshBasicMaterial({map:texture}));sign.position.set(0,5,-11.88);root.add(sign);
 for(const x of [-4,4])box(root,x,2.5,-12,.16,5,.16,0x3f7575);
 for(let i=0;i<12;i++){const flag=new T.Mesh(new T.ConeGeometry(.25,.6,3),material([0xf074aa,0xfbe081,0x54beb9][i%3]));flag.rotation.z=Math.PI;flag.position.set(-11+i*2,6.4+Math.sin(i/11*Math.PI)*-.7,-10);root.add(flag);}
 scene.add(root);return root;
}

type Rider=ReturnType<typeof makeCyclist>&{lane:number;speed:number;direction:number;active:boolean;returnAt:number;points:number;spin:number};
type Burst={group:T.Group;age:number;velocities:T.Vector3[]};
export class PinkEngine {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(44,1,.1,100);state={...pedalInitial};riders:Rider[]=[];
 private root:T.Group;private observer:ResizeObserver;private frame=0;private last=0;private clock=0;private accumulator=0;private reloadAt=0;private noteUntil=0;private lastShot=-1;private bursts:Burst[]=[];private abort=new AbortController();private audio:AudioContext|null=null;
 constructor(private host:HTMLElement,private onState:(state:PedalState)=>void){
   this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;host.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute("aria-label","Pink Pedal Spielfeld");
   this.root=buildPark(this.scene);this.camera.position.set(0,9,23);this.camera.lookAt(0,1.8,0);
   for(let i=0;i<6;i++){const model=makeCyclist(i),r:Rider={...model,lane:i%3,speed:2+i*.28,direction:i%2?1:-1,active:true,returnAt:0,points:(3-i%3)*25,spin:0};r.group.position.set(-12+i*4,0,[-6,0,6][r.lane]);r.group.rotation.y=r.direction===1?0:Math.PI;r.group.traverse(o=>{o.userData.rider=i;});this.scene.add(r.group);this.riders.push(r);}
   this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
   const signal=this.abort.signal;this.renderer.domElement.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();this.shoot(e.clientX,e.clientY);},{signal});
   this.renderer.domElement.addEventListener("contextmenu",e=>{e.preventDefault();this.reload();},{signal});
   document.addEventListener("keydown",e=>{if((e.target as HTMLElement)?.closest("button,input,[role=slider]"))return;if(e.code==="KeyR")this.reload();if(e.code==="Escape")this.pause();},{signal});
   document.addEventListener("visibilitychange",()=>{if(document.hidden)this.pause();},{signal});window.addEventListener("blur",()=>this.pause(),{signal});
   this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 private resize(){this.camera.aspect=this.host.clientWidth/this.host.clientHeight;this.camera.fov=this.camera.aspect<.8?58:44;this.camera.updateProjectionMatrix();this.renderer.setSize(this.host.clientWidth,this.host.clientHeight);}
 start(){this.state={...pedalInitial,phase:"playing"};this.clock=0;this.reloadAt=0;this.noteUntil=0;this.lastShot=-1;this.riders.forEach((r,i)=>{r.active=true;r.group.visible=true;r.group.position.x=-12+i*4;r.speed=2+i*.28;r.returnAt=0;});this.emit();this.tone(520,.08);}
 pause(){if(this.state.phase!=="playing")return;this.state.phase="paused";this.emit();}
 resume(){if(this.state.phase!=="paused")return;this.state.phase="playing";this.emit();}
 reload(){if(this.state.phase!=="playing"||this.reloadAt||this.state.ammo===6)return;this.reloadAt=this.clock+1.1;this.state.reloading=true;this.state.message="NACHLADEN";this.noteUntil=this.reloadAt;this.tone(220,.12);this.emit();}
 shoot(x:number,y:number){
   if(this.state.phase!=="playing"||this.reloadAt||this.clock-this.lastShot<.14)return;
   if(!this.state.ammo){this.reload();return;}this.lastShot=this.clock;this.state.ammo--;this.state.shots++;
   const rect=this.renderer.domElement.getBoundingClientRect(),point=new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(point,this.camera);this.scene.updateMatrixWorld(true);
   const hit=ray.intersectObjects(this.riders.filter(r=>r.active).map(r=>r.group),true)[0];
   if(hit){const rider=this.riders[hit.object.userData.rider];rider.active=false;rider.group.visible=false;rider.returnAt=this.clock+.9+Math.random()*.8;this.state.hits++;this.state.combo++;const multiplier=Math.min(4,1+Math.floor((this.state.combo-1)/3));const points=rider.points*multiplier;this.state.score+=points;this.state.message=`+${points}${multiplier>1?` / COMBO x${multiplier}`:""}`;this.noteUntil=this.clock+.8;this.burst(hit.point);this.tone(650+this.state.combo*40,.1);}
   else {this.state.combo=0;this.state.message="DANEBEN";this.noteUntil=this.clock+.4;this.tone(100,.05);}
   if(!this.state.ammo)this.reload();this.emit();
 }
 private burst(at:T.Vector3){const group=new T.Group(),velocities:T.Vector3[]=[];for(let i=0;i<14;i++){const m=new T.Mesh(new T.BoxGeometry(.13,.13,.06),material([0xff64ac,0xffec7f,0x65d9d1][i%3]));group.add(m);velocities.push(v((Math.random()-.5)*6,2+Math.random()*4,(Math.random()-.5)*3));}group.position.copy(at);this.scene.add(group);this.bursts.push({group,age:0,velocities});}
 private tone(hz:number,duration:number){try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type="sine";osc.frequency.setValueAtTime(hz,this.audio.currentTime);gain.gain.setValueAtTime(.08,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{}}
 private tick(now:number){
   this.frame=requestAnimationFrame(t=>this.tick(t));const dt=Math.min(.15,(now-this.last)/1000||.016);this.last=now;
   if(this.state.phase==="playing"||this.state.phase==="ready"){
     if(this.state.phase==="playing"){this.clock+=dt;this.state.time=Math.max(0,90-this.clock);if(!this.state.time){this.state.phase="finished";this.state.message="";this.state.reloading=false;this.reloadAt=0;this.emit();}if(this.reloadAt&&this.clock>=this.reloadAt){this.reloadAt=0;this.state.ammo=6;this.state.reloading=false;}}
     for(const r of this.riders){if(!r.active){if(this.clock>=r.returnAt){r.active=true;r.group.visible=true;r.group.position.x=-r.direction*18;r.speed=Math.min(5,2+this.clock/40+r.lane*.4);}continue;}r.group.position.x+=r.speed*r.direction*dt;if(Math.abs(r.group.position.x)>19){r.group.position.x=-r.direction*18;}r.spin+=dt*r.speed;for(const wheel of r.wheels)wheel.rotation.z=-r.spin*r.direction;for(let i=0;i<r.legs.length;i++)r.legs[i].rotation.z=Math.sin(r.spin*3+i*Math.PI)*.4;r.body.rotation.z=Math.sin(r.spin*2)*.035;}
     for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.age+=dt;b.group.children.forEach((p,j)=>{b.velocities[j].y-=dt*9;p.position.addScaledVector(b.velocities[j],dt);p.rotation.x+=dt*5;p.rotation.z+=dt*3;});if(b.age>1){disposeScene(b.group);this.bursts.splice(i,1);}}
   }
   this.renderer.render(this.scene,this.camera);this.accumulator+=dt;if(this.accumulator>.09){this.accumulator=0;this.emit();}
 }
 private emit(){this.onState({...this.state,message:this.clock<this.noteUntil?this.state.message:""});}
 destroy(){cancelAnimationFrame(this.frame);this.abort.abort();this.observer.disconnect();disposeScene(this.root);this.riders.forEach(r=>disposeScene(r.group));this.bursts.forEach(b=>disposeScene(b.group));void this.audio?.close();this.renderer.dispose();this.renderer.domElement.remove();}
}
