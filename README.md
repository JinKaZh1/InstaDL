# InstaDL

Paste a public Instagram Reel or post link, pick quality, download.

## Prereqs

- Node 18+
- `yt-dlp` on PATH (the `/api/info` route shells out to it):
  - Windows: `winget install yt-dlp` or `pip install yt-dlp`
  - macOS: `brew install yt-dlp`
  - Linux: `pip install yt-dlp`
- Or set `YTDLP_PATH` in `.env.local` to point at the binary.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, paste a public Reel/post URL.

## Notes

- fps shown is the file's native frame rate (display only — no re-encode in v1).
- Carousels list every item's variants.
- Private/deleted posts return a friendly error, nothing stored.
- Deploy: Vercel works if the runtime has yt-dlp; otherwise host on Railway/VPS with yt-dlp installed.
