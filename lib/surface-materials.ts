import * as T from "three";

export type Surface = "concrete" | "metal" | "wood" | "asphalt" | "fabric";

function textureCanvas(surface: Surface) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  let seed = 719;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = surface === "metal" ? "#c2c5c3" : "#bababa";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const v = Math.floor(90 + random() * 145);
    ctx.fillStyle = `rgba(${v},${v},${v},${surface === "asphalt" ? .65 : .32})`;
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 4, 1 + random() * 3);
  }
  if (surface === "metal") {
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = i % 3 ? "#493e2b33" : "#ffffff55";
      ctx.fillRect(random() * 512, random() * 512, random() * 45 + 3, 1);
    }
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = "#81583b55";
      ctx.fillRect(random() * 512, random() * 512, 3 + random() * 13, 1 + random() * 20);
    }
  } else if (surface === "wood") {
    for (let i = 0; i < 170; i++) {
      ctx.fillStyle = i % 2 ? "#473c2633" : "#eeeadc33";
      ctx.fillRect(random() * 512, random() * 512, 1 + random() * 3, 80 + random() * 200);
    }
    ctx.fillStyle = "#372e2855";
    for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 2, 512);
  } else if (surface === "concrete" || surface === "asphalt") {
    ctx.strokeStyle = "#31353c66";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      let x = random() * 512, y = random() * 512;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 9; j++) { x += (random() - .5) * 36; y += random() * 16; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = i % 3 ? "#43524855" : "#ddddcc66";
      ctx.fillRect(random() * 512, random() * 512, 12 + random() * 34, 8 + random() * 22);
    }
    ctx.fillStyle = "#ffffff22";
    for (let i = 0; i < 512; i += 4) { ctx.fillRect(i, 0, 1, 512); ctx.fillRect(0, i, 512, 1); }
  }
  return canvas;
}

export class SurfaceMaterials {
  private sources = new Map<Surface, HTMLCanvasElement>();
  readonly textures = new Set<T.Texture>();
  private tiles = new Map<string,{map:T.CanvasTexture;bump:T.Texture}>();
  private materials = new Map<string, T.MeshStandardMaterial>();

  get(color: string | number, surface: Surface, span = 4) {
    const scale = Math.max(1, Math.round(span / 4));
    const key = `${color}:${surface}:${scale}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    let canvas = this.sources.get(surface);
    if (!canvas) { canvas = textureCanvas(surface); this.sources.set(surface, canvas); }
    const tileKey=`${surface}:${scale}`;
    let tile=this.tiles.get(tileKey);
    if(!tile){
      const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(scale,scale);map.colorSpace=T.SRGBColorSpace;
      const bump=map.clone();bump.colorSpace=T.NoColorSpace;
      map.userData.surfaceManaged=bump.userData.surfaceManaged=true;
      this.textures.add(map);this.textures.add(bump);tile={map,bump};this.tiles.set(tileKey,tile);
    }
    const {map,bump}=tile;
    const material = new T.MeshStandardMaterial({
      color, map, bumpMap: bump, bumpScale: surface === "metal" ? .012 : .035,
      roughness: surface === "metal" ? .48 : surface === "fabric" ? 1 : .92,
      metalness: surface === "metal" ? .45 : 0,
    });
    material.userData.surfaceManaged = true;
    this.materials.set(key, material);
    return material;
  }

  setAnisotropy(value: number) {
    for (const texture of this.textures) {
      if (texture.anisotropy !== value) { texture.anisotropy = value; texture.needsUpdate = true; }
    }
  }

  dispose() {
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.textures.clear(); this.materials.clear(); this.sources.clear(); this.tiles.clear();
  }
}

export function makeSky(dock: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, dock ? "#627d8e" : "#658ba4");
  sky.addColorStop(.48, dock ? "#e2d2b4" : "#dae8ed");
  sky.addColorStop(.6, dock ? "#aaa99c" : "#acbcc4");
  sky.addColorStop(1, "#647373");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 38; i++) {
    ctx.fillStyle = `rgba(245,248,246,${.04 + (i % 3) * .035})`;
    ctx.beginPath(); ctx.ellipse((i * 137) % 1024, 70 + (i * 31) % 145, 70 + (i % 4) * 26, 8 + (i % 3) * 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.mapping = T.EquirectangularReflectionMapping;
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
