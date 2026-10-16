export const ANALYTICS_EVENTS = [
  "hero_ai_focus",
  "hero_ai_submit",
  "goal_selected",
  "solution_viewed",
  "solution_builder_started",
  "solution_builder_completed",
  "project_viewed",
  "contact_started",
  "lead_completed",
  "sound_enabled",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type EventProperties = {
  goal?: "Sell" | "Support" | "Automate" | "Create" | "Build" | "Transform";
  componentCount?: number;
  delivery?: "crm" | "download" | "email_draft";
};
export interface AnalyticsAdapter {
  track(event: AnalyticsEvent, props: EventProperties): void;
  ready(): boolean;
}
export type AnalyticsGlobals = {
  gtag?: (command: string, event: string, properties: object) => void;
  plausible?: (event: string, options: { props: object }) => void;
  posthog?: { capture: (event: string, properties: object) => void };
};
export function sanitizeProperties(props: EventProperties): EventProperties {
  const clean: EventProperties = {};
  if (
    props.goal &&
    ["Sell", "Support", "Automate", "Create", "Build", "Transform"].includes(
      props.goal,
    )
  )
    clean.goal = props.goal;
  if (
    Number.isInteger(props.componentCount) &&
    props.componentCount! >= 0 &&
    props.componentCount! <= 5
  )
    clean.componentCount = props.componentCount;
  if (
    props.delivery &&
    ["crm", "download", "email_draft"].includes(props.delivery)
  )
    clean.delivery = props.delivery;
  return clean;
}
export function createAnalyticsAdapter(
  provider: string,
  globals: AnalyticsGlobals,
): AnalyticsAdapter {
  return {
    ready: () =>
      provider === "ga4"
        ? typeof globals.gtag === "function"
        : provider === "plausible"
          ? typeof globals.plausible === "function"
          : provider === "posthog"
            ? typeof globals.posthog?.capture === "function"
            : false,
    track(event, props) {
      const safe = sanitizeProperties(props);
      if (provider === "ga4") globals.gtag?.("event", event, safe);
      else if (provider === "plausible")
        globals.plausible?.(event, { props: safe });
      else if (provider === "posthog") globals.posthog?.capture(event, safe);
    },
  };
}
export function track(event: AnalyticsEvent, properties: EventProperties = {}) {
  if (typeof window === "undefined") return;
  if (!ANALYTICS_EVENTS.includes(event)) return;
  const props = sanitizeProperties(properties);
  window.dispatchEvent(
    new CustomEvent("cube:analytics", {
      detail: { event, ...props, time: Date.now() },
    }),
  );
  if (navigator.doNotTrack === "1") return;
  const provider = document.body.dataset.analyticsProvider || "none";
  try {
    createAnalyticsAdapter(provider, window as Window & AnalyticsGlobals).track(
      event,
      props,
    );
  } catch {
    /* Analytics failures must never interrupt a visitor workflow. */
  }
}
