"use client";
import { useEffect, useRef } from "react";
import {
  SECTION_ORDER,
  sectionSample,
  influenceAt,
  type SectionSample,
} from "./cube-controller";
export function useCubeInteraction(final = false) {
  const signal = useRef({
    x: 0,
    y: 0,
    influence: 0,
    section: {
      from: final ? "contact" : "hero",
      to: final ? "contact" : "hero",
      mix: 0,
    } as SectionSample,
  });
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (final) {
        signal.current.section = { from: "contact", to: "contact", mix: 0 };
        return;
      }
      const positions = Object.fromEntries(
        SECTION_ORDER.map((id) => {
          const e =
            id === "hero"
              ? document.querySelector(".hero")
              : document.getElementById(id);
          return [
            id,
            e ? e.getBoundingClientRect().top + window.scrollY : undefined,
          ];
        }),
      );
      signal.current.section = sectionSample(
        positions,
        window.scrollY + window.innerHeight * 0.24,
      );
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const pointer = (e: PointerEvent) => {
      const zone = document.querySelector(final ? ".cta-cube" : ".cube-stage");
      if (!zone || e.pointerType !== "mouse") return;
      const b = zone.getBoundingClientRect(),
        x = ((e.clientX - b.left) / b.width) * 2 - 1,
        y = 1 - ((e.clientY - b.top) / b.height) * 2;
      signal.current.x = Math.max(-1, Math.min(1, x));
      signal.current.y = Math.max(-1, Math.min(1, y));
      signal.current.influence = influenceAt(x, y);
    };
    const leave = () => {
      signal.current.influence = 0;
    };
    measure();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    window.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("pointermove", pointer);
      document.removeEventListener("pointerleave", leave);
    };
  }, [final]);
  return signal;
}
