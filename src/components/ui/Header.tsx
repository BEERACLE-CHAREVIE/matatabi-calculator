import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type HeaderNavCtaConfig = {
  label: string;
  shortLabel?: string;
  href: string;
};

export type HeaderProps = {
  className?: string;
  cta?: HeaderNavCtaConfig;
};

const DEFAULT_CTA: Required<HeaderNavCtaConfig> = {
  label: "診断を始める",
  shortLabel: "診断 →",
  href: "/calculate",
};

export function Header({ className, cta }: HeaderProps = {}) {
  const ctaConfig = {
    label: cta?.label ?? DEFAULT_CTA.label,
    shortLabel: cta?.shortLabel ?? DEFAULT_CTA.shortLabel,
    href: cta?.href ?? DEFAULT_CTA.href,
  };

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-40 border-b border-line/30 bg-canvas/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:h-16 sm:px-8">
        <Link
          href="/"
          aria-label="またたび計算機 トップページ"
          className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Image
            src="/brand/logo-header.svg"
            alt=""
            aria-hidden="true"
            width={200}
            height={40}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>
        <Link
          href={ctaConfig.href}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md font-medium",
            "border border-line bg-canvas text-ink hover:bg-line/30",
            "transition-colors duration-150",
            "h-9 px-3 text-sm sm:h-10 sm:px-4 sm:text-base",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          )}
        >
          <span className="sm:hidden">{ctaConfig.shortLabel}</span>
          <span className="hidden sm:inline">{ctaConfig.label}</span>
          <ArrowRight
            aria-hidden="true"
            className="hidden h-4 w-4 sm:inline-block"
          />
        </Link>
      </div>
    </header>
  );
}
