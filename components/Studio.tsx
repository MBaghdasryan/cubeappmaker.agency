"use client";
import NextLink from "@/components/SiteLink";
import {
  useState,
  useEffect,
  useSyncExternalStore,
  lazy,
  Suspense,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Box,
  Users,
  Headset,
  Atom,
  ScanFace,
  Workflow,
  Bot,
  Database,
  Link,
  Settings,
  Plane,
  Building2,
  ShoppingBag,
  ShieldCheck,
  Globe,
  Volume2,
  VolumeX,
  Menu,
  Check,
  Plus,
  Calendar,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Brand from "./Brand";
import BusinessImpact from "./BusinessImpact";
import { track } from "@/lib/analytics";
import { technologyFor } from "@/lib/technology";
import {
  servicesFor,
  industryGoals,
  industryArchitecture,
  projectContexts,
  projectIndexes,
} from "@/lib/recommendations";
import { useBuilderTools } from "@/lib/use-builder-tools";
import { goals, industries, modules, recommend } from "@/lib/catalog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import SalesAssistant from "./SalesAssistant";
import { sound } from "@/lib/sound";
import type { CubeState } from "./three/CubeExperience";
const Cube = lazy(() => import("./three/CubeExperience"));
const goalIcons = [Users, Headset, Atom, ScanFace, Box, Workflow],
  moduleIcons = [Bot, Database, Link, Settings, Box],
  industryIcons = [Plane, Headset, Users, ShoppingBag, ShieldCheck, Building2];
const chips = [
  "Generate Leads",
  "Automate Sales",
  "Build AI Agent",
  "Create AI Content",
  "Vibe Code MVP",
  "Custom Solution",
];
const projects = [
  [
    "Travel AI Platform",
    "Personalized travel discovery and concierge support.",
    "AI Agents · OpenAI · n8n",
  ],
  [
    "Telecom Support Automation",
    "Knowledge-grounded answers with human handoff.",
    "AI Voice · Claude · Asterisk",
  ],
  [
    "AI Video Production System",
    "A connected creative and production workflow.",
    "Runway · Sora · ElevenLabs",
  ],
  [
    "AI CRM for Real Estate",
    "From property inquiry to a qualified sales conversation.",
    "Bitrix24 · AI Agents · Automation",
  ],
];
const subscribeMounted = () => () => {};
export default function Studio() {
  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false,
  );
  const [state, setState] = useState<CubeState>("IDLE"),
    [query, setQuery] = useState(""),
    [initial, setInitial] = useState(""),
    [chat, setChat] = useState(false),
    [goal, setGoal] = useState<number | null>(null),
    [selected, setSelected] = useState([0, 1, 2, 3, 4]),
    [detail, setDetail] = useState<{ title: string; text: string } | null>(
      null,
    ),
    [nav, setNav] = useState(false),
    [enabled, setEnabled] = useState(false),
    [offset, setOffset] = useState(0);
  const technology = technologyFor(goal, selected);
  useBuilderTools(setSelected);
  useEffect(() => {
    const restore = () => {
      try {
        if (
          localStorage.getItem("cube-sound") === "true" &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          sound.enable(true);
          setEnabled(true);
        }
      } catch {}
    };
    window.addEventListener("pointerdown", restore, { once: true });
    window.addEventListener("keydown", restore, { once: true });
    return () => {
      window.removeEventListener("pointerdown", restore);
      window.removeEventListener("keydown", restore);
    };
  }, []);
  const start = (text: string) => {
    if (!text.startsWith("Build my solution")) {
      setSelected(goals[recommend(text)].modules);
      setGoal(recommend(text));
    }
    setInitial(text);
    setChat(true);
    setState("PROCESSING");
    sound.play("ai-processing");
    track("hero_ai_submit");
    track("contact_started");
  };
  const choose = (i: number) => {
    setGoal(i);
    setSelected(goals[i].modules);
    setState("RESULT");
    sound.play("ai-result");
    track("goal_selected", {
      goal: goals[i].name as
        "Sell" | "Support" | "Automate" | "Create" | "Build" | "Transform",
    });
  };
  return (
    <>
      <NextLink className="skip" href="#main">
        Skip to content
      </NextLink>
      <div className="site-shell">
        <header className="header">
          <Brand />
          <nav
            className={nav ? "nav is-open" : "nav"}
            aria-label="Main navigation"
          >
            {[
              ["Home", "#"],
              ["Services", "#goals"],
              ["Solutions", "#solutions"],
              ["Projects", "#projects"],
              ["About", "#about"],
              ["Insights", "#insights"],
              ["Contact", "#contact"],
            ].map(([label, url]) => (
              <NextLink
                key={label}

                href={url}
                className={label === "Home" ? "active" : ""}
                onClick={() => setNav(false)}
              >
                {label}
              </NextLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="sound"
              aria-label={
                enabled ? "Disable interface sounds" : "Enable interface sounds"
              }
              onClick={() => {
                sound.enable(!enabled);
                setEnabled(!enabled);
                if (!enabled) track("sound_enabled");
              }}
            >
              {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <span className="language">
              <Globe size={19} /> EN
            </span>
            <NextLink className="primary book" href="#contact">
              Book a Call <ArrowUpRight size={15} />
            </NextLink>
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={nav}
              onClick={() => setNav(!nav)}
            >
              <Menu />
            </button>
          </div>
        </header>
        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="eyebrow">
                <Box size={11} /> AI TRANSFORMATION STUDIO
              </div>
              <h1 id="hero-title">
                We Build
                <br />
                <span>Intelligent</span>
                <br />
                Businesses.
              </h1>
              <p className="hero-description">
                From AI content and automation to AI agents,
                <br className="desktop-break" /> SaaS and vibe-coded products.
              </p>
              <form
                className="ai-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim()) start(query.trim());
                }}
              >
                <Box className="input-cube" />
                <input
                  aria-label="Tell Cube what you want to build"
                  placeholder="Tell Cube what you want to build..."
                  maxLength={2000}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setState("LISTENING");
                    sound.play("ai-activate");
                    track("hero_ai_focus");
                  }}
                  onBlur={() => setState("IDLE")}
                  required
                />
                <button
                  className="primary square"
                  aria-label="Start your project"
                >
                  <ArrowRight />
                </button>
              </form>
              <div className="intent-chips">
                {chips.map((c) => (
                  <button key={c} onClick={() => start(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <NextLink className="explore" href="#goals">
                Or explore by service <ArrowDown size={15} />
              </NextLink>
            </div>
            <div className="hero-visual">
              <div
                className="cube-stage"
                onPointerEnter={() => {
                  if (state === "IDLE") setState("HOVER");
                  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) sound.play("cube-hover", 1);
                }}
                onPointerLeave={() => {
                  if (state === "HOVER") setState("IDLE");
                  sound.play("cube-release");
                }}
              >
                <div className="cube-fallback" />
                {mounted && (
                  <Suspense fallback={null}>
                    <Cube state={state} />
                  </Suspense>
                )}
              </div>
              <button
                className="orbit-label agents"
                onClick={() => start("Build an AI agent")}
              >
                <strong>AI Agents</strong>
                <small>Sales · Support · Voice</small>
              </button>
              <button
                className="orbit-label content"
                onClick={() => start("Create AI content")}
              >
                <strong>Content Studio</strong>
                <small>Image · Video · Voice</small>
              </button>
              <button
                className="orbit-label coding"
                onClick={() => start("Build a SaaS MVP")}
              >
                <strong>Vibe Coding</strong>
                <small>MVP · SaaS · Apps</small>
              </button>
              <button
                className="orbit-label strategy"
                onClick={() => start("Design an AI strategy")}
              >
                <strong>AI Strategy</strong>
                <small>Roadmap · Consulting</small>
              </button>
              <button
                className="orbit-label crm"
                onClick={() => start("Automate CRM workflows")}
              >
                <strong>CRM & Automation</strong>
                <small>Integrations · Workflows</small>
              </button>
              <div className="orbit-caption">
                <Sparkles size={11} /> One partner. Full AI spectrum.
              </div>
            </div>
            <aside className="assistant-teaser">
              <div className="assistant-heading">
                <span className="icon-glow">
                  <Box />
                </span>
                <div>
                  <strong>Cube AI</strong>
                  <small>
                    <i /> Solution guide
                  </small>
                </div>
              </div>
              <div className="assistant-bubble">
                Hi! I’m Cube AI 👋
                <br />
                Tell me about your business idea or challenge, and let’s design
                your AI solution.
              </div>
              <div className="teaser-buttons">
                <button onClick={() => start("I need a proposal")}>
                  Get a Proposal
                </button>
                <NextLink href="#projects">
                  Explore Solutions
                </NextLink>
                <button onClick={() => start("Help me choose an AI solution")}>
                  Ask a Question
                </button>
              </div>
            </aside>
          </section>
          <section className="panel goals" id="goals">
            <div className="section-heading">
              <div>
                <div className="eyebrow small">
                  <Box size={10} /> WHAT DO YOU WANT TO ACHIEVE?
                </div>
                <h2>
                  Turn Ideas into <em>Real Results</em>
                </h2>
              </div>
              <p>
                {goal === null
                  ? "Choose your main goal, and discover the right solution, technologies and next steps."
                  : `${goals[goal].solution}: your recommended components are selected below.`}
              </p>
              <NextLink href="/services">
                View All Services <ArrowRight />
              </NextLink>
            </div>
            <div className="goal-grid">
              {goals.map((g, i) => {
                const Icon = goalIcons[i];
                return (
                  <button
                    className={`goal-card ${goal === i ? "selected" : ""}`}
                    aria-pressed={goal === i}
                    key={g.name}
                    onClick={() => choose(i)}
                  >
                    <span className="icon-glow">
                      <Icon />
                    </span>
                    <strong>{g.name}</strong>
                    <span>{g.text}</span>
                    <ArrowRight className="circle-arrow" />
                  </button>
                );
              })}
            </div>
          </section>
          <section className="panel industries" id="solutions">
            <div className="section-heading">
              <div>
                <h2>
                  AI Solutions for <em>Every</em> Industry
                </h2>
                <p>Ready-to-build solutions tailored to your business.</p>
              </div>
              <div className="row-actions">
                <NextLink href="/solutions">
                  View All Solutions
                </NextLink>
                <button
                  aria-label="Previous industries"
                  onClick={() => setOffset((offset + 5) % 6)}
                >
                  <ChevronLeft />
                </button>
                <button
                  aria-label="Next industries"
                  onClick={() => setOffset((offset + 1) % 6)}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="industry-grid">
              {industries.map((_, n) => {
                const i = (n + offset) % 6,
                  d = industries[i],
                  Icon = industryIcons[i];
                return (
                  <button
                    className="industry-card"
                    key={d.name}
                    onClick={() => {
                      setDetail({
                        title: d.name + " AI Solutions",
                        text: `${d.problem} Capability: ${d.text}. Architecture: ${industryArchitecture(i)}. Relevant services: ${servicesFor(
                          industryGoals[i],
                        )
                          .map((s) => s[1])
                          .join(", ")}.`,
                      });
                      choose(industryGoals[i]);
                      track("solution_viewed");
                    }}
                  >
                    <div
                      className="reference-image industry-image"
                      style={{
                        backgroundPosition: `${[6.6, 23.7, 40.8, 58, 75.5, 92.8][i]}% 51.2%`,
                      }}
                    />
                    <div className="industry-copy">
                      <span className="mini-icon">
                        <Icon />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>{d.text}</small>
                      </div>
                      <ArrowRight className="circle-arrow" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="panel builder" id="builder">
            <div className="builder-main">
              <div className="section-heading">
                <div>
                  <h2>
                    Build Your AI <em>Solution</em>
                  </h2>
                  <p>
                    Select components, and get a personalized solution in
                    minutes.
                  </p>
                </div>
                <span className="builder-badge">
                  <span /> Interactive Builder
                </span>
              </div>
              <div className="module-row">
                {modules.map((m, i) => {
                  const Icon = moduleIcons[i];
                  return (
                    <div className="module-wrap" key={m}>
                      <label
                        className={`module-card ${selected.includes(i) ? "selected" : ""}`}
                      >
                        <Checkbox
                          aria-label={m}
                          checked={selected.includes(i)}
                          onCheckedChange={(checked) => {
                            setSelected((s) =>
                              checked
                                ? [...s, i].sort()
                                : s.filter((v) => v !== i),
                            );
                            track("solution_builder_started");
                          }}
                        />
                        <Icon />
                        <strong>{m}</strong>
                        <small>
                          {
                            [
                              "Sales / Support / Custom",
                              "Your data & documents",
                              "Bitrix24 · U-ON · Custom",
                              "n8n · Make · Custom",
                              "Web · Mobile · SaaS",
                            ][i]
                          }
                        </small>
                      </label>
                      {i < 4 && (
                        <span className="plus">
                          <Plus />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <aside className="proposal-card">
              <h3>
                <Box />{" "}
                {goal === null ? "Your AI Solution" : goals[goal].solution}
              </h3>
              <ul>
                <li>
                  <Check /> {selected.length} connected components
                </li>
                <li>
                  <Check /> Custom architecture
                </li>
                <li>
                  <Check /> Recommended stack
                </li>
                <li>
                  <Check /> Implementation stages
                </li>
              </ul>
              <button
                className="primary"
                disabled={!selected.length}
                onClick={() => {
                  start(
                    `Build my solution with ${selected.map((i) => modules[i]).join(", ")}`,
                  );
                  track("solution_builder_completed");
                }}
              >
                Generate My AI Proposal <ArrowRight size={16} />
              </button>
            </aside>
          </section>
          <section className="panel projects" id="projects">
            <div className="section-heading">
              <div>
                <h2>Featured Solution Concepts</h2>
                <p>
                  {goal === null
                    ? "Explore what we can build for your business."
                    : `Concepts relevant to ${goals[goal].name.toLowerCase()}. Intended outcomes, not client results.`}
                </p>
              </div>
              <button
                className="text-link"
                onClick={() =>
                  setDetail({
                    title: "From concept to your project",
                    text: "These are illustrative solution concepts, not verified client case studies. Tell us about your business to explore a tailored architecture, delivery scope and validation plan.",
                  })
                }
              >
                About These Projects <ArrowRight />
              </button>
            </div>
            <div className="project-grid">
              {projectIndexes(goal).map((i) => {
                const p = projects[i],
                  context = projectContexts[i];
                return (
                  <button
                    className="project-card"
                    key={p[0]}
                    onClick={() => {
                      setDetail({
                        title: p[0],
                        text: `Challenge: ${context.challenge} Solution: ${context.solution} Stack: ${p[2]}. Intended outcome: ${context.outcome} This is a solution concept; no client results are claimed.`,
                      });
                      track("project_viewed");
                    }}
                  >
                    <div
                      className="reference-image project-image"
                      style={{
                        backgroundPosition: `${[7.7, 36, 64.7, 94.4][i]}% 79%`,
                      }}
                    />
                    {i === 2 && (
                      <span className="play">
                        <Play fill="currentColor" />
                      </span>
                    )}
                    <div className="project-copy">
                      <strong>{p[0]}</strong>
                      <p>{p[1]}</p>
                      <small>{p[2]}</small>
                      <ArrowRight className="circle-arrow" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="value-row" aria-label="Our approach">
            {[
              [Users, "Built around you", "Business-first design"],
              [Headset, "Human + AI", "Thoughtful handoff"],
              [ShieldCheck, "Secure by design", "Scoped data access"],
              [Globe, "Connected", "Your existing tools"],
              [Workflow, "End to end", "Strategy to delivery"],
              [Atom, "Made to evolve", "Continuous evaluation"],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Users;
              return (
                <div key={String(title)}>
                  <span className="mini-icon">
                    <I />
                  </span>
                  <span>
                    <strong>{String(title)}</strong>
                    <small>{String(text)}</small>
                  </span>
                </div>
              );
            })}
          </section>
          <section className="technology" aria-label="Technology Stack">
            <p aria-live="polite">{technology.label}</p>
            <div>
              {technology.items.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </section>
          <BusinessImpact />
          <section className="final-cta" id="contact">
            <div className="cta-cube">
              <Box className="cta-static" />
              {mounted && (
                <Suspense fallback={null}>
                  <Cube state={state} final />
                </Suspense>
              )}
            </div>
            <h2>
              Let’s Design
              <br />
              Your <em>AI Solution.</em>
            </h2>
            <div className="final-input">
              <form
                className="ai-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(String(new FormData(e.currentTarget).get("brief")));
                }}
              >
                <Box className="input-cube" />
                <input
                  name="brief"
                  required
                  maxLength={2000}
                  aria-label="Describe your project"
                  placeholder="Describe your project or business challenge..."
                />
                <button
                  className="primary square"
                  aria-label="Design my solution"
                >
                  <ArrowRight />
                </button>
              </form>
              <div className="tiny-chips">
                {[
                  "I need an AI sales agent",
                  "Automate my business",
                  "Create content for my brand",
                  "Build a SaaS product",
                ].map((c) => (
                  <button key={c} onClick={() => start(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <NextLink
              className="outline-call"
              href="mailto:info@cubeappmaker.agency?subject=Book%20a%20discovery%20call"
            >
              <Calendar size={15} /> Book a Free Call
            </NextLink>
          </section>
          <section className="about-section" id="about">
            <div>
              <span className="eyebrow">HOW WE BUILD</span>
              <h2>
                From possibility to <em>practical impact.</em>
              </h2>
              <p>
                One partner for AI strategy, product engineering and connected
                workflows. We start with the problem, prove the approach, and
                build for the people who use it.
              </p>
            </div>
            <ol>
              {[
                [
                  "Discover",
                  "Understand your goals, data and current workflow.",
                ],
                ["Design", "Define architecture, scope and success criteria."],
                [
                  "Build",
                  "Ship a focused pilot with evaluation and human oversight.",
                ],
                ["Evolve", "Review real usage and improve the system."],
              ].map(([a, b], i) => (
                <li key={a}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{a}</h3>
                    <p>{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="insights-section" id="insights">
            <div>
              <span className="eyebrow">A CLEARER START</span>
              <h2>Before you build.</h2>
            </div>
            {[
              [
                "Where should we start with AI?",
                "Choose one repeated task with clear inputs and an outcome you can evaluate. Check data and permissions before selecting a model.",
              ],
              [
                "Can AI work with our existing tools?",
                "Often, yes. We assess available APIs, access controls and workflow requirements before recommending an integration.",
              ],
              [
                "How long will our project take?",
                "Timing depends on scope, data readiness and integrations. Discovery defines the pilot and a realistic delivery plan.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={16} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </section>
        </main>
        <footer>
          <Brand />
          <span>AI Transformation Studio</span>
          <NextLink href="mailto:info@cubeappmaker.agency">
            info@cubeappmaker.agency
          </NextLink>
          <NextLink href="tel:+37495555997">
            +374 95 555 997
          </NextLink>
          <button
            onClick={() =>
              setDetail({
                title: "Privacy & your project brief",
                text: "Your draft is saved in this browser session. If an AI provider is configured, your business challenge is sent to it when you request a recommendation. Your full brief is sent to CRM only when you submit it; download and email actions remain under your control. No raw conversations are sent to analytics. Sound is off until enabled. Clear your saved conversation from the assistant at any time.",
              })
            }
          >
            Privacy
          </button>
          <small>© {new Date().getFullYear()} CubeAppMaker.agency</small>
        </footer>
      </div>
      <button
        className="floating-cube"
        aria-label="Open Cube AI"
        onClick={() => {
          setInitial("");
          setChat(true);
          track("contact_started");
        }}
      >
        <Box />
      </button>
      {mounted && chat && (
        <SalesAssistant
          open={chat}
          onOpenChange={(v) => {
            setChat(v);
            if (!v) setState("IDLE");
          }}
          initial={initial}
          selected={selected}
          onState={setState}
        />
      )}
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="detail-dialog">
          <DialogTitle>{detail?.title}</DialogTitle>
          <DialogDescription>{detail?.text}</DialogDescription>
          <button
            className="primary"
            onClick={() => {
              const title = detail?.title;
              setDetail(null);
              start("I’m interested in " + title);
            }}
          >
            Design a solution for me <ArrowRight size={16} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
