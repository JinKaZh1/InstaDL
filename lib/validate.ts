const IG_RE =
  /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+\/)?(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/;

export function normalizeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase();
    if (host === "instagr.am") return withProto;
    if (host !== "instagram.com" && host !== "www.instagram.com") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function isValidInstagramUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  return normalized !== null && IG_RE.test(normalized.split("?")[0]);
}
