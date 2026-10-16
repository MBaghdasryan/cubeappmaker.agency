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
    } else if (this.ctx) void this.ctx.suspend();
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
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  }
}
export const sound = new SoundManager();
export function useSoundEffects(enabled: boolean) {
  useEffect(() => {
    const visibility = () => sound.visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
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
