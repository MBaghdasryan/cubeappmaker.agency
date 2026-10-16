import type { Metadata } from "next";
export const SITE_URL = "https://www.cubeappmaker.agency";
export const SITE_DESCRIPTION =
  "AI agents, automation, generative content and custom software. Design your AI solution with CubeAppMaker.";
export function pageMetadata(
  title: string,
  description = SITE_DESCRIPTION,
  path = "/",
): Metadata {
  const url = new URL(path, SITE_URL).href;
  const image = {
    url: `${SITE_URL}/images/social-card.png`,
    width: 1200,
    height: 630,
    alt: "CubeAppMaker — We Build Intelligent Businesses. AI Transformation Studio.",
  };
  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "CubeAppMaker.agency",
      type: "website",
      locale: "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
