import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Font pairing from section 8 of the build spec: one family across both
// scripts so English clinical shorthand and Arabic names/orders feel
// like one coherent design, not two mismatched fonts stitched together.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans"
});

const plexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans-arabic"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono"
});

export const metadata: Metadata = {
  title: "HPB Department",
  description: "Hepatobiliary Surgery Department — documentation, ward, clinic, emergency, and roster"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexSansArabic.variable} ${plexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
