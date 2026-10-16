export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://www.cubeappmaker.agency/sitemap.xml",
  };
}

export const dynamic='force-static';
