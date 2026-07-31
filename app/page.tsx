"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
  Camera,
  Music2,
  BadgeCheck,
  ExternalLink,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import type {
  AnalyzeErrorResponse,
  AnalyzeResult,
  CounterStrategy,
  CoursePromo,
  CreatorPlatform,
  DataConfidence,
  ProfileEvidence,
} from "@/types";

type ViewState = "idle" | "loading" | "error" | "success";

const PLATFORM_OPTIONS: { value: CreatorPlatform; label: string; icon: typeof Camera }[] = [
  { value: "Instagram", label: "Instagram", icon: Camera },
  { value: "TikTok", label: "TikTok", icon: Music2 },
];

export default function Home() {
  const [competitorName, setCompetitorName] = useState("");
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>(["Instagram"]);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [view, setView] = useState<ViewState>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  function togglePlatform(p: CreatorPlatform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = competitorName.trim();
    if (!name || platforms.length === 0 || view === "loading") return;

    setView("loading");
    setErrorMessage("");

    const postUrls = [instagramUrl, tiktokUrl].map((u) => u.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorName: name, platforms, postUrls }),
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

  const showEvidenceFields = platforms.length > 0;

  return (
    <div className="relative flex-1 bg-neutral-950 text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(215,38,61,0.12),transparent)]"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col px-6 py-16 sm:py-24">
        <header className="mb-10 flex flex-col items-center text-center">
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
            an instant breakdown of their content — plus three ready-to-run
            counter strategies.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mx-auto mb-16 w-full max-w-lg">
          <div className="mb-3 flex justify-center gap-2">
            {PLATFORM_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = platforms.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePlatform(value)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mb-4 text-center text-[11px] text-neutral-500">
            Select both if this creator posts on both platforms.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
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
              disabled={view === "loading" || !competitorName.trim() || platforms.length === 0}
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
          </div>

          {showEvidenceFields && (
            <div className="mt-4">
              <p className="mb-2 text-center text-[11px] text-neutral-500">
                Optional — paste a real post URL for genuine profile evidence (never AI-generated)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {platforms.includes("Instagram") && (
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="Instagram post URL"
                    disabled={view === "loading"}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none transition focus:border-accent/60 disabled:opacity-60"
                  />
                )}
                {platforms.includes("TikTok") && (
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="TikTok post URL"
                    disabled={view === "loading"}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none transition focus:border-accent/60 disabled:opacity-60"
                  />
                )}
              </div>
            </div>
          )}
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
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={result.source} />
                <ConfidenceBadge confidence={result.analysis.confidence} />
              </div>

              {result.profileEvidence.length > 0 && (
                <ProfileEvidenceSection evidence={result.profileEvidence} />
              )}

              <AnalysisCard result={result} />

              <div>
                <h2 className="font-heading mb-1 flex items-center gap-2 text-xl font-semibold text-white">
                  <Target className="h-5 w-5 text-accent" />
                  3 Counter-Strategies
                </h2>
                <p className="mb-4 text-sm text-neutral-500">
                  Each card: the angle to take, why it beats them, ready-to-post copy, an
                  image prompt for the visual — and a course to help you execute it.
                </p>
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
      {isAi ? "Powered by Gemini" : "Demo mode — no API key set"}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: DataConfidence }) {
  const grounded = confidence === "grounded";
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        grounded
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-neutral-600/40 bg-white/5 text-neutral-400"
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {grounded ? "Grounded in public sources" : "Limited public data — treat as directional"}
    </div>
  );
}

function ProfileEvidenceSection({ evidence }: { evidence: ProfileEvidence[] }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5"
    >
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-300">
        <BadgeCheck className="h-4 w-4" />
        Real profile evidence
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {evidence.map((item, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
            {item.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external CDN, not a local/known domain
              <img
                src={item.thumbnailUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {item.platform}
              </p>
              {item.error ? (
                <p className="text-xs text-neutral-500">{item.error}</p>
              ) : (
                <>
                  <p className="truncate text-xs font-medium text-neutral-100">
                    {item.authorName}
                  </p>
                  <p className="line-clamp-2 text-xs text-neutral-400">{item.title}</p>
                </>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                View original
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
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

      {analysis.sources.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-neutral-300">
            <ExternalLink className="h-4 w-4" />
            Sources
          </h3>
          <ul className="space-y-1">
            {analysis.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-6 text-xs italic text-neutral-500">
          No verifiable public sources were found for this query — treat the analysis
          below as directional, not confirmed fact.
        </p>
      )}

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
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-300">
          <Megaphone className="h-4 w-4" />
          Ads analyzed
        </h3>
        <p className="mb-2 text-[11px] italic text-neutral-500">{analysis.adsAnalyzedNote}</p>
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </p>
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

      <h3 className="font-heading mb-2 text-base font-semibold text-white">{strategy.title}</h3>

      <SectionLabel>The angle</SectionLabel>
      <p className="mb-3 text-xs font-medium text-neutral-400">{strategy.angle}</p>

      <SectionLabel>Why it works</SectionLabel>
      <p className="mb-4 text-sm leading-relaxed text-neutral-400">{strategy.rationale}</p>

      <SectionLabel>Sample post copy</SectionLabel>
      <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-100">{strategy.headline}</p>
        <p className="mb-2 text-xs leading-relaxed text-neutral-400">{strategy.body}</p>
        <span className="inline-block rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white">
          {strategy.cta}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
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

      <CoursePromoCard promo={strategy.coursePromo} />
    </motion.div>
  );
}

function CoursePromoCard({ promo }: { promo: CoursePromo }) {
  return (
    <div className="mt-auto rounded-lg border border-dashed border-accent/30 bg-accent/[0.06] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
        <Lightbulb className="h-3 w-3" />
        Content course
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium normal-case text-neutral-400">
          Coming soon
        </span>
      </div>
      <p className="mb-1 text-xs font-medium text-neutral-100">{promo.headline}</p>
      <p className="mb-2 text-[11px] leading-relaxed text-neutral-400">{promo.body}</p>
      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-md border border-accent/40 px-2.5 py-1 text-[11px] font-medium text-accent/70"
      >
        {promo.cta}
      </button>
    </div>
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
