export type AdPlatform =
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "Google Display"
  | "YouTube"
  | "LinkedIn";

// The platform(s) the creator/competitor being analyzed is actually active on.
export type CreatorPlatform = "Instagram" | "TikTok";

export interface CompetitorAd {
  id: string;
  platform: AdPlatform;
  format: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
}

export interface Source {
  label: string;
  url: string;
}

// "grounded": backed by real sources the research step actually found.
// "limited": public data was too sparse to confirm — copy should say so plainly.
export type DataConfidence = "grounded" | "limited";

export interface CompetitorAnalysis {
  summary: string;
  toneOfVoice: string;
  targetAudience: string;
  primaryAngle: string;
  strengths: string[];
  weaknesses: string[];
  adsAnalyzed: CompetitorAd[];
  adsAnalyzedNote: string;
  sources: Source[];
  confidence: DataConfidence;
}

export interface CoursePromo {
  headline: string;
  body: string;
  cta: string;
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
  coursePromo: CoursePromo;
}

// Real, fetched-at-request-time evidence for a specific post/profile the user
// linked to — never AI-generated, so it can carry an actual thumbnail/caption.
export interface ProfileEvidence {
  platform: CreatorPlatform | "Unknown";
  url: string;
  authorName?: string;
  title?: string;
  thumbnailUrl?: string;
  error?: string;
}

export type AnalysisSource = "ai" | "mock";

// Why a "mock" result was returned — lets the UI say something more useful
// than a blanket "no API key" when the key is fine but the live call failed.
export type MockReason = "no_key" | "error";

export interface AnalyzeResult {
  competitor: string;
  platforms: CreatorPlatform[];
  analysis: CompetitorAnalysis;
  counterStrategies: CounterStrategy[];
  profileEvidence: ProfileEvidence[];
  generatedAt: string;
  source: AnalysisSource;
  mockReason?: MockReason;
  mockReasonDetail?: string;
}

export interface AnalyzeRequestBody {
  competitorName: string;
  platforms: CreatorPlatform[];
  postUrls?: string[];
}

export interface AnalyzeErrorResponse {
  error: string;
}
