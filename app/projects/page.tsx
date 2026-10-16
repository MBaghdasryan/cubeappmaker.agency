import Brand from "@/components/Brand";
import Link from "@/components/SiteLink";
import { pageMetadata } from "@/lib/seo";
import { projects } from "@/hybrid/projects";
export const metadata = pageMetadata(
  "Solution Concepts | CubeAppMaker",
  "Illustrative architectures, not verified client case studies.",
  "/projects",
);
export default function Projects() {
  return (
    <main className="route-page">
      <header>
        <Brand />
        <Link className="primary" href="/#projects">
          Back to concepts
        </Link>
      </header>
      <h1>Featured Solution Concepts</h1>
      <p className="intro">
        Explore what we can build for your business. These are illustrative
        solution concepts, not verified client case studies.
      </p>
      <div className="route-grid">
        {projects.map((p) => (
          <Link key={p.slug} href={"/projects/" + p.slug}>
            <h2>{p.title}</h2>
            <p>{p.solution}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
