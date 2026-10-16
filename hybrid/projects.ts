import { projectContexts } from "@/lib/recommendations";
export const projects = [
  ["travel-ai-platform", "Travel AI Platform", "AI Agents · OpenAI · n8n"],
  [
    "telecom-support-automation",
    "Telecom Support Automation",
    "AI Voice · Claude · Asterisk",
  ],
  [
    "ai-video-production-system",
    "AI Video Production System",
    "Runway · Sora · ElevenLabs",
  ],
  [
    "ai-crm-for-real-estate",
    "AI CRM for Real Estate",
    "Bitrix24 · AI Agents · Automation",
  ],
].map(([slug, title, stack], i) => ({
  slug,
  title,
  stack,
  ...projectContexts[i],
}));
