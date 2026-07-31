import type { CreatorPlatform, ProfileEvidence } from "@/types";

function detectPlatform(url: string): CreatorPlatform | null {
  if (/(^|\.)instagram\.com/i.test(url)) return "Instagram";
  if (/(^|\.)tiktok\.com/i.test(url)) return "TikTok";
  return null;
}

async function fetchTikTokOEmbed(url: string): Promise<ProfileEvidence> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`TikTok oEmbed responded with ${res.status}.`);
    const data = await res.json();
    return {
      platform: "TikTok",
      url,
      authorName: data.author_name,
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error) {
    return {
      platform: "TikTok",
      url,
      error: error instanceof Error ? error.message : "Failed to fetch TikTok oEmbed data.",
    };
  }
}

async function fetchInstagramOEmbed(url: string): Promise<ProfileEvidence> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return {
      platform: "Instagram",
      url,
      error:
        "Instagram locked its oEmbed endpoint behind an approved Meta app token. Set INSTAGRAM_ACCESS_TOKEN to enable real previews.",
    };
  }

  try {
    const endpoint = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Instagram oEmbed responded with ${res.status}.`);
    const data = await res.json();
    return {
      platform: "Instagram",
      url,
      authorName: data.author_name,
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error) {
    return {
      platform: "Instagram",
      url,
      error: error instanceof Error ? error.message : "Failed to fetch Instagram oEmbed data.",
    };
  }
}

/**
 * Fetches real, official oEmbed data for user-supplied post/profile URLs —
 * genuine evidence (real avatar/caption/thumbnail), never AI-generated.
 */
export async function fetchProfileEvidence(urls: string[]): Promise<ProfileEvidence[]> {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);

  return Promise.all(
    cleaned.map(async (url) => {
      const platform = detectPlatform(url);
      if (!platform) {
        return {
          platform: "Unknown" as const,
          url,
          error: "That doesn't look like an Instagram or TikTok link.",
        };
      }
      return platform === "TikTok" ? fetchTikTokOEmbed(url) : fetchInstagramOEmbed(url);
    })
  );
}
