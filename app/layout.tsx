import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoria",
  description: "Memoria prototype migrated to Next.js",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Outfit:wght@200;300;400;500;600;700;800&family=Noto+Serif+SC:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
