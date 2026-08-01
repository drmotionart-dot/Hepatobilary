import type { Metadata, Viewport } from "next";
import Script from "next/script";
import OfflineQueueBanner from "@/components/OfflineQueueBanner";
import RegisterSW from "@/components/RegisterSW";
import ShiftKeyProvider from "@/components/shift-key/ShiftKeyProvider";
import OnboardingTour from "@/components/tour/OnboardingTour";
import { DEPARTMENT_NAME } from "@/lib/constants";
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
  title: DEPARTMENT_NAME,
  description: "Hepatobiliary Surgery Department — documentation, ward, clinic, emergency, and roster",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "HPB" },
};

export const viewport: Viewport = {
  themeColor: "#0E5C56",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("hpb-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`}
        </Script>
        <OfflineQueueBanner />
        <RegisterSW />
        <ShiftKeyProvider>
          {children}
          <OnboardingTour />
        </ShiftKeyProvider>
      </body>
    </html>
  );
}
