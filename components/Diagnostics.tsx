"use client";
import Link from "@/components/SiteLink";
import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import SalesAssistant from "./SalesAssistant";
import { sound, SOUND_NAMES } from "@/lib/sound";
import { CUBE_STATES, SECTIONS, type CubeState } from "./three/cube-controller";
const Cube = lazy(() => import("./three/CubeExperience"));
const subscribe = () => () => {};
const failAI: typeof fetch = async (input) =>
  String(input) === "/api/status"
    ? Response.json({ ai: true, crm: false })
    : Response.json({ error: "Injected AI failure" }, { status: 503 });
const failCRM: typeof fetch = async (input) => {
  if (String(input) === "/api/status")
    return Response.json({ ai: false, crm: true });
  if (String(input) === "/api/recommend")
    return Response.json({
      mode: "guided",
      summary: "Local regression fixture. No external data sent.",
      components: ["AI Agent", "Knowledge Base"],
    });
  return Response.json(
    { error: "Injected CRM failure. Your brief is preserved." },
    { status: 502 },
  );
};
export default function Diagnostics() {
  const mounted = useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    ),
    [state, setState] = useState<CubeState>("IDLE"),
    [fallback, setFallback] = useState(false),
    [reduced, setReduced] = useState(false),
    [missing, setMissing] = useState(false),
    [generation, setGeneration] = useState(0),
    [chat, setChat] = useState<"ai" | "crm" | null>(null),
    [audio, setAudio] = useState("Not enabled"),
    [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const listener = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setLog((old) => [
        ...old.slice(-24),
        `${d.name}: ${d.phase} (${d.mode}, ${d.context})`,
      ]);
    };
    window.addEventListener("cube:audio", listener);
    return () => window.removeEventListener("cube:audio", listener);
  }, []);
  return (
    <main className="route-page">
      <h1 style={{ fontSize: 32, marginTop: 20 }}>
        Local regression diagnostics
      </h1>
      <p>
        No external submissions. These controls exercise production components
        with explicit fault injection.
      </p>
      <div className="chat-actions">
        {Object.keys(CUBE_STATES).map((s) => (
          <button
            className="primary"
            key={s}
            onClick={() => setState(s as CubeState)}
          >
            {s}
          </button>
        ))}
        <button className="primary" onClick={() => setFallback((v) => !v)}>
          Toggle WebGL fallback
        </button>
        <button className="primary" onClick={() => setReduced((v) => !v)}>
          Toggle reduced motion
        </button>
        <button className="primary" onClick={() => setMissing((v) => !v)}>
          Toggle GLB load failure
        </button>
        <button
          className="primary"
          onClick={() => {
            const canvas = document.querySelector("canvas");
            const gl = canvas?.getContext("webgl2");
            gl?.getExtension("WEBGL_lose_context")?.loseContext();
          }}
        >
          Lose WebGL context
        </button>
        <button className="primary" onClick={() => setGeneration((v) => v + 1)}>
          Remount renderer
        </button>
      </div>
      <div
        className="cube-stage"
        style={{
          position: "relative",
          inset: "auto",
          height: 360,
          width: 500,
          maxWidth: "100%",
        }}
      >
        <div className="cube-fallback" />
        {mounted && (
          <Suspense fallback={null}>
            <Cube
              key={`${missing}-${generation}`}
              state={state}
              forceFallback={fallback}
              reducedMotion={reduced}
              modelUrl={
                missing ? "/models/regression-missing.glb" : "/models/cube.glb"
              }
            />
          </Suspense>
        )}
      </div>
      <p role="status">
        Cube: {state}. WebGL: {fallback ? "forced fallback" : "normal"}
      </p>
      <details>
        <summary>Section camera targets</summary>
        <pre>{JSON.stringify(SECTIONS, null, 2)}</pre>
      </details>
      <div className="chat-actions">
        <button className="primary" onClick={() => setChat("ai")}>
          Test AI failure
        </button>
        <button className="primary" onClick={() => setChat("crm")}>
          Test CRM failure
        </button>
      </div>
      {chat && (
        <SalesAssistant
          key={chat}
          open
          onOpenChange={(v) => {
            if (!v) setChat(null);
          }}
          initial="Regression: automate support"
          selected={[0, 1]}
          onState={setState}
          request={chat === "ai" ? failAI : failCRM}
        />
      )}
      <h2 style={{ marginTop: 30 }}>Audio regression</h2>
      <button
        className="primary"
        onClick={async () => {
          sound.enable(true);
          try {
            const buffers = await sound.preload();
            setAudio(
              `${buffers.length} WebM buffers decoded; context ${sound.status().context}`,
            );
          } catch (e) {
            setAudio(String(e));
          }
        }}
      >
        Enable and decode audio
      </button>
      <button
        className="primary"
        onClick={() => {
          sound.enable(false);
          setAudio(`Muted; context ${sound.status().context}`);
        }}
      >
        Mute audio
      </button>
      <p role="status">{audio}</p>
      <div className="chat-actions">
        {SOUND_NAMES.map((name) => (
          <button
            className="primary"
            key={name}
            onClick={() => sound.play(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <pre aria-live="polite">{log.join("\n")}</pre>
      <Link href="/">
        Return to the site
      </Link>
    </main>
  );
}
