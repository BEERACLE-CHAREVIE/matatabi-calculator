import Image from "next/image";

export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="読み込み中"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-20 sm:px-8 sm:py-28"
    >
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={96}
        height={96}
        className="h-16 w-16 animate-pulse opacity-70 motion-safe:animate-spin sm:h-20 sm:w-20"
      />
      <p className="text-sm font-medium text-ink/70 sm:text-base">
        読み込み中...
      </p>
      <div
        aria-hidden="true"
        className="flex w-full max-w-sm flex-col gap-2"
      >
        <span className="h-3 w-full animate-pulse rounded-md bg-line/30" />
        <span className="h-3 w-3/4 animate-pulse rounded-md bg-line/30" />
      </div>
    </main>
  );
}
