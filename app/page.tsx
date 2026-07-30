"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  Swords,
  Loader2,
  Sparkles,
  Radar,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Target,
  Megaphone,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";
import type { AnalyzeErrorResponse, AnalyzeResult, CounterStrategy } from "@/types";

type ViewState = "idle" | "loading" | "error" | "success";

export default function Home() {
  const [competitorName, setCompetitorName] = useState("");
  const [view, setView] = useState<ViewState>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = competitorName.trim();
    if (!name || view === "loading") return;

    setView("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorName: name }),
      });

      if (!res.ok) {
        const data: AnalyzeErrorResponse = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      const data: AnalyzeResult = await res.json();
      setResult(data);
      setView("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setView("error");
    }
  }

  return (
    <div className="relative flex-1 bg-neutral-950 text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(215,38,61,0.12),transparent)]"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col px-6 py-16 sm:py-24">
        <header className="mb-12 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered competitive ad intelligence
          </div>
          <div className="mb-4 flex items-center gap-3">
            <Swords className="h-8 w-8 text-accent" />
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              AdRival <span className="text-accent">AI</span>
            </h1>
          </div>
          <p className="max-w-xl text-balance text-lg text-neutral-400">
            Turn their ad spend into your playbook. Enter any competitor and get
            an instant breakdown of their ads — plus three ready-to-run counter
            strategies.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mb-16 flex w-full max-w-lg flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
            placeholder="e.g. Notion, Allbirds, HubSpot..."
            disabled={view === "loading"}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={view === "loading" || !competitorName.trim()}
            className={clsx(
              "flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition",
              "bg-accent hover:bg-accent-hover active:bg-accent-dim",
              "disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            )}
          >
            {view === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Radar className="h-4 w-4" />
                Analyze Competitor
              </>
            )}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <SkeletonCard lines={4} />
              <div className="grid gap-6 sm:grid-cols-3">
                <SkeletonCard lines={5} />
                <SkeletonCard lines={5} />
                <SkeletonCard lines={5} />
              </div>
            </motion.div>
          )}

          {view === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-300"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </motion.div>
          )}

          {view === "success" && result && (
            <motion.div
              key="success"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
              }}
              className="space-y-8"
            >
              <SourceBadge source={result.source} />
              <AnalysisCard result={result} />
              <div>
                <h2 className="font-heading mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                  <Target className="h-5 w-5 text-accent" />
                  3 Counter-Strategies
                </h2>
                <div className="grid gap-6 sm:grid-cols-3">
                  {result.counterStrategies.map((strategy) => (
                    <StrategyCard key={strategy.id} strategy={strategy} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: AnalyzeResult["source"] }) {
  const isAi = source === "ai";
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        isAi
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      )}
    >
      <Sparkles className="h-3 w-3" />
      {isAi ? "Powered by Claude" : "Demo mode — no API key set"}
    </div>
  );
}

function AnalysisCard({ result }: { result: AnalyzeResult }) {
  const { analysis, competitor } = result;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <h2 className="font-heading mb-2 text-xl font-semibold text-white">{competitor}</h2>
      <p className="mb-5 text-sm leading-relaxed text-neutral-400">{analysis.summary}</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Tone of voice" value={analysis.toneOfVoice} />
        <StatTile label="Target audience" value={analysis.targetAudience} />
        <StatTile label="Primary angle" value={analysis.primaryAngle} />
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-sm text-neutral-400">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-orange-300">
            <XCircle className="h-4 w-4" />
            Weaknesses
          </h3>
          <ul className="space-y-1.5">
            {analysis.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-neutral-400">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-neutral-300">
          <Megaphone className="h-4 w-4" />
          Ads analyzed
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {analysis.adsAnalyzed.map((ad) => (
            <div key={ad.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {ad.platform}
              </p>
              <p className="line-clamp-2 text-xs text-neutral-300">{ad.headline}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="text-sm text-neutral-200">{value}</p>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: CounterStrategy }) {
  const [copied, setCopied] = useState(false);

  async function copyImagePrompt() {
    await navigator.clipboard.writeText(strategy.imagePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {strategy.channels.map((c) => (
          <span
            key={c}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-400"
          >
            {c}
          </span>
        ))}
      </div>

      <h3 className="font-heading mb-1 text-base font-semibold text-white">{strategy.title}</h3>
      <p className="mb-3 text-xs font-medium text-neutral-500">{strategy.angle}</p>
      <p className="mb-4 text-sm leading-relaxed text-neutral-400">{strategy.rationale}</p>

      <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-100">{strategy.headline}</p>
        <p className="mb-2 text-xs leading-relaxed text-neutral-400">{strategy.body}</p>
        <span className="inline-block rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white">
          {strategy.cta}
        </span>
      </div>

      <div className="mt-auto rounded-lg border border-white/10 bg-black/30 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            <ImageIcon className="h-3 w-3" />
            Image prompt
          </p>
          <button
            type="button"
            onClick={copyImagePrompt}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-neutral-400 transition hover:bg-white/10 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-neutral-400">
          {strategy.imagePrompt}
        </p>
      </div>
    </motion.div>
  );
}

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-3 animate-pulse rounded-full bg-white/10",
              i === 0 ? "w-1/2" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  );
}
