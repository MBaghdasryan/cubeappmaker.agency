import { pageMetadata } from "@/lib/seo";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { services, solutions } from "@/lib/catalog";
import Brand from "@/components/Brand";
type Props = { params: Promise<{ category: string; slug: string }> };
function item(category: string, slug: string) {
  return (
    category === "services"
      ? services
      : category === "solutions"
        ? solutions
        : []
  ).find((v) => v[0] === slug);
}
export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const data = item(category, slug);
  return pageMetadata(
    data ? `${data[1]} | CubeAppMaker` : "Not found",
    data?.[2],
    `/${category}/${slug}`,
  );
}
export default async function Detail({ params }: Props) {
  const { category, slug } = await params;
  const data = item(category, slug);
  if (!data) notFound();
  return (
    <main className="route-page">
      <header>
        <Brand />
        <Link className="primary" href="/#contact">
          Discuss your project
        </Link>
      </header>
      <nav aria-label="Breadcrumb" style={{ marginTop: 35 }}>
        <Link href="/">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/${category}`}>
          {category}
        </Link>{" "}
        / {data[1]}
      </nav>
      <h1>
        {data[1]}
        <br />
        <em>From idea to implementation.</em>
      </h1>
      <p className="intro">{data[2]}</p>
      <section className="route-block">
        <h2>Designed for your workflow</h2>
        <p>
          We begin by understanding the people, tools and information involved.
          Together, we define a focused use case, agree on measurable acceptance
          criteria and identify where human review is essential.
        </p>
      </section>
      <div className="route-grid">
        {[
          [
            "01 · Discover",
            "Review current processes, data quality, permissions and integration requirements.",
          ],
          [
            "02 · Build & evaluate",
            "Deliver a focused pilot, evaluate real scenarios and handle failure paths before expansion.",
          ],
          [
            "03 · Roll out",
            "Connect your operational tools, document ownership and improve based on measured usage.",
          ],
        ].map(([t, p]) => (
          <section className="route-block" key={t}>
            <h2>{t}</h2>
            <p>{p}</p>
          </section>
        ))}
      </div>
      <section className="route-block">
        <h2>What to bring to discovery</h2>
        <ul>
          <li>Your main business challenge and expected outcome</li>
          <li>Examples of current workflows and the tools you use</li>
          <li>Data sources, access requirements and constraints</li>
          <li>Target timing and an approximate budget, if available</li>
        </ul>
        <p>
          Scope, estimates and the final technology stack are agreed after
          discovery.
        </p>
      </section>
      <Link
        className="primary"
        href={`mailto:info@cubeappmaker.agency?subject=${encodeURIComponent(data[1] + " — discovery")}`}
      >
        Let’s discuss {data[1].toLowerCase()}
      </Link>
    </main>
  );
}

export const dynamicParams=false;
export function generateStaticParams(){return [...services.map(s=>({category:'services',slug:s[0]})),...solutions.map(s=>({category:'solutions',slug:s[0]}))]}
