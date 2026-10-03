import * as T from "three";
import { Octree } from "three/addons/math/Octree.js";
import PF from "pathfinding";
import type { MapId, Weapon } from "./arsenal";

export type World = {group:T.Group;octree:Octree;walls:T.Object3D[];grid:PF.Grid;spawns:T.Vector3[]};
export function buildWorld(scene:T.Scene, map:MapId):World {
  const group=new T.Group(), solid=new T.Group(), walls:T.Object3D[]=[], blocks:{x:number;z:number;w:number;d:number}[]=[];
  const dock=map==="dockyard";
  scene.background=new T.Color(dock?"#b7c8ce":"#c3d4df");
  scene.fog=new T.Fog(dock?"#b7c8ce":"#c3d4df",45,125);
  const mats=new Map<string,T.MeshStandardMaterial>();
  function mat(color:string){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.86}));return mats.get(color)!;}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,collision=true){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color)); m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
    (collision?solid:group).add(m);if(collision){walls.push(m);if(y-h/2<2&&y+h/2>.5)blocks.push({x,z,w,d});}return m;
  }
  function cylinder(x:number,y:number,z:number,r:number,h:number,color:string){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,12),mat(color));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  function sign(text:string,x:number,y:number,z:number,w:number,color="#e6eee6",rotation=0){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;const c=canvas.getContext("2d")!;
    c.fillStyle=color;c.font="bold 76px monospace";c.textAlign="center";c.fillText(text,256,92);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);
  }
  const floor=box(0,-.3,0,60,.6,60,dock?"#626c6c":"#a0afb5");
  blocks.pop();floor.receiveShadow=true;
  box(-30,2,0,1,4,61,"#586767");box(30,2,0,1,4,61,"#586767");box(0,2,-30,60,4,1,"#586767");box(0,2,30,60,4,1,"#586767");
  if(dock){
    function container(x:number,z:number,color:string,rot=false,stack=false){
      const w=rot?5:11,d=rot?11:5,y=stack?4.75:1.6;
      box(x,y,z,w,3.2,d,color,!stack);
      for(let i=-4;i<=4;i++){
        if(rot){box(x-2.54,y,z+i, .09,3.02,.12,"#253c42",false);box(x+2.54,y,z+i,.09,3.02,.12,"#253c42",false);}
        else {box(x+i,y,z-2.54,.12,3.02,.09,"#253c42",false);box(x+i,y,z+2.54,.12,3.02,.09,"#253c42",false);}
      }
      if(!rot)sign("NORTH / 07",x,y+.15,z+2.61,4.5);
    }
    container(-13,-15,"#326f75");container(4,-15,"#a34c41");container(17,-8,"#48778a",true);
    container(-16,2,"#7a893b",true);container(-3,3,"#ad6652");container(13,10,"#376e75");container(-8,19,"#3c6679");
    container(-13,-15,"#a4643d",false,true);container(17,-8,"#42685a",true,true);
    for(const [x,z] of [[-24,-8],[5,-3],[24,20],[-20,22],[7,23],[-2,-23]]){
      box(x,.65,z,2.7,1.3,2.5,"#9a927b");box(x,.8,z,2.76,.13,2.56,"#555c4e",false);
    }
    for(let z=-26;z<27;z+=6){box(5,.014,z,.16,.025,2.5,"#d2c581",false);box(8,.014,z,.16,.025,2.5,"#d2c581",false);}
    for(const x of [-25,25]){box(x,9,-22,.7,18,.7,"#d4b66b",false);box(x,9,8,.7,18,.7,"#d4b66b",false);}
    box(0,18,-22,51,1.2,1,"#d4b66b",false);box(0,18,8,51,1.2,1,"#d4b66b",false);box(-2,19,-7,2,1,31,"#344d55",false);
    cylinder(-2,12,-5,.06,12,"#222e33");box(-2,6,-5,1.3,.7,1,"#393e34",false);
    const water=new T.Mesh(new T.PlaneGeometry(260,260),new T.MeshStandardMaterial({color:"#487f89",roughness:.3,metalness:.35}));water.rotation.x=-Math.PI/2;water.position.set(0,-.8,0);group.add(water);
    for(let i=0;i<8;i++)box(-65+i*18,5,-65,12,10,9,i%2?"#74868b":"#879594",false);
    sign("DOCK 04",0,3.1,-29.42,9,"#d7ef72");
  } else {
    function building(x:number,z:number,w:number,d:number,color:string){
      box(x,2.5,z,w,5,d,color);box(x,5.1,z,w+.5,.25,d+.5,"#e5ece8",false);
      box(x,1.2,z+d/2+.02,w,.28,.08,"#2c99ab",false);
      for(let i=-w/2+1.3;i<w/2;i+=2.5)box(x+i,3.2,z+d/2+.06,1.7,1.5,.1,"#375664",false);
    }
    building(-17,-15,12,10,"#d2d6d4");building(7,-17,12,8,"#7f9197");building(19,3,10,12,"#c1c8c8");building(-16,10,10,10,"#829ba0");
    box(-2,1.1,-3,7,2.2,2,"#5a6970");box(-2,1.1,9,7,2.2,2,"#5a6970");
    for(const [x,z] of [[-4,22],[10,15],[-24,0],[24,-20],[6,0]]){box(x,.75,z,3,1.5,2,"#668583");box(x,.78,z,3.05,.16,2.05,"#bac7bd",false);}
    box(-2,.03,3,7,.05,8,"#d7dede",false);sign("RELAY",-2,1.5,-1.92,5,"#7bd7df");
    for(let i=0;i<3;i++){cylinder(-17+i*4,6.3,-15,1.4,2.5,"#c7cecf");cylinder(-17+i*4,7.7,-15,.3,.5,"#4e5e65");}
    const dish=new T.Mesh(new T.SphereGeometry(4,24,12,0,Math.PI*2,0,Math.PI*.42),new T.MeshStandardMaterial({color:"#e9ece5",side:T.DoubleSide}));dish.rotation.z=.5;dish.position.set(9,9,-17);group.add(dish);cylinder(9,6.9,-17,.3,4,"#596a70");
    for(let i=0;i<15;i++){const angle=i/15*Math.PI*2,r=75+(i%3)*12;const m=new T.Mesh(new T.ConeGeometry(18+(i%3)*4,24+(i%4)*8,5),mat(i%2?"#899eab":"#a9b8c0"));m.position.set(Math.cos(angle)*r,7,Math.sin(angle)*r);group.add(m);}
    for(let z=-26;z<27;z+=5)box(-7,.018,z,.13,.03,2,"#e7e2b1",false);
    sign("SECTOR B",0,3,-29.42,8,"#7bdae2");
  }
  for(const [x,z] of [[-27,-25],[27,25],[-27,25],[27,-25]]){
    cylinder(x,4.5,z,.11,9,"#3d4849");box(x,9,z,1.4,.18,.6,"#e7e6c3",false);
  }
  const hemi=new T.HemisphereLight(dock?0xe6f3ff:0xd8edff,0x647164,2.7);group.add(hemi);
  const sun=new T.DirectionalLight(dock?0xfff0d7:0xf2f9ff,3.2);sun.position.set(-20,45,25);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:110});sun.shadow.bias=-.001;sun.shadow.normalBias=.04;group.add(sun);
  group.add(solid);scene.add(group);group.updateMatrixWorld(true);
  const octree=new Octree().fromGraphNode(solid);
  const grid=new PF.Grid(60,60);
  for(let z=0;z<60;z++)for(let x=0;x<60;x++){
    const wx=x-29.5,wz=z-29.5;
    if(blocks.some(b=>Math.abs(wx-b.x)<b.w/2+.7&&Math.abs(wz-b.z)<b.d/2+.7))grid.setWalkableAt(x,z,false);
  }
  const spawns=[[-23,23],[23,-25],[23,23],[-24,-25],[1,24],[-25,0],[25,0],[0,-25]].map(([x,z])=>new T.Vector3(x,0,z));
  return {group,octree,walls,grid,spawns};
}

export function makeWeapon(w:Weapon){
  const g=new T.Group();const black=new T.MeshStandardMaterial({color:0x263031,metalness:.65,roughness:.38});const metal=new T.MeshStandardMaterial({color:0x5e6868,metalness:.8,roughness:.3});
  const accent=new T.MeshStandardMaterial({color:["ak47","mp44","rpd","dragunov"].includes(w.id)?0x7f5034:0x647366,roughness:.65});
  const pistol=w.category==="Pistolen",sniper=w.category==="Scharfschuetzen",smg=w.category==="Maschinenpistolen",mg=w.category==="Leichte MGs",shotgun=w.category==="Schrotflinten";
  function box(x:number,y:number,z:number,a:number,b:number,c:number,m:T.Material){const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
  box(0,0,0,.12,pistol?.12:.16,pistol?.28:.48,black);
  box(0,-.15,pistol?.04:.1,.095,.23,.12,accent).rotation.x=-.23;
  if(!pistol){box(0,-.17,-.11,mg?.23:.08,mg?.2:.27,.17,mg?accent:black).rotation.x=.15;box(0,.005,.35,.12,.14,.3,accent);box(0,.01,-.34,.13,.14,smg?.16:.35,accent);}
  const barrel=new T.Mesh(new T.CylinderGeometry(.027,.027,pistol?.14:sniper?.62:smg?.23:.4,12),metal);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.025,pistol?-.2:sniper?-.74:smg?-.46:-.61);g.add(barrel);
  box(0,.13,pistol?-.1:-.27,.04,.1,.035,black);box(0,.11,.13,.085,.08,.04,black);
  if(sniper){const scope=new T.Mesh(new T.CylinderGeometry(.061,.052,.34,16),black);scope.rotation.x=Math.PI/2;scope.position.set(0,.18,-.05);g.add(scope);}
  if(shotgun)box(0,-.055,-.45,.14,.12,.22,accent);
  for(let i=0;i<6&&!pistol;i++)box(0,.092,-.3+i*.045,.15,.023,.016,metal);
  const glove=new T.MeshStandardMaterial({color:0x424a3b});box(.07,-.23,.13,.16,.17,.24,glove);if(!pistol)box(-.05,-.12,-.35,.17,.14,.22,glove);
  return g;
}

export function makeBot(index:number){
  const g=new T.Group();const suit=new T.MeshStandardMaterial({color:index%2?0x784e49:0x816052});const armor=new T.MeshStandardMaterial({color:0x343d3a});
  function part(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
  part(.54,.7,.32,0,1.06,0,suit);part(.57,.45,.13,0,1.16,.21,armor);
  const head=part(.34,.36,.34,0,1.63,0,armor);head.userData.head=true;
  part(.3,.08,.06,0,1.64,.19,new T.MeshStandardMaterial({color:0xf38c79,emissive:0x6b261f}));
  const left=part(.2,.69,.24,-.16,.39,0,suit),right=part(.2,.69,.24,.16,.39,0,suit);
  part(.18,.5,.22,-.38,1.08,.1,suit).rotation.x=-.7;part(.18,.5,.22,.38,1.08,.1,suit).rotation.x=-.7;
  part(.13,.13,.7,.19,1.18,.48,armor);
  return {group:g,left,right};
}
