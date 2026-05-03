# Issue #13 実装プラン: プライバシーポリシー／利用規約の要否判断と文面用意

## Context
本リポジトリは Cloudflare Pages による静的エクスポート (`output: "export"`) で配信される完全クライアント計算アプリ「またたび計算機」の準備フェーズ Issue #13 を扱う。法務／公開準備フェーズ（フェーズ 4）の最初の Issue であり、入力フォーム 5 項目（月額ベンダー費用 / 改修費用 / 手作業人数 / 更新待ち期間 / 内製化状況）の取り扱いについて、プライバシーポリシー／利用規約の要否を法務観点で判断し、必要であればドラフト文面とフッター導線を用意することが目的。コード修正は最小限（Markdown ドラフト + 静的ページ + フッター + 設定）に留める。

事実関係の確認結果（事実認定の根拠）:
- 計算は完全クライアント計算（`docs/spec/calculation-logic.md` の擬似コード `calculate()` はサーバ送信なし）
- 入力値の永続化は **将来拡張として明示的にスコープ外**（`docs/spec/input-form.md §10`）→ 現時点では `localStorage` 等にも保存しない
- PDF はクライアントサイド生成（`docs/spec/pdf-report.md` の jsPDF + html2canvas、`useCORS=false`、外部 CDN 依存ゼロ）
- Next.js のサーバ機能（`cookies()` / `headers()` / Server Actions / Route Handlers / SSR fetch）は一切未使用（Issue #11 プラン §B）
- **「入力値はサーバへ送らず、永続化もしない」設計が Issue #11 プランで恒久方針として確定済み**（`working/plans/issue-11-cloudflare-pages-setup_260501114546.md:40`）
- フッターコンポーネントは未実装（`src/app/layout.tsx` には `<body>` 直下に `{children}` のみ、`src/components/ui/` には `Button.tsx` / `Card.tsx` のみ）
- 既存 `docs/legal/` や `docs/policy/` ディレクトリは **存在しない**
- アクセス解析は Issue #14（未着手）でスコープ外。現時点では GA4 / Cloudflare Web Analytics のいずれも未導入

GitHub Issue: #13

---

## 変更対象ファイル

### M0. 【法務判断】要否判断と文面方針の確定（プラン上の最優先ゲート）

- **判断者**: 株式会社ねこにまたたび代表 / プロダクトオーナー（必要に応じて外部の法務顧問に相談）
- **作業場所**: 本プランのレビュー時点で意思決定し、`docs/legal/REASONING.md`（M1 で新設）に判断結果と根拠を文書化する
- **判断対象**（後述「判断ツリー」を参照）:
  1. 入力値の取り扱いが「完全クライアント計算で完結し、サーバ送信・保存・サードパーティ提供なし」と確認できるか
  2. Cookie / トラッカー（GA4 等）を **現時点で** 設置するか
  3. PDF の連絡先（`contact@...`）はメール宛先表示のみで送信機能を持たないか（フォーム submit を持たない事実の確認）
  4. 利用規約（免責 / 著作権 / 禁止事項 / 準拠法）の必要性。本アプリは ROI 試算結果という**金額表示**を含むため、誤利用に対する免責条項の整備は強く推奨される（コードレベルの推奨であって法的助言ではない）
- **アウトプット**: 「Privacy Policy: 不要 / 簡易掲載 / 正規掲載」「Terms of Use: 不要 / 簡易免責のみ / 正規掲載」の 2 軸 × 3 段階のいずれかをチェックインし、その判断ロジックを M1 の REASONING.md に記録する
- **このゲートを通過するまで** M2 以降の文面ドラフトおよびリポジトリ側変更には着手しない（手戻りを防ぐ）

### M1. 【ステークホルダー作業】法務レビュー依頼（文面ドラフト完成後）

- **作業者**: プロダクトオーナー → 法務担当（社内 / 外部顧問）
- **タイミング**: 本プランの 1〜3（後述）でドラフト Markdown が確定した直後、本番公開前の最終ゲートとして
- **依頼内容**:
  - 個人情報保護法（令和 4 年改正版）への適合性
  - 特定電子メール法 / 電気通信事業法（通信の秘密）への該当有無
  - 海外居住者がアクセスする場合の GDPR / CCPA 適用範囲（B2B 中小企業向けで国内顧客に限定する想定だが、Cloudflare 経由で技術的にはグローバル配信される事実を申し送る）
  - 利用規約の免責条項（試算結果に対する保証否認）の有効性
  - 「Proprietary. © 株式会社ねこにまたたび」表示と利用規約の整合（README.md 95-97 行）
- **フィードバック反映ループ**: レビュー指摘 → ドラフト Markdown 修正 → 再レビュー（最大 2 サイクル想定）。修正は本プランの「1. 〜 4.」のリポジトリ側変更内に閉じる（Next.js コードへの追加修正は発生しないように設計する）
- **本プランのスコープ**: 「ドラフト文面の構造」「リポジトリ内配置」「フッター導線」までを対象とし、**確定文言の法的レビューは本プラン外（ステークホルダー作業）として明確に分離**する

---

### 1. リポジトリ側変更（条件 A: PP / Terms「不要」と判断された場合）

判断ゲート M0 で「現時点では PP / Terms 不要」と確定した場合の最小変更セット。

#### 1-A-1. `docs/legal/REASONING.md` を新規作成（**必須**）

- **配置**: `/Users/YS/development/matatabi-calculator/docs/legal/REASONING.md`
- **内容**:
  - タイトル: 「プライバシーポリシー／利用規約の要否判断記録」
  - 判断日付・判断者・参照した仕様書（`docs/spec/calculation-logic.md`、`docs/spec/input-form.md §10`、`docs/spec/pdf-report.md §2`、Issue #11 プラン §B）
  - 「不要」と判断した根拠の列挙:
    1. 入力値はクライアント計算のみで完結しサーバ送信なし
    2. localStorage / sessionStorage / Cookie への永続化なし
    3. サードパーティ JS / CDN への入力値リーク経路なし（PDF も `useCORS=false`）
    4. Cookie / トラッカー（GA4 等）は **本 Issue 着手時点では未設置**
    5. お問い合わせフォーム / メール送信機能なし（PDF フッター記載の `contact@...` は単なる表示文字列）
  - **再評価トリガ**（必読リスト）: Issue #14（アクセス解析）着手時 / 入力値永続化（`input-form.md §10`）着手時 / お問い合わせフォーム追加時 / 顧客名入力（`pdf-report.md §6.3`）追加時
  - **法務レビュー結果**（M1 完了後に追記する欄）

#### 1-A-2. `README.md` の「ドキュメント」節に法務判断記録へのリンクを追記

- **配置**: `/Users/YS/development/matatabi-calculator/README.md`
- **追加箇所**: 85〜93 行目「ドキュメント」リスト末尾
- **追加内容**: `- 法務判断記録: [docs/legal/REASONING.md](./docs/legal/REASONING.md) (Issue #13)`
- **理由**: 公開前のレビュアーや将来の貢献者が「なぜ PP がないのか」を即座にトレースできるようにする

#### 1-A-3. フッター導線は **設置しない**（条件 A の場合）

- 現状 `src/app/layout.tsx` にはフッター未実装。条件 A では `/privacy` / `/terms` ページが存在しないため、リンク先のないフッターを作るのは過剰。Issue #14 等で再評価された時点で 1-B / 1-C と統合して整備する
- **ただし**「© 株式会社ねこにまたたび」のコピーライト表示のみは公開時の体裁として欲しい場合、軽量な `Footer.tsx` を 1-C-3 と同じ場所に置き、リーガルリンクは持たせない構成も選択可（M0 判断で決める）

---

### 1. リポジトリ側変更（条件 B: 簡易免責 / 簡易プライバシー注記のみと判断された場合）

判断ゲート M0 で「PP は不要だが、ROI 試算の免責 / 入力値の取り扱い説明は掲載すべき」とされた中間ケース。

#### 1-B-1. `docs/legal/REASONING.md` を新規作成（条件 A と同形だが結論セクションが「簡易掲載」）

#### 1-B-2. `docs/legal/notice.md` を新規作成（簡易掲載文面ドラフト）

- **配置**: `/Users/YS/development/matatabi-calculator/docs/legal/notice.md`
- **内容構成**（ドラフト）:
  1. 「入力値の取り扱いについて」 — クライアント計算のみで完結、当社サーバへの送信・保存なし、Cookie 等のトラッキングなし
  2. 「試算結果の取り扱いについて」 — 業界標準値に基づく簡易試算であり投資判断の保証ではない旨（`calculation-logic.md §3` の説明ロジックを引用）
  3. 「お問い合わせ」 — PDF 記載の連絡先は本プロダクト（マスター設計書 §3.3 の「お問い合わせ」CTA に整合）
  4. 「著作権・商標」 — 「Proprietary. © 株式会社ねこにまたたび」（README.md 97 行）に整合
- **トーン**: 平易な日本語、商談対話で経営者が読んでも違和感のないレベル

#### 1-B-3. `src/app/notice/page.tsx` を新規作成（簡易掲載ページ）

- **配置**: `/Users/YS/development/matatabi-calculator/src/app/notice/page.tsx`
- **方針**: Static Page（静的エクスポート互換）。`docs/legal/notice.md` の内容を **手動で TSX に転記** して配置する（`output: "export"` 配下で `next-mdx-remote` 等の追加依存を避けるため、Markdown ローダーは導入しない）
- **メタデータ**: `metadata = { title: "ご利用にあたって | またたび計算機", robots: { index: true, follow: true } }`
- **整合**: `next.config.mjs` の `output: "export"` で `out/notice/index.html` として静的書き出しされること

#### 1-B-4. `src/components/ui/Footer.tsx` を新規作成 + `src/app/layout.tsx` で配置

- **配置**: `/Users/YS/development/matatabi-calculator/src/components/ui/Footer.tsx`
- **`layout.tsx` 修正**: `<body>` 直下を `<div className="min-h-screen flex flex-col"><div className="flex-1">{children}</div><Footer /></div>` の形に変更（`bg-canvas text-ink antialiased` のクラスは body に残す）
- **Footer 構成**:
  - 左: `© 株式会社ねこにまたたび`
  - 右: `<Link href="/notice">ご利用にあたって</Link>`
- **デザイントークン**: `border-line` の上端 1px 罫線、Noto Sans JP / 12px、`text-ink/70`（`docs/design-tokens.md` の既定トークンに沿う）
- **`src/components/ui/index.ts` から re-export**

---

### 1. リポジトリ側変更（条件 C: PP / Terms 正規掲載が必要と判断された場合）

判断ゲート M0 で「将来 #14 で GA4 等を入れる確度が高い、または利用規約を正規に整備すべき」と判断された場合の最大セット。

#### 1-C-1. `docs/legal/REASONING.md` を新規作成（条件 A と同形、結論は「正規掲載」）

#### 1-C-2. ドラフト Markdown を新規作成

- `/Users/YS/development/matatabi-calculator/docs/legal/privacy.md` — プライバシーポリシードラフト
  - 取得情報の有無（現状なし。将来 GA4 導入時の追記欄をプレースホルダで明記）
  - 利用目的 / 第三者提供 / 開示請求窓口 / 改定履歴
  - 個人情報保護法（令和 4 年改正）対応の汎用テンプレ構成
- `/Users/YS/development/matatabi-calculator/docs/legal/terms.md` — 利用規約ドラフト
  - 第 1 条 適用範囲 / 第 2 条 利用条件 / 第 3 条 知的財産 / 第 4 条 禁止事項 / 第 5 条 免責（試算結果の保証否認）/ 第 6 条 規約変更 / 第 7 条 準拠法・裁判管轄（日本法・東京地裁等）
- どちらも **「ドラフト」**「最終版は法務レビュー後」と冒頭に注記（M1 のフィードバック前提）

#### 1-C-3. `src/app/privacy/page.tsx` および `src/app/terms/page.tsx` を新規作成

- 1-B-3 と同じ静的ページ方式（Markdown ローダー導入せず、TSX 内に転記）
- メタデータは `robots: { index: true, follow: true }`
- 各ページ末尾に「最終更新日」「お問い合わせ先」を記載

#### 1-C-4. `src/components/ui/Footer.tsx` の構成（条件 B より拡張）

- 左: `© 株式会社ねこにまたたび`
- 右: `プライバシーポリシー` / `利用規約` の 2 リンク（`<Link href="/privacy">` / `<Link href="/terms">`）
- `layout.tsx` 配置は 1-B-4 と同手順

#### 1-C-5. `README.md` ドキュメント節への追記

- `- プライバシーポリシー: docs/legal/privacy.md`
- `- 利用規約: docs/legal/terms.md`
- `- 法務判断記録: docs/legal/REASONING.md`

---

## 設計上の考慮点

### 判断ツリー（M0 で必ず通すこと）

```
Q1. 入力値をサーバ送信・保存するか？
├─ Yes → 条件 C（PP 必須）
└─ No  → Q2 へ

Q2. localStorage / sessionStorage / Cookie に保存するか？
├─ Yes → 「Cookie の利用」として PP 言及が望ましい → 条件 B または C
└─ No  → Q3 へ

Q3. サードパーティ JS（GA4 / Cloudflare Web Analytics 等）を読み込むか？
   - Cloudflare Web Analytics（クッキーレス・IP 匿名化）= 一般に PP 必要性は低いが推奨
   - GA4 = Cookie 利用するため PP 必須
├─ GA4 採用予定（Issue #14） → 条件 C（先回りで整備）
├─ Cloudflare Web Analytics 採用予定 → 条件 B 以上
└─ 解析なし → Q4 へ

Q4. お問い合わせフォーム / メール送信機能を持つか？
├─ Yes → 条件 C（取得情報の利用目的を明記）
└─ No  → Q5 へ

Q5. 利用規約（免責 / 著作権 / 禁止事項）を整備すべきか？
   ROI 試算という金額表示を含むため、誤利用回避の観点から **条件 B 以上を推奨**
├─ 整備する → 条件 B または C
└─ 整備しない → 条件 A（REASONING.md のみで運用可）
```

**現時点（Issue #14 未着手 / 入力値永続化なし / お問い合わせフォームなし）の暫定判断**: 条件 A〜B の境界。代表者・法務担当の意思決定で確定する。

### Issue #14（アクセス解析）連動の設計考慮点

- Issue #14 で **Cloudflare Web Analytics**（クッキーレス）を採用 → PP 簡易記載で済む可能性が高い → 条件 B
- Issue #14 で **GA4** を採用 → PP 必須 + Cookie 同意（要否は最低限の議論）→ 条件 C
- 本 Issue で条件 A を選んだ場合、Issue #14 着手時に本 Issue を **再オープンまたは追加 Issue を起票** することを `REASONING.md` の「再評価トリガ」に明記し、抜けを防ぐ
- 逆に本 Issue で条件 C を先回りで整備した場合、Issue #14 のスコープが「タグ設置 + PP の取得情報節を更新するだけ」に縮小し、後続 Issue が軽くなる利点がある

### 法令適用範囲の考慮

- **個人情報保護法（日本）**: 入力値（金額・人数）は通常、特定個人を識別しないため「個人情報」に該当しない可能性が高い。ただし IP / Cookie ID は個人関連情報として整理が必要（GA4 採用時）
- **GDPR / CCPA**: B2B 中小企業向けで主たる利用者は国内想定だが、Cloudflare 経由で技術的にはグローバル配信される。EEA / カリフォルニア州からのアクセスに対する考慮を法務レビューに含める
- **電気通信事業法（外部送信規律）**: 令和 5 年施行の改正で第三者送信を伴う Web サービスに通知義務が課された。GA4 / Cloudflare Web Analytics いずれを採用するにしても、Issue #14 着手時に外部送信規律の適用判定を行う必要がある（本 Issue の REASONING.md にも申し送る）

### Cookie の扱い

- 現時点で Cookie は **一切使用しない**（Next.js の `cookies()` 未使用、Issue #11 プラン §B）
- Cloudflare のエッジレベルで `__cf_bm`（Bot Management）等の Cookie がセットされる可能性はゼロではないが、これは Cloudflare の運用クッキーで本サービス由来ではない。条件 B / C を採用する場合の文面では「当社が能動的に設置する Cookie はない」というスタンスが妥当
- Lighthouse の Best Practices で Cookie 関連の警告（HttpOnly / SameSite 不足等）が出ないかは検証フェーズで確認

### フッター実装方針

- 既存の `src/components/ui/` には `Button` / `Card` のみ。`Footer` を **`ui/` 配下に置くか、`src/components/layout/` を新設するか** は本 Issue で決定する（推奨: `ui/` 配下に置き、`index.ts` から re-export して既存パターンに揃える）
- `Card.Header` / `Card.Body` / `Card.Footer` の composition API は YAGNI で実装しないという既存方針（`docs/design-tokens.md:161`）に倣い、`Footer` は **シンプルな 1 ファイル コンポーネント**で実装する
- `layout.tsx` の現状は `<body>` 直下に `{children}` のみ。Footer を sticky 風に画面下に配置するため Flexbox で `min-h-screen` を確保する変更が必要（条件 B / C のみ）

### リポジトリ内配置の代替案と不採用理由

- `app/legal/privacy/page.tsx` のようにネスト配置する案 → URL が長くなり、フッターからのリンク文字列も長くなるため不採用。`/privacy` / `/terms` のフラット構成を採用
- `public/legal/privacy.html` に静的 HTML として置く案 → Next.js の `metadata` API（OG / robots）が使えず、デザイントークンとの整合も取りにくいため不採用
- `next-mdx-remote` 等で Markdown を直接レンダリングする案 → 静的エクスポート（`output: "export"`）と相性検証が必要 + 依存追加が発生し本 Issue（最小限のコード変更）の方針に反するため不採用。**Markdown はソース・オブ・トゥルース、TSX は転記版** という二層構造を採る

### スコープ外（明示）

- アクセス解析タグの設置（Issue #14）
- 入力値の `localStorage` 永続化（`docs/spec/input-form.md §10` の将来拡張）
- お問い合わせフォーム / メール送信 API の追加
- Cookie 同意バナー（Cookie を使わない設計のため不要。Issue #14 で GA4 採用が決まった時点で別途検討）
- PDF フッターの `contact@nekonimatatabi.example` 連絡先確定（Issue #5 / `pdf-report.md §13.5` で別管理）

---

## 検証方法

1. **判断記録の整合性確認** — `docs/legal/REASONING.md` が `docs/spec/calculation-logic.md` / `docs/spec/input-form.md §10` / `docs/spec/pdf-report.md §2` / Issue #11 プランの「サーバ送信なし」記述と矛盾しないこと（人手レビューで参照箇所をリンクで突き合わせ）
2. **Markdown レンダリング確認**（条件 B / C） — GitHub 上で `docs/legal/notice.md` / `privacy.md` / `terms.md` が崩れずに表示されること（プレビュー）
3. **静的ページのレンダリング確認**（条件 B / C） — `npm run build` で `out/notice/index.html`（または `out/privacy/index.html` / `out/terms/index.html`）が生成されること、`npx serve out` 経由でアクセスして本文が表示されること
4. **フッター導線の機能確認**（条件 B / C） — トップページ `/` のフッターから `/notice`（または `/privacy` / `/terms`）に遷移し、戻る操作で復帰できること、Cloudflare Pages のプレビュー URL でも同様に動作すること
5. **Lighthouse 確認** — Best Practices カテゴリで Cookie 関連の警告（`Set-Cookie` の `HttpOnly` / `SameSite`）が出ないこと、SEO カテゴリで `robots.txt` と `metadata.robots` が整合し `/notice` / `/privacy` / `/terms` がインデックス可能であること
6. **法務レビュー結果の反映ループ** — M1 の指摘を受けて Markdown ドラフトを更新したのち、対応する TSX 転記版 (`page.tsx`) も同時に更新する。差分が出ないことを `git diff` で目視確認（Markdown と TSX の二重メンテに伴うズレを防ぐ）
7. **再評価トリガの埋め込み確認** — Issue #14（アクセス解析）の Issue 本体に「着手時に Issue #13 / `docs/legal/REASONING.md` を再評価する」コメントを追加できる状態にしておく（Issue #14 着手前ならコメント追加、未起票なら REASONING.md 内の「再評価トリガ」節で代替）
8. **メタデータ確認**（条件 B / C） — 各リーガルページの `<title>` が「ご利用にあたって | またたび計算機」「プライバシーポリシー | またたび計算機」「利用規約 | またたび計算機」となり、`metadataBase` (`src/app/layout.tsx` 25 行) からの相対 URL が正しく解決されること
