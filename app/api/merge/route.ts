import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i, /^scontent/i];

function assertCdn(u: string): URL {
  const target = new URL(u);
  if (target.protocol !== "https:" || !ALLOWED.some((re) => re.test(target.hostname))) {
    throw new Error("Media host not allowed.");
  }
  return target;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

async function downloadTo(url: string, dest: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" } });
  if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

function mux(video: string, audio: string, out: string): Promise<void> {
  const bin = process.env.FFMPEG_PATH ?? "ffmpeg";
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      ["-y", "-v", "error", "-i", video, "-i", audio, "-c:v", "copy", "-c:a", "aac", "-shortest", "-movflags", "+faststart", out],
      { timeout: 55000 },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("v");
  const a = req.nextUrl.searchParams.get("a");
  const filename = req.nextUrl.searchParams.get("filename") ?? "instagram-video.mp4";
  if (!v || !a) {
    return NextResponse.json({ error: "missing_params", message: "Need ?v= and ?a= CDN URLs." }, { status: 400 });
  }

  let videoUrl: URL;
  let audioUrl: URL;
  try {
    videoUrl = assertCdn(v);
    audioUrl = assertCdn(a);
  } catch {
    return NextResponse.json({ error: "invalid_url", message: "Media host not allowed." }, { status: 400 });
  }

  const id = randomUUID();
  const dir = join(tmpdir(), `instadl-${id}`);
  const videoPath = join(dir, "v.mp4");
  const audioPath = join(dir, "a.m4a");
  const outPath = join(dir, "out.mp4");

  try {
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      downloadTo(videoUrl.toString(), videoPath),
      downloadTo(audioUrl.toString(), audioPath),
    ]);
    await mux(videoPath, audioPath, outPath);
    const data = await fs.readFile(outPath);
    const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safe}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "merge_failed", message: e instanceof Error ? e.message : "Could not merge video+audio." },
      { status: 502 }
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
