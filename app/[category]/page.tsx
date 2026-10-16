import { pageMetadata } from "@/lib/seo";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { services, solutions } from "@/lib/catalog";
import Brand from "@/components/Brand";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return pageMetadata(
    `${category === "services" ? "AI Services" : "AI Solutions"} | CubeAppMaker`,
    undefined,
    `/${category}`,
  );
}
export default async function Catalog({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!["services", "solutions"].includes(category)) notFound();
  const items = category === "services" ? services : solutions;
  return (
    <main className="route-page">
      <header>
        <Brand />
        <Link href="/#contact" className="primary">
          Discuss your project
        </Link>
      </header>
      <h1>
        AI {category === "services" ? "capabilities." : "solutions."}
        <br />
        <em>Built around your business.</em>
      </h1>
      <p className="intro">
        Explore a practical starting point. Every engagement begins with your
        workflow, data and goals.
      </p>
      <div className="route-grid">
        {items.map(([slug, title, text]) => (
          <Link href={`/${category}/${slug}`} key={slug}>
            <h2>{title}</h2>
            <p>{text}</p>
          </Link>
        ))}
      </div>
      <Link href="/">
        Back to CubeAppMaker
      </Link>
    </main>
  );
}

export const dynamicParams=false;
export function generateStaticParams(){return [{category:'services'},{category:'solutions'}]}
