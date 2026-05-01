import Link from "next/link";
import { cn } from "@/lib/cn";

export type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-line/60 bg-canvas px-4 py-4 text-xs text-ink/70 sm:px-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p>© 株式会社ねこにまたたび</p>
        <nav aria-label="法務情報">
          <ul className="flex items-center gap-4">
            <li>
              <Link
                href="/privacy"
                className="hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
              >
                プライバシーポリシー
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
              >
                利用規約
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
