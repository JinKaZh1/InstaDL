"use client";

import type { MediaInfo } from "@/lib/instagram";

export default function MediaPreview({ info, variantId }: { info: MediaInfo; variantId?: string }) {
  const video = (variantId ? info.variants.find((v) => v.id === variantId && v.kind === "video") : undefined)
    ?? info.variants.find((v) => v.kind === "video" && !v.needsMerge)
    ?? info.variants.find((v) => v.kind === "video");
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {video ? (
        <video key={video.id} src={video.mediaUrl} poster={info.thumbnail ?? undefined} controls muted={false} playsInline preload="metadata" className="max-h-[480px] w-full bg-black" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={info.thumbnail ?? info.variants[0]?.mediaUrl} alt="Instagram preview" className="max-h-[480px] w-full object-contain bg-black" />
      )}
      {video?.needsMerge && (
        <div className="border-t border-emerald-900 bg-emerald-950/50 px-4 py-2 text-xs text-emerald-300">
          Full audio is included when you hit Download — this preview plays video only.
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-zinc-400">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-medium uppercase">{info.type}</span>
        {info.duration ? <span>{Math.round(info.duration)}s</span> : null}
        {info.caption ? <span className="truncate">{info.caption}</span> : null}
      </div>
    </div>
  );
}
