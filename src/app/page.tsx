import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">またたび計算機</h1>
        <p className="text-sm sm:text-base">
          現在準備中です。今しばらくお待ちください。
        </p>
        <p className="text-sm text-ink/80">
          The quick brown fox jumps over the lazy cat. 1234567890
        </p>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="カラートークン プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Color tokens</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded border border-line bg-canvas" />
            <span className="text-xs">canvas / #F8F6F2</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-ink" />
            <span className="text-xs">ink / #72665B</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-line" />
            <span className="text-xs">line / #BEB5AA</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-accent" />
            <span className="text-xs">accent / #9CAEB8</span>
          </li>
        </ul>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="角丸 / シャドウ プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Radius &amp; Shadow tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-md / 6px
          </div>
          <div className="rounded-xl border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-xl / 12px
          </div>
          <div className="rounded-2xl border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-2xl / 16px
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-card">
            shadow-card
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-card-hover">
            shadow-card-hover
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-floating">
            shadow-floating
          </div>
        </div>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="タイポグラフィ補強 プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Typography tokens</h2>
        <div className="rounded-xl border border-line/50 bg-canvas p-4 text-center">
          <span className="text-xs font-bold uppercase tracking-warning text-ink">
            CRITICAL OPPORTUNITY LOSS
          </span>
          <p className="mt-1 text-[10px] text-ink/60">
            tracking-warning / 0.06em（Issue #4 で WarningBanner が消費予定）
          </p>
        </div>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="Button プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Button (variant × size)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">
            Primary sm
          </Button>
          <Button variant="primary" size="md">
            Primary md
          </Button>
          <Button variant="primary" size="lg">
            Primary lg
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="Card プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Card</h2>
        <Card>
          <h3 className="mb-2 text-base font-semibold">Card title</h3>
          <p className="text-sm text-ink/80">
            rounded-xl / border-line/50 / shadow-card / p-6 がデフォルト。
            モバイルで padding を縮める場合は className=&quot;p-4 sm:p-6&quot; を渡す。
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm">アクション</Button>
            <Button variant="ghost" size="sm">
              サブ
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
