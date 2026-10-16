export type CubeState =
  "IDLE" | "HOVER" | "LISTENING" | "PROCESSING" | "RESULT" | "ERROR";
export type SectionId =
  "hero" | "goals" | "solutions" | "builder" | "projects" | "contact";
export type Vec3 = [number, number, number];
export const CUBE_STATES: Record<
  CubeState,
  {
    rotation: number;
    orbitSpeed: number;
    radius: number;
    emission: number;
    bloom: number;
    trail: number;
    ring: number;
    scale: number;
    particle: number;
  }
> = {
  IDLE: {
    rotation: (Math.PI * 2) / 15,
    orbitSpeed: 1,
    radius: 1,
    emission: 0.85,
    bloom: 0.18,
    trail: 0.008,
    ring: 0.24,
    scale: 1,
    particle: 0.4,
  },
  HOVER: {
    rotation: 0.22,
    orbitSpeed: 1.15,
    radius: 1,
    emission: 1,
    bloom: 0.23,
    trail: 0.015,
    ring: 0.3,
    scale: 1.015,
    particle: 0.5,
  },
  LISTENING: {
    rotation: 0.05,
    orbitSpeed: 0.65,
    radius: 0.86,
    emission: 1.05,
    bloom: 0.24,
    trail: 0.012,
    ring: 0.32,
    scale: 1,
    particle: 0.5,
  },
  PROCESSING: {
    rotation: 0.3,
    orbitSpeed: 2.8,
    radius: 0.92,
    emission: 1.5,
    bloom: 0.48,
    trail: 0.28,
    ring: 0.55,
    scale: 1,
    particle: 0.75,
  },
  RESULT: {
    rotation: 0.3,
    orbitSpeed: 0.75,
    radius: 1,
    emission: 0.95,
    bloom: 0.2,
    trail: 0.008,
    ring: 0.27,
    scale: 1,
    particle: 0.42,
  },
  ERROR: {
    rotation: 0.12,
    orbitSpeed: 0.6,
    radius: 1,
    emission: 0.8,
    bloom: 0.15,
    trail: 0,
    ring: 0.2,
    scale: 1,
    particle: 0.35,
  },
};
export const SECTIONS: Record<
  SectionId,
  { position: Vec3; rotation: Vec3; camera: Vec3; target: Vec3; scale: number }
> = {
  hero: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    camera: [0, 1.7, 7.4],
    target: [0, 0, 0],
    scale: 1,
  },
  goals: {
    position: [0.12, 0.03, 0],
    rotation: [0.03, 0.22, 0],
    camera: [0.12, 1.8, 7.6],
    target: [0.08, 0, 0],
    scale: 0.98,
  },
  solutions: {
    position: [-0.08, 0.04, 0],
    rotation: [0.02, 0.65, 0],
    camera: [-0.14, 1.65, 7.7],
    target: [-0.05, 0.03, 0],
    scale: 0.96,
  },
  builder: {
    position: [0, 0.02, 0],
    rotation: [-0.08, 0.78, 0],
    camera: [0.1, 2.05, 7.9],
    target: [0, 0, 0],
    scale: 0.94,
  },
  projects: {
    position: [0, -0.04, 0],
    rotation: [0, 0.95, 0],
    camera: [0, 1.65, 8.3],
    target: [0, 0, 0],
    scale: 0.88,
  },
  contact: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    camera: [0, 1.7, 7.4],
    target: [0, 0, 0],
    scale: 1,
  },
};
export const SECTION_ORDER = Object.keys(SECTIONS) as SectionId[];
export type SectionSample = { from: SectionId; to: SectionId; mix: number };
export function sectionSample(
  positions: Partial<Record<SectionId, number>>,
  probe: number,
): SectionSample {
  const stops = SECTION_ORDER.filter((id) => Number.isFinite(positions[id]));
  if (!stops.length) return { from: "hero", to: "hero", mix: 0 };
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i],
      b = stops[i + 1];
    if (probe < (positions[b] ?? 0)) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (probe - (positions[a] ?? 0)) /
            Math.max(1, (positions[b] ?? 1) - (positions[a] ?? 0)),
        ),
      );
      return { from: a, to: b, mix: raw * raw * (3 - 2 * raw) };
    }
  }
  const last = stops[stops.length - 1];
  return { from: last, to: last, mix: 0 };
}
export function influenceAt(x: number, y: number) {
  const distance = Math.hypot(x / 0.95, y / 0.9);
  const v = Math.max(0, Math.min(1, 1 - distance));
  return v * v * (3 - 2 * v);
}
export function stateWithInfluence(state: CubeState, influence: number) {
  const base = CUBE_STATES[state];
  if (state !== "IDLE" && state !== "HOVER") return base;
  const t = Math.max(0, Math.min(1, influence));
  return Object.fromEntries(
    Object.keys(base).map((key) => {
      const k = key as keyof typeof base;
      return [
        k,
        CUBE_STATES.IDLE[k] + (CUBE_STATES.HOVER[k] - CUBE_STATES.IDLE[k]) * t,
      ];
    }),
  ) as typeof base;
}
// Explode requires an explicitly approved segmented asset, not arbitrary mesh count.
export function segmentationSupport(
  meshNames: string[],
  approvedSegments: readonly string[] = [],
) {
  const supported =
    approvedSegments.length > 1 &&
    approvedSegments.every((name) => meshNames.includes(name));
  return {
    supported,
    enabled: false as const,
    reason: supported
      ? "Segmented asset detected; animation remains opt-in."
      : "Supplied asset is not an approved segmented GLB.",
  };
}
