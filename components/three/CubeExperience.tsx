"use client";
import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center, Line } from "@react-three/drei";
import * as THREE from "three";
import CubeEffects, { BLOOM_LAYER } from "./CubeEffects";
import { useCubeInteraction } from "./CubeInteractionController";
import {
  CUBE_STATES,
  SECTIONS,
  stateWithInfluence,
  segmentationSupport,
  type CubeState,
} from "./cube-controller";
export type { CubeState } from "./cube-controller";
type Signal = ReturnType<typeof useCubeInteraction>;
function subscribeMedia(callback: () => void) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    mobile = matchMedia("(max-width: 700px)");
  reduced.addEventListener("change", callback);
  mobile.addEventListener("change", callback);
  return () => {
    reduced.removeEventListener("change", callback);
    mobile.removeEventListener("change", callback);
  };
}
const serverMode = () => 0;
function browserMode() {
  return (
    (matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0) +
    (matchMedia("(max-width: 700px)").matches ? 2 : 0) +
    (navigator.hardwareConcurrency <= 2 ? 4 : 0)
  );
}
class Boundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function MainCube({
  state,
  reduced,
  signal,
  onLoaded,
  modelUrl,
}: {
  state: CubeState;
  reduced: boolean;
  signal: Signal;
  onLoaded: () => void;
  modelUrl: string;
}) {
  const gltf = useGLTF(modelUrl);
  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = (o.material as THREE.MeshStandardMaterial).clone();
        const m = o.material as THREE.MeshStandardMaterial;
        m.metalness = 0.35;
        m.roughness = 0.45;
        m.emissive.set("#69adff");
        m.emissiveMap = m.map;
        m.emissiveIntensity = 0.85;
        o.layers.enable(BLOOM_LAYER);
      }
    });
    return scene;
  }, [gltf.scene]);
  useEffect(() => {
    const names: string[] = [];
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) names.push(o.name);
    });
    Object.assign(model.userData, { segmentation: segmentationSupport(names) });
    onLoaded();
    return () => {
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
      });
    };
  }, [model, onLoaded]);
  const group = useRef<THREE.Group>(null),
    angle = useRef(0.5),
    speed = useRef(0),
    influence = useRef(0),
    hoverOffset = useRef(0);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const d = Math.min(delta, 0.05),
      input = signal.current;
    influence.current = THREE.MathUtils.damp(
      influence.current,
      reduced ? 0 : input.influence,
      4,
      d,
    );
    const config = stateWithInfluence(state, influence.current),
      a = SECTIONS[reduced ? "hero" : input.section.from],
      b = SECTIONS[reduced ? "hero" : input.section.to],
      mix = reduced ? 0 : input.section.mix;
    speed.current = THREE.MathUtils.damp(
      speed.current,
      reduced ? 0 : config.rotation,
      4,
      d,
    );
    angle.current += speed.current * d;
    hoverOffset.current = THREE.MathUtils.damp(
      hoverOffset.current,
      input.x * influence.current * 0.104,
      4,
      d,
    );
    group.current.rotation.y =
      angle.current +
      hoverOffset.current +
      THREE.MathUtils.lerp(a.rotation[1], b.rotation[1], mix);
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      (reduced ? 0 : input.y * influence.current * 0.07) +
        THREE.MathUtils.lerp(a.rotation[0], b.rotation[0], mix),
      4,
      d,
    );
    group.current.position.x = THREE.MathUtils.damp(
      group.current.position.x,
      THREE.MathUtils.lerp(a.position[0], b.position[0], mix),
      3,
      d,
    );
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      THREE.MathUtils.lerp(a.position[1], b.position[1], mix) +
        (reduced ? 0 : Math.sin(clock.elapsedTime * 0.7) * 0.05),
      4,
      d,
    );
    group.current.scale.setScalar(
      THREE.MathUtils.damp(
        group.current.scale.x,
        config.scale * THREE.MathUtils.lerp(a.scale, b.scale, mix),
        4,
        d,
      ),
    );
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const material = o.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = THREE.MathUtils.damp(
          material.emissiveIntensity,
          config.emission *
            (state === "PROCESSING" && !reduced
              ? 1 + Math.sin(clock.elapsedTime * 2) * 0.06
              : 1),
          4,
          d,
        );
      }
    });
  });
  return (
    <group ref={group}>
      <Center>
        <primitive object={model} scale={3.1} dispose={null} />
      </Center>
    </group>
  );
}
const satellites = Array.from({ length: 12 }, (_, i) => ({
  phase: i * 2.399,
  radius: 2.2 + (i % 3) * 0.24,
  speed: 0.1 + (i % 4) * 0.025,
  size: 0.065 + (i % 3) * 0.03,
  incline: Math.sin(i * 7) * 0.7,
}));
function Satellite({
  index,
  state,
  reduced,
  signal,
}: {
  index: number;
  state: CubeState;
  reduced: boolean;
  signal: Signal;
}) {
  const spec = satellites[index],
    mesh = useRef<THREE.Mesh>(null),
    trail = useRef<THREE.Line>(null),
    t = useRef(0),
    radius = useRef(1),
    velocity = useRef(1),
    opacity = useRef(0.008);
  const resources = useMemo(() => {
    const box = new THREE.BoxGeometry(spec.size, spec.size, spec.size),
      edge = new THREE.EdgesGeometry(box),
      geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(12 * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: "#009dff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return {
      box,
      edge,
      geometry,
      material,
      line: new THREE.Line(geometry, material),
    };
  }, [spec]);
  useEffect(
    () => () => {
      resources.box.dispose();
      resources.edge.dispose();
      resources.geometry.dispose();
      resources.material.dispose();
    },
    [resources],
  );
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const d = Math.min(delta, 0.05),
      config = stateWithInfluence(state, signal.current.influence);
    velocity.current = THREE.MathUtils.damp(
      velocity.current,
      config.orbitSpeed,
      3,
      d,
    );
    radius.current = THREE.MathUtils.damp(radius.current, config.radius, 3, d);
    t.current += reduced ? 0 : d * velocity.current;
    const a = spec.phase + t.current * spec.speed,
      r = spec.radius * radius.current;
    const alignment = state === "RESULT" && index < 3 ? 0.1 : 0;
    mesh.current.position.set(
      Math.cos(a) * r +
        (reduced ? 0 : signal.current.x * signal.current.influence * 0.025),
      Math.sin(a * 1.2) * 1.45 + spec.incline + alignment,
      Math.sin(a) * r * 0.55,
    );
    mesh.current.rotation.set(a, a * 0.8, a * 0.3);
    opacity.current = reduced
      ? 0
      : THREE.MathUtils.damp(opacity.current, config.trail, 2.4, d);
    const live = trail.current;
    if (!live) return;
    (live.material as THREE.LineBasicMaterial).opacity = opacity.current;
    const attr = live.geometry.getAttribute("position");
    for (let j = 0; j < 12; j++) {
      const p = a - j * 0.013 * velocity.current;
      attr.setXYZ(
        j,
        Math.cos(p) * r,
        Math.sin(p * 1.2) * 1.45 + spec.incline + alignment,
        Math.sin(p) * r * 0.55,
      );
    }
    attr.needsUpdate = true;
    live.geometry.computeBoundingSphere();
  });
  return (
    <>
      <mesh
        ref={mesh}
        geometry={resources.box}
        onUpdate={(o) => o.layers.enable(BLOOM_LAYER)}
      >
        <meshStandardMaterial
          color="#009cff"
          emissive="#27aaff"
          emissiveIntensity={state === "PROCESSING" ? 2.2 : 1.25}
          metalness={0.65}
          roughness={0.18}
        />
        <lineSegments geometry={resources.edge}>
          <lineBasicMaterial color="#7dedff" />
        </lineSegments>
      </mesh>
      <primitive ref={trail} object={resources.line} />
    </>
  );
}
const ring = Array.from(
  { length: 97 },
  (_, i) =>
    new THREE.Vector3(
      Math.cos((i / 96) * Math.PI * 2) * 2.6,
      Math.sin((i / 96) * Math.PI * 2) * 2.6,
      0,
    ),
);
function OrbitalRings({
  state,
  reduced,
}: {
  state: CubeState;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current && !reduced)
      ref.current.rotation.z += Math.min(delta, 0.05) * 0.008;
  });
  return (
    <group ref={ref} rotation={[1.12, 0.3, -0.25]}>
      <Line
        points={ring}
        color="#008bdb"
        transparent
        opacity={CUBE_STATES[state].ring}
        lineWidth={0.7}
      />
      <group rotation={[0.65, 0.6, 0.8]}>
        <Line
          points={ring}
          color="#00caff"
          transparent
          opacity={0.2}
          lineWidth={0.7}
        />
      </group>
    </group>
  );
}
const positions = new Float32Array(
  Array.from({ length: 120 * 3 }, (_, i) => Math.sin(i * 127.1 + 31.7) * 5),
);
function ParticleField({
  mobile,
  state,
  reduced,
}: {
  mobile: boolean;
  state: CubeState;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(
    () => positions.slice(0, (mobile ? 40 : 120) * 3),
    [mobile],
  );
  useFrame((_, delta) => {
    if (!ref.current) return;
    const d = Math.min(delta, 0.05);
    ref.current.scale.setScalar(
      THREE.MathUtils.damp(
        ref.current.scale.x,
        state === "PROCESSING" && !reduced ? 0.84 : 1,
        2,
        d,
      ),
    );
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#009dff"
        size={0.016}
        transparent
        opacity={CUBE_STATES[state].particle}
        sizeAttenuation
      />
    </points>
  );
}
function CameraController({
  signal,
  reduced,
}: {
  signal: Signal;
  reduced: boolean;
}) {
  const target = useRef(new THREE.Vector3());
  useFrame(({ camera }, delta) => {
    const s = signal.current,
      a = SECTIONS[reduced ? "hero" : s.section.from],
      b = SECTIONS[reduced ? "hero" : s.section.to],
      d = Math.min(delta, 0.05),
      mix = reduced ? 0 : s.section.mix;
    for (let i = 0; i < 3; i++) {
      const axis = (["x", "y", "z"] as const)[i];
      const offset =
        !reduced && i < 2 ? (i === 0 ? s.x : s.y) * s.influence * 0.06 : 0;
      camera.position[axis] = THREE.MathUtils.damp(
        camera.position[axis],
        THREE.MathUtils.lerp(a.camera[i], b.camera[i], mix) + offset,
        2.5,
        d,
      );
      target.current[axis] = THREE.MathUtils.damp(
        target.current[axis],
        THREE.MathUtils.lerp(a.target[i], b.target[i], mix),
        2.5,
        d,
      );
    }
    camera.lookAt(target.current);
  });
  return null;
}
function ContextMonitor({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onFailure);
    return () => canvas.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  return null;
}
function FrameScheduler({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    if (!active) return;
    const id = window.setInterval(invalidate, 1000 / 30);
    return () => window.clearInterval(id);
  }, [active, invalidate]);
  return null;
}
function Visibility({
  container,
  onVisibility,
}: {
  container: RefObject<HTMLDivElement | null>;
  onVisibility: (v: boolean) => void;
}) {
  useEffect(() => {
    let intersecting = false;
    const update = () => onVisibility(intersecting && !document.hidden);
    const observer = new IntersectionObserver(
      ([e]) => {
        intersecting = e.isIntersecting;
        update();
      },
      { rootMargin: "80px" },
    );
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [container, onVisibility]);
  return null;
}
export default function CubeExperience({
  state,
  final = false,
  forceFallback = false,
  reducedMotion,
  modelUrl = "/models/cube.glb",
}: {
  state: CubeState;
  final?: boolean;
  forceFallback?: boolean;
  reducedMotion?: boolean;
  modelUrl?: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false),
    [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false),
    mode = useSyncExternalStore(subscribeMedia, browserMode, serverMode),
    reduced = reducedMotion ?? !!(mode & 1),
    mobile = !!(mode & 2),
    weak = !!(mode & 4),
    signal = useCubeInteraction(final);
  const onLoaded = useCallback(() => setLoaded(true), []),
    onFailure = useCallback(() => {
      setFailed(true);
      setLoaded(false);
    }, []);
  return (
    <div
      ref={container}
      className={`canvas-wrap ${loaded && !failed && !forceFallback ? "model-loaded" : ""}`}
      data-cube-state={state}
      data-motion={reduced ? "reduced" : "full"}
      data-webgl={
        failed || forceFallback ? "fallback" : loaded ? "ready" : "loading"
      }
      aria-label="Animated holographic cube"
    >
      <Visibility container={container} onVisibility={setVisible} />
      {!failed && !forceFallback && visible && (
        <Boundary onFailure={onFailure}>
          <Canvas
            dpr={[1, mobile ? 1.2 : 1.6]}
            camera={{ position: [0, 1.7, 7.4], fov: 43 }}
            gl={{
              alpha: true,
              antialias: !mobile,
              powerPreference: "low-power",
            }}
            frameloop="demand"
            fallback={<span className="sr-only">Static cube illustration</span>}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <ContextMonitor onFailure={onFailure} />
            <FrameScheduler active={visible && !reduced} />
            <CameraController signal={signal} reduced={reduced} />
            <Suspense fallback={null}>
              <ambientLight
                intensity={1.2}
                onUpdate={(o) => o.layers.enable(BLOOM_LAYER)}
              />
              <directionalLight
                position={[3, 5, 4]}
                intensity={3}
                color="#d6f4ff"
                onUpdate={(o) => o.layers.enable(BLOOM_LAYER)}
              />
              <pointLight
                position={[-3, 1, 3]}
                color="#008cff"
                intensity={20}
                onUpdate={(o) => o.layers.enable(BLOOM_LAYER)}
              />
              <pointLight
                position={[2, -2, 2]}
                color="#006dff"
                intensity={12}
                onUpdate={(o) => o.layers.enable(BLOOM_LAYER)}
              />
              <MainCube
                state={state}
                reduced={reduced}
                signal={signal}
                onLoaded={onLoaded}
                modelUrl={modelUrl}
              />
              {satellites.slice(0, mobile || weak ? 6 : 12).map((_, i) => (
                <Satellite
                  key={i}
                  index={i}
                  state={state}
                  reduced={reduced}
                  signal={signal}
                />
              ))}
              <OrbitalRings state={state} reduced={reduced} />
              <ParticleField
                mobile={mobile || reduced || weak}
                state={state}
                reduced={reduced}
              />
            </Suspense>
            {!weak && (
              <CubeEffects state={state} mobile={mobile} reduced={reduced} />
            )}
          </Canvas>
        </Boundary>
      )}
    </div>
  );
}
