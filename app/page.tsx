"use client";

import { useState } from "react";
import MediaPreview from "@/components/MediaPreview";
import UrlForm from "@/components/UrlForm";
import VariantList from "@/components/VariantList";
import type { MediaInfo } from "@/lib/instagram";

export default function Home() {
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchInfo(url: string) {
    setLoading(true);
    setError(null);
    setInfo(null);
    setSelectedId(undefined);
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        return;
      }
      setInfo(data as MediaInfo);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold">
          Insta<span className="text-pink-500">DL</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a public Reel or post link, pick quality, download.
        </p>
      </header>

      <UrlForm onSubmit={fetchInfo} loading={loading} />

      {loading && (
        <div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          Resolving Instagram link…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {info && (
        <div className="flex flex-col gap-4">
          <MediaPreview info={info} variantId={selectedId} />
          <VariantList key={JSON.stringify(info.variants.map((v) => v.id))} variants={info.variants} onSelect={setSelectedId} />
        </div>
      )}

      <footer className="mt-auto pt-8 text-center text-xs text-zinc-600">
        For personal use only — respect creators&apos; rights. No login, nothing stored.
      </footer>
    </main>
  );
}
