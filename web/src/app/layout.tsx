import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spatula Comps",
  description: "คอมพ์ TFT ปักหมุดได้ไม่จำกัด เปิดดูได้แม้ออฟไลน์",
  manifest: "manifest.json",
  appleWebApp: { capable: true, title: "Comps", statusBarStyle: "black-translucent" },
  icons: { icon: "icon.svg", apple: "icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  viewportFit: "cover",
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="bg-neutral-950 text-neutral-100 antialiased [overscroll-behavior:contain]">
        {children}
      </body>
    </html>
  );
}
