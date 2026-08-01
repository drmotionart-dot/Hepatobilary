"use client";

import { useEffect } from "react";

// Registers the installable-PWA service worker in production builds only.
// In dev, Next.js serves its own HMR service worker on /__nextjs and a second
// controller would conflict with fast refresh, so we skip non-production.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed", err));
    };
    register();
    window.addEventListener("load", register);
  }, []);
  return null;
}
