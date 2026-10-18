import test from "node:test";
import assert from "node:assert/strict";
import { SoundManager } from "../lib/sound.ts";

test("uploaded audio obeys mute, cube visibility, tab visibility and reduced motion", () => {
  const names = ["Audio", "AudioContext", "document", "localStorage", "matchMedia"] as const;
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const clips: FakeAudio[] = [];
  let hidden = false, reduced = false;
  class FakeAudio {
    paused = true; currentTime = 0; volume = 1; loop = false; preload = "";
    constructor(public src: string) { clips.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  class FakeContext {
    destination = {}; state = "running";
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
  }
  const values = { Audio: FakeAudio, AudioContext: FakeContext,
    document: { get hidden() { return hidden; } },
    localStorage: { setItem() {} }, matchMedia: () => ({ matches: reduced }) };
  try {
    for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: values[name] });
    const sound = new SoundManager();
    sound.play = () => {}; // Isolate the existing WebAudio effects from uploaded MP3 lifecycle.
    sound.cubeVisibility(true); sound.ui("ui-click");
    assert.equal(clips.length, 0, "no autoplay before consent");
    sound.enable(true);
    const music = clips.find(c => c.src.endsWith("cube-ambient.mp3"))!;
    assert.ok(music.loop); assert.equal(music.paused, false);
    sound.ui("ui-click"); sound.ui("ui-hover");
    assert.ok(clips.some(c => c.src.endsWith("ui-click.mp3") && !c.paused));
    assert.ok(clips.some(c => c.src.endsWith("ui-hover.mp3") && !c.paused));
    sound.cubeVisibility(false); assert.ok(music.paused);
    sound.cubeVisibility(true); assert.equal(music.paused, false);
    hidden = true; sound.visibility(); assert.ok(clips.every(c => c.paused));
    hidden = false; reduced = true; sound.visibility(); assert.ok(music.paused);
    reduced = false; sound.visibility(); assert.equal(music.paused, false);
    sound.enable(false); assert.ok(clips.every(c => c.paused));
  } finally {
    for (const name of names) {
      const descriptor = saved.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
