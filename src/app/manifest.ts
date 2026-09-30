import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sankofa Chess",
    short_name: "Sankofa",
    description: "Learn from the past. Master your next move.",
    start_url: "/app/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F0F0F",
    theme_color: "#0F0F0F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
