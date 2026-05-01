import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://roi.nekonimatatabi.com";

// 固定 ISO 文字列に揃えることで、内容変更がない PR で sitemap の <lastmod> 差分が
// 発生しないようにする。LP の本格的な更新時にこの定数を更新する。
const LAST_MODIFIED = "2026-05-01";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = LAST_MODIFIED;
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/calculate`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
