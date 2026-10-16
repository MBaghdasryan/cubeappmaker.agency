"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, Vector2, MathUtils } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CUBE_STATES, type CubeState } from "./cube-controller";
export const BLOOM_LAYER = 1;
export default function CubeEffects({
  state,
  mobile,
  reduced,
}: {
  state: CubeState;
  mobile: boolean;
  reduced: boolean;
}) {
  const { gl, scene, camera, size } = useThree(),
    failed = useRef(false);
  const passes = useMemo(() => {
    const bloomComposer = new EffectComposer(gl);
    bloomComposer.renderToScreen = false;
    const renderBloom = new RenderPass(scene, camera),
      bloom = new UnrealBloomPass(new Vector2(256, 256), 0.18, 0.3, 1.1);
    bloomComposer.addPass(renderBloom);
    bloomComposer.addPass(bloom);
    const composer = new EffectComposer(gl),
      renderBase = new RenderPass(scene, camera);
    const material = new ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloom.renderTargetsHorizontal[0].texture },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform sampler2D baseTexture;uniform sampler2D bloomTexture;varying vec2 vUv;void main(){vec4 b=texture2D(baseTexture,vUv);vec3 g=texture2D(bloomTexture,vUv).rgb;gl_FragColor=vec4(b.rgb+g,max(b.a,clamp(max(max(g.r,g.g),g.b),0.,1.)));}",
    });
    const mix = new ShaderPass(material, "baseTexture"),
      output = new OutputPass();
    composer.addPass(renderBase);
    composer.addPass(mix);
    composer.addPass(output);
    return {
      bloomComposer,
      bloom,
      composer,
      renderBloom,
      renderBase,
      mix,
      output,
      material,
    };
  }, [gl, scene, camera]);
  const runtime = useRef<typeof passes | null>(null);
  useEffect(() => {
    runtime.current = passes;
    return () => {
      runtime.current = null;
    };
  }, [passes]);
  useEffect(() => {
    const ratio = Math.min(gl.getPixelRatio(), mobile ? 1 : 1.35);
    passes.composer.setPixelRatio(ratio);
    passes.composer.setSize(size.width, size.height);
    passes.bloomComposer.setPixelRatio(ratio * 0.5);
    passes.bloomComposer.setSize(size.width, size.height);
  }, [passes, size, gl, mobile]);
  useEffect(
    () => () => {
      passes.bloom.dispose();
      passes.renderBloom.dispose();
      passes.renderBase.dispose();
      passes.mix.dispose();
      passes.output.dispose();
      passes.material.dispose();
      passes.bloomComposer.dispose();
      passes.composer.dispose();
    },
    [passes],
  );
  useFrame(({ camera, gl, scene }, delta) => {
    const current = runtime.current;
    if (!current) {
      gl.render(scene, camera);
      return;
    }
    if (failed.current) {
      gl.render(scene, camera);
      return;
    }
    const mask = camera.layers.mask;
    try {
      current.bloom.strength = MathUtils.damp(
        current.bloom.strength,
        CUBE_STATES[state].bloom * (mobile ? 0.65 : 1) * (reduced ? 0.5 : 1),
        3,
        Math.min(delta, 0.05),
      );
      camera.layers.set(BLOOM_LAYER);
      current.bloomComposer.render(delta);
      camera.layers.mask = mask;
      current.composer.render(delta);
    } catch {
      failed.current = true;
      camera.layers.mask = mask;
      gl.setRenderTarget(null);
      gl.render(scene, camera);
    } finally {
      camera.layers.mask = mask;
    }
  }, 1);
  return null;
}
