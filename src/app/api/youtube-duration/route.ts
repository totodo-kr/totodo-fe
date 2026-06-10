import { NextRequest, NextResponse } from "next/server";

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    // youtube.com/shorts/VIDEO_ID
    const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
    // youtube.com/watch?v=VIDEO_ID or /embed/VIDEO_ID
    return u.searchParams.get("v") || u.pathname.match(/\/embed\/([^/?]+)/)?.[1] || null;
  } catch {
    return null;
  }
}

// ISO 8601 duration (PT4M13S) → seconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const videoId = extractYoutubeId(url);
  if (!videoId) return NextResponse.json({ error: "YouTube 영상 ID를 파싱할 수 없습니다." }, { status: 400 });

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(apiUrl, { cache: "no-store" });
  } catch (e) {
    return NextResponse.json({ error: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const json = await res.json();

  if (!res.ok) {
    const ytError = json?.error?.message ?? `HTTP ${res.status}`;
    return NextResponse.json({ error: `YouTube API 오류: ${ytError}` }, { status: 502 });
  }

  const duration = json.items?.[0]?.contentDetails?.duration as string | undefined;
  if (!duration) return NextResponse.json({ error: "영상 정보를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({ duration_seconds: parseDuration(duration) });
}
