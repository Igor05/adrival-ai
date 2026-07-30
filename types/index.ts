export type AdPlatform =
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "Google Display"
  | "YouTube"
  | "LinkedIn";

export interface CompetitorAd {
  id: string;
  platform: AdPlatform;
  format: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
}

export interface CompetitorAnalysis {
  summary: string;
  toneOfVoice: string;
  targetAudience: string;
  primaryAngle: string;
  strengths: string[];
  weaknesses: string[];
  adsAnalyzed: CompetitorAd[];
}

export interface CounterStrategy {
  id: string;
  title: string;
  angle: string;
  rationale: string;
  targetAudience: string;
  channels: AdPlatform[];
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
}

export type AnalysisSource = "ai" | "mock";

export interface AnalyzeResult {
  competitor: string;
  analysis: CompetitorAnalysis;
  counterStrategies: CounterStrategy[];
  generatedAt: string;
  source: AnalysisSource;
}

export interface AnalyzeRequestBody {
  competitorName: string;
}

export interface AnalyzeErrorResponse {
  error: string;
}
