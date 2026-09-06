import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i, /^scontent/i];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  const filename = req.nextUrl.searchParams.get("filename") ?? "instagram-media";
  if (!u) {
    return NextResponse.json({ error: "missing_url", message: "Missing ?u= parameter." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return NextResponse.json({ error: "invalid_url", message: "Bad media URL." }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED.some((re) => re.test(target.hostname))) {
    return NextResponse.json({ error: "invalid_url", message: "Media host not allowed." }, { status: 400 });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const upstream = await fetch(target.toString(), {
    headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream_failed", message: "Download source expired. Re-fetch the link." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}
