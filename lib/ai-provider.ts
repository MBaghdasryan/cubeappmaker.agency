import { z } from "zod";
import { goals, modules, recommend } from "./catalog.ts";
export const recommendationSchema = z.object({
  summary: z.string().min(1).max(2500),
  components: z
    .array(
      z.enum([
        "AI Agent",
        "Knowledge Base",
        "CRM Integration",
        "Automation",
        "Custom App",
      ]),
    )
    .min(1)
    .max(5),
});
export type Recommendation = z.infer<typeof recommendationSchema> & {
  mode: "guided" | "ai";
};
export interface AIProvider {
  recommend(problem: string): Promise<Recommendation>;
}
export class GuidedProvider implements AIProvider {
  async recommend(problem: string): Promise<Recommendation> {
    const g = goals[recommend(problem)];
    return {
      mode: "guided",
      summary: `A useful starting point is ${g.solution.toLowerCase()}: ${g.modules.map((i) => modules[i]).join(" + ")}. Let’s shape this around your business.`,
      components: g.modules.map(
        (i) => modules[i],
      ) as Recommendation["components"],
    };
  }
}
export class HTTPAIProvider implements AIProvider {
  constructor(
    private url: string,
    private key: string,
    private request: typeof fetch = fetch,
  ) {}
  async recommend(problem: string): Promise<Recommendation> {
    if (new URL(this.url).protocol !== "https:")
      throw new Error("INVALID_CONFIG");
    const r = await this.request(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({ problem, allowedComponents: modules }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error("AI_PROVIDER_FAILED");
    return { mode: "ai", ...recommendationSchema.parse(await r.json()) };
  }
}
