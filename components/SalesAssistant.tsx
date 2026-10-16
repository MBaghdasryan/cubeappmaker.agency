"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Box, ArrowRight, Download, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { goals, modules, recommend } from "@/lib/catalog";
import { sound } from "@/lib/sound";
import { track } from "@/lib/analytics";
import { servicesForProblem } from "@/lib/recommendations";
import { apiRequest } from "@/lib/api-client";
import type { CubeState } from "./three/cube-controller";
type Message = { role: "assistant" | "user"; text: string };
type Draft = {
  messages: Message[];
  fields: Record<string, string>;
  step: number;
  selected: number[];
};
const questions = [
  ["company", "What’s your company or project called?"],
  ["industry", "Which industry do you work in?"],
  ["stack", "Which tools or CRM do you use today?"],
  ["timeline", "Do you have a target launch window?"],
  [
    "budgetRange",
    "Do you have an approximate budget range? You can skip this.",
  ],
  ["contact", "What email should we include in your project brief?"],
];
function readDraft(initial: string, selected: number[]): Draft {
  if (initial)
    return {
      messages: [
        { role: "user", text: initial },
        {
          role: "assistant",
          text: "Preparing a starting point for your project…",
        },
      ],
      fields: { problem: initial, goal: goals[recommend(initial)].name },
      step: 0,
      selected,
    };
  try {
    const raw = sessionStorage.getItem("cube-brief");
    if (raw) {
      const draft = JSON.parse(raw) as Draft;
      if (
        Array.isArray(draft.messages) &&
        draft.messages.every(
          (m) =>
            ["user", "assistant"].includes(m.role) &&
            typeof m.text === "string",
        ) &&
        Number.isInteger(draft.step) &&
        draft.step >= -1 &&
        draft.step <= questions.length &&
        draft.fields &&
        Object.values(draft.fields).every((v) => typeof v === "string")
      )
        return {
          ...draft,
          selected:
            Array.isArray(draft.selected) &&
            draft.selected.every(
              (i) => Number.isInteger(i) && i >= 0 && i < modules.length,
            )
              ? draft.selected
              : selected,
        };
    }
  } catch {}
  return {
    messages: [
      {
        role: "assistant",
        text: "Tell me what you want to improve or build. I’ll help organize a solution and a project brief.",
      },
    ],
    fields: {},
    step: -1,
    selected,
  };
}
export default function SalesAssistant({
  open,
  onOpenChange,
  initial,
  selected,
  onState,
  request = apiRequest,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: string;
  selected: number[];
  onState: (s: CubeState) => void;
  request?: typeof fetch;
}) {
  const [draft, setDraft] = useState(() => readDraft(initial, selected)),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(!!initial),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [connection, setConnection] = useState<{
      ai: boolean;
      crm: boolean;
      aiStatus?: string;
      crmStatus?: string;
    } | null>(null),
    [mode, setMode] = useState("guided");
  const bottom = useRef<HTMLDivElement>(null),
    activeRequest = useRef<AbortController | null>(null),
    started = useRef(false);
  const { messages, fields, step } = draft;
  useEffect(() => {
    const controller = new AbortController();
    void request("/api/status", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    })
      .then((r) => {
        if (!r.ok) throw new Error("status");
        return r.json() as Promise<{
          ai: boolean;
          crm: boolean;
          aiStatus: string;
          crmStatus: string;
        }>;
      })
      .then(setConnection)
      .catch(() => {
        if (!controller.signal.aborted)
          setConnection({
            ai: false,
            crm: false,
            aiStatus: "unavailable",
            crmStatus: "unavailable",
          });
      });
    return () => controller.abort();
  }, [request]);
  useEffect(() => {
    try {
      sessionStorage.setItem("cube-brief", JSON.stringify(draft));
    } catch {}
  }, [draft]);
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [messages]);
  const resolveRecommendation = useCallback(
    async (problem: string, controller: AbortController) => {
      try {
        const response = await request("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        const data = (await response.json()) as {
          summary?: string;
          components?: string[];
          mode?: string;
          error?: string;
        };
        if (
          !response.ok ||
          typeof data.summary !== "string" ||
          data.summary.length > 2500
        )
          throw new Error(data.error || "Invalid recommendation");
        if (controller.signal.aborted) return;
        setMode(data.mode === "ai" ? "ai" : "guided");
        setDraft((d) => ({
          ...d,
          messages: [
            { role: "user", text: problem },
            {
              role: "assistant",
              text:
                data.summary +
                "\nRelevant services: " +
                servicesForProblem(problem)
                  .map((s) => s[1])
                  .join(", ") +
                ".\n\n" +
                questions[0][1],
            },
          ],
          selected:
            !problem.startsWith("Build my solution") &&
            Array.isArray(data.components) &&
            data.components.length > 0 &&
            data.components.every((c) => modules.includes(c))
              ? data.components.map((c) => modules.indexOf(c))
              : d.selected,
        }));
        onState("RESULT");
        sound.play("ai-result");
      } catch {
        if (controller.signal.aborted) return;
        setMode("unavailable");
        setError(
          "Live recommendations are unavailable. Your request is preserved; continue with the guided brief.",
        );
        setDraft((d) => ({
          ...d,
          messages: [
            { role: "user", text: problem },
            {
              role: "assistant",
              text: `Suggested direction: ${goals[recommend(problem)].solution}.\n\n${questions[0][1]}`,
            },
          ],
        }));
        onState("ERROR");
        sound.play("ai-activate", 0.25);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [request, onState],
  );
  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      sessionStorage.removeItem("cube-lead-id");
    } catch {}
    void resolveRecommendation(initial, controller);
    return () => {
      controller.abort();
      started.current = false;
    };
  }, [initial, resolveRecommendation]);
  useEffect(() => () => activeRequest.current?.abort(), []);
  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    setError("");
    setValue("");
    sound.play("ai-activate");
    if (step === -1) {
      const g = goals[recommend(text)];
      setDraft({
        fields: { problem: text, goal: g.name },
        step: 0,
        selected: g.modules,
        messages: [
          { role: "user", text },
          {
            role: "assistant",
            text: "Preparing a starting point for your project…",
          },
        ],
      });
      setBusy(true);
      onState("PROCESSING");
      const controller = new AbortController();
      activeRequest.current = controller;
      void resolveRecommendation(text, controller);
      return;
    }
    if (step >= questions.length) return;
    const key = questions[step][0];
    if (
      key === "contact" &&
      text !== "Skipped" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
    ) {
      setError("Please enter a valid email address, or skip this question.");
      setValue(text);
      return;
    }
    const limit =
      key === "company" || key === "industry"
        ? 300
        : key === "timeline" || key === "budgetRange"
          ? 500
          : 2000;
    if (text.length > limit) {
      setError(`Please keep this answer under ${limit} characters.`);
      setValue(text);
      return;
    }
    setDraft((d) => ({
      ...d,
      fields: { ...d.fields, [key]: text },
      step: d.step + 1,
      messages: [
        ...d.messages,
        { role: "user", text },
        {
          role: "assistant",
          text:
            step + 1 < questions.length
              ? questions[step + 1][1]
              : `Your brief is ready.\n\nArchitecture: ${d.selected.map((i) => modules[i]).join(" → ")}.\nSuggested stack: ${d.selected.includes(4) ? "React, a secure API and your preferred cloud platform" : "a grounded AI assistant, your existing CRM and n8n or Make"}.\nStages: discovery → focused pilot → evaluation → rollout.\nTimeline and budget will be scoped after discovery.\n\nDownload the brief or open an email draft to discuss it with the team.`,
        },
      ],
    }));
    onState("RESULT");
    sound.play("ai-result");
  };
  const lead = () => ({
    ...fields,
    intent: fields.problem,
    recommendedServices: servicesForProblem(fields.problem || "").map(
      (s) => s[1],
    ),
    recommendedArchitecture: draft.selected.map((i) => modules[i]).join(" → "),
    conversationSummary: messages.map((m) => `${m.role}: ${m.text}`).join("\n"),
    source: "cubeapp-website",
    timestamp: new Date().toISOString(),
  });
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(lead(), null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cubeapp-project-brief.json";
    a.click();
    URL.revokeObjectURL(url);
    track("solution_builder_completed", {
      componentCount: draft.selected.length,
      delivery: "download",
    });
  };
  const send = async () => {
    if (busy || sent) return;
    if (!fields.contact || fields.contact === "Skipped") {
      setError(
        "Add a contact email before submitting, or download your brief.",
      );
      setDraft((d) => ({ ...d, step: 5 }));
      return;
    }
    setBusy(true);
    setError("");
    onState("PROCESSING");
    sound.play("ai-processing");
    try {
      let id = sessionStorage.getItem("cube-lead-id");
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("cube-lead-id", id);
      }
      const r = await request("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify(lead()),
        signal: AbortSignal.timeout(20000),
      });
      const data = (await r.json()) as { error?: string; delivered?: boolean };
      if (!r.ok || data.delivered !== true)
        throw new Error(
          data.error || "Delivery failed. Your brief is still saved here.",
        );
      setSent(true);
      track("lead_completed", {
        delivery: "crm",
        componentCount: draft.selected.length,
      });
      onState("RESULT");
      sound.play("ai-result");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to submit. Your brief is preserved. Please retry or email it.",
      );
      onState("ERROR");
      sound.play("ai-activate", 0.25);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    activeRequest.current?.abort();
    try {
      sessionStorage.removeItem("cube-brief");
      sessionStorage.removeItem("cube-lead-id");
    } catch {}
    setDraft({
      messages: [
        { role: "assistant", text: "What would you like to build or improve?" },
      ],
      fields: {},
      step: -1,
      selected,
    });
    setBusy(false);
    setSent(false);
    setError("");
    setValue("");
    onState("IDLE");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="chat-dialog"
        onCloseAutoFocus={(e) => {
          const trigger =
            document.querySelector<HTMLButtonElement>(".floating-cube");
          if (trigger) {
            e.preventDefault();
            trigger.focus();
          }
        }}
      >
        <DialogTitle>
          <Box /> Cube AI <small className="chat-note">Project guide</small>
        </DialogTitle>
        <DialogDescription>
          Build a clear brief, one question at a time.
        </DialogDescription>
        <p className="chat-note" data-testid="integration-status">
          {mode === "ai"
            ? "AI-assisted recommendations"
            : "Guided recommendations"}{" "}
          · AI:{" "}
          {connection
            ? connection.ai
              ? mode === "unavailable"
                ? "configured; last request failed"
                : mode === "ai"
                  ? "connected for this request"
                  : "configured; not yet verified"
              : connection.aiStatus === "unavailable"
                ? "status unavailable"
                : connection.aiStatus === "invalid_configuration"
                  ? "invalid configuration"
                  : "not configured"
            : "checking configuration"}{" "}
          · CRM:{" "}
          {connection
            ? connection.crm
              ? "configured; delivery confirmed on submit"
              : connection.crmStatus === "unavailable"
                ? "status unavailable � download or email your brief"
                : connection.crmStatus === "invalid_configuration"
                  ? "invalid configuration"
                  : "not configured — download or email your brief"
            : "checking configuration"}
        </p>
        <div className="chat-messages" aria-live="polite" aria-busy={busy}>
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.text}
            </div>
          ))}
          <div ref={bottom} />
        </div>
        {step < questions.length && (
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
          >
            <input
              aria-label={
                step < 0 ? "Your business challenge" : questions[step][1]
              }
              type={step === 5 ? "email" : "text"}
              disabled={busy}
              value={value}
              onFocus={() => {
                if (!busy) onState("LISTENING");
              }}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                step < 0
                  ? "Tell me about your idea..."
                  : step === 5
                    ? "you@company.com"
                    : "Your answer..."
              }
              maxLength={
                step === 0 || step === 1
                  ? 300
                  : step === 3 || step === 4
                    ? 500
                    : 2000
              }
              required
            />
            <button
              className="primary"
              disabled={busy}
              aria-label="Send answer"
            >
              <ArrowRight size={20} />
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="chat-error">
            {error}
          </p>
        )}
        {sent && <p role="status">Your brief was delivered successfully.</p>}
        <div className="chat-actions">
          {step >= 0 && step < questions.length && (
            <button disabled={busy} onClick={() => submit("Skipped")}>
              Skip this question
            </button>
          )}
          {step >= questions.length && (
            <>
              <button className="primary" onClick={download}>
                <Download size={14} /> Download brief
              </button>
              <a
                onClick={() =>
                  track("contact_started", { delivery: "email_draft" })
                }
                href={`mailto:info@cubeappmaker.agency?subject=${encodeURIComponent("AI project brief — " + (fields.company || "New project"))}&body=${encodeURIComponent(JSON.stringify(lead(), null, 2))}`}
              >
                Open email draft
              </a>
              {connection?.crm && (
                <button disabled={busy || sent} onClick={send}>
                  {busy ? "Sending…" : sent ? "Delivered" : "Submit brief"}
                </button>
              )}
            </>
          )}
          <button onClick={reset} className="text-link">
            <RotateCcw size={13} /> Start again
          </button>
        </div>
        <p className="chat-note">
          Your draft is saved in this browser session. AI recommendations use
          the configured service; your brief is sent only when you choose.
        </p>
      </DialogContent>
    </Dialog>
  );
}
