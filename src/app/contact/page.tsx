import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "お問い合わせ | またたび計算機",
  description:
    "ROI 診断アプリ「またたび計算機」へのお問い合わせ窓口。プライバシーポリシー第 6 条に基づく開示・訂正・削除等の請求もこちらから受け付けます。",
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <article className="text-ink">
        <h1 className="text-2xl font-bold sm:text-3xl">お問い合わせ</h1>
        <p className="mt-4 text-sm leading-relaxed sm:text-base">
          本サービスに関するお問い合わせ、およびプライバシーポリシー第 6
          条に基づく個人情報の開示・訂正・削除等のご請求は、以下のメールアドレスまでご連絡ください。
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">メールでのお問い合わせ</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            <a
              href="mailto:nekonimatatabi@nekonimatatabi.com"
              className="inline-flex min-h-11 items-center text-accent hover:underline"
            >
              nekonimatatabi@nekonimatatabi.com
            </a>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80 sm:text-base">
            お問い合わせフォームは現在準備中です。準備が整い次第、本ページにて公開します。それまではメールにてご連絡ください。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">ご記入いただきたい内容</h2>
          <ul className="mt-2 list-disc pl-6 text-sm leading-relaxed sm:text-base">
            <li>お名前（個人または法人名）</li>
            <li>ご連絡先メールアドレス</li>
            <li>お問い合わせの種別（一般のお問い合わせ／個人情報に関する請求等）</li>
            <li>お問い合わせの内容</li>
          </ul>
        </section>

        <section className="mt-8 border-t border-line/60 pt-6">
          <p className="text-sm">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-accent hover:underline"
            >
              ← トップページへ戻る
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
