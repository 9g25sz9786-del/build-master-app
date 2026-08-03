import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Build Master — Project Feasibility App",
    short_name: "Build Master",
    description: "Commercial real estate investment feasibility & intelligence platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#141210",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
