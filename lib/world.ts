import * as T from "three";
import { Octree } from "three/addons/math/Octree.js";
import PF from "pathfinding";
import type { MapId, Weapon } from "./arsenal";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SurfaceMaterials, makeSky, type Surface } from "./surface-materials";
import { graphicsPresets, type GraphicsQuality } from "./graphics-settings";

export type World = {group:T.Group;octree:Octree;walls:T.Object3D[];grid:PF.Grid;spawns:T.Vector3[];ladders:{x:number;z:number;top:number;landingZ:number}[];sun:T.DirectionalLight;surfaces:SurfaceMaterials;sky:T.Texture;details:T.Group[]};
export function setWorldQuality(world:World,quality:GraphicsQuality,anisotropy:number){
  const preset=graphicsPresets[quality];
  world.surfaces.setAnisotropy(anisotropy);
  world.details.forEach((g,i)=>g.visible=preset.detail>i);
  world.sun.castShadow=preset.shadows>0;
  if(!preset.shadows){world.sun.shadow.map?.dispose();world.sun.shadow.map=null;}
  if(world.sun.shadow.mapSize.x!==preset.shadows&&preset.shadows){
    world.sun.shadow.map?.dispose();world.sun.shadow.map=null;
    world.sun.shadow.mapSize.set(preset.shadows,preset.shadows);world.sun.shadow.needsUpdate=true;
  }
}
function batchDecoration(root:T.Group,excluded:Set<T.Object3D>){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),batches=new Map<T.Material,T.Mesh[]>();
  root.traverse(object=>{
    if(!(object instanceof T.Mesh)||Array.isArray(object.material)||object.material.transparent)return;
    for(let ancestor:T.Object3D|null=object;ancestor;ancestor=ancestor.parent)if(excluded.has(ancestor))return;
    const items=batches.get(object.material)??[];items.push(object);batches.set(object.material,items);
  });
  for(const [material,meshes] of batches){
    if(meshes.length<3)continue;
    const parts=meshes.map(mesh=>{const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));});
    const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());
    if(!geometry)continue;
    const merged=new T.Mesh(geometry,material);merged.castShadow=meshes.some(m=>m.castShadow);merged.receiveShadow=true;
    meshes.forEach(mesh=>mesh.visible=false);root.add(merged);
  }
}
export function buildWorld(scene:T.Scene, map:MapId):World {
  const group=new T.Group(), solid=new T.Group(), walls:T.Object3D[]=[], blocks:{x:number;z:number;w:number;d:number}[]=[];
  const dock=map==="dockyard";
  const ladders:World["ladders"]=[];
  const surfaces=new SurfaceMaterials(),sky=makeSky(dock);group.userData.surfaces=surfaces;
  scene.background=sky;scene.environment=sky;scene.environmentIntensity=.32;
  scene.fog=new T.Fog(dock?"#b5b6a9":"#c2d3df",38,135);
  function mat(color:string,surface:Surface="metal",span=4){return surfaces.get(color,surface,span);}
  function surfaceFor(color:string,w:number,h:number,d:number):Surface{
    if(["#9a927b","#605c4b","#9a927b"].includes(color))return "wood";
    return Math.min(w,h,d)>.35&&["#586767","#c8be99","#c8d0c7","#d2d6d4","#7f9197","#c1c8c8","#829ba0","#5a6970","#aabac0"].includes(color)?"concrete":"metal";
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,collision=true){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color,surfaceFor(color,w,h,d),Math.max(w,h,d))); m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
    (collision?solid:group).add(m);if(collision){walls.push(m);if(y-h/2<2&&y+h/2>.5)blocks.push({x,z,w,d});}return m;
  }
  function cylinder(x:number,y:number,z:number,r:number,h:number,color:string){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,12),mat(color));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  function ladder(x:number,z:number,top:number,landingZ:number){
    ladders.push({x,z,top,landingZ});
    for(const dx of [-.45,.45])cylinder(x+dx,top/2,z,.045,top+.8,"#e4bf51");
    for(let y=.3;y<top+.2;y+=.35)box(x,y,z,.9,.055,.07,"#b8bec0",false);
  }
  function sign(text:string,x:number,y:number,z:number,w:number,color="#e6eee6",rotation=0){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;const c=canvas.getContext("2d")!;
    c.fillStyle=color;c.font="bold 76px monospace";c.textAlign="center";c.fillText(text,256,92);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);
  }
  const floor=box(0,-.3,0,60,.6,60,dock?"#626c6c":"#a0afb5");
  blocks.pop();floor.receiveShadow=true;
  floor.material=mat(dock?"#727775":"#bbc7cb",dock?"asphalt":"concrete",60);
  box(-30,2,0,1,4,61,"#586767");box(30,2,0,1,4,61,"#586767");box(0,2,-30,60,4,1,"#586767");box(0,2,30,60,4,1,"#586767");
  if(dock){
    function container(x:number,z:number,color:string,rot=false,stack=false){
      const w=rot?5:11,d=rot?11:5,y=stack?4.75:1.6;
      box(x,y,z,w,3.2,d,color);
      for(let i=-4;i<=4;i++){
        if(rot){box(x-2.54,y,z+i, .09,3.02,.12,"#253c42",false);box(x+2.54,y,z+i,.09,3.02,.12,"#253c42",false);}
        else {box(x+i,y,z-2.54,.12,3.02,.09,"#253c42",false);box(x+i,y,z+2.54,.12,3.02,.09,"#253c42",false);}
      }
      if(!rot)sign("NORTH / 07",x,y+.15,z+2.61,4.5);
      const front=rot?z+5.52:z+2.57;
      if(rot){for(const dx of [-1.6,1.6]){box(x+dx,y,front,.07,2.9,.1,"#b1b9ad",false);box(x+dx+.18,y-.25,front+.08,.4,.07,.12,"#e0dac3",false);}sign("CARGO",x,y+.65,front+.02,3);}
      else {box(x,y+1.52,z,w,.08,d+.05,"#9da99b",false);sign("MAX 30.480 KG",x+3,y-1,z+2.62,2,"#dfd7bb");}
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
    for(const [x,z] of [[-24,-8],[24,20],[-20,22]]){
      for(const dx of [-.8,.8])box(x+dx,.65,z, .11,1.36,2.56,"#4d5c56",false);
      sign("SUPPLY",x,.85,z+1.3,1.8,"#ece2b7");
    }
    for(let i=0;i<7;i++){const z=-22+i*7;box(-29.42,1.4,z,.09,1.2,2.2,i%2?"#dac785":"#3a494a",false);}
    // Peripheral equipment stays outside the playable boundary.
    box(36,1.1,13,3,2.2,5,"#d0a348",false);box(36,2.9,13,2.7,.25,3,"#333f3e",false);
    for(const x of [34.7,37.3])for(const z of [11.4,14.6]){const wheel=cylinder(x,.7,z,.65,.35,"#293231");wheel.rotation.z=Math.PI/2;}
    box(36,2.2,9.8,.3,4.4,.3,"#526160",false);box(35.4,.3,8.6,.18,.2,2.8,"#526160",false);box(36.6,.3,8.6,.18,.2,2.8,"#526160",false);
    for(let i=0;i<5;i++){cylinder(-35+i*2.8,.7,16,.6,1.4,i%2?"#b06250":"#536f79");}
    for(let i=0;i<4;i++){box(-22+i*13,.02,27,5,.03,.14,"#d6d7b3",false);}
    ladder(-13,-11.85,6.35,-13.5);ladder(-3,6.15,3.2,4.5);ladder(13,13.15,3.2,11.5);
    // Walkable catwalk connects the two central container roofs.
    box(4.5,3.04,7.2,2.4,.3,9,"#465959");
    box(2.8,3.04,4.3,3.5,.3,1.8,"#465959");box(6.6,3.04,9.8,4.2,.3,1.8,"#465959");
    for(const x of [3.25,5.75]){box(x,4.1,7.2,.07,.08,9,"#e1bd55",false);for(let z=3;z<12;z+=1.4)box(x,3.65,z,.07,1.1,.07,"#e1bd55",false);}
    for(let i=0;i<16;i++)box(4.5,3.2,3+i*.55,2.3,.02,.045,"#879792",false);
    for(const [x,z] of [[-22,9],[22,-16],[9,21]]){
      box(x,.1,z,3,.2,2,"#605c4b",false);
      for(let i=0;i<3;i++){cylinder(x-1+i,.6,z,.38,1,"#566c6d");cylinder(x-1+i,1.11,z,.4,.045,"#bdac80");}
    }
    for(let i=0;i<10;i++){const x=-23+i*5;box(x,.015,-27,2.8,.02,.11,"#d7d6ae",false);box(x,.017,-26.4,.08,.023,1.2,"#d7d6ae",false);}
    for(const [x,z] of [[-8,-23],[18,22]]){
      box(x,.45,z,3,.9,1.6,"#c8be99");for(let i=0;i<8;i++)box(x-1.3+i*.38,.46,z+.82,.17,.76,.025,i%2?"#2c3939":"#e2bc48",false);
    }
    box(-23,2.2,-17,4,4.4,5,"#c8d0c7");box(-23,4.5,-17,4.4,.2,5.4,"#515e60",false);
    for(const x of [-24,-22]){box(x,2.7,-14.46,1.5,1.2,.06,"#4b8391",false);box(x,2.7,-14.4,.06,1.2,.06,"#d6d9c2",false);}
    sign("CONTROL",-23,3.8,-14.4,3,"#dfdfbb");
  } else {
    function building(x:number,z:number,w:number,d:number,color:string){
      box(x,2.5,z,w,5,d,color);box(x,5.1,z,w+.5,.25,d+.5,"#e5ece8",false);
      box(x,1.2,z+d/2+.02,w,.28,.08,"#2c99ab",false);
      for(let i=-w/2+1.3;i<w/2;i+=2.5)box(x+i,3.2,z+d/2+.06,1.7,1.5,.1,"#375664",false);
      for(let i=-w/2+1.3;i<w/2;i+=2.5){box(x+i,3.2,z+d/2+.13,.05,1.55,.08,"#abbfc1",false);box(x+i,3.2,z+d/2+.14,1.75,.06,.08,"#abbfc1",false);}
      box(x,1.35,z+d/2+.09,1.3,2.7,.12,"#344e59",false);box(x+.42,1.4,z+d/2+.2,.08,.26,.06,"#c4d7d9",false);
      box(x,2.85,z+d/2+.2,1.55,.12,.28,"#dceedd",false);sign("RESEARCH",x,4.5,z+d/2+.11,4,"#e4f0e8");
      box(x-2,5.6,z,2.2,.9,1.5,"#687e86",false);for(let j=0;j<7;j++)box(x-2,5.65,z-.65+j*.2,2.3,.03,.06,"#cbd9d8",false);
      cylinder(x+w/2-.5,7,z-d/2+.5,.06,4,"#56737b");box(x+w/2-.5,8,z-d/2+.5,1.5,.04,.04,"#56737b",false);
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
    for(let i=0;i<9;i++){const x=-27+i*6;box(x,.025,27,1.7,.04,.4,"#eef2e6",false);}
    for(let i=0;i<10;i++){const x=-42+i*9,z=i%2?-39:40;cylinder(x,3,z,.25,6,"#59695b");for(let j=0;j<3;j++){const pine=new T.Mesh(new T.ConeGeometry(2.8-j*.65,4,7),mat(j%2?"#476c68":"#38675e"));pine.position.set(x,4+j*1.6,z);group.add(pine);}}
    for(const x of [-27,27]){box(x,1.7,30.6,.2,3.4,.2,"#6d919c",false);box(x,3.4,30.6,1.1,.3,.5,"#cbecef",false);}
    ladder(-19,-9.35,5,-11.2);ladder(7,-12.35,5,-14);ladder(19,9.65,5,7.5);ladder(-16,15.65,5,13.4);
    box(-4,4.87,-17,10,.26,2.8,"#637a7c");
    for(const z of [-18.45,-15.55]){box(-4,6,z,10,.065,.065,"#c7dce1",false);for(let x=-8;x<=0;x+=1.5)box(x,5.5,z,.06,1.05,.06,"#87a2ac",false);}
    for(const [x,z] of [[19,2],[-16,9]]){
      for(let i=0;i<3;i++){const panel=box(x-2+i*2,5.5,z,1.7,.09,3,"#294e68",false);panel.rotation.x=.2;for(let j=0;j<5;j++)box(x-2+i*2,5.65,z-1.2+j*.6,1.7,.022,.025,"#9bbac7",false);}
      cylinder(x+3,5.8,z-3,.36,1.5,"#9aaeb3");
    }
    for(const [x,z] of [[-25,-12],[15,-21]]){
      for(let i=0;i<3;i++){const pipe=cylinder(x+i*.4,.5,z,.12,5,"#8b9ea0");pipe.rotation.x=Math.PI/2;}
      box(x+.4,.18,z,1.8,.35,5.5,"#5a6c6d",false);
    }
    for(let i=0;i<5;i++){box(13,.15+i*.3,14-i*.6,2.2,.3+i*.6,.6,"#aabac0");}
    box(13,1.5,10.6,2.2,.3,2,"#aabac0");
    for(let i=0;i<6;i++){box(-27+i*10,.08,28,4,.16,1.6,"#dce3dc",false);}
  }
  // Ground-level dressing: drain covers, repair patches, cables and bollards.
  for(let i=0;i<9;i++){
    const x=-24+(i%3)*23,z=-22+Math.floor(i/3)*21;
    box(x,.016,z,1.4,.027,.65,"#303e40",false);for(let j=0;j<8;j++)box(x-.6+j*.17,.035,z,.05,.025,.62,"#8d9c9a",false);
    cylinder(x+1.1,.45,z,.1,.9,dock?"#c7b557":"#779da7");
  }
  for(const [x,z] of [[-27,-25],[27,25],[-27,25],[27,-25]]){
    cylinder(x,4.5,z,.11,9,"#3d4849");box(x,9,z,1.4,.18,.6,"#e7e6c3",false);
  }
  const details=[new T.Group(),new T.Group()];group.add(...details);
  const dress=(level:number,x:number,y:number,z:number,w:number,h:number,d:number,color:string,surface:Surface="metal")=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color,surface,Math.max(w,h,d)));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;details[level].add(mesh);return mesh;
  };
  // Decorative geometry never enters the navigation grid or collision octree.
  if(dock){
    for(const [x,z] of [[-24,-8],[5,-3],[24,20],[-20,22],[7,23],[-2,-23]]){
      for(let i=0;i<7;i++)dress(0,x-1.1+i*.37,.06,z,.28,.12,2.6,"#8e8068","wood");
      for(const dx of [-1.1,1.1])for(const dz of [-1.05,1.05])dress(1,x+dx,.65,z+dz,.11,1.32,.12,"#b6a17f","wood");
    }
    for(const [x,z] of [[-13,-15],[4,-15],[-3,3],[13,10],[-8,19]]){
      for(const dx of [-5.48,5.48])for(const dz of [-2.52,2.52])dress(0,x+dx,1.6,z+dz,.13,3.19,.13,"#a7aca0");
      for(let i=0;i<18;i++)dress(1,x-5+i*.58,1.6,z+2.56,.055,3.02,.04,"#788681");
      for(let i=0;i<12;i++)dress(1,x-5+i*.9,3.23,z,.08,.08,4.9,"#8a9993");
    }
    const puddle=new T.MeshStandardMaterial({color:0x637f80,roughness:.12,metalness:.55,transparent:true,opacity:.65,depthWrite:false});
    for(let i=0;i<8;i++){
      const mesh=new T.Mesh(new T.CircleGeometry(1.4+(i%3)*.5,16),puddle);mesh.rotation.x=-Math.PI/2;mesh.scale.y=.5;mesh.position.set(-24+(i*11)%48,.022,-24+(i*17)%48);details[0].add(mesh);
      dress(1,-24+(i*13)%48,.025,-24+(i*19)%48,.3,.03,.14,"#7b7667","wood");
    }
    for(let i=0;i<3;i++){
      dress(0,-45+i*28,11,-58,19,22,14,"#788c92","concrete");
      for(let j=0;j<6;j++)dress(1,-52+i*28+j*2.5,15,-50.92,1.4,2.2,.09,"#3c6977");
      dress(1,-45+i*28,23,-58,1,4,1,"#697e84");
    }
    for(const x of [-27,27]){
      const glow=new T.Mesh(new T.PlaneGeometry(.8,.3),new T.MeshStandardMaterial({color:0xffd49a,emissive:0xffb857,emissiveIntensity:2}));
      glow.position.set(x,8.87,-25);glow.rotation.x=-Math.PI/2;details[0].add(glow);
    }
  }else{
    for(const [x,z,w,d] of [[-17,-15,12,10],[7,-17,12,8],[19,3,10,12],[-16,10,10,10]]){
      for(let y=.5;y<5;y+=.7)dress(1,x,y,z+d/2+.025,w,.018,.025,"#8c9f9e","concrete");
      for(let i=-w/2+1.3;i<w/2;i+=2.5){
        dress(0,x+i,4.02,z+d/2+.2,2.05,.09,.35,"#d5ded8");
        const glass=dress(0,x+i,3.2,z+d/2+.19,1.6,1.4,.025,"#4d7789");
        glass.material=new T.MeshStandardMaterial({color:0x456b7c,metalness:.65,roughness:.12});
      }
      for(let i=0;i<6;i++)dress(1,x-w/2+.3+i*1.2,5.3,z-d/2,.045,.6,.08,"#a1b4b8");
      dress(0,x-w/2-.13,2.5,z+d/2-.2,.13,5,.16,"#74898e");
      for(let i=0;i<5;i++)dress(1,x-1.6+i*.32,5.85,z,.04,.6,1.4,"#364d57");
    }
    for(let i=0;i<15;i++){
      const angle=i/15*Math.PI*2,r=75+(i%3)*12,height=24+(i%4)*8;
      const cap=new T.Mesh(new T.ConeGeometry((18+(i%3)*4)*.54,height*.54,5),new T.MeshStandardMaterial({color:0xe6edf0,roughness:1,flatShading:true}));
      cap.position.set(Math.cos(angle)*r,7+height*.23,Math.sin(angle)*r);details[0].add(cap);
    }
    for(let i=0;i<15;i++)dress(1,-28+(i*7.3)%56,.03,-28+(i*13.2)%56,1.2,.05,.6,"#e1e7e5","concrete");
    for(const x of [-27,27]){
      const glow=new T.Mesh(new T.PlaneGeometry(.7,.28),new T.MeshStandardMaterial({color:0xb3eff6,emissive:0x9ee5f5,emissiveIntensity:2}));glow.position.set(x,8.86,25);glow.rotation.x=-Math.PI/2;details[0].add(glow);
    }
  }
  const hemi=new T.HemisphereLight(dock?0xe0efff:0xd8edff,0x64685c,.95);group.add(hemi);
  const sun=new T.DirectionalLight(dock?0xffe1b0:0xecf6ff,3.5);sun.position.set(-26,dock?28:38,20);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:110});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.001;sun.shadow.normalBias=.04;group.add(sun);
  group.add(solid);scene.add(group);group.updateMatrixWorld(true);
  batchDecoration(group,new Set([solid,...details]));details.forEach(detail=>batchDecoration(detail,new Set()));
  const octree=new Octree().fromGraphNode(solid);
  const grid=new PF.Grid(60,60);
  for(let z=0;z<60;z++)for(let x=0;x<60;x++){
    const wx=x-29.5,wz=z-29.5;
    if(blocks.some(b=>Math.abs(wx-b.x)<b.w/2+.7&&Math.abs(wz-b.z)<b.d/2+.7))grid.setWalkableAt(x,z,false);
  }
  const spawns=[[-23,23],[23,-25],[23,23],[-24,-25],[1,24],[-27,0],[25,0],[0,-25]].map(([x,z])=>new T.Vector3(x,0,z));
  return {group,octree,walls,grid,spawns,ladders,sun,surfaces,sky,details};
}

export function makeWeapon(w:Weapon){
  const g=new T.Group(),surfaces=new SurfaceMaterials();g.userData.surfaces=surfaces;
  const black=surfaces.get(0x323a38,"metal"),metal=new T.MeshStandardMaterial({color:0x8a9697,metalness:.9,roughness:.27});
  const wooden=["ak47","mp44","rpd","dragunov"].includes(w.id),accent=surfaces.get(wooden?0x986441:0x687461,wooden?"wood":"fabric");
  const pistol=w.category==="Pistolen",sniper=w.category==="Scharfschuetzen",smg=w.category==="Maschinenpistolen",mg=w.category==="Leichte MGs",shotgun=w.category==="Schrotflinten";
  function box(x:number,y:number,z:number,a:number,b:number,c:number,m:T.Material){const mesh=new T.Mesh(new RoundedBoxGeometry(a,b,c,2,Math.min(a,b,c)*.16),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
  const muzzle=new T.Object3D();muzzle.name="muzzle";g.add(muzzle);
  if(w.id==="rpg"){
    const tube=new T.Mesh(new T.CylinderGeometry(.085,.085,1.1,18),accent);tube.rotation.x=Math.PI/2;tube.position.z=-.2;g.add(tube);
    const warhead=new T.Mesh(new T.ConeGeometry(.14,.4,16),metal);warhead.rotation.x=-Math.PI/2;warhead.position.z=-.92;g.add(warhead);
    for(const z of [-.62,.24]){const rim=new T.Mesh(new T.TorusGeometry(.09,.018,8,18),black);rim.position.z=z;g.add(rim);}
    box(0,-.16,.05,.09,.24,.12,black);box(0,.13,-.3,.04,.18,.035,black);box(.06,-.22,.11,.15,.17,.2,accent);muzzle.position.z=-1.12;return g;
  }
  box(0,0,0,.12,pistol?.12:.16,pistol?.28:.48,black);
  box(0,-.15,pistol?.04:.1,.095,.23,.12,accent).rotation.x=-.23;
  if(!pistol){box(0,-.17,-.11,mg?.23:.08,mg?.2:.27,.17,mg?accent:black).rotation.x=.15;box(0,.005,.35,.12,.14,.3,accent);box(0,.01,-.34,.13,.14,smg?.16:.35,accent);}
  const barrel=new T.Mesh(new T.CylinderGeometry(.027,.027,pistol?.14:sniper?.62:smg?.23:.4,12),metal);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.025,pistol?-.2:sniper?-.74:smg?-.46:-.61);g.add(barrel);
  muzzle.position.set(0,.025,pistol?-.29:sniper?-1.07:smg?-.6:-.83);
  const suppressor=new T.Mesh(new T.CylinderGeometry(.038,.04,.065,16),black);suppressor.rotation.x=Math.PI/2;suppressor.position.copy(muzzle.position).add(new T.Vector3(0,0,.025));g.add(suppressor);
  const bore=new T.Mesh(new T.CircleGeometry(.025,12),new T.MeshBasicMaterial({color:0x080c0b}));bore.position.copy(muzzle.position).add(new T.Vector3(0,0,-.015));bore.rotation.y=Math.PI;g.add(bore);
  box(0,.13,pistol?-.1:-.27,.04,.1,.035,black);box(0,.11,.13,.085,.08,.04,black);
  if(sniper){
    const scope=new T.Mesh(new T.CylinderGeometry(.061,.052,.34,20),black);scope.rotation.x=Math.PI/2;scope.position.set(0,.18,-.05);g.add(scope);
    const lens=new T.Mesh(new T.CircleGeometry(.05,20),new T.MeshStandardMaterial({color:0x79bdd0,roughness:.08,metalness:.9}));lens.position.set(0,.18,.122);g.add(lens);
    for(const z of [-.16,.07]){const ring=new T.Mesh(new T.TorusGeometry(.06,.009,8,20),metal);ring.position.set(0,.18,z);g.add(ring);box(0,.12,z,.06,.07,.05,black);}
  }
  if(shotgun)box(0,-.055,-.45,.14,.12,.22,accent);
  for(let i=0;i<6&&!pistol;i++)box(0,.092,-.3+i*.045,.15,.023,.016,metal);
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){const screw=new T.Mesh(new T.CylinderGeometry(.011,.011,.008,8),metal);screw.rotation.z=Math.PI/2;screw.position.set(side*.064,.025,-.13+i*.12);g.add(screw);}
    if(!pistol)for(let i=0;i<5;i++)box(side*.071,.015,-.44+i*.037,.012,.08,.012,black);
  }
  box(0,-.1,.085,.065,.025,.08,metal);box(0,-.115,-.015,.075,.08,.025,black);
  if(!pistol){box(.07,.045,.045,.015,.045,.1,metal);box(0,.005,.49,.145,.19,.045,black);}
  for(let i=0;i<5;i++)box(.048,-.15-i*.035,-.11,.017,.014,.12,metal);
  box(.066,.022,.05,.018,.017,.075,black);box(.078,.075,-.06,.1,.018,.018,metal);
  const glove=surfaces.get(0x555c45,"fabric"),sleeve=surfaces.get(0x7c7e63,"fabric");
  box(.07,-.23,.13,.16,.17,.24,glove);box(.1,-.29,.32,.17,.2,.25,sleeve).rotation.x=.3;
  for(let i=0;i<4;i++)box(.006+i*.035,-.16,.065,.027,.04,.1,glove);
  if(!pistol){box(-.05,-.12,-.35,.17,.14,.22,glove);box(-.13,-.22,-.21,.17,.2,.28,sleeve).rotation.z=-.35;}
  return g;
}

export function makeBot(index:number){
  const g=new T.Group(),surfaces=new SurfaceMaterials();g.userData.surfaces=surfaces;
  const suit=surfaces.get(index%2?0x896c5a:0x7f8066,"fabric"),armor=surfaces.get(0x424c40,"fabric");
  function part(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.22),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
  part(.54,.7,.32,0,1.06,0,suit);part(.57,.45,.13,0,1.16,.21,armor);
  const head=part(.34,.36,.34,0,1.63,0,armor);head.userData.head=true;
  const helmet=new T.Mesh(new T.SphereGeometry(.23,16,10,0,Math.PI*2,0,Math.PI*.65),suit);helmet.position.set(0,1.73,0);helmet.scale.z=.94;helmet.castShadow=true;helmet.userData.head=true;g.add(helmet);
  part(.33,.075,.065,0,1.67,.19,new T.MeshStandardMaterial({color:0xf09068,emissive:0x692c18,roughness:.22,metalness:.45})).userData.head=true;
  for(const x of [-.22,.22]){part(.09,.14,.13,x,1.65,0,armor).userData.head=true;part(.07,.58,.035,x,1.14,.275,armor);}
  const left=part(.2,.69,.24,-.16,.39,0,suit),right=part(.2,.69,.24,.16,.39,0,suit);
  for(const [leg,x] of [[left,-.16],[right,.16]] as const){
    const boot=part(.23,.22,.33,x,.15,.045,armor);boot.removeFromParent();boot.position.sub(leg.position);leg.add(boot);
    const knee=part(.2,.18,.065,x,.48,.14,armor);knee.removeFromParent();knee.position.sub(leg.position);leg.add(knee);
  }
  part(.18,.5,.22,-.38,1.08,.1,suit).rotation.x=-.7;part(.18,.5,.22,.38,1.08,.1,suit).rotation.x=-.7;
  part(.13,.13,.7,.19,1.18,.48,armor);
  for(const x of [-.18,0,.18]){part(.13,.19,.1,x,.99,.31,armor);part(.14,.035,.11,x,1.08,.32,suit);}
  part(.4,.42,.17,0,1.14,-.24,suit);part(.54,.1,.41,0,.79,0,armor);
  part(.035,.34,.035,-.23,1.52,-.25,armor);
  return {group:g,left,right};
}
