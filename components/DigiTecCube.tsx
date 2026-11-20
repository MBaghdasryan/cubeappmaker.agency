"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import styles from "@/app/digitec2026/page.module.css";
const Cube = dynamic(() => import("@/components/three/CubeExperience"), { ssr: false, loading: () => <p role="status">Loading the cube…</p> });
export default function DigiTecCube() {
  const [active, setActive] = useState(false);
  return <div className={`${styles.visual} ${active ? styles.activeVisual : ""}`}>
    {active && <div className={styles.liveCube}><Cube state="IDLE" /></div>}<div className={styles.cubeArt} aria-hidden="true"><svg viewBox="0 0 400 400" fill="none"><defs><linearGradient id="event-cube" x1="80" y1="80" x2="320" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="#00D9FF"/><stop offset="1" stopColor="#1E90FF"/></linearGradient></defs><g stroke="url(#event-cube)" strokeWidth="1.5"><path d="M200 50 335 128v155L200 360 65 283V128Z"/><path d="m65 128 135 78 135-78M200 206v154M200 50v156M65 283l135-77 135 77" opacity=".4"/><path d="m200 127 68 39v78l-68 39-68-39v-78Z" strokeWidth="4"/><path d="m132 166 68 39 68-39m-68 39v78" strokeWidth="4"/><ellipse cx="200" cy="206" rx="183" ry="72" transform="rotate(-25 200 206)" opacity=".3"/></g><g fill="#00D9FF"><circle cx="65" cy="128" r="4"/><circle cx="335" cy="283" r="4"/><circle cx="200" cy="50" r="4"/></g></svg></div>
    <button className={styles.cubeButton} onClick={() => setActive(!active)} aria-pressed={active}>{active ? "Close 3D view" : "Explore the 3D cube"} <span aria-hidden="true">{active ? "×" : "+"}</span></button>
    <span className={styles.visualCaption}>INTELLIGENCE. CONNECTED.</span>
  </div>;
}
