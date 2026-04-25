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

      {/* TODO: UI 本実装時に削除 */}
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
        <button
          type="button"
          className="mt-6 w-full rounded bg-accent px-4 py-2 font-medium text-canvas hover:opacity-90"
        >
          CTA サンプル（accent bg / canvas text）
        </button>
      </section>
    </main>
  );
}
