import Brand from "@/components/Brand";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { projects } from "@/hybrid/projects";
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  return pageMetadata(
    (p?.title || "Not found") + " | CubeAppMaker",
    p?.solution,
    "/projects/" + slug,
  );
}
export default async function Project({ params }: Props) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <main className="route-page">
      <header>
        <Brand />
        <Link className="primary" href="/#contact">
          Discuss your project
        </Link>
      </header>
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/projects">Projects</Link> /{" "}
        {p.title}
      </nav>
      <h1>{p.title}</h1>
      <p className="intro">
        This is a solution concept; no client results are claimed.
      </p>
      {[
        ["Challenge", p.challenge],
        ["Solution", p.solution],
        ["Stack", p.stack],
        ["Intended outcome", p.outcome],
      ].map(([title, text]) => (
        <section className="route-block" key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <Link className="primary" href="/#contact">
        Design a solution for me
      </Link>
    </main>
  );
}
