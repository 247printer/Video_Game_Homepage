import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { graphicsPresets, type GraphicsQuality } from "./graphics-settings";

export class GraphicsPipeline {
  private composer: EffectComposer | null = null;
  private aa: ShaderPass | null = null;
  private width = 1;
  private height = 1;
  private quality: GraphicsQuality = "low";
  private suspended = false;

  constructor(private renderer: T.WebGLRenderer, private scene: T.Scene, private camera: T.PerspectiveCamera) {}

  setQuality(quality: GraphicsQuality) {
    if (this.quality === quality && (quality === "low" || this.composer)) return;
    this.dispose();
    this.quality = quality;
    this.suspended = false;
    if (quality === "low") return;
    const preset = graphicsPresets[quality];
    // Byte targets also work on GPUs without floating-point color attachments.
    const target = new T.WebGLRenderTarget(1, 1, { type: T.UnsignedByteType });
    const composer = this.composer = new EffectComposer(this.renderer, target);
    composer.addPass(new RenderPass(this.scene, this.camera));
    if (preset.ao) {
      const ao = new SSAOPass(this.scene, this.camera, 1, 1, 16);
      ao.kernelRadius = 1.8;
      ao.minDistance = .001;
      ao.maxDistance = .035;
      for(const buffer of [ao.normalRenderTarget,ao.ssaoRenderTarget,ao.blurRenderTarget])buffer.texture.type=T.UnsignedByteType;
      composer.addPass(ao);
    }
    const bloom=new UnrealBloomPass(new T.Vector2(1, 1), quality === "high" ? .22 : .14, .35, .85);
    for(const buffer of [bloom.renderTargetBright,...bloom.renderTargetsHorizontal,...bloom.renderTargetsVertical])buffer.texture.type=T.UnsignedByteType;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass({
      uniforms:{tDiffuse:{value:null}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
        void main(){vec4 c=texture2D(tDiffuse,vUv);float grey=dot(c.rgb,vec3(.299,.587,.114));
        c.rgb=mix(vec3(grey),c.rgb,.94);c.rgb=(c.rgb-.5)*1.035+.5;
        vec2 edge=vUv*(1.0-vUv);float vignette=pow(clamp(16.0*edge.x*edge.y,0.0,1.0),.09);
        gl_FragColor=vec4(c.rgb*mix(.88,1.0,vignette),c.a);}`,
    }));
    this.aa = new ShaderPass(FXAAShader);
    composer.addPass(this.aa);
    this.resize(this.width, this.height);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const ratio = this.renderer.getPixelRatio();
    this.composer?.setPixelRatio(ratio);
    this.composer?.setSize(this.width, this.height);
    this.aa?.uniforms.resolution.value.set(1 / (this.width * ratio), 1 / (this.height * ratio));
  }

  render(dt: number) {
    if (!this.composer || this.suspended) { this.renderer.render(this.scene, this.camera); return; }
    try { this.composer.render(dt); }
    catch (error) {
      console.warn("Postprocessing unavailable; using direct rendering.", error);
      this.dispose();
      this.suspended = true;
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.composer) {
      for (const pass of this.composer.passes) pass.dispose();
      this.composer.dispose();
    }
    this.composer = null;
    this.aa = null;
  }
}
