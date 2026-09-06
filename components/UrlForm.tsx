"use client";

import { useState } from "react";

export default function UrlForm({
  onSubmit,
  loading,
}: {
  onSubmit: (url: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste Instagram Reel or post link…"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-pink-500"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="shrink-0 rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold hover:bg-pink-500 disabled:opacity-50"
      >
        {loading ? "Fetching…" : "Fetch"}
      </button>
    </form>
  );
}
