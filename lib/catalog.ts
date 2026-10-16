export const modules = [
  "AI Agent",
  "Knowledge Base",
  "CRM Integration",
  "Automation",
  "Custom App",
];
export const goals = [
  {
    name: "Sell",
    text: "Generate and convert more leads",
    modules: [0, 2, 3],
    solution: "Sales automation",
  },
  {
    name: "Support",
    text: "Automate customer service 24/7",
    modules: [0, 1, 2],
    solution: "Customer support",
  },
  {
    name: "Automate",
    text: "Streamline business processes",
    modules: [1, 2, 3],
    solution: "Marketing automation",
  },
  {
    name: "Create",
    text: "AI content, video and digital humans",
    modules: [0, 3],
    solution: "Content at scale",
  },
  {
    name: "Build",
    text: "SaaS, apps and vibe-coded MVPs",
    modules: [0, 1, 4],
    solution: "Rapid MVP",
  },
  {
    name: "Transform",
    text: "AI strategy and digital transformation",
    modules: [0, 1, 2, 3, 4],
    solution: "Internal knowledge",
  },
];
export const industries = [
  {
    name: "Travel",
    text: "AI Concierge & Sales Automation",
    problem:
      "Turn destination questions into personalized travel options and qualified booking inquiries.",
  },
  {
    name: "Telecom",
    text: "AI Customer Support",
    problem:
      "Answer recurring questions and route complex requests to a human.",
  },
  {
    name: "Real Estate",
    text: "AI Sales Agent & CRM",
    problem:
      "Match property inquiries to listings and keep lead context connected to your CRM.",
  },
  {
    name: "Retail",
    text: "AI Shopping Assistant",
    problem:
      "Guide shoppers through product discovery with catalog-grounded recommendations.",
  },
  {
    name: "Healthcare",
    text: "AI Assistant & Knowledge Base",
    problem:
      "Help staff find approved information and assist with administrative requests, with human oversight.",
  },
  {
    name: "Government",
    text: "Citizen Support & Automation",
    problem:
      "Help people navigate public information and route requests to the right team.",
  },
];
export const services = [
  [
    "ai-agents",
    "AI Agents",
    "Purpose-built assistants that answer, qualify and take carefully scoped actions.",
  ],
  [
    "ai-automation",
    "AI Automation",
    "Connect your tools and remove repetitive operational work.",
  ],
  [
    "generative-ai-content",
    "Generative AI Content",
    "A repeatable content workflow built around your brand.",
  ],
  [
    "ai-video-production",
    "AI Video Production",
    "From creative direction to an AI-assisted video workflow.",
  ],
  [
    "vibe-coding-mvp",
    "Vibe Coding / Rapid MVP",
    "Turn a focused product idea into a testable experience.",
  ],
  [
    "custom-ai-development",
    "Custom AI Development",
    "AI systems designed around your data and operations.",
  ],
  [
    "ai-web-mobile-development",
    "AI Web & Mobile Development",
    "Useful AI capabilities inside a complete digital product.",
  ],
  [
    "crm-ai-integration",
    "CRM + AI Integration",
    "Keep conversations, lead context and next steps connected.",
  ],
  [
    "ai-consulting-training",
    "AI Consulting & Training",
    "A practical roadmap for adopting AI responsibly.",
  ],
  [
    "ai-characters-influencers",
    "AI Characters & Influencers",
    "Consistent digital characters for brand storytelling.",
  ],
];
export const solutions = [
  [
    "sales-automation",
    "Sales Automation",
    "Qualify inquiries and deliver structured lead context to your sales team.",
  ],
  [
    "customer-support",
    "Customer Support",
    "Ground answers in approved knowledge and hand off complex issues with context.",
  ],
  [
    "content-at-scale",
    "Content at Scale",
    "Build a brand-aware creation and review workflow for text, image and video.",
  ],
  [
    "marketing-automation",
    "Marketing Automation",
    "Connect campaign operations, CRM events and human approvals.",
  ],
  [
    "internal-knowledge",
    "Internal Knowledge",
    "Help teams retrieve reliable information from their own approved sources.",
  ],
  [
    "rapid-mvp",
    "Rapid MVP",
    "Validate your most important product hypothesis with a focused working release.",
  ],
];
export function recommend(t: string) {
  if (/support|customer|поддерж/i.test(t)) return 1;
  if (/content|video|image|контент|видео/i.test(t)) return 3;
  if (/app|mvp|saas|product|прилож|сайт/i.test(t)) return 4;
  if (/automat|workflow|автомат/i.test(t)) return 2;
  if (/strategy|transform|стратег/i.test(t)) return 5;
  return 0;
}
