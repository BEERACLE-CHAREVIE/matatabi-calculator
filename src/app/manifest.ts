import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "./site-metadata";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ja",
    // matches tailwind canvas / offwhite (#F8F6F2) and layout.tsx viewport.themeColor
    background_color: "#F8F6F2",
    theme_color: "#F8F6F2",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "finance"],
  };
}
