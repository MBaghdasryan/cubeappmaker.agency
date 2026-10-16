"use client";
import { useEffect } from "react";
import { flushSync } from "react-dom";
import { modules } from "./catalog";
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useBuilderTools(setSelected: (items: number[]) => void) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "configure_ai_solution",
            description:
              "Select components in the visible AI solution builder. Does not send a brief or create a lead.",
            inputSchema: {
              type: "object",
              properties: {
                components: {
                  type: "array",
                  items: { type: "string", enum: modules },
                  minItems: 1,
                  maxItems: 5,
                  uniqueItems: true,
                },
              },
              required: ["components"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              const value = input as { components?: unknown };
              if (
                !value ||
                !Array.isArray(value.components) ||
                !value.components.length ||
                value.components.length > 5 ||
                value.components.some(
                  (v) => typeof v !== "string" || !modules.includes(v),
                ) ||
                new Set(value.components).size !== value.components.length
              )
                throw new Error(
                  "Choose one to five unique supported components.",
                );
              const indexes = value.components.map((v) => modules.indexOf(v));
              flushSync(() => setSelected(indexes));
              return {
                components: indexes.map((i) => modules[i]),
                submitted: false,
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [setSelected]);
}
