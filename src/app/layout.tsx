// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/pwa/PwaRegister/PwaRegister";
import "./globals.scss";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LHP Sistema Contábil",
    template: "%s | LHP Sistema Contábil",
  },
  description:
    "Sistema completo para gestão contábil, clientes, processos, cálculos financeiros e laudos periciais.",
  applicationName: "LHP Sistema Contábil",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sistema Contábil",
  },
  icons: {
    icon: [
      {
        url: "/icons/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "LHP Sistema Contábil",
    title: "LHP Sistema Contábil",
    description:
      "Gestão de clientes, processos, cálculos financeiros, análises e laudos periciais em um único sistema.",
    images: [
      {
        url: "/images/share/sistema-contabil.png",
        width: 1254,
        height: 1254,
        alt: "LHP Sistema Contábil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LHP Sistema Contábil",
    description:
      "Sistema completo para gestão contábil, cálculos financeiros e laudos periciais.",
    images: ["/images/share/sistema-contabil.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#071a2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}