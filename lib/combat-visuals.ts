import * as T from "three";
import { graphicsPresets, type GraphicsQuality } from "./graphics-settings";
import type { MapId } from "./arsenal";

type Particle = { velocity: T.Vector3; age: number; life: number; size: number; smoke: boolean };

export class CombatVisuals {
  readonly particles: T.Points;
  readonly weather: T.Points;
  private capacity = 420;
  private cursor = 0;
  private data: (Particle | undefined)[] = Array(800);
  private positions = new Float32Array(800 * 3);
  private colors = new Float32Array(800 * 3);
  private sizes = new Float32Array(800);
  private opacity = new Float32Array(800);
  private flash = new T.PointLight(0xffbb68, 0, 9, 2);
  private flashTime = 0;
  private marks: T.Mesh[] = [];
  private map: MapId = "dockyard";
  private material: T.ShaderMaterial;

  constructor(private scene: T.Scene) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute("particleColor", new T.BufferAttribute(this.colors, 3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute("size", new T.BufferAttribute(this.sizes, 1).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute("alpha", new T.BufferAttribute(this.opacity, 1).setUsage(T.DynamicDrawUsage));
    this.material = new T.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { scale: { value: 500 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 particleColor;
        uniform float scale; varying float vAlpha; varying vec3 vColor;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vAlpha=alpha;vColor=particleColor;
        gl_PointSize=clamp(size*scale/max(.1,-p.z),1.0,160.0);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying float vAlpha; varying vec3 vColor;
        void main(){float d=length(gl_PointCoord-.5)*2.0;float a=(1.0-smoothstep(.15,1.0,d))*vAlpha;
        if(a<.01)discard;gl_FragColor=vec4(vColor,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.particles = new T.Points(geometry, this.material);
    this.particles.frustumCulled = false;
    this.particles.renderOrder = 2;
    const weatherPositions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      weatherPositions[i * 3] = ((i * 17.137) % 60) - 30;
      weatherPositions[i * 3 + 1] = .5 + (i * .713) % 22;
      weatherPositions[i * 3 + 2] = ((i * 23.371) % 60) - 30;
    }
    const weatherGeo = new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(weatherPositions, 3).setUsage(T.DynamicDrawUsage));
    this.weather = new T.Points(weatherGeo, new T.PointsMaterial({ color: 0xcac3a7, size: .035, transparent: true, opacity: .35, depthWrite: false }));
    this.weather.frustumCulled = false;
    scene.add(this.particles, this.weather, this.flash);
    this.setQuality("medium");
  }

  setQuality(quality: GraphicsQuality) {
    const preset = graphicsPresets[quality];
    this.capacity = preset.particles;
    this.clear();
    this.particles.geometry.setDrawRange(0, this.capacity);
    this.weather.geometry.setDrawRange(0, preset.weather);
  }

  setMap(map: MapId) {
    this.map = map;
    const material = this.weather.material as T.PointsMaterial;
    material.color.set(map === "relay" ? 0xf1f7fa : 0xd8c6a1);
    material.size = map === "relay" ? .075 : .035;
    material.opacity = map === "relay" ? .65 : .3;
  }

  resize(height: number, ratio: number) { this.material.uniforms.scale.value = height * ratio * .7; }

  private emit(at: T.Vector3, velocity: T.Vector3, color: number, size: number, life: number, smoke = false) {
    const i = this.cursor++ % this.capacity;
    this.data[i] = { velocity, age: 0, life, size, smoke };
    this.positions.set(at.toArray(), i * 3);
    this.colors.set(new T.Color(color).toArray(), i * 3);
    this.sizes[i] = size; this.opacity[i] = smoke ? .22 : .95;
  }

  muzzle(at: T.Vector3, direction: T.Vector3) {
    for (let i = 0; i < 5; i++) this.emit(at.clone().addScaledVector(direction, i * .05), direction.clone().multiplyScalar(2.5), i % 2 ? 0xff8e25 : 0xffe9a8, .13 - i * .015, .04 + i * .005);
    this.emit(at, new T.Vector3(0, .7, 0), 0x8c8a7d, .12, .45, true);
    this.flash.position.copy(at); this.flash.intensity = 4; this.flashTime = .05;
  }

  trail(at: T.Vector3, dt: number) {
    const count = Math.max(1, Math.ceil(dt * 70));
    for (let i = 0; i < count; i++) this.emit(at, new T.Vector3((Math.random() - .5) * .3, .3, (Math.random() - .5) * .3), i % 3 ? 0x8e918e : 0xffbd54, .16, .55, i % 3 !== 0);
  }

  impact(at: T.Vector3, normal: T.Vector3, flesh: boolean) {
    for (let i = 0; i < (this.capacity > 200 ? 12 : 5); i++) {
      const velocity = normal.clone().multiplyScalar(1 + Math.random() * 2).add(new T.Vector3(Math.random() - .5, Math.random(), Math.random() - .5));
      this.emit(at, velocity, flesh ? 0x8d8576 : i % 3 ? 0xc2bda5 : 0xffc975, .035 + Math.random() * .055, .18 + Math.random() * .25, i % 3 !== 0);
    }
    if (flesh) return;
    if (this.marks.length >= 48) this.removeMark(this.marks.shift()!);
    const mark = new T.Mesh(new T.CircleGeometry(.04 + Math.random() * .025, 9), new T.MeshBasicMaterial({ color: 0x292c29, transparent: true, opacity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    mark.position.copy(at).addScaledVector(normal, .008);
    mark.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
    this.scene.add(mark); this.marks.push(mark);
  }

  explosion(at: T.Vector3) {
    const count = this.capacity > 500 ? 100 : this.capacity > 200 ? 60 : 28;
    for (let i = 0; i < count; i++) {
      const direction = new T.Vector3(Math.random() - .5, Math.random() * .8, Math.random() - .5).normalize();
      const smoke = i > count * .35;
      this.emit(at.clone().addScaledVector(direction, .1), direction.multiplyScalar(smoke ? 1 + Math.random() * 2.8 : 3 + Math.random() * 8), smoke ? (i % 2 ? 0x676963 : 0x444a49) : (i % 2 ? 0xffb34c : 0xffecb8), smoke ? .6 + Math.random() * .8 : .08 + Math.random() * .45, smoke ? 1.8 + Math.random() * 1.3 : .2 + Math.random() * .5, smoke);
    }
    this.flash.position.copy(at); this.flash.intensity = 35; this.flash.distance = 16; this.flashTime = .18;
  }

  update(dt: number) {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (!p) continue;
      p.age += dt;
      if (p.age >= p.life) { this.opacity[i] = 0; this.data[i] = undefined; continue; }
      p.velocity.y += (p.smoke ? .8 : -5) * dt;
      p.velocity.multiplyScalar(Math.exp(-dt * (p.smoke ? .9 : .2)));
      this.positions[i * 3] += p.velocity.x * dt;
      this.positions[i * 3 + 1] += p.velocity.y * dt;
      this.positions[i * 3 + 2] += p.velocity.z * dt;
      this.sizes[i] = p.size * (p.smoke ? 1 + p.age * 1.3 : 1);
      this.opacity[i] = (p.smoke ? .3 : 1) * (1 - p.age / p.life);
    }
    for (const name of ["position", "size", "alpha", "particleColor"]) this.particles.geometry.getAttribute(name).needsUpdate = true;
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.flash.intensity *= Math.exp(-dt * 22);
    if (!this.flashTime) { this.flash.intensity = 0; this.flash.distance = 9; }
    const weather = this.weather.geometry.getAttribute("position") as T.BufferAttribute;
    for (let i = 0; i < this.weather.geometry.drawRange.count; i++) {
      let y = weather.getY(i) + dt * (this.map === "relay" ? -.85 : .08);
      if (y < .1) y = 22; else if (y > 22) y = .2;
      let x = weather.getX(i) + dt * .35; if (x > 30) x = -30;
      weather.setXYZ(i, x, y, weather.getZ(i));
    }
    weather.needsUpdate = true;
  }

  private removeMark(mark: T.Mesh) { mark.removeFromParent(); mark.geometry.dispose(); (mark.material as T.Material).dispose(); }
  clear() {
    this.data.fill(undefined); this.opacity.fill(0); this.cursor = 0;
    this.particles.geometry.getAttribute("alpha").needsUpdate = true;
    this.flash.intensity = 0; this.flashTime = 0;
    for (const mark of this.marks) this.removeMark(mark);
    this.marks = [];
  }
  dispose() {
    this.clear();
    this.particles.removeFromParent(); this.particles.geometry.dispose(); this.material.dispose();
    this.weather.removeFromParent(); this.weather.geometry.dispose(); (this.weather.material as T.Material).dispose(); this.flash.removeFromParent(); this.flash.dispose();
  }
}
