"use client";

import { useState } from "react";
import type { Variant } from "@/lib/instagram";

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "size unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function downloadHref(v: Variant): string {
  const filename = `instadl-${v.quality}.mp4`;
  if (v.kind === "image") {
    return `/api/download?u=${encodeURIComponent(v.mediaUrl)}&filename=${encodeURIComponent(`instadl-${v.quality}.${v.ext}`)}`;
  }
  if (v.needsMerge && v.videoUrl && v.audioUrl) {
    return `/api/merge?v=${encodeURIComponent(v.videoUrl)}&a=${encodeURIComponent(v.audioUrl)}&filename=${encodeURIComponent(filename)}`;
  }
  return `/api/download?u=${encodeURIComponent(v.mediaUrl)}&filename=${encodeURIComponent(filename)}`;
}

export default function VariantList({
  variants,
  onSelect,
}: {
  variants: Variant[];
  onSelect?: (id: string) => void;
}) {
  const [selected, setSelected] = useState(variants[0]?.id);
  const current = variants.find((v) => v.id === selected) ?? variants[0];
  if (!current) return null;

  const href = downloadHref(current);

  function pick(id: string) {
    setSelected(id);
    onSelect?.(id);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Pick quality
      </h2>
      <div className="space-y-2">
        {variants.map((v) => (
          <label
            key={v.id}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${
              v.id === selected
                ? "border-pink-500 bg-pink-500/10"
                : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="variant"
                checked={v.id === selected}
                onChange={() => pick(v.id)}
                className="accent-pink-500"
              />
              <span className="font-semibold">{v.quality}</span>
              <span className="text-zinc-400">
                {v.width}×{v.height}
              </span>
            </span>
            <span className="text-xs text-zinc-400">
              {formatBytes(v.filesize)}
              {v.fps ? ` · ${v.fps}fps` : ""}
              {v.kind === "video" ? (v.needsMerge ? " · 🔊 merged" : " · 🔊 with sound") : ""}
              {` · .${v.kind === "video" ? "mp4" : v.ext}`}
            </span>
          </label>
        ))}
      </div>
      <a
        href={href}
        className="mt-4 block rounded-xl bg-pink-600 px-5 py-3 text-center text-sm font-semibold hover:bg-pink-500"
      >
        Download {current.quality} · {formatBytes(current.filesize)}
        {current.fps ? ` · ${current.fps}fps` : ""}
        {current.needsMerge ? " · merges video+audio" : ""}
      </a>
      <p className="mt-2 text-center text-xs text-zinc-500">
        {current.kind === "video"
          ? current.needsMerge
            ? "HD qualities ship video and audio separately — we merge them on the server with ffmpeg."
            : "Direct MP4 with sound, straight from Instagram."
          : "Original picture file from Instagram."}
      </p>
    </div>
  );
}
