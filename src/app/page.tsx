import type { Metadata } from "next";
import {
  AlertRulerIcon,
  ClosingCta,
  CoinStackIcon,
  FAQ,
  FileExportIcon,
  Hero,
  HourglassThinIcon,
  HowItWorks,
  LedgerCalcIcon,
  NumericTicker,
  ProblemSection,
  TrendDownLineIcon,
  ValuePropSection,
} from "@/components/landing";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
  },
};

const HERO_HEADLINE = "IT コストが減らない理由は、もう数字で見えています。";
const HERO_SUBCOPY =
  "ベンダー費用、改修費、待ち時間。あなたの会社で発生している『止血できる金額』と『取り逃している利益』を、5 つの質問だけで可視化します。";
const HERO_META = ["所要 約 5 分", "完全無料", "登録不要", "ブラウザ内で完結"];

const PROBLEMS = [
  {
    icon: <CoinStackIcon className="h-[22px] w-[22px]" />,
    title: "毎月のベンダー費、何に使われているのか説明できない",
    body: "見積書の根拠が不明瞭なまま、改修のたびに数十万円が出ていく状態に違和感を覚えていませんか。",
    metric: "¥320,000",
    metricCaption: "/ 月 中央値",
  },
  {
    icon: <HourglassThinIcon className="h-[22px] w-[22px]" />,
    title: "ちょっとした更新が、いつも 1 ヶ月待ち",
    body: "軽微な改修ですら数週間〜数ヶ月待ち。スピードを失った時間こそが、最大の機会損失です。",
    metric: "32.4 日",
    metricCaption: "/ 件 待機",
  },
  {
    icon: <AlertRulerIcon className="h-[22px] w-[22px]" />,
    title: "内製化したいが、何から始めるかわからない",
    body: "AI 駆動開発の選択肢は知っているものの、自社の IT コストに対する効果を数字で示せずにいませんか。",
    metric: "0",
    metricCaption: "/ 着手者",
  },
];

const VALUES = [
  {
    icon: <LedgerCalcIcon className="h-7 w-7" />,
    title: "3 年間で『止血』できる金額を試算",
    body: "ベンダー費用と改修費を入力するだけで、AI 駆動開発で削減できる 3 年間のコストが即座に算出されます。",
    metric: "¥-,---,---",
    metricUnit: "/ 3 年 推定値",
  },
  {
    icon: <TrendDownLineIcon className="h-[22px] w-[22px]" />,
    title: "手作業で失っている『利益』を可視化",
    body: "人手で行っている定型業務を時給換算し、年間の利益創出ポテンシャルを数値化します。",
    metric: "2,400h",
    metricUnit: "/ 年 換算",
  },
  {
    icon: <FileExportIcon className="h-[22px] w-[22px]" />,
    title: "その場で PDF レポートをダウンロード",
    body: "診断結果は A4 1 枚の PDF として出力。社内稟議や経営会議の資料として、そのまま使えます。",
    metric: "A4 / 1 枚",
    metricUnit: "/ 即時 DL",
  },
];

const STEPS = [
  {
    stepNumber: 1,
    title: "5 つの質問に答える",
    body: "月額ベンダー費用 / 改修費用 / 手作業人数 / 更新待ち期間 / 内製化状況。",
    subLabel: "Input",
  },
  {
    stepNumber: 2,
    title: "結果ダッシュボードを確認",
    body: "3 年間のトータルインパクト、止血額、年間利益創出を一画面で確認できます。",
    subLabel: "Diagnose",
  },
  {
    stepNumber: 3,
    title: "PDF レポートをダウンロード",
    body: "経営会議用の A4 1 枚レポートを即時生成。ブラウザ内で完結します。",
    subLabel: "Export",
  },
];

const FAQS = [
  {
    id: "faq-data-privacy",
    question: "入力したデータはどこかに送信されますか？",
    answer:
      "いいえ。すべてお使いのブラウザ内で計算され、当社サーバーや第三者への送信は一切行いません。詳しくはプライバシーポリシーをご確認ください。",
  },
  {
    id: "faq-accuracy",
    question: "試算結果はどのくらい正確ですか？",
    answer:
      "公的統計（厚生労働省「賃金構造基本統計調査」「就労条件総合調査」ほか）に基づく業界標準値（時給 2,500 円、1 日 2 時間、月 20 営業日、年 3 回改修など）で試算します。実際の効果を保証するものではありませんが、コスト構造の妥当性を判断する初期指標として広くお使いいただけます。",
  },
  {
    id: "faq-time",
    question: "所要時間はどのくらいですか？",
    answer:
      "5 つの質問に答えるだけで完了し、目安は 3〜5 分程度です。途中で戻って数値を修正することもできます。",
  },
  {
    id: "faq-pdf-usage",
    question: "PDF レポートはどのような場面で使えますか？",
    answer:
      "社内稟議、経営会議、IT 投資の見直し提案、ベンダーとの交渉材料など、決裁者に数字でメリットを示す必要があるあらゆる場面でご活用いただけます。",
  },
  {
    id: "faq-mobile",
    question: "スマートフォンやタブレットでも使えますか？",
    answer:
      "はい。商談先のタブレットからでも快適にお使いいただけるよう、レスポンシブ対応しています。",
  },
  {
    id: "faq-pricing",
    question: "利用に費用はかかりますか？登録は必要ですか？",
    answer:
      "完全無料、登録不要です。サイトを開いてすぐに診断を開始できます。",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero
        headline={HERO_HEADLINE}
        subCopy={HERO_SUBCOPY}
        ctaLabel="いますぐ計算を始める"
        ctaHref="/calculate"
        meta={HERO_META}
      />
      <NumericTicker />
      <ProblemSection items={PROBLEMS} />
      <ValuePropSection items={VALUES} />
      <HowItWorks steps={STEPS} />
      <FAQ items={FAQS} />
      <ClosingCta
        headline="数字を、味方にしませんか。"
        body="3 年後の IT コストは、今日の判断で変わります。まずは 5 分の診断から。"
        ctaLabel="5 分で診断する"
        ctaHref="/calculate"
      />
    </main>
  );
}
