"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";

/* Brand / press kit: the Axon Careers mark, downloadable as SVG or PNG. The SVG
   files live in /public/brand; PNGs are rasterized in the browser from those SVGs
   so we don't ship binary assets. */

type Asset = { key: string; label: string; file: string; darkPreview?: boolean };
const ASSETS: Asset[] = [
  { key: "mark", label: "Mark", file: "/brand/axon-mark.svg" },
  { key: "mark-dark", label: "Mark, reversed", file: "/brand/axon-mark-dark.svg", darkPreview: true },
  { key: "logo", label: "Full logo", file: "/brand/axon-logo.svg" },
];

async function downloadPng(file: string, name: string, size = 1024) {
  const res = await fetch(file);
  const svgText = await res.text();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
  const ratio = img.width && img.height ? img.width / img.height : 1;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round(size / ratio);
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  canvas.toBlob((png) => {
    if (!png) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
}

export default function BrandPage() {
  const getSvg = useCallback((file: string, name: string) => {
    const a = document.createElement("a");
    a.href = file;
    a.download = name;
    a.click();
  }, []);

  return (
    <>
      <SiteNav />
      <main className="container-wide py-16 sm:py-20">
        <header className="max-w-2xl">
          <p className="eyebrow mb-3">Brand</p>
          <h1 className="font-serif text-display font-semibold text-ink">The Axon Careers mark.</h1>
          <p className="mt-4 text-lg text-ink-2">
            Download the logo for press, partnerships, or slides. Each comes on its background, ready to drop in.
            SVG stays crisp at any size; the PNG is a 1024px export. Please keep the proportions and colors as they are.
          </p>
        </header>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ASSETS.map((a) => (
            <div key={a.key} className="card overflow-hidden">
              <div
                className="grid h-56 place-items-center border-b p-8"
                style={{
                  borderColor: "var(--border)",
                  background: a.darkPreview ? "#0c1114" : "#f7f3e9",
                }}
              >
                {/* Preview the exact downloadable file (background baked in). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.file}
                  alt="Axon Careers logo"
                  className={a.key === "logo" ? "max-h-20 w-auto" : "h-28 w-28 rounded-xl"}
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-5">
                <span className="font-medium text-ink">{a.label}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => getSvg(a.file, `axon-${a.key}.svg`)}>
                    <Download size={14} /> SVG
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadPng(a.file, `axon-${a.key}.png`)}>
                    <Download size={14} /> PNG
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <p className="mt-10 text-sm text-ink-3">
          Colors: teal <code className="font-mono">#14808e</code> and deep teal <code className="font-mono">#0c5660</code>,
          with an amber accent <code className="font-mono">#b8893b</code>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
