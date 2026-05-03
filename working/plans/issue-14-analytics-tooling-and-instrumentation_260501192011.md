# Issue #14 実装プラン: アクセス解析の方針確定とタグ導入

## Context

公開後の「またたび計算機」（`https://roi.nekonimatatabi.com`）の利用状況を計測し、商談現場での効果測定・改善サイクルを回すための解析基盤を導入する。Issue #14 の中身は (1) GA4 / Cloudflare Web Analytics の採否判断、(2) 計測したいイベントの洗い出し、(3) タグ設置と動作確認、(4) プライバシーポリシー側の追記の 4 つ。

依存・前提:
- **Issue #11（Cloudflare Pages 構築）完了済み**。本番ドメイン `https://roi.nekonimatatabi.com`、`develop` プレビュー、`main` プロダクションのフローが稼働中（`README.md` §デプロイ）。`output: "export"` の静的エクスポート（`next.config.mjs`）で配信され、Server Actions / API Routes は一切なし。タグ設置は完全にクライアントサイドの `<Script>` または beacon に限定される。
- **Issue #13（プライバシーポリシー／利用規約）完了済み**。条件 C（正規掲載）採択。`docs/legal/privacy.md` §1 と §5、`docs/legal/REASONING.md` の「再評価トリガ」「現時点の入力値取り扱いに関する事実認定」表が整備済み。`privacy.md:13` に `<!-- TODO(Issue #14): … -->` が埋め込まれており、本 Issue 着手時に更新する旨が明記されている。
- **Markdown ↔ TSX 二層構造の同時更新原則**（`docs/legal/REASONING.md` §「Markdown ソースと TSX 転記版の二層構造の運用ルール」）に従い、`docs/legal/privacy.md` と `src/app/privacy/page.tsx` を同一コミット内で更新する必要がある。

構造的事情（**未実装 Issue (#2 / #3 / #4 / #5) への申し送りが必要な理由**）:
- Issue #2（`InputForm` Step-by-Step、`docs/spec/input-form.md §3.4`）／Issue #3（`ResultDashboard`、`docs/spec/result-dashboard.md §3 §6.4`）／Issue #4（`WarningBanner`、`docs/spec/warning-copy.md §3`）／Issue #5（PDF ダウンロード、`docs/spec/pdf-report.md §8`）が未実装。
- 結果として「診断開始（Step 1 突入）」「診断完了（確認画面で『診断する』押下）」「PDF ダウンロード（成功／失敗）」「警告バナー表示」を **今この PR でフックすることはできない**。
- このため本プランでは「**`src/lib/analytics.ts` に `trackEvent(name, params)` の薄いラッパだけ用意して、各後続 Issue の実装時にフックを差し込む**」運用を採用する。本 PR では (a) ツール採択、(b) ラッパ実装、(c) ページビュー計測（ルート遷移）、(d) ポリシー文言更新のみを行い、ドメインイベント発火は後続 Issue 完了に応じて配線していく。

GitHub Issue: #14

---

## 設計上の考慮点

### A. 採否判断（GA4 vs Cloudflare Web Analytics）の比較表と推奨

| 軸 | GA4 (gtag.js) | Cloudflare Web Analytics |
|---|---|---|
| Cookie 設置 | あり（`_ga`, `_ga_<id>` 等の 1st-party Cookie） | **なし**（Cookieless、ブラウザフィンガープリントも未使用と公式表明） |
| 個人関連情報の取得 | Cookie ID / IP / リファラ / UA 等を Google サーバへ送信。個人情報保護法上の「個人関連情報」に該当する可能性が高い | IP は Cloudflare エッジで集計用途のみ短期処理、Cookie ID 不発行。配信元と同一事業者のため第三者提供にあたるかは整理要 |
| 電気通信事業法 外部送信規律（令和 5 改正） | **該当**：第三者送信に明確に当たり、通知（プライバシーポリシー記載 or バナー）が必要 | **該当の可能性が低い**：Cloudflare は配信元 CDN を兼ねるため「外部」性が弱い。ただし保守的には「念のため記載」が望ましい |
| カスタムイベント | 任意の `gtag('event', 'name', params)` 可能。診断完了 / PDF ダウンロード等の業務イベント計測に必要十分 | **任意イベント不可**（PV / Web Vitals / ページタイミングのみ）。「診断完了率」「PDF DL 数」は計測できない |
| 静的エクスポート + Cloudflare Pages 相性 | gtag.js を `<Script>` で注入するだけ。問題なし | 配信元と同じダッシュボードで完結。Cloudflare Pages との一体運用が最もシンプル |
| 導入工数 | `<Script>` + 環境変数 1 件 + 同意・通知文言整備。中程度 | beacon `<Script>` 1 行 + 環境変数 1 件のみ。最小 |
| データ保有期間 / エクスポート性 | 標準 14 ヶ月（最長 38 ヶ月）、BigQuery 連携でロー行エクスポート可能 | 直近 30〜90 日のダッシュボード表示のみ。エクスポート機能は限定的 |
| LCP 1 秒目標（マスター設計書 §1.4）への影響 | gtag.js は ~70KB（gzip 後）。`afterInteractive` 配置で LCP 直接干渉は小さいが、Total Blocking Time に効いてくる | beacon は ~1KB と極小。LCP / TBT への影響は実質ゼロ |
| 商談での説明責任 | 「Google にデータが渡る」点を毎回説明する必要 | 「Cookie を入れていません」と一言で済む |

**推奨: Cloudflare Web Analytics を第一候補、ただし「カスタムイベント計測が事業判断上必須」と判断された場合は GA4 併用を検討**。

採用根拠:
1. プライバシーポリシーの増設範囲が最小（Cookie 節 §5 の追記と取得情報節 §1 の 1 文書き換えで完結）。
2. 設計書 §1.4 の LCP 1 秒目標とバンドル収支に有利。jsPDF / html2canvas / Recharts という重い依存（`docs/spec/pdf-report.md §10`、`docs/spec/result-dashboard.md §5`）を抱える本アプリではバイト予算がシビア。
3. 商談先（中小企業経営層）に対し「Cookie を発行していません」と説明できることは B2B での信頼に効く。
4. 配信元と解析元が同一事業者のため、外部送信規律の整理が単純化する。

**採用の代償（許容する制約）**:
- 「診断完了率」「PDF ダウンロード数」を即時計測できない。本プランの **§B** で「将来 GA4 / Plausible / 自前 Analytics Engine 併用への移行余地」を残す。
- 当面は **PV / Web Vitals / 平均滞在時間** の集計に絞る。ファネル計測は Issue #2〜#5 完了後に再評価する（後段の意思決定ゲート M0 で確定）。

> **オーナー判断ポイント**: 「診断完了率や PDF DL 数を初期から KPI として追いたい」が経営判断であれば GA4 を採用するか、Cloudflare Web Analytics + GA4 の二層構成にする。本プランは比較表を提示するのみで、最終決定はオーナーが M0 で行う。M0 の決定により M1 以降のステップが分岐する。

### B. 計測イベントの洗い出しと未実装 Issue への申し送り

本プランでは以下の表を「将来計測したいイベントの目録」として確定する。**いま発火させるのは PV のみ**で、それ以外は対応 Issue 完了時に該当箇所へ `trackEvent()` を 1 行差し込む運用とする。

| イベント名（候補） | 発火タイミング | パラメータ | 計測価値 | フック挿入予定箇所 |
|---|---|---|---|---|
| `page_view` | クライアントマウント時 + ルート遷移時 | `{ path }` | サイト全体の回遊（特に `/privacy` `/terms` 除外設定の根拠） | 本 PR で実装（`src/lib/analytics.ts` のフック + `src/app/layout.tsx` 配線） |
| `diagnose_start` | Step 1（月額ベンダー費用入力）に到達した瞬間 | `{}` | 商談で診断画面に踏み込んだ件数 | Issue #2 実装時に Step 1 マウント時 useEffect。`docs/spec/input-form.md §3.4` Step 1 |
| `diagnose_step_complete` | 各 Step の「次へ」押下成功時 | `{ step: 1..5 }` | 離脱ステップの特定（Step 4 更新待ち期間の選択離脱率など） | Issue #2 実装時、Step 1〜5 の `onNext` ハンドラ。`docs/spec/input-form.md §6.2` |
| `diagnose_complete` | 確認画面「診断する」ボタン押下成功時（バリデーション通過後、結果画面マウント時のいずれか一方に統一） | `{ insourcing_level, has_speed_warning }` | 完走率の主要 KPI | Issue #3 実装時、`ResultDashboard` 初回マウントの `useEffect`（`docs/spec/result-dashboard.md §6.4` の `key={hash(result)}` のタイミングと整合） |
| `warning_banner_shown` | 警告バナーがマウントされた瞬間（`speedWarning && insourcingLevel !== 1` 成立時） | `{ monthly_loss_man_yen }`（万円単位の整数のみ、円単位は載せない） | 警告発動率 | Issue #4 実装時、`WarningBanner` の `useEffect`（`docs/spec/warning-copy.md §4.3` の発動条件） |
| `pdf_download_start` | PDF ダウンロードボタン押下、`isGeneratingPdf = true` の直後 | `{}` | DL 試行数 | Issue #5 実装時、`docs/spec/pdf-report.md §8.1` の生成フロー先頭 |
| `pdf_download_success` | `pdf.save(filename)` 成功直後（`isGeneratingPdf = false` の直前） | `{ duration_ms }` | DL 成功数 | Issue #5 実装時、`docs/spec/pdf-report.md §8.1` `save()` 直後 |
| `pdf_download_failure` | タイムアウト or `catch` 節到達時 | `{ reason: "timeout" \| "exception" }` | DL 失敗率（iPad Safari メモリ不足等の早期検知） | Issue #5 実装時、`docs/spec/pdf-report.md §8.3` のエラーハンドリング |
| `revise_step` | 確認画面の「この項目を修正」リンク押下 | `{ step: 1..5 }` | どの項目で迷うかの特定 | Issue #2 実装時。`docs/spec/input-form.md §3.3` |

**重要な制約: パラメータに入力値そのもの（金額・人数）を載せない**。理由:
- 入力値はユーザの事業情報そのもの（月額ベンダー費用 = 経営機微情報）。`docs/legal/REASONING.md` §「現時点の入力値取り扱いに関する事実認定」で「サーバ送信なし」を約束しているため、解析タグ経由の送信もこの原則に反する。
- パラメータに含めてよいのは「内製化レベル（5 段階の離散カテゴリ）」「警告発動の有無（boolean）」「ステップ番号」「結果フラグ」等の **粒度の粗いカテゴリ値** のみ。`monthly_loss_man_yen` のような数値も「金額そのものではなく万円丸めの粗粒度」までに留める。

**Cloudflare Web Analytics 採用時の制約**:
- 上表のうち本 PR で発火させるのは `page_view` のみ。それ以外は「将来 GA4 を併用するか、Cloudflare の Analytics Engine + Workers 経由の自前 beacon を導入するか」の判断が必要になる。本 PR では `trackEvent()` を **no-op スタブ** として実装し、後続 Issue で配線箇所を確定するに留める。

### C. 電気通信事業法 外部送信規律への対応方針

`docs/legal/REASONING.md` §「法令適用範囲」で「Issue #14 着手時に判定」と保留されていた論点を本プランで確定する。

採用ツール別の方針:
- **Cloudflare Web Analytics 単独採用の場合**: 配信元と一体のため「外部送信」性が弱いが、保守的に **プライバシーポリシー §5（Cookie 等の利用）に「アクセス解析として Cloudflare Web Analytics を利用する」旨を追記** することで通知義務を満たす方針とする。バナー設置は不採用（B2B サイトで初回バナーは UX 阻害が大きく、Cookie 不使用ツールでは過剰）。
- **GA4 併用 / 単独採用の場合**: 「外部送信」に明確に該当するため、§5 に **(1) 利用ツール名、(2) 送信先事業者（Google LLC）、(3) 送信される情報の概要、(4) 利用目的、(5) オプトアウト手段（Google Analytics オプトアウトアドオン or `_ga` Cookie 削除）** を明記する。設置タイミングは **タグ読み込み前の通知（プライバシーポリシー記載で代替）**。本アプリは B2B 商談用途で初回バナーの UX 阻害を避けたいため、**バナー方式は採用しない**。法務レビュー指摘でバナー必要となった場合は別 Issue（Cookie 同意バナー実装）を立てる。

**いずれの場合も**:
- 通知文の根拠（電気通信事業法 27 条の 12 / 総務省ガイドライン）はリポジトリ側のコメントに残さない（法務レビュー対象として `docs/legal/REASONING.md` に書く）。

### D. タグ設置方式（next/script strategy 選定）

`src/app/layout.tsx:54` の `<html>`／`<body>` 構造に `<Script>` を追加する。strategy の比較:

| strategy | LCP 影響 | 説明 |
|---|---|---|
| `beforeInteractive` | **大**：レンダリングを止める。LCP 1 秒目標を直接侵食 | 解析タグには過剰 |
| `afterInteractive`（既定） | 小〜中：ページがインタラクティブになった後にロード。Web Vitals 等の早期計測との整合 | **GA4 採用時はこれが標準** |
| `lazyOnload` | 最小：ブラウザがアイドル状態になってからロード。**早期離脱の page_view を取りこぼす可能性** | 計測精度を犠牲にバンドル予算を最優先する場合 |

**採用方針**:
- **Cloudflare Web Analytics の beacon**: 1KB 未満。`strategy="afterInteractive"` で配置。`data-cf-beacon='{"token":"<token>"}'` を `<Script>` 属性に展開（`next/script` は任意属性をパススルーする）。
- **GA4 を採用する場合**: `strategy="afterInteractive"` で `https://www.googletagmanager.com/gtag/js?id=<MEASUREMENT_ID>` を読み込み、続けて初期化用のインライン `<Script id="ga4-init">` を `afterInteractive` で配置。

**SPA ルート遷移の page_view 計測**: 静的エクスポートでも Next.js App Router のクライアントナビゲーションは発生する（`/` → `/privacy` → `/terms`）。GA4 では `gtag('config', id, { send_page_view: false })` にして `usePathname()` の変化を `useEffect` で監視し、`gtag('event', 'page_view', ...)` を発火する。Cloudflare Web Analytics は SPA の遷移を自動検知するため明示的なフックは不要（公式 FAQ 確認事項として `<Script>` 注入のみで OK）。`/privacy` `/terms` を除外する場合は、後者の場合フックでガードする独自 layout 系コードが必要となるため、**初期は除外せず全 PV を計測** する方針とする（除外要件が出た時点で別 Issue）。

### E. 環境変数とプレビュー / 本番の挙動分岐

`README.md:73` の「必須環境変数」節に既に `NEXT_PUBLIC_SITE_URL` が定義されている。本 Issue で追加する変数:

| 変数名 | スコープ | 値 |
|---|---|---|
| `NEXT_PUBLIC_CF_BEACON_TOKEN`（CF 採用時） | Production のみ | Cloudflare ダッシュボードで発行される beacon token |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`（GA4 採用時） | Production のみ | `G-XXXXXXXXXX` |

**Preview / Local では未設定**にする。`src/lib/analytics.ts` の `trackEvent()` は環境変数未設定時を **no-op** とする（`if (!token) return;`）。これにより:
- ローカル `npm run dev`: 送信オフ
- `develop` プレビュー（`*.pages.dev`）: 送信オフ
- `main` 本番: 送信オン

判定ロジック候補:
1. **環境変数の有無で分岐（推奨）**: Cloudflare Pages の Production スコープにのみ環境変数を設定。Preview スコープには設定しない。`src/lib/analytics.ts` 冒頭で `const TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN; if (!TOKEN) return null;` でガード。**`output: "export"` でビルド時にインライン化されるため、Preview ビルドにそもそもタグが含まれない**。
2. ホスト名で分岐: 不採用（静的エクスポートでは window.location 参照が必要となり、ガードが緩む）。

採用は **方式 1**。理由は静的エクスポートとの相性、ビルド時に決定される確実性、Cloudflare Pages のスコープ別環境変数機能との親和性（`README.md:74-76` の既存運用と統一）。

### F. Markdown と TSX の二層構造の同時更新原則

`docs/legal/REASONING.md` §「Markdown ソースと TSX 転記版の二層構造の運用ルール」に従い、本 Issue でも:
- ソース: `docs/legal/privacy.md` の §1（取得する情報）と §5（Cookie 等の利用）
- 転記: `src/app/privacy/page.tsx` の対応箇所（行 24〜43 の §1、行 89〜102 の §5）

を **同一コミット内で更新**する。`git diff` で乖離がないか目視確認するワークフローを継承（`docs/legal/REASONING.md`）。

`docs/legal/REASONING.md` 自体も同時更新が必要:
- §「再評価トリガ」のチェックボックス `- [ ] Issue #14（アクセス解析）着手 …` を `- [x]` に変更し、コミット参照を添える
- §「現時点の入力値取り扱いに関する事実認定」表の「アクセス解析タグ」行を `**未設置**` から「**◯◯（採用ツール名）導入済み**」へ書き換え、出典を本プランの最終 PR 番号にする
- §「法令適用範囲」の「Issue #14 着手時に判定」記述を「§D に従い、外部送信規律はプライバシーポリシー §5 への記載で対応」に書き換える

### G. SPA 内ルート遷移・除外設定・no-op の安全性

- **SPA 内ルート遷移**: `usePathname` を購読する `<AnalyticsRouteListener />` クライアントコンポーネントを `src/components/system/AnalyticsRouteListener.tsx` に新規作成し、`src/app/layout.tsx` から `<Footer />` と並列でマウントする。GA4 採用時は `pathname` 変化をトリガに `gtag('event', 'page_view', { page_path })` を発火。Cloudflare Web Analytics 単独採用時はクライアント側フック不要（自動検知）のため、本コンポーネントは「将来用のプレースホルダ」として最小骨格のみ実装する（M0 で CF 単独採用が確定した場合はマウントしない）。
- **除外設定**: 初期リリースでは `/privacy` `/terms` を除外しない（除外要件が出た時点で別 Issue）。
- **no-op の安全性**: `trackEvent` は `try { … } catch {}` で握り潰し、計測失敗が業務フロー（特に PDF 生成・診断完了）に波及しないことを保証する。これは `docs/spec/pdf-report.md §8.3` の「失敗時 console.error のみ」という方針と整合。

### H. 将来の Cookie 同意バナー導入余地

- 現時点ではバナー不採用（§C の方針）。
- 将来 GA4 への切替や EEA トラフィック増で必要となった場合は、`@osano/cookieconsent` 等の軽量ライブラリ導入か自前実装で対応する余地を残す。`src/lib/analytics.ts` の `trackEvent` を「同意フラグが立つまでバッファリング」する設計に拡張可能な構造（関数ラッパ）にしておく。

### I. CSP / mixed content の事前確認

- Cloudflare Web Analytics の beacon は `https://static.cloudflareinsights.com/beacon.min.js`、送信先 `https://cloudflareinsights.com`。
- GA4 は `https://www.googletagmanager.com/gtag/js`、送信先 `https://www.google-analytics.com` `https://region1.google-analytics.com`。
- 本リポジトリには現時点で CSP メタタグも HTTP ヘッダ設定（`_headers` ファイル）も存在しない。`out/` を grep して CSP がないことを確認した上で、将来 `_headers` で CSP を導入する際は採用ツールのドメインを script-src / connect-src に明示する旨を `README.md` のドキュメント節に注記する。

---

## 変更対象ファイル

### M0. 【意思決定ゲート】GA4 / Cloudflare Web Analytics の採用確定

- **判断者**: 株式会社ねこにまたたび代表 / プロダクトオーナー
- **入力**: 本プラン §A の比較表
- **アウトプット**: 「Cloudflare Web Analytics 単独 / GA4 単独 / 併用」のいずれか 1 つを選択し、`docs/legal/REASONING.md` に追記用の判断記録（採用ツール名・判断日・判断理由）を準備
- **判断基準**:
  - 「初期から診断完了率 / PDF DL 数を KPI として追う必要があるか」が Yes → GA4（単独 or 併用）
  - 「No、まずは PV と滞在時間が見られればよい」→ Cloudflare Web Analytics 単独
- **このゲートを通過するまで M1 以降の実装に着手しない**。本プラン本文は両分岐を併記しているが、実装ブランチでは採択された片方のみを反映する。

### M1. 【ステークホルダー作業】解析ツール側のセットアップ

- **作業者**: Cloudflare アカウント / Google アナリティクス アカウントを保有するオーナー
- **作業内容（CF 採用時）**:
  1. Cloudflare ダッシュボード → Web Analytics → 「Add a site」で `roi.nekonimatatabi.com` を追加（Free プラン）
  2. 発行された JS スニペットから `data-cf-beacon='{"token":"<TOKEN>"}'` の token を取得
  3. Cloudflare Pages → 当該プロジェクト → Settings → Environment variables → **Production** スコープにのみ `NEXT_PUBLIC_CF_BEACON_TOKEN` を登録（Preview には登録しない）
- **作業内容（GA4 採用時）**:
  1. Google Analytics → 管理 → プロパティ作成（業種: 「ビジネス・産業マーケット」、レポートのタイムゾーン: 日本、通貨: 円）
  2. データストリーム作成（ウェブ、URL: `https://roi.nekonimatatabi.com`）
  3. 発行された Measurement ID（`G-XXXXXXXXXX`）を取得
  4. Cloudflare Pages → Production スコープに `NEXT_PUBLIC_GA_MEASUREMENT_ID` を登録（Preview には登録しない）
  5. データ保持期間: 14 ヶ月（既定）から変更しない（B2B 中小企業向けで再訪頻度が低いため最長設定不要）
- **アウトプット**: 採用ツールの ID / Token を記録（リポジトリには **コミットしない**）。Cloudflare Pages の Production スコープに環境変数が登録されている状態。
- **このステップはリポジトリ変更を伴わない**。M2 以降のリポジトリ変更とは独立して進められる。

### M2. 解析ラッパの新規実装

- **新規**: `src/lib/analytics.ts`
- **内容**: 以下の薄いラッパ関数群を実装する。
  - `trackEvent(name: string, params?: Record<string, string | number | boolean>): void` — 採用ツールに応じて `window.gtag('event', name, params)` または Cloudflare の beacon API（任意イベント未対応のため CF 単独採用時は **no-op**）を呼ぶ。例外は `try/catch` で握り潰す。
  - `trackPageView(path: string): void` — `gtag('event', 'page_view', { page_path: path })` を発火。CF 単独採用時は no-op（自動検知のため）。
  - 内部ガード: `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` または `process.env.NEXT_PUBLIC_CF_BEACON_TOKEN` 未設定時は全関数を no-op に短絡する（§E 方式 1）。
  - `window` 未定義時（SSR 静的エクスポート時のビルド評価）も no-op。
- **理由**: 後続 Issue (#2/#3/#4/#5) で `import { trackEvent } from "@/lib/analytics";` 1 行追加して該当箇所に `trackEvent("diagnose_complete", { ... })` を差し込めるようにするため。本 PR ではこの API を確定する。
- **テスト戦略**: 単体テストは現時点で導入していないため不要。型チェック (`npm run typecheck`) と lint のみ。

### M3. SPA ルート遷移の PV 計測フックを追加

- **新規**: `src/components/system/AnalyticsRouteListener.tsx`（`"use client"` 指定）
- **内容**: `usePathname()` の変化を購読する `useEffect` で `trackPageView(pathname)` を呼ぶ。CF 単独採用が確定した場合はファイル自体を作成しない（または空関数で no-op としてマウントしておき、将来 GA4 併用時に配線を生かす）。
- **配置**: `src/app/layout.tsx` の `<body>` 内、`<Footer />` と並列でマウント（描画なし）。
- **理由**: 静的エクスポートでも App Router のクライアントナビゲーションは発生する。GA4 で `send_page_view: false` 設定にしたうえで明示的に PV を発火する SPA 標準パターン。

### M4. layout.tsx に解析タグを設置

- **変更**: `src/app/layout.tsx`
- **変更箇所**:
  - 既存 import に `import Script from "next/script";` を追加（GA4 採用時のみ）。
  - 既存 import に `import { AnalyticsRouteListener } from "@/components/system/AnalyticsRouteListener";` を追加（GA4 採用時または将来 GA4 併用に備える場合）。
  - `<body>` 内に以下を追加（採用ツール別）:
    - **Cloudflare Web Analytics 採用時**: `<Script>` を 1 本、`strategy="afterInteractive"`、`src="https://static.cloudflareinsights.com/beacon.min.js"`、`data-cf-beacon={JSON.stringify({ token: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN })}`。`token` 未設定（Preview / Local）では `<Script>` を出力しないガードを入れる。
    - **GA4 採用時**: `<Script>` を 2 本、(1) `src={`https://www.googletagmanager.com/gtag/js?id=${id}`}` strategy="afterInteractive"、(2) インライン `<Script id="ga4-init" strategy="afterInteractive">` で `window.dataLayer` 初期化と `gtag('config', id, { send_page_view: false })`。
- **理由**: 静的エクスポート + Cloudflare Pages 配信下で、本ファイルが全ページ共通の `<head>` 注入点（既存の `metadataBase` `applicationName` 等の管理場所と整合）。
- **検証**: `npm run build` 後、`out/index.html` `out/privacy/index.html` `out/terms/index.html` の `<head>` または `<body>` に `<script>` タグが含まれること、Preview ビルド（環境変数なし）では含まれないことを確認。

### M5. プライバシーポリシーの取得情報節を更新（Markdown）

- **変更**: `docs/legal/privacy.md`
- **変更箇所**:
  - **§1（取得する情報）**: 行 11〜16 の TODO コメントと「現時点では未取得」表記を削除し、採用ツール名と取得情報（CF 採用時: 「IP アドレス、ユーザーエージェント、リファラ、ページパス等の閲覧情報。Cookie その他のトラッカーは設置しません」／GA4 採用時: 「Cookie 識別子（`_ga`, `_ga_<id>`）、IP アドレス、ユーザーエージェント、リファラ、閲覧履歴」）を明記。
  - **§5（Cookie 等の利用）**: 行 42〜46 を、採用ツール別に書き換え:
    - CF 採用時: 「当社は Cloudflare Web Analytics を利用しており、本ツールは Cookie を発行しません」と明記、Cloudflare の運用 Cookie（`__cf_bm`）に関する既存記述は維持
    - GA4 採用時: 「当社は Google アナリティクス 4（GA4）を利用しており、利用状況の把握のために `_ga` 等の 1st-party Cookie を設置します。本機能を利用したくない場合は、Google Analytics オプトアウトアドオン（https://tools.google.com/dlpage/gaoptout）の利用、またはブラウザの Cookie 削除によりオプトアウトできます」と明記
  - 行 13 の `<!-- TODO(Issue #14): … -->` コメントを削除
- **理由**: `docs/legal/REASONING.md` で再評価トリガとして指定された Issue #14 着手時の更新義務を履行。電気通信事業法 外部送信規律への通知義務（採用ツールが該当する場合）をプライバシーポリシー記載で代替する方針（§C）を実体化する。

### M6. プライバシーポリシーの公開ページを同時更新（TSX）

- **変更**: `src/app/privacy/page.tsx`
- **変更箇所**: 行 24〜43 の §1（取得する情報）の `<ul>` 内 `<li>` テキスト、行 89〜102 の §5（Cookie 等の利用）の `<p>` テキストを、M5 の Markdown 変更と **完全に同じ文言** に書き換え。
- **理由**: `docs/legal/REASONING.md` §「同時更新の原則」を遵守。`git diff` で Markdown と TSX が同一コミット内で同期している状態にする。

### M7. REASONING.md の状態更新

- **変更**: `docs/legal/REASONING.md`
- **変更箇所**:
  - §「現時点の入力値取り扱いに関する事実認定」表（行 23〜32）の「アクセス解析タグ」行（行 30）を `**未設置**（Issue #14 で別途検討）` から `**◯◯（採用ツール名）導入済み**（Issue #14 PR #XX）` に書き換え
  - §「法令適用範囲」の「電気通信事業法（外部送信規律、令和 5 年改正）」項（行 41）を「Issue #14 着手時に判定」から「Issue #14 で判定済み: §D に従い、プライバシーポリシー §5 への記載で対応（バナー不採用）」に書き換え
  - §「再評価トリガ」のチェックボックス（行 48）を `- [ ] Issue #14（アクセス解析）着手 …` から `- [x] Issue #14（アクセス解析）着手 — PR #XX で完了` に変更
- **理由**: 法務判断記録の鮮度を維持。次に法務レビューを通すときの参照点を残す。

### M8. README.md の必須環境変数節とドキュメント節の更新

- **変更**: `README.md`
- **変更箇所**:
  - **§必須環境変数**（行 71〜76）に新しい変数行を追加:
    - CF 採用時: `NEXT_PUBLIC_CF_BEACON_TOKEN`（Production のみ。Preview / ローカルでは未設定で送信オフ）
    - GA4 採用時: `NEXT_PUBLIC_GA_MEASUREMENT_ID`（Production のみ）
  - **§ドキュメント**（行 85〜96）に「アクセス解析方針」の 1 行を追加し、`docs/legal/REASONING.md` への参照を再掲（解析ツール採否の根拠の保管場所として）
  - 任意で「アクセス解析」節を新設し、(a) 採用ツール、(b) 計測方針（PV のみ初期）、(c) 環境変数によるオン／オフ、(d) Issue #2〜#5 完了後にイベントを段階的に追加する旨を 5〜10 行で記述
- **理由**: 新規開発者参加時の初動コストを下げる。Cloudflare Pages のスコープ別変数の運用が `NEXT_PUBLIC_SITE_URL` 1 件しかなかったため、追加した時点でドキュメント側を確実に更新する。

### M9. （CF 採用時のみ）lint / typecheck の通過確認

- **変更**: なし（検証ステップ）
- **内容**: `npm run typecheck` と `npm run lint` を実行し、`src/lib/analytics.ts` `src/components/system/AnalyticsRouteListener.tsx` `src/app/layout.tsx` の型エラー / lint 違反がないことを確認。
- **理由**: 既存の `eslint-config-next` と `tsc --noEmit` の品質ゲートを継承。

---

## 検証方法

### 1. Local（送信オフ）
1. `npm run dev` で起動。`http://localhost:3000` を開く。
2. DevTools Network タブで `cloudflareinsights.com` / `googletagmanager.com` / `google-analytics.com` への通信が **発生しないこと** を確認（環境変数未設定のため `<Script>` が出力されない）。
3. DevTools Console で `window.gtag` / `window.dataLayer` が undefined / 未初期化であることを確認。
4. `/`、`/privacy`、`/terms` を順に遷移しても通信が発生しないこと。

### 2. Preview（送信オフ）
1. `develop` ブランチにマージ → Cloudflare Pages の自動 Preview ビルドが走る。
2. 発行された Preview URL（`*.pages.dev`）を開く。
3. DevTools Network タブで解析ドメインへの通信が **発生しないこと** を確認（Preview スコープに環境変数が設定されていないため）。
4. ページソース（`view-source:`）で `<script src="…cloudflareinsights…">` 等が **含まれていないこと** を確認。

### 3. Production smoke test（送信オン）
1. `develop` → `main` の PR をマージ → Cloudflare Pages の本番デプロイが走る。
2. `https://roi.nekonimatatabi.com` を開く。
3. DevTools Network タブで採用ツールの beacon リクエストが発生していること:
   - CF: `https://static.cloudflareinsights.com/beacon.min.js` の 200 応答 + `https://cloudflareinsights.com/cdn-cgi/rum?…` への beacon
   - GA4: `https://www.googletagmanager.com/gtag/js?id=G-XXXX` の 200 応答 + `https://www.google-analytics.com/g/collect?...` への beacon
4. ページソースに `<script src="…">` が出力されていること。
5. 採用ツールのダッシュボードで疎通確認:
   - **CF**: Cloudflare Dashboard → Web Analytics → 当該サイト → Real-time にアクセスし、自身のアクセスがリアルタイム表示されること
   - **GA4**: GA4 → レポート → リアルタイムでアクセスがカウントされること
6. `/`、`/privacy`、`/terms` を順に遷移し、PV が 3 件カウントされること（GA4 SPA フック動作確認）。

### 4. Lighthouse / payload checks
1. 本番 URL で Chrome DevTools → Lighthouse → Performance を実行。
2. **LCP が 1 秒前後を維持していること**（`docs/spec/pdf-report.md §1.2` の非機能要件）。`afterInteractive` 配置で LCP が直接侵食されていない想定。
3. **Total JS Transfer サイズの増分**:
   - CF 採用: +1〜2 KB（gzip）
   - GA4 採用: +30〜40 KB（gzip）
   - いずれも許容範囲内であることを記録に残す
4. CSP / mixed content の警告がコンソールに出ていないこと。
5. Issue #11 で確定した HSTS / TLS 1.2 構成と矛盾していないこと。

### 5. 法務文言の二層整合確認
1. `git diff develop -- docs/legal/privacy.md src/app/privacy/page.tsx` を実行し、Markdown と TSX の §1 / §5 の文言が **逐語一致** していることを目視確認。
2. `docs/legal/REASONING.md` のチェックボックス更新と表更新がコミットされていること。

---

## 後続 Issue への申し送り

- **Issue #2**: Step 1 マウント時に `trackEvent("diagnose_start")`、各 Step の onNext 成功時に `trackEvent("diagnose_step_complete", { step })`、確認画面「修正」リンク押下に `trackEvent("revise_step", { step })` を差し込む。実装位置は `docs/spec/input-form.md §3.4` のステップ構成と §6.2 のエラー表示タイミングを参照。
- **Issue #3**: `ResultDashboard` 初回マウントの `useEffect`（`docs/spec/result-dashboard.md §6.4` の `key={hash(result)}` の発火時）に `trackEvent("diagnose_complete", { insourcing_level, has_speed_warning })` を差し込む。**入力値の生数値はパラメータに載せない**（§B の制約）。
- **Issue #4**: `WarningBanner` の `useEffect` で `trackEvent("warning_banner_shown", { monthly_loss_man_yen })` を差し込む。`docs/spec/warning-copy.md §4.3` の発動条件と整合させる。
- **Issue #5**: `docs/spec/pdf-report.md §8.1` のフロー先頭で `trackEvent("pdf_download_start")`、`save()` 成功直後で `trackEvent("pdf_download_success", { duration_ms })`、`§8.3` の catch 節で `trackEvent("pdf_download_failure", { reason })` を差し込む。タイムアウト 10 秒との整合に注意。
- **Cookie 同意バナーの検討トリガ**: (a) 法務レビューでバナー必要と指摘された場合、(b) GA4 への切替を行う場合、(c) EEA トラフィック比率が増えた場合 — のいずれかが発生した時点で別 Issue 化（`docs/legal/REASONING.md` の再評価トリガに追記する）。
- **`/privacy` `/terms` の PV 除外**: 現状は除外しない。除外要件（社内利用比率の偏りで本番統計が歪む等）が出た時点で `AnalyticsRouteListener` にガードを追加する別 Issue。
- **GA4 への切替 / 併用検討**: Cloudflare Web Analytics 単独採用で開始した後、Issue #2〜#5 完了時点で「診断完了率 / PDF DL 数を計測したい」という運用要件が確定したら GA4 併用 / 切替の Issue を立てる。`src/lib/analytics.ts` の `trackEvent` API を変えずに実装内部だけ差し替える設計。
- **CSP の導入**: 将来 `_headers` ファイルで CSP を導入する際は採用ツールのドメインを `script-src` / `connect-src` / `img-src` に追加する。`README.md` のドキュメント節にも反映する。
