import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 | またたび計算機",
  description:
    "ROI 診断アプリ「またたび計算機」の利用規約。利用条件、知的財産権、禁止事項、免責、準拠法等を定めます。",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <article className="prose-legal text-ink">
        <p className="mb-6 rounded-md border border-line/60 bg-line/10 p-3 text-sm text-ink/80">
          ⚠️ 本ドキュメントはドラフトです。最終版は法務レビュー後に確定します。
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">利用規約</h1>
        <p className="mt-4 text-sm leading-relaxed sm:text-base">
          本利用規約（以下「本規約」といいます）は、株式会社ねこにまたたび（以下「当社」といいます）が提供する
          ROI
          診断アプリ「またたび計算機」（以下「本サービス」といいます）の利用条件を定めるものです。本サービスを利用するすべてのユーザー（以下「ユーザー」といいます）は、本規約に同意したものとみなします。
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 1 条（適用範囲）</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。当社が本サービス上で別途定める個別規定がある場合、当該規定も本規約の一部を構成します。本規約と個別規定が矛盾する場合は、個別規定が優先します。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 2 条（利用条件）</h2>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>
              本サービスは、ブラウザ上で稼働する Web
              アプリケーションとして提供されます。ユーザーは、自己の責任において、適切な通信環境および機器を準備するものとします。
            </li>
            <li>本サービスの利用にあたり、ユーザー登録は不要です。</li>
            <li>
              ユーザーは、本サービスを自己の業務上の検討目的に限り利用することができます。
            </li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 3 条（知的財産権）</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            本サービスおよび本サービスを通じて提供されるコンテンツ（テキスト、画像、ロゴ、計算ロジック、ソースコード等）に関する著作権、商標権その他の知的財産権は、当社または正当な権利者に帰属します。ユーザーは、当社の事前の書面による同意なく、これらを複製、転載、改変、再配布、販売、その他第三者に利用させてはなりません。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 4 条（禁止事項）</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
          </p>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>法令または公序良俗に違反する行為</li>
            <li>
              当社、他のユーザー、その他の第三者の権利、名誉、信用、プライバシーを侵害する行為
            </li>
            <li>本サービスの運営を妨害し、または当社の業務に支障を生じさせる行為</li>
            <li>
              本サービスを通じて取得した情報を、当社の事前の書面による同意なく商用目的で利用する行為
            </li>
            <li>
              本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル、その他のソースコード解析行為
            </li>
            <li>不正アクセス、コンピュータウイルスの送信、過度な負荷を発生させる行為</li>
            <li>その他、当社が不適切と判断する行為</li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            第 5 条（試算結果の保証否認・免責）
          </h2>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>
              本サービスが提供する ROI
              試算結果は、ユーザーが入力した値および当社が定める一般的な業界標準値に基づく
              <strong>簡易試算</strong>
              であり、実際の投資効果、財務効果、または事業上の成果を保証するものではありません。
            </li>
            <li>
              本サービスは、特定の経営判断、投資判断、調達判断を勧誘または推奨するものではなく、当社は試算結果に基づきユーザーが行った判断・行為およびその結果について、一切の責任を負いません。
            </li>
            <li>
              本サービスは現状有姿（&quot;AS
              IS&quot;）で提供され、当社は本サービスの正確性、完全性、特定目的への適合性、エラーや中断のないことを保証しません。
            </li>
            <li>
              当社の故意または重過失による場合を除き、当社は本サービスに関連してユーザーに生じた一切の損害（直接損害、間接損害、特別損害、結果的損害、逸失利益等を含む）について責任を負いません。
            </li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            第 6 条（サービスの変更・中断・終了）
          </h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、ユーザーへの事前通知なく、本サービスの内容を変更し、または提供を中断・終了することができます。当社は、これによりユーザーに生じた損害について、本規約第
            5 条第 4 項の範囲で責任を負います。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 7 条（規約の変更）</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、必要と判断した場合、ユーザーへの事前通知のうえで、本規約を変更することができます。変更後の本規約は、本サービス上での掲示その他適切な方法により周知された時点から効力を生じます。変更後にユーザーが本サービスを継続して利用した場合、変更後の本規約に同意したものとみなします。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">第 8 条（準拠法・裁判管轄）</h2>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>本規約の準拠法は日本法とします。</li>
            <li>
              本サービスまたは本規約に関連して当社とユーザーとの間に紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </li>
          </ol>
        </section>

        <section className="mt-8 border-t border-line/60 pt-6">
          <p className="text-sm text-ink/70">制定日: 2026-XX-XX（法務レビュー後に確定）</p>
          <p className="mt-3 text-sm">
            <Link href="/" className="text-accent hover:underline">
              ← トップページへ戻る
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
