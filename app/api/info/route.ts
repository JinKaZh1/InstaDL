import { execFile } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, classifyYtDlpError, normalizeInfo } from "@/lib/instagram";
import { isValidInstagramUrl, normalizeUrl } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

function runYtDlp(url: string): Promise<string> {
  const bin = process.env.YTDLP_PATH ?? "yt-dlp";
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      ["-J", "--no-playlist", "--no-warnings", url],
      { timeout: 25000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const perMin = Number(process.env.RATE_LIMIT_PER_MIN ?? 20);
  if (!checkRateLimit(ip, perMin)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Slow down a bit." },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_url", message: "Send a JSON body like { url }." }, { status: 400 });
  }

  const normalized = body.url ? normalizeUrl(body.url) : null;
  if (!normalized || !isValidInstagramUrl(normalized)) {
    return NextResponse.json(
      { error: "invalid_url", message: "That doesn't look like an Instagram Reel/post link." },
      { status: 400 }
    );
  }

  try {
    const stdout = await runYtDlp(normalized);
    let data;
    try {
      data = JSON.parse(stdout);
    } catch {
      return NextResponse.json(
        { error: "upstream_failed", message: "Instagram returned something unexpected. Try again." },
        { status: 502 }
      );
    }
    const info = normalizeInfo(data);
    if ("code" in info) {
      return NextResponse.json({ error: info.code, message: info.message }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const err = classifyYtDlpError(msg);
    if (err.code === "upstream_failed" && /empty media response|empty media|unable to extract/i.test(msg)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Instagram blocked this datacenter IP. Try again later or from another network." },
        { status: 429 }
      );
    }
    const status = err.code === "rate_limited" ? 429 : err.code === "not_found_or_private" ? 404 : 502;
    return NextResponse.json({ error: err.code, message: err.message }, { status });
  }
}
