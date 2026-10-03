import * as T from "three";

export class WebGLUnavailableError extends Error {
  constructor(cause:unknown){
    super("WebGL 2 ist nicht verfuegbar. STRIKEPOINT kann die 3D-Grafik nicht starten.",{cause});
    this.name="WebGLUnavailableError";
  }
}

export function createShooterRenderer(){
  // Let the browser choose the GPU; retry without MSAA or optional buffers.
  const profiles:T.WebGLRendererParameters[]=[
    {antialias:true,powerPreference:"default"},
    {antialias:false,powerPreference:"default",alpha:false,stencil:false,depth:true,preserveDrawingBuffer:false},
  ];
  let cause:unknown;
  for(let i=0;i<profiles.length;i++){
    try{return {renderer:new T.WebGLRenderer(profiles[i]),reduced:i>0};}
    catch(error){cause=error;}
  }
  throw new WebGLUnavailableError(cause);
}
