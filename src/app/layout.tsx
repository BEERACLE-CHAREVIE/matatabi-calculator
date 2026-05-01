import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/ui/Footer";
import { Header } from "@/components/ui/Header";
import "./globals.css";

const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://roi.nekonimatatabi.com";
const SITE_NAME = "またたび計算機";
const SITE_DEFAULT_TITLE = "またたび計算機 | IT コスト診断・ROI 試算ツール";
const SITE_DESCRIPTION =
  "中小企業の経営者向け ROI 診断ツール。月額ベンダー費用や改修費、手作業時間を 5 つの質問に答えるだけで、3 年間で止血できる IT コストと取り逃している利益を試算。結果は PDF で出力でき、登録不要・完全無料でご利用いただけます。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_DEFAULT_TITLE,
    template: "%s | またたび計算機",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["ROI", "IT コスト削減", "AI 駆動開発", "ベンダー依存", "中小企業"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F6F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${notoSansJp.variable} bg-canvas text-ink antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        {CF_BEACON_TOKEN ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
          />
        ) : null}
      </body>
    </html>
  );
}
