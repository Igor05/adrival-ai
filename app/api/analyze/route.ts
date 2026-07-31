import { GoogleGenAI } from "@google/genai";
import { fetchProfileEvidence } from "@/lib/oembed";
import type {
  AdPlatform,
  AnalyzeErrorResponse,
  AnalyzeRequestBody,
  AnalyzeResult,
  CompetitorAd,
  CompetitorAnalysis,
  CounterStrategy,
  CoursePromo,
  CreatorPlatform,
  DataConfidence,
  ProfileEvidence,
  Source,
} from "@/types";

export const dynamic = "force-dynamic";
// Three sequential Gemini calls per request comfortably exceed the 10s
// default on Vercel — give the pipeline room to finish.
export const maxDuration = 60;

// "gemini-1.5-flash" has been retired by Google; "gemini-flash-latest" is the
// current free-tier-eligible alias that always points at the newest Flash model.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * Illustrative example ad formats — NOT the analyzed creator's actual posts.
 * A real ad/content-library pipeline (Meta Ad Library, TikTok Creative
 * Center) is out of scope for this MVP; the UI discloses this plainly via
 * `adsAnalyzedNote` rather than presenting these as real scraped content.
 */
const MOCK_COMPETITOR_ADS: CompetitorAd[] = [
  {
    id: "ad-1",
    platform: "Instagram",
    format: "Feed — single image",
    angle: "Social proof + urgency",
    headline: "40,000+ teams already switched. Are you still waiting?",
    body: "Rated 4.9/5 by real users. Setup takes 5 minutes, no credit card required. Limited-time: 30% off annual plans this week only.",
    cta: "Claim My Discount",
  },
  {
    id: "ad-2",
    platform: "TikTok",
    format: "Short-form UGC video (0:22)",
    angle: "Relatable pain point / before-after",
    headline: "POV: you just found the tool that saves you 10 hours a week",
    body: "Real user walkthrough going from spreadsheet chaos to a fully automated workflow in one weekend. Comments are full of people asking for the link.",
    cta: "Try It Free",
  },
  {
    id: "ad-3",
    platform: "Google Display",
    format: "Responsive display ad",
    angle: "Authority / trust",
    headline: "The #1 Rated Platform for Growing Teams",
    body: "Trusted by Fortune 500s and scrappy startups alike. Bank-level security, 99.9% uptime, and support that actually responds. Switch in minutes.",
    cta: "Compare Plans",
  },
];

const ADS_ANALYZED_NOTE =
  "Illustrative example ad formats for reference — not this creator's actual posts. Real ad-library sourcing (Meta Ad Library / TikTok Creative Center) is a larger integration outside this MVP's scope.";

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    analysis: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence summary of the creator's content approach.",
        },
        toneOfVoice: { type: "string" },
        targetAudience: { type: "string" },
        primaryAngle: {
          type: "string",
          description: "The dominant content/persuasion angle they lean on.",
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
        weaknesses: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: [
        "summary",
        "toneOfVoice",
        "targetAudience",
        "primaryAngle",
        "strengths",
        "weaknesses",
      ],
    },
    counterStrategies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          angle: {
            type: "string",
            description: "The counter-positioning angle, distinct from the creator's primary angle.",
          },
          rationale: {
            type: "string",
            description: "Why this angle exploits a specific weakness in their approach.",
          },
          targetAudience: { type: "string" },
          channels: {
            type: "array",
            items: {
              type: "string",
              enum: ["Instagram", "Facebook", "TikTok", "Google Display", "YouTube", "LinkedIn"],
            },
            minItems: 1,
            maxItems: 3,
          },
          headline: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
          imagePrompt: {
            type: "string",
            description:
              "A ready-to-use, richly descriptive prompt (subject, composition, lighting, style, aspect ratio) for an AI image generator to create the visual.",
          },
        },
        required: [
          "title",
          "angle",
          "rationale",
          "targetAudience",
          "channels",
          "headline",
          "body",
          "cta",
          "imagePrompt",
        ],
      },
    },
  },
  required: ["analysis", "counterStrategies"],
} as const;

function platformList(platforms: CreatorPlatform[]): string {
  return platforms.join(" and ");
}

/** Poetic, non-functional upsell placeholder — the real course lands later. */
function buildCoursePromo(strategy: { title: string }, platforms: CreatorPlatform[]): CoursePromo {
  return {
    headline: `Great angle. Now — who's drawing the carousel?`,
    body: `An idea is a spark; a scroll-stopping carousel is the fire. We're building a step-by-step course that turns "${strategy.title}" into ready-to-post ${platformList(platforms)} frames — the hook, the pacing, the caption, the swipe. Be first through the door when it launches.`,
    cta: "Join the Waitlist",
  };
}

// ---------------------------------------------------------------------------
// Agent 1 — Researcher: uses real Google Search grounding. Only reports what
// it can actually find; sources are extracted from grounding metadata, never
// authored by the model, so a citation link can never be a hallucination.
// ---------------------------------------------------------------------------
async function researchAgent(
  client: GoogleGenAI,
  competitorName: string,
  platforms: CreatorPlatform[]
): Promise<{ findings: string; sources: Source[] }> {
  const prompt = `You are a social media research analyst. Use web search to find real, current public information about the creator or brand "${competitorName}", specifically their presence on ${platformList(platforms)}.

Look for: their content tone of voice, who their audience appears to be, their primary content angle/positioning, and genuine strengths and weaknesses (or risks) in their public content strategy.

Rules:
- Only state things you found evidence for via search.
- If you cannot find enough reliable public information about this specific creator, say so explicitly instead of guessing or inventing specifics.
- Never invent statistics, quotes, or follower counts you did not actually retrieve.

Write your findings as plain research notes.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const findings = response.text ?? "";
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    let label = chunk.web?.title || uri;
    try {
      label = chunk.web?.title || new URL(uri).hostname;
    } catch {
      // keep the raw uri as the label if it isn't a parseable absolute URL
    }
    sources.push({ label, url: uri });
    if (sources.length >= 6) break;
  }

  return { findings, sources };
}

// ---------------------------------------------------------------------------
// Agent 2 — Verifier: cross-checks the researcher's notes against the actual
// retrieved sources, strips unsupported specifics, and rates confidence.
// ---------------------------------------------------------------------------
async function verifierAgent(
  client: GoogleGenAI,
  competitorName: string,
  findings: string,
  sources: Source[]
): Promise<{ verifiedNotes: string; confidence: DataConfidence }> {
  const sourceList = sources.length
    ? sources.map((s, i) => `${i + 1}. ${s.label} — ${s.url}`).join("\n")
    : "(no sources were retrieved)";

  const prompt = `You are a fact-checking editor. Below are raw research notes about "${competitorName}" and the list of sources that were actually retrieved during research.

RESEARCH NOTES:
${findings || "(no findings returned)"}

SOURCES RETRIEVED:
${sourceList}

Rewrite the notes keeping ONLY claims that are plausibly supported by the listed sources, or that are clearly framed as general industry patterns rather than specific facts about this creator. Remove or soften anything that reads like an invented, oddly-specific statistic with no source behind it.

Then, on its own final line, write exactly one of:
CONFIDENCE: grounded
CONFIDENCE: limited

Use "grounded" only if there are at least 2 relevant, on-topic sources backing real claims. Otherwise use "limited".`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text ?? "";
  const match = text.match(/CONFIDENCE:\s*(grounded|limited)/i);
  const confidence: DataConfidence = match?.[1]?.toLowerCase() === "grounded" ? "grounded" : "limited";
  const verifiedNotes = text.replace(/CONFIDENCE:\s*(grounded|limited)\s*$/i, "").trim();

  return { verifiedNotes, confidence };
}

// ---------------------------------------------------------------------------
// Agent 3 — Writer: turns verified notes into the final structured JSON. It
// never authors source URLs (those come from Agent 1) and is told plainly
// when confidence is "limited" so it hedges instead of inventing specifics.
// ---------------------------------------------------------------------------
async function writerAgent(
  client: GoogleGenAI,
  competitorName: string,
  platforms: CreatorPlatform[],
  verifiedNotes: string,
  confidence: DataConfidence
): Promise<{
  analysis: Omit<CompetitorAnalysis, "adsAnalyzed" | "adsAnalyzedNote" | "sources" | "confidence">;
  counterStrategies: Array<Omit<CounterStrategy, "id" | "channels" | "coursePromo"> & { channels: string[] }>;
}> {
  const adsBlock = MOCK_COMPETITOR_ADS.map(
    (ad, i) =>
      `${i + 1}. [${ad.platform} — ${ad.format}]\n   Angle: ${ad.angle}\n   Headline: "${ad.headline}"\n   Body: "${ad.body}"\n   CTA: "${ad.cta}"`
  ).join("\n\n");

  const honesty =
    confidence === "grounded"
      ? "The research below is reasonably well-sourced — reflect its specifics."
      : 'Public data on this specific creator was too sparse to confirm real specifics. Write the analysis around general, honestly-hedged patterns (e.g. "creators in this niche typically...") rather than inventing precise facts about them. Do not present guesses as confirmed data.';

  const prompt = `You are a senior social media strategist.

Creator/brand being analyzed: "${competitorName}" (active on ${platformList(platforms)})

VERIFIED RESEARCH NOTES:
${verifiedNotes || "(none — no usable public data was found)"}

${honesty}

For reference, here are illustrative example ad formats (NOT this creator's actual content — just a template of what a scroll-stopping post can look like):

${adsBlock}

Analyze this creator's content approach, then produce exactly THREE distinct counter-strategies a challenger creator/brand could run against them. Each counter-strategy must:
- Attack a specific weakness you identified (do not just restate their angle in different words).
- Be genuinely different from the other two (different angle, different emotional lever, different channel mix where sensible).
- Include ready-to-run post copy and a detailed AI image-generation prompt for the visual.

Respond with JSON only, matching the provided response schema exactly.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSIS_JSON_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a text response.");
  }

  return JSON.parse(response.text);
}

async function runAgentPipeline(
  competitorName: string,
  platforms: CreatorPlatform[]
): Promise<AnalyzeResult> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { findings, sources } = await researchAgent(client, competitorName, platforms);
  const { verifiedNotes, confidence } = await verifierAgent(client, competitorName, findings, sources);
  const written = await writerAgent(client, competitorName, platforms, verifiedNotes, confidence);

  const analysis: CompetitorAnalysis = {
    ...written.analysis,
    adsAnalyzed: MOCK_COMPETITOR_ADS,
    adsAnalyzedNote: ADS_ANALYZED_NOTE,
    sources,
    confidence,
  };

  const counterStrategies: CounterStrategy[] = written.counterStrategies.map((s, i) => ({
    ...s,
    id: `strategy-${i + 1}`,
    channels: s.channels as AdPlatform[],
    coursePromo: buildCoursePromo(s, platforms),
  }));

  return {
    competitor: competitorName.trim(),
    platforms,
    analysis,
    counterStrategies,
    profileEvidence: [],
    generatedAt: new Date().toISOString(),
    source: "ai",
  };
}

function buildMockResult(competitorName: string, platforms: CreatorPlatform[]): AnalyzeResult {
  const name = competitorName.trim();

  const analysis: CompetitorAnalysis = {
    summary: `${name} leans heavily on social proof and urgency to push fast follows, backed by a scrappy, testimonial-driven video presence and a more polished, authority-focused push for retargeting. The throughline across all three creatives is "everyone already trusts us — don't be the one left behind."`,
    toneOfVoice: "Confident, slightly urgent, peer-driven — talks to the audience like a friend who already made the switch.",
    targetAudience: "Followers who are comparison-shopping and influenced by visible adoption numbers more than niche depth.",
    primaryAngle: "Bandwagon urgency: \"everyone else already switched, don't be last.\"",
    strengths: [
      "High-volume social proof (specific counts, ratings) builds fast trust",
      "UGC-style video feels authentic and lowers guard compared to polished posts",
      "Consistent CTA ladder (follow → compare → convert) matches funnel stage to channel",
    ],
    weaknesses: [
      "Every angle relies on the same lever (social proof) — no emotional or outcome-based hook for viewers who don't respond to herd behavior",
      "No mention of specific, measurable outcomes beyond vague claims",
      "Discount-led urgency trains the audience to wait for the next promo instead of converting at full price",
    ],
    adsAnalyzed: MOCK_COMPETITOR_ADS,
    adsAnalyzedNote: ADS_ANALYZED_NOTE,
    sources: [],
    confidence: "limited",
  };

  const counterStrategies: CounterStrategy[] = [
    {
      id: "strategy-1",
      title: "The Anti-Herd Play",
      angle: "Outcome-first, zero social-proof pressure",
      rationale: `${name}'s content sells "everyone already switched." We flip it: sell the specific, measurable result instead of the crowd, winning over skeptical viewers who distrust bandwagon marketing.`,
      targetAudience: "Analytical viewers who ignore hype-driven content and want proof in numbers, not testimonials.",
      channels: ["Google Display", "LinkedIn"],
      headline: "11 hours back every week. Here's the math.",
      body: "No trends, no hype — just a transparent breakdown of exactly where the time savings come from. See the calculator, plug in your numbers, decide for yourself.",
      cta: "See the Calculator",
      imagePrompt:
        "Clean editorial product shot: a minimalist dashboard UI floating above a wooden desk, showing a simple time-saved counter animating upward, soft studio lighting from the top-left, muted sage-and-cream color palette, shallow depth of field, no people, 4:5 aspect ratio, high-end advertising photography style.",
      coursePromo: buildCoursePromo({ title: "The Anti-Herd Play" }, platforms),
    },
    {
      id: "strategy-2",
      title: "Founder-to-Founder Honesty",
      angle: "Transparent, unpolished credibility over discount urgency",
      rationale: `${name} uses discount-driven urgency, which trains viewers to wait. We counter with founder-led transparency that builds trust without ever mentioning price — a lever they aren't using.`,
      targetAudience: "Early-stage founders and creators fatigued by discount-chasing and slick marketing claims.",
      channels: ["TikTok", "Instagram"],
      headline: "I built this because the other tools lied about the setup time",
      body: "Real founder, real screen recording, no script: watch the actual onboarding from zero to first result, mistakes included. What you see is what you get.",
      cta: "Watch the Full Setup",
      imagePrompt:
        "Handheld, natural-light selfie-style video still: a founder mid-sentence at a cluttered home desk with sticky notes and a coffee mug, laptop screen visible showing a real product dashboard, warm afternoon window light, slightly imperfect framing for authenticity, vertical 9:16 aspect ratio, UGC creator aesthetic.",
      coursePromo: buildCoursePromo({ title: "Founder-to-Founder Honesty" }, platforms),
    },
    {
      id: "strategy-3",
      title: "The Specificity Wedge",
      angle: "Niche-down positioning against a broad, generic claim",
      rationale: `${name} targets a broad audience with generic trust claims. We wedge into a specific underserved segment with language and outcomes tailored to them, making the generic creator feel like they weren't built for this viewer.`,
      targetAudience: "A narrow, underserved segment that broad messaging fails to address directly.",
      channels: ["Facebook", "Instagram"],
      headline: "Finally, built for solo operators — not enterprise teams pretending to care about you",
      body: "Every feature here assumes it's just you. No seat-based pricing, no admin bloat, no dashboards designed for a team of twelve. Just the workflow you actually need.",
      cta: "See the Solo Plan",
      imagePrompt:
        "Bright, airy flat-lay photograph: a single laptop on a small kitchen table with one coffee cup and one notebook (deliberately solo, no second chair or extra place setting), soft natural daylight, minimal Scandinavian styling, warm neutral tones, square 1:1 aspect ratio, aspirational solopreneur lifestyle photography.",
      coursePromo: buildCoursePromo({ title: "The Specificity Wedge" }, platforms),
    },
  ];

  return {
    competitor: name,
    platforms,
    analysis,
    counterStrategies,
    profileEvidence: [],
    generatedAt: new Date().toISOString(),
    source: "mock",
  };
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = await request.json();
  } catch {
    const payload: AnalyzeErrorResponse = { error: "Invalid JSON body." };
    return Response.json(payload, { status: 400 });
  }

  const competitorName = body?.competitorName?.trim();
  const platforms = (body?.platforms ?? []).filter(
    (p): p is CreatorPlatform => p === "Instagram" || p === "TikTok"
  );
  const postUrls = body?.postUrls ?? [];

  if (!competitorName) {
    const payload: AnalyzeErrorResponse = { error: "competitorName is required." };
    return Response.json(payload, { status: 400 });
  }

  if (platforms.length === 0) {
    const payload: AnalyzeErrorResponse = { error: "Select at least one platform (Instagram and/or TikTok)." };
    return Response.json(payload, { status: 400 });
  }

  // Real oEmbed lookups don't need a Gemini key — fetch them regardless.
  const profileEvidence: ProfileEvidence[] = await fetchProfileEvidence(postUrls);

  if (!process.env.GEMINI_API_KEY) {
    const payload = buildMockResult(competitorName, platforms);
    payload.profileEvidence = profileEvidence;
    return Response.json(payload);
  }

  try {
    const result = await runAgentPipeline(competitorName, platforms);
    result.profileEvidence = profileEvidence;
    return Response.json(result);
  } catch (error) {
    console.error("Gemini agent pipeline failed, falling back to mock data:", error);
    const payload = buildMockResult(competitorName, platforms);
    payload.profileEvidence = profileEvidence;
    return Response.json(payload);
  }
}
