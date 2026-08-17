import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Infamous Operations Network",
    short_name: "Infamous Ops",
    description: "A tactical operations portal for the Infamous SWTOR guild",
    start_url: "/",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#0f8f6d",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
