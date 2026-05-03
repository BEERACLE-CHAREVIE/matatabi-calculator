import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | またたび計算機",
  description:
    "ROI 診断アプリ「またたび計算機」のプライバシーポリシー。入力値の取り扱いと個人関連情報の利用方針を定めます。",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <article className="text-ink">
        <h1 className="text-2xl font-bold sm:text-3xl">プライバシーポリシー</h1>
        <p className="mt-4 text-sm leading-relaxed sm:text-base">
          株式会社ねこにまたたび（以下「当社」といいます）は、当社が提供する ROI
          診断アプリ「またたび計算機」（以下「本サービス」といいます）におけるユーザーの個人情報および個人関連情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">1. 取得する情報</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            本サービスは、ユーザーが本サービスのフォームに入力した情報（月額ベンダー費用、改修費用、手作業人数、更新待ち期間、内製化状況の
            5
            項目）を、ユーザーのブラウザ内でのみ計算処理し、当社サーバへの送信・保存・第三者提供は一切行いません。
          </p>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            加えて、本サービスの利用状況の把握のため、当社は以下の情報をアクセス解析サービス（Cloudflare
            Web Analytics）を通じて取得します。
          </p>
          <ul className="mt-2 list-disc pl-6 text-sm leading-relaxed sm:text-base">
            <li>
              IP
              アドレス、ユーザーエージェント、リファラ、ページパス、参照タイミング等の閲覧情報（Cloudflare
              Web Analytics は Cookie その他のトラッカーを設置しません）
            </li>
          </ul>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            なお、以下の情報については将来的に取得する可能性があり、その場合は本ポリシーを改定したうえで取得を開始します。
          </p>
          <ul className="mt-2 list-disc pl-6 text-sm leading-relaxed sm:text-base">
            <li>
              お問い合わせフォーム等を通じて任意に提供される氏名・メールアドレス・所属組織等（<strong>現時点では当該機能なし</strong>）
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">2. 利用目的</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、第 1
            項に基づき将来的に取得する個人関連情報を、以下の目的でのみ利用します。
          </p>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>本サービスの利用状況の把握および改善</li>
            <li>不正利用の防止およびセキュリティの確保</li>
            <li>本サービスに関するお問い合わせへの対応（該当機能を提供する場合）</li>
            <li>法令または公的機関からの正当な要請への対応</li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">3. 第三者提供</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、以下の場合を除き、取得した個人関連情報を第三者に提供しません。
          </p>
          <ol className="mt-2 list-decimal pl-6 text-sm leading-relaxed sm:text-base">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づき開示が求められる場合</li>
            <li>
              人の生命、身体または財産の保護のために必要であって、ユーザーの同意を得ることが困難である場合
            </li>
            <li>
              業務委託先（アクセス解析サービス事業者等）に対し、本ポリシー第 2
              項の利用目的の達成に必要な範囲で提供する場合（この場合、当社は委託先に対し適切な監督を行います）
            </li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">4. 安全管理措置</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、取得した個人関連情報の漏えい、滅失または毀損の防止その他の安全管理のために、組織的・人的・物理的・技術的に必要かつ適切な措置を講じます。
          </p>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            本サービスは Cloudflare Pages
            上で静的サイトとして配信され、すべての通信は HTTPS（TLS 1.2
            以上）で暗号化されます。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">5. Cookie 等の利用</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、本サービスのアクセス解析として Cloudflare Web Analytics
            を利用します。本ツールは Cookie その他のトラッカーを設置せず、第 1
            項に定める閲覧情報のみを集計目的で取得します。
          </p>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            なお、本サービスは Cloudflare
            のエッジネットワーク上で配信されるため、Cloudflare が運用上必要とする
            Cookie（<code>__cf_bm</code> 等のボット管理用 Cookie
            等）が設定される場合があります。これらは Cloudflare
            の利用規約およびプライバシーポリシーに従って取り扱われます。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            6. 開示・訂正・削除等の請求
          </h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            ユーザーは、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止、第三者提供の停止を請求することができます。請求方法および本ポリシーに関するお問い合わせは、メール（
            <a
              href="mailto:nekonimatatabi@nekonimatatabi.com"
              className="text-accent hover:underline"
            >
              nekonimatatabi@nekonimatatabi.com
            </a>
            ）またはお問い合わせフォーム（
            <Link href="/contact" className="text-accent hover:underline">
              こちら
            </Link>
            ）よりご連絡ください。
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">7. 改定</h2>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            当社は、法令の変更、本サービスの仕様変更、運用方針の変更等に応じて、本ポリシーを改定することがあります。重要な改定を行う場合は、本サービス上での告知その他適切な方法により周知します。
          </p>
        </section>

        <section className="mt-8 border-t border-line/60 pt-6">
          <p className="text-sm text-ink/70">制定日: 2026-05-11</p>
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
