import * as T from "three";

type Target = {object:T.Object3D;x:number;y:number;scale:number};

// Canvas 2D keeps the same simulation and scoring usable without a GPU context.
export class ParkCanvasRenderer {
  readonly domElement=document.createElement("canvas");
  private context:CanvasRenderingContext2D;
  private width=1;private height=1;private ratio=1;private targets:Target[]=[];
  constructor(){const context=this.domElement.getContext("2d");if(!context)throw new Error("Canvas 2D ist in diesem Browser nicht verfuegbar.");this.context=context;this.domElement.dataset.renderer="canvas2d";}
  setPixelRatio(ratio:number){this.ratio=ratio;}
  setSize(width:number,height:number){this.width=Math.max(1,width);this.height=Math.max(1,height);this.domElement.width=Math.round(this.width*this.ratio);this.domElement.height=Math.round(this.height*this.ratio);this.domElement.style.width=`${this.width}px`;this.domElement.style.height=`${this.height}px`;}
  private project(point:T.Vector3,camera:T.Camera){const p=point.clone().project(camera);return {x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2};}
  hitTest(clientX:number,clientY:number){
    const rect=this.domElement.getBoundingClientRect(),x=(clientX-rect.left)*this.width/rect.width,y=(clientY-rect.top)*this.height/rect.height;
    for(let i=this.targets.length-1;i>=0;i--){const t=this.targets[i];if(!t.object.visible)continue;const px=(x-t.x)/t.scale,py=(t.y-y)/t.scale;
      if(Math.abs(px)<1.5&&py>.03&&py<3.4)return {object:t.object,point:t.object.position.clone().add(new T.Vector3(0,2,0))};
    }
    return undefined;
  }
  private ellipse(x:number,y:number,rx:number,ry:number,color:string){const c=this.context;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  private line(points:number[][],color:string,width:number){const c=this.context;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  private cyclist(target:Target){
    const {object,x,y,scale}=target,c=this.context,index=object.userData.rider as number,direction=Math.cos(object.rotation.y)>0?1:-1;
    c.save();c.translate(x,y);c.scale(scale*direction,scale);c.lineCap="round";c.lineJoin="round";
    this.ellipse(0,.03,1.6,.15,"#40754c33");
    const spin=object.children[0]?.rotation.z??0;
    for(const wx of [-.85,.85]){this.ellipse(wx,-.62,.58,.58,"#233d43");this.ellipse(wx,-.62,.47,.47,"#e2eee0");this.ellipse(wx,-.62,.42,.42,"#a1cfb4");for(let i=0;i<8;i++){const a=i*Math.PI/4+spin;this.line([[wx,-.62],[wx+Math.sin(a)*.44,-.62+Math.cos(a)*.44]],"#547f7f",.02);}}
    const frame=["#26a7a6","#b090dc","#e7c253"][index%3];
    this.line([[-.85,-.62],[-.3,-1.4],[0,-.68],[-.85,-.62]],frame,.07);this.line([[-.3,-1.4],[.6,-1.4],[0,-.68]],frame,.07);this.line([[.85,-.62],[.55,-1.85],[.75,-1.85]],frame,.07);
    c.fillStyle="#253b43";c.fillRect(-.16,-1.25,.24,.55);c.fillRect(-.55,-1.52,.45,.1);
    const skin=["#e7ad87","#9a6248","#f4cba5"][index%3],pink=["#f3429b","#fb75b2","#d82779"][index%3];
    const knee=Math.sin(spin*3)*.16;
    this.line([[-.2,-1.4],[.25+knee,-.8],[-.1,-.5]],skin,.22);this.line([[-.1,-.5],[.18,-.5]],"#f4ead9",.15);
    c.fillStyle=pink;c.beginPath();c.moveTo(-.75,-2);c.lineTo(.22,-2);c.lineTo(.51,-1.17);c.quadraticCurveTo(-.28,-.94,-1.02,-1.17);c.closePath();c.fill();
    this.ellipse(-.28,-2.09,.66,.72,pink);this.line([[-.68,-2.3],[.1,-1.99],[.55,-1.85]],skin,.2);
    this.ellipse(-.24,-2.8,.34,.38,skin);this.ellipse(.065,-2.8,.12,.09,skin);this.ellipse(-.45,-2.92,.23,.25,"#764b38");
    this.ellipse(-.25,-3.08,.4,.2,"#f6f0db");this.line([[-.54,-3.08],[.16,-3.08]],"#36a9ac",.07);this.ellipse(-.02,-2.88,.04,.045,"#243b43");
    this.line([[-.02,-2.66],[.08,-2.65]],"#863c53",.025);
    for(let i=0;i<5;i++)this.ellipse(-.8+i*.23,-1.22,.038,.04,"#fff2df");
    c.restore();
  }
  render(scene:T.Scene,camera:T.Camera){
    camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);const c=this.context,w=this.width,h=this.height;
    c.setTransform(this.ratio,0,0,this.ratio,0,0);c.fillStyle="#8fdaea";c.fillRect(0,0,w,h);
    const horizon=h*.34;c.fillStyle="#8dbd72";c.fillRect(0,horizon,w,h-horizon);
    for(let i=0;i<7;i++)this.ellipse(i*w/5,horizon,w*.2,h*.12,i%2?"#a9cd81":"#94c37d");
    for(let i=0;i<15;i++){const x=(i+.3)*w/14,y=horizon+Math.sin(i*7)*h*.03;c.fillStyle="#886944";c.fillRect(x-4,y-55,8,72);this.ellipse(x,y-70,30+i%3*7,43,i%2?"#438f65":"#61a568");this.ellipse(x+18,y-52,24,29,"#78b56b");}
    for(const z of [-6,0,6]){const back=this.project(new T.Vector3(0,0,z-1.45),camera).y,front=this.project(new T.Vector3(0,0,z+1.45),camera).y;c.fillStyle="#eee3c8";c.fillRect(0,back,w,front-back);c.fillStyle="#d5c9ac";c.fillRect(0,back+3,w,front-back-6);c.setLineDash([20,24]);this.line([[0,(back+front)/2],[w,(back+front)/2]],"#fff7e6",2);c.setLineDash([]);}
    for(let i=0;i<36;i++){const x=(i*97)%w,y=horizon+20+(i*43)%Math.max(1,h-horizon-20);if(i%3===0){c.fillStyle="#6f9c59";c.fillRect(x,y,2,10);this.ellipse(x+1,y,3,3,["#ec8fb6","#f7dc62","#fff0d6"][i%3]);}}
    this.targets=[];
    const riders=scene.children.filter(o=>typeof o.userData.rider==="number"&&o.visible).sort((a,b)=>a.position.z-b.position.z);
    for(const object of riders){const base=this.project(object.position,camera),top=this.project(object.position.clone().add(new T.Vector3(0,3.4,0)),camera);const scale=(base.y-top.y)/3.4;const t={object,x:base.x,y:base.y,scale};this.targets.push(t);this.cyclist(t);}
    for(const object of scene.children){
      if(object.userData.renderKind==="schnitzel"){const p=this.project(object.position,camera),edge=this.project(object.position.clone().add(new T.Vector3(.55,0,0)),camera),size=Math.min(80,Math.max(8,Math.abs(edge.x-p.x)));c.save();c.translate(p.x,p.y);c.rotate(object.rotation.z);this.ellipse(0,0,size,size*.62,"#d49637");for(let i=0;i<14;i++)this.ellipse(Math.sin(i*2.4)*size*.7,Math.cos(i*1.7)*size*.4,2,2,i%2?"#f2cb72":"#9d6826");this.ellipse(size*.4,-size*.3,size*.22,size*.15,"#f4dc58");c.restore();}
      if(object.userData.renderKind==="confetti")object.children.forEach((particle,i)=>{const p=this.project(particle.getWorldPosition(new T.Vector3()),camera);c.fillStyle=["#ff64ac","#ffec7f","#65d9d1"][i%3];c.fillRect(p.x,p.y,5,5);});
    }
  }
  dispose(){this.targets=[];this.domElement.width=1;this.domElement.height=1;}
}

export function createParkRenderer(force2d=false){
  if(!force2d){try{const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.domElement.dataset.renderer="webgl";renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;return renderer;}catch(error){console.warn("Pink Pedal: WebGL unavailable; using Canvas 2D.",error);}}
  return new ParkCanvasRenderer();
}
