/** @type {import('next').NextConfig} */
// Cloudflare Pages 静的配信向け設定 (Issue #11)
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
