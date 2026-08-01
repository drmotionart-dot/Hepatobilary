import type { MetadataRoute } from "next";

// Installable PWA manifest (spec §2: "One codebase serves web + installable PWA").
// Served by Next.js at /manifest.webmanifest from this route.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HPB Department",
    short_name: "HPB",
    description:
      "Hepatobiliary Surgery Department — documentation, ward, clinic, emergency, and roster",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F7F5",
    theme_color: "#0E5C56",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
