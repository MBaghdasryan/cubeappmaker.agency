import { services, goals, modules, recommend } from "./catalog.ts";

// Ordered by business relevance, not a fabricated confidence score.
const serviceOrder = [
  [0, 7, 1],
  [0, 5, 7],
  [1, 7, 8],
  [2, 3, 9],
  [4, 6, 5],
  [8, 5, 1],
];
export function servicesFor(goal: number) {
  return serviceOrder[goal].map((index) => services[index]);
}
export function servicesForProblem(problem: string) {
  return servicesFor(recommend(problem));
}
export const industryGoals = [0, 1, 0, 0, 1, 1];
export function industryArchitecture(index: number) {
  const goal = industryGoals[index];
  return `${goals[goal].modules.map((i) => modules[i]).join(" → ")} → human review`;
}
export const projectContexts = [
  {
    goals: [0, 4],
    challenge: "Travel inquiries arrive with incomplete preferences.",
    solution:
      "A concierge collects requirements and hands a clear booking inquiry to the team.",
    outcome: "A more useful starting point for a travel advisor.",
  },
  {
    goals: [1, 2, 5],
    challenge:
      "Repeated service questions compete with complex support requests.",
    solution:
      "Ground responses in approved knowledge and route exceptions to a person.",
    outcome: "More consistent answers and better context at handoff.",
  },
  {
    goals: [3],
    challenge:
      "Creative production involves repeated briefing and review steps.",
    solution:
      "Connect brand guidance, generation and human review in one workflow.",
    outcome: "A clearer, more repeatable production process.",
  },
  {
    goals: [0, 2, 4, 5],
    challenge: "Property inquiry context is scattered across conversations.",
    solution: "Connect qualification, listing knowledge and CRM follow-up.",
    outcome: "More complete lead context and a visible next action.",
  },
];
export function projectIndexes(goal: number | null) {
  return projectContexts.flatMap((p, i) =>
    goal === null || p.goals.includes(goal) ? [i] : [],
  );
}
