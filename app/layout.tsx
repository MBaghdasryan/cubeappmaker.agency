import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { pageMetadata, SITE_URL } from "@/lib/seo";
export const metadata: Metadata = {
  ...pageMetadata("CubeAppMaker — We Build Intelligent Businesses"),
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body data-analytics-provider={process.env.ANALYTICS_PROVIDER || "none"}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "CubeAppMaker.agency",
              url: SITE_URL,
              email: "info@cubeappmaker.agency",
              telephone: "+37495555997",
            }),
          }}
        />
      </body>
    </html>
  );
}
