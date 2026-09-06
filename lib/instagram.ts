export interface Variant {
  id: string;
  quality: string;
  width: number;
  height: number;
  fps: number | null;
  filesize: number | null;
  ext: string;
  mediaUrl: string;
  kind: "video" | "image";
  hasAudio: boolean;
  needsMerge: boolean;
  videoUrl: string | null;
  audioUrl: string | null;
}

export interface MediaInfo {
  type: "video" | "image" | "carousel";
  thumbnail: string | null;
  duration: number | null;
  caption: string | null;
  variants: Variant[];
}

interface YtDlpFormat {
  format_id?: string;
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  tbr?: number;
  format_note?: string;
  http_headers?: Record<string, string>;
}

interface YtDlpJson {
  _type?: string;
  entries?: YtDlpJson[];
  id?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  formats?: YtDlpFormat[];
  requested_formats?: YtDlpFormat[];
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
}

export type InfoError =
  | { code: "invalid_url"; message: string }
  | { code: "not_found_or_private"; message: string }
  | { code: "rate_limited"; message: string }
  | { code: "upstream_failed"; message: string };

const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string, perMin = 20): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const times = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  times.push(now);
  hits.set(ip, times);
  return times.length <= perMin;
}

function videoVariants(data: YtDlpJson): Variant[] {
  const formats = (data.formats ?? []).filter((f) => f.url);
  const isDash = (f: YtDlpFormat) => !!f.format_note?.includes("DASH");
  const audioOnly = formats.filter((f) => f.vcodec === "none" && f.acodec && f.acodec !== "none");
  const bestAudio =
    [...audioOnly].sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0))[0] ?? null;

  const dashVideos = formats
    .filter((f) => isDash(f) && f.vcodec && f.vcodec !== "none" && f.width && f.height)
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0));

  const progressive = formats.filter(
    (f) => (f.ext === "mp4" || !f.ext) && !isDash(f) && f.vcodec !== "none" && f.acodec !== "none"
  );
  const sizeOf = (f: YtDlpFormat) => f.filesize ?? f.filesize_approx ?? 0;
  const sorted = [...progressive].sort((a, b) => sizeOf(b) - sizeOf(a));

  const seen = new Set<string>();
  const out: Variant[] = [];

  for (const f of sorted) {
    const w = f.width ?? 0;
    const h = f.height ?? 0;
    const key = `${w}x${h}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const q = Math.min(w, h) || Math.max(w, h);
    out.push({
      id: f.format_id ?? key,
      quality: q ? `${q}p` : "Original",
      width: w,
      height: h,
      fps: f.fps ? Math.round(f.fps) : null,
      filesize: f.filesize ?? f.filesize_approx ?? null,
      ext: "mp4",
      mediaUrl: f.url!,
      kind: "video",
      hasAudio: true,
      needsMerge: false,
      videoUrl: null,
      audioUrl: null,
    });
  }

  if (bestAudio) {
    for (const v of dashVideos) {
      const w = v.width ?? 0;
      const h = v.height ?? 0;
      const key = `${w}x${h}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const vsize = v.filesize ?? v.filesize_approx ?? null;
      const asize = bestAudio.filesize ?? bestAudio.filesize_approx ?? null;
      const q = Math.min(w, h) || Math.max(w, h);
      out.push({
        id: `merged-${v.format_id ?? `${w}x${h}`}`,
        quality: q ? `${q}p` : "Original",
        width: w,
        height: h,
        fps: v.fps ? Math.round(v.fps) : null,
        filesize: vsize != null && asize != null ? vsize + asize : null,
        ext: "mp4",
        mediaUrl: v.url!,
        kind: "video",
        hasAudio: true,
        needsMerge: true,
        videoUrl: v.url!,
        audioUrl: bestAudio.url!,
      });
    }
  }

  out.sort((a, b) => b.height - a.height);
  return out;
}

function imageVariants(data: YtDlpJson): Variant[] {
  if (!data.url) return [];
  const ext = data.ext ?? "jpg";
  const w = data.width ?? 1080;
  const h = data.height ?? 1080;
  return [
    {
      id: "0",
      quality: w ? `${w}×${h}` : "Original",
      width: w,
      height: h,
      fps: null,
      filesize: null,
      ext,
      mediaUrl: data.url,
      kind: "image",
      hasAudio: false,
      needsMerge: false,
      videoUrl: null,
      audioUrl: null,
    },
  ];
}

function normalizeEntry(entry: YtDlpJson): MediaInfo | null {
  const variants =
    entry.formats && entry.formats.length > 0 ? videoVariants(entry) : imageVariants(entry);
  if (variants.length === 0) return null;
  return {
    type: variants[0].kind === "video" ? "video" : "image",
    thumbnail: entry.thumbnail ?? null,
    duration: entry.duration ?? null,
    caption: entry.title ?? entry.description ?? null,
    variants,
  };
}

export function normalizeInfo(data: YtDlpJson): MediaInfo | InfoError {
  if (data._type === "playlist" && data.entries) {
    const variants: Variant[] = [];
    let thumbnail: string | null = data.thumbnail ?? null;
    for (const entry of data.entries) {
      const info = normalizeEntry(entry);
      if (!info) continue;
      if (!thumbnail && info.thumbnail) thumbnail = info.thumbnail;
      variants.push(...info.variants);
    }
    if (variants.length === 0) {
      return { code: "not_found_or_private", message: "No downloadable media found. The post may be private or deleted." };
    }
    return { type: "carousel", thumbnail, duration: null, caption: data.title ?? null, variants };
  }
  const info = normalizeEntry(data);
  if (!info) {
    return { code: "not_found_or_private", message: "No downloadable media found. The post may be private or deleted." };
  }
  return info;
}

export function classifyYtDlpError(stderr: string): InfoError {
  const s = stderr.toLowerCase();
  if (s.includes("private") || s.includes("login required") || s.includes("not available") || s.includes("404")) {
    return { code: "not_found_or_private", message: "This post is private, deleted, or requires login." };
  }
  if (s.includes("rate-limit") || s.includes("429")) {
    return { code: "rate_limited", message: "Instagram is rate-limiting requests. Try again in a minute." };
  }
  return { code: "upstream_failed", message: "Could not fetch that link. Check the URL and try again." };
}
