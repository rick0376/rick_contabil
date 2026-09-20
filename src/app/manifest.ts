// src/app/manifest.ts

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LHP Sistema Contábil",
    short_name: "Sistema Contábil",
    description:
      "Sistema completo para gestão contábil, cálculos financeiros, processos e laudos periciais.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#061426",
    theme_color: "#071a2b",
    categories: ["business", "finance", "productivity"],
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}