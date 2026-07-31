import { GoogleGenAI } from "@google/genai";
import type {
  AdPlatform,
  AnalyzeErrorResponse,
  AnalyzeRequestBody,
  AnalyzeResult,
  CompetitorAd,
  CompetitorAnalysis,
  CounterStrategy,
} from "@/types";

export const dynamic = "force-dynamic";

// "gemini-1.5-flash" has been retired by Google; "gemini-flash-latest" is the
// current free-tier-eligible alias that always points at the newest Flash model.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * Stand-in for a real ad-scraping pipeline (e.g. Meta Ad Library / TikTok
 * Creative Center). Three representative creatives across platforms are fed
 * to the LLM as "what we found" for the requested competitor.
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

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    analysis: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence summary of the competitor's ad approach.",
        },
        toneOfVoice: { type: "string" },
        targetAudience: { type: "string" },
        primaryAngle: {
          type: "string",
          description: "The dominant persuasion angle used across their ads.",
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
            description: "The counter-positioning angle, distinct from the competitor's primary angle.",
          },
          rationale: {
            type: "string",
            description: "Why this angle exploits a specific weakness in the competitor's approach.",
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
              "A ready-to-use, richly descriptive prompt (subject, composition, lighting, style, aspect ratio) for an AI image generator to create the ad's visual.",
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

function buildPrompt(competitorName: string): string {
  const adsBlock = MOCK_COMPETITOR_ADS.map(
    (ad, i) =>
      `${i + 1}. [${ad.platform} — ${ad.format}]\n   Angle: ${ad.angle}\n   Headline: "${ad.headline}"\n   Body: "${ad.body}"\n   CTA: "${ad.cta}"`
  ).join("\n\n");

  return `You are a senior performance marketing strategist and competitive-intelligence analyst.

Competitor being analyzed: "${competitorName}"

Below are the competitor's ads we pulled from ad libraries across platforms:

${adsBlock}

Analyze this competitor's advertising approach, then produce exactly THREE distinct counter-strategies a challenger brand could run against them. Each counter-strategy must:
- Attack a specific weakness you identified (do not just restate the competitor's angle in different words).
- Be genuinely different from the other two (different angle, different emotional lever, different channel mix where sensible).
- Include ready-to-run ad copy and a detailed AI image-generation prompt for the visual.

Respond with JSON only, matching the provided response schema exactly.`;
}

function buildMockResult(competitorName: string): AnalyzeResult {
  const name = competitorName.trim();

  const analysis: CompetitorAnalysis = {
    summary: `${name} leans heavily on social proof and urgency to push fast sign-ups, backed by a scrappy, testimonial-driven video presence and a more polished, authority-focused display push for retargeting. The throughline across all three creatives is "everyone already trusts us — don't be the one left behind."`,
    toneOfVoice: "Confident, slightly urgent, peer-driven — talks to the prospect like a friend who already made the switch.",
    targetAudience: "Operators and small team leads who are price-sensitive, comparison-shopping, and influenced by visible adoption numbers more than technical depth.",
    primaryAngle: "Bandwagon urgency: \"everyone else already switched, don't be last.\"",
    strengths: [
      "High-volume social proof (specific user counts, star ratings) builds fast trust",
      "UGC-style video feels authentic and lowers guard compared to polished ads",
      "Consistent CTA ladder (free trial → compare plans) matches funnel stage to channel",
    ],
    weaknesses: [
      "Every angle relies on the same lever (social proof) — no emotional or outcome-based hook for buyers who don't respond to herd behavior",
      "No mention of specific, measurable outcomes (time saved, revenue impact) beyond vague claims",
      "Discount-led urgency trains the audience to wait for the next promo instead of buying at full price",
    ],
    adsAnalyzed: MOCK_COMPETITOR_ADS,
  };

  const counterStrategies: CounterStrategy[] = [
    {
      id: "strategy-1",
      title: "The Anti-Herd Play",
      angle: "Outcome-first, zero social-proof pressure",
      rationale: `${name}'s ads sell "everyone already switched." We flip it: sell the specific, measurable result instead of the crowd, winning over skeptical buyers who distrust bandwagon marketing.`,
      targetAudience: "Analytical decision-makers who ignore hype-driven ads and want proof in numbers, not testimonials.",
      channels: ["Google Display", "LinkedIn"],
      headline: "11 hours back every week. Here's the math.",
      body: "No trends, no hype — just a transparent breakdown of exactly where the time savings come from. See the calculator, plug in your team size, decide for yourself.",
      cta: "See the Calculator",
      imagePrompt:
        "Clean editorial product shot: a minimalist dashboard UI floating above a wooden desk, showing a simple time-saved counter animating upward, soft studio lighting from the top-left, muted sage-and-cream color palette, shallow depth of field, no people, 4:5 aspect ratio, high-end SaaS advertising photography style.",
    },
    {
      id: "strategy-2",
      title: "Founder-to-Founder Honesty",
      angle: "Transparent, unpolished credibility over discount urgency",
      rationale: `${name} uses discount-driven urgency, which trains buyers to wait. We counter with founder-led transparency that builds trust without ever mentioning price — a lever they aren't using.`,
      targetAudience: "Early-stage founders and small business owners fatigued by discount-chasing and slick marketing claims.",
      channels: ["TikTok", "Instagram"],
      headline: "I built this because the other tools lied about the setup time",
      body: "Real founder, real screen recording, no script: watch the actual onboarding from zero to first result, mistakes included. What you see is what you get.",
      cta: "Watch the Full Setup",
      imagePrompt:
        "Handheld, natural-light selfie-style video still: a founder mid-sentence at a cluttered home desk with sticky notes and a coffee mug, laptop screen visible showing a real product dashboard, warm afternoon window light, slightly imperfect framing for authenticity, vertical 9:16 aspect ratio, UGC creator aesthetic.",
    },
    {
      id: "strategy-3",
      title: "The Specificity Wedge",
      angle: "Niche-down positioning against a broad, generic claim",
      rationale: `${name} targets "growing teams" broadly with generic trust claims. We wedge into a specific underserved segment with language and outcomes tailored to them, making the generic competitor feel like it wasn't built for this buyer.`,
      targetAudience: "A narrow, underserved segment (e.g. solo operators or a specific vertical) that broad competitor messaging fails to address directly.",
      channels: ["Facebook", "Instagram"],
      headline: "Finally, built for solo operators — not enterprise teams pretending to care about you",
      body: "Every feature here assumes it's just you. No seat-based pricing, no admin bloat, no dashboards designed for a team of twelve. Just the workflow you actually need.",
      cta: "See the Solo Plan",
      imagePrompt:
        "Bright, airy flat-lay photograph: a single laptop on a small kitchen table with one coffee cup and one notebook (deliberately solo, no second chair or extra place setting), soft natural daylight, minimal Scandinavian styling, warm neutral tones, square 1:1 aspect ratio, aspirational solopreneur lifestyle photography.",
    },
  ];

  return {
    competitor: name,
    analysis,
    counterStrategies,
    generatedAt: new Date().toISOString(),
    source: "mock",
  };
}

async function generateWithGemini(competitorName: string): Promise<AnalyzeResult> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await client.models.generateContent({
    model: MODEL,
    contents: buildPrompt(competitorName),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSIS_JSON_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a text response.");
  }

  const parsed = JSON.parse(response.text) as {
    analysis: Omit<CompetitorAnalysis, "adsAnalyzed">;
    counterStrategies: Array<Omit<CounterStrategy, "id" | "channels"> & { channels: string[] }>;
  };

  const analysis: CompetitorAnalysis = {
    ...parsed.analysis,
    adsAnalyzed: MOCK_COMPETITOR_ADS,
  };

  const counterStrategies: CounterStrategy[] = parsed.counterStrategies.map((s, i) => ({
    ...s,
    id: `strategy-${i + 1}`,
    channels: s.channels as AdPlatform[],
  }));

  return {
    competitor: competitorName.trim(),
    analysis,
    counterStrategies,
    generatedAt: new Date().toISOString(),
    source: "ai",
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

  if (!competitorName) {
    const payload: AnalyzeErrorResponse = { error: "competitorName is required." };
    return Response.json(payload, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    const payload: AnalyzeResult = buildMockResult(competitorName);
    return Response.json(payload);
  }

  try {
    const result = await generateWithGemini(competitorName);
    return Response.json(result);
  } catch (error) {
    console.error("Gemini analysis failed, falling back to mock data:", error);
    const payload: AnalyzeResult = buildMockResult(competitorName);
    return Response.json(payload);
  }
}
