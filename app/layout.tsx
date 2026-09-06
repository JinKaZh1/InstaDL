import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaDL — Instagram Video & Photo Downloader",
  description: "Paste a public Instagram Reel or post link, pick quality, and download.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
