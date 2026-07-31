import type { Metadata } from "next";
import Script from "next/script";
import OfflineQueueBanner from "@/components/OfflineQueueBanner";
// Self-hosted IBM Plex family (fontsource) so builds don't depend on Google
// Fonts at build time. Same families as before: sans + arabic + mono.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "HPB Department",
  description: "Hepatobiliary Surgery Department — documentation, ward, clinic, emergency, and roster"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("hpb-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`}
        </Script>
        <OfflineQueueBanner />
        {children}
      </body>
    </html>
  );
}
