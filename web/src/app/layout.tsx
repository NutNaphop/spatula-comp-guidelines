import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

/* One superfamily, two roles: Plex Sans Thai carries Thai and Latin evenly
   (a hard requirement here), and Plex Mono turns costs, levels and tiers into
   readouts instead of prose. */
const sans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spatula Comps",
  description: "คอมพ์ TFT ปักหมุดได้ไม่จำกัด เปิดดูได้แม้ออฟไลน์",
  manifest: "manifest.json",
  appleWebApp: { capable: true, title: "Comps", statusBarStyle: "black-translucent" },
  icons: { icon: "icon.svg", apple: "icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f16",
  viewportFit: "cover",
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* Runs before the body is painted, which is the point: deciding this
            in a React effect would show the dark page ground first and flash
            a black square in a 52dp overlay window. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if(location.search.indexOf("view=mini")>-1)document.documentElement.classList.add("mini")',
          }}
        />
      </head>
      <body className="bg-ink text-chalk antialiased [overscroll-behavior:contain]">
        {children}
      </body>
    </html>
  );
}
