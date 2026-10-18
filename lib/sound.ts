"use client";
import { useEffect } from "react";
export type SoundName =
  | "cube-hover"
  | "cube-release"
  | "pointer-energy"
  | "scroll-tick"
  | "ai-activate"
  | "ai-processing"
  | "ai-result";
export const SOUND_NAMES: SoundName[] = [
  "cube-hover",
  "cube-release",
  "pointer-energy",
  "scroll-tick",
  "ai-activate",
  "ai-processing",
  "ai-result",
];
export class SoundManager {
  private clips = new Map<string, HTMLAudioElement>();
  private cubeVisible = false;
  private ambient: HTMLAudioElement | null = null;
  private reduced() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  ui(name: "ui-click" | "ui-hover") {
    if (!this.enabled || document.hidden) return;
    const now = performance.now();
    if (now - (this.last.get(name) ?? -1000) < (name === "ui-click" ? 45 : 130)) return;
    this.last.set(name, now);
    let clip = this.clips.get(name);
    if (!clip) {
      clip = new Audio(`/audio/${name}.mp3`);
      clip.preload = "auto";
      clip.volume = name === "ui-click" ? 0.3 : 0.18;
      this.clips.set(name, clip);
    }
    clip.currentTime = 0;
    void clip.play().catch(() => {});
  }
  cubeVisibility(visible: boolean) {
    this.cubeVisible = visible;
    this.syncAmbient();
  }
  private syncAmbient() {
    const active = this.enabled && this.cubeVisible && !document.hidden && !this.reduced();
    if (active) {
      this.ambient ??= new Audio("/audio/cube-ambient.mp3");
      this.ambient.loop = true;
      this.ambient.volume = 0.12;
      if (this.ambient.paused) void this.ambient.play().catch(() => {});
    } else this.ambient?.pause();
  }
  async preload() {
    if (!this.ctx) return [];
    return Promise.all(
      SOUND_NAMES.map(async (name) => {
        if (!this.buffers.has(name)) {
          const response = await fetch(`/audio/${name}.webm`);
          if (!response.ok) throw new Error(`Cannot load ${name}`);
          const buffer = await this.ctx!.decodeAudioData(
            await response.arrayBuffer(),
          );
          this.buffers.set(name, buffer);
        }
        return { name, duration: this.buffers.get(name)!.duration };
      }),
    );
  }
  status() {
    return {
      enabled: this.enabled,
      context: this.ctx?.state || "not-created",
      loaded: [...this.buffers.keys()],
    };
  }
  private report(
    name: SoundName,
    phase: "started" | "ended",
    mode: "buffer" | "synth",
  ) {
    window.dispatchEvent(
      new CustomEvent("cube:audio", {
        detail: { name, phase, mode, context: this.ctx?.state },
      }),
    );
  }
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private buffers = new Map<string, AudioBuffer>();
  private last = new Map<string, number>();
  private loading = new Set<string>();
  readonly gains = {
    UI: 0.14,
    CUBE: 0.12,
    SCROLL: 0.035,
    POINTER: 0.045,
    AI: 0.16,
  };
  enable(value: boolean) {
    this.enabled = value;
    try {
      localStorage.setItem("cube-sound", String(value));
    } catch {}
    if (value) {
      this.ctx ??= new AudioContext();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume();
      this.play("ai-activate");
    } else {
      if (this.ctx) void this.ctx.suspend();
      for (const clip of this.clips.values()) { clip.pause(); clip.currentTime = 0; }
    }
    this.syncAmbient();
  }
  play(name: SoundName, intensity = 1) {
    if (!this.enabled || !this.ctx || !this.master || document.hidden) return;
    if (intensity <= 0) return;
    const now = performance.now();
    if (
      now - (this.last.get(name) || -1000) <
      (name === "scroll-tick" ? 150 : name === "pointer-energy" ? 220 : 450)
    )
      return;
    this.last.set(name, now);
    const channel = name.startsWith("cube")
      ? "CUBE"
      : name.startsWith("ai")
        ? "AI"
        : name.startsWith("pointer")
          ? "POINTER"
          : "SCROLL";
    const gain = this.ctx.createGain();
    gain.gain.value = this.gains[channel] * Math.min(1, Math.max(0, intensity));
    gain.connect(this.master);
    const buffer = this.buffers.get(name);
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.onended = () => {
        this.report(name, "ended", "buffer");
        source.disconnect();
        gain.disconnect();
      };
      if (name === "pointer-energy") {
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          this.ctx.currentTime + 0.12,
        );
      }
      source.start();
      if (name === "pointer-energy") source.stop(this.ctx.currentTime + 0.13);
      this.report(name, "started", "buffer");
      return;
    }
    if (!this.loading.has(name)) {
      this.loading.add(name);
      void fetch(`/audio/${name}.webm`)
        .then((r) => {
          if (!r.ok) throw new Error("audio");
          return r.arrayBuffer();
        })
        .then((b) => this.ctx!.decodeAudioData(b))
        .then((b) => this.buffers.set(name, b))
        .catch(() => {});
    }
    const osc = this.ctx.createOscillator(),
      t = this.ctx.currentTime,
      d =
        name === "scroll-tick"
          ? 0.035
          : name === "pointer-energy"
            ? 0.1
            : name === "ai-processing"
              ? 0.65
              : 0.3;
    osc.type = "sine";
    osc.frequency.setValueAtTime(
      name === "ai-result"
        ? 660
        : name === "ai-activate"
          ? 440
          : name === "pointer-energy"
            ? 180
            : 110,
      t,
    );
    osc.frequency.exponentialRampToValueAtTime(
      name === "ai-result" ? 880 : 70,
      t + d,
    );
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(
      this.gains[channel] * Math.max(0.01, intensity),
      t + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(gain);
    osc.onended = () => {
      this.report(name, "ended", "synth");
      osc.disconnect();
      gain.disconnect();
    };
    osc.start();
    this.report(name, "started", "synth");
    osc.stop(t + d + 0.02);
  }
  visibility() {
    this.syncAmbient();
    if (document.hidden) for (const clip of this.clips.values()) clip.pause();
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  }
}
export const sound = new SoundManager();
export function useSoundEffects(enabled: boolean) {
  useEffect(() => {
    const targetElement = (target: EventTarget | null) => target instanceof Element ? target : null;
    const click = () => sound.ui("ui-click");
    const hover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = targetElement(event.target);
      const from = targetElement(event.relatedTarget);
      const item = target?.closest("a, button, input, select, textarea, summary, [role='button'], [role='checkbox'], .cube-stage, #goals, #solutions, #builder, #projects");
      if (item && (!from || !item.contains(from))) sound.ui("ui-hover");
    };
    const restore = () => {
      try {
        if (!sound.status().enabled && localStorage.getItem("cube-sound") === "true") sound.enable(true);
      } catch {}
    };
    const cube = document.querySelector(".cube-stage");
    const observer = new IntersectionObserver(([entry]) => sound.cubeVisibility(entry.isIntersecting), { threshold: 0.15 });
    if (cube) observer.observe(cube);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const visibility = () => sound.visibility();
    reduced.addEventListener("change", visibility);
    document.addEventListener("click", click, true);
    document.addEventListener("pointerover", hover, { passive: true });
    document.addEventListener("pointerdown", restore, { once: true });
    document.addEventListener("keydown", restore, { once: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("click", click, true);
      document.removeEventListener("pointerover", hover);
      document.removeEventListener("pointerdown", restore);
      document.removeEventListener("keydown", restore);
      reduced.removeEventListener("change", visibility);
      observer.disconnect();
      sound.cubeVisibility(false);
    };
  }, []);
  useEffect(() => {
    if (!enabled || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let previous = scrollY,
      last = performance.now(),
      x = 0,
      y = 0,
      pt = 0;
    const scroll = () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const n = performance.now(),
        v = Math.abs(scrollY - previous) / Math.max(16, n - last);
      sound.play(
        "scroll-tick",
        Math.min(matchMedia("(pointer: coarse)").matches ? 0.2 : 0.65, v / 3),
      );
      previous = scrollY;
      last = n;
    };
    const pointer = (e: PointerEvent) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (e.pointerType !== "mouse" || !(e.target as Element).closest(".hero"))
        return;
      const n = performance.now(),
        v = Math.hypot(e.clientX - x, e.clientY - y) / Math.max(16, n - pt);
      if (pt && v > 0.4) sound.play("pointer-energy", Math.min(0.6, v / 6));
      x = e.clientX;
      y = e.clientY;
      pt = n;
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointermove", pointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", pointer);
    };
  }, [enabled]);
}
