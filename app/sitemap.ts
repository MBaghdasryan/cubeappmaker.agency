import { services, solutions } from "@/lib/catalog";
export default function sitemap() {
  const base = "https://www.cubeappmaker.agency";
  return [
    "",
    "/projects",
    "/projects/travel-ai-platform",
    "/projects/telecom-support-automation",
    "/projects/ai-video-production-system",
    "/projects/ai-crm-for-real-estate",
    "/services",
    "/solutions",
    ...services.map((s) => "/services/" + s[0]),
    ...solutions.map((s) => "/solutions/" + s[0]),
  ].map((path) => ({ url: base + path }));
}

export const dynamic='force-static';
