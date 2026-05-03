# Issue #46 全ページのモバイル/タブレット最適化検証プラン

## Context

LP 各セクション（Hero / Problem / Value / HowItWorks / FAQ / ClosingCta）と `/calculate` 配下の InputForm（#39）／ResultDashboard（#41）は responsive 実装済みだが、375px〜1440px の 5 ビューポート × 全公開ページの厳密検証は未実施である。経営層が商談中にスマホ／タブレットで開く想定であり、開いた瞬間の崩れ・タップミス・キーボード起動時のレイアウト破綻は離脱直結となる。本 Issue では「実装変更ではなく検証マトリクス完走」を目的に、(a) 既存コードを読み込んで懸念ポイントを事前洗い出し、(b) ビューポート × ページ × 観点のマトリクスを定義し、(c) DevTools エミュレーション + 実機（iOS Safari / Android Chrome）で実走、(d) 検出した不具合は別 Issue（または同 PR）化する。

GitHub Issue: #46

## 変更対象ファイル

> 本 Issue は **検証中心** タスクのためファイル変更は原則発生しない。以下 1〜3 は「事前コードレビューで洗い出した検証注力ポイント」、4 は「不具合検出時に修正候補となるファイル」、5 は「検証結果の記録物」を示す。

### 1. 検証対象ページ（変更なし・観察のみ）

- **対象**:
  - `src/app/page.tsx`（LP トップ。`Hero` / `ProblemSection` / `ValuePropSection` / `HowItWorks` / `FAQ` / `ClosingCta`）
  - `src/app/calculate/page.tsx` + `src/app/calculate/CalculatePageClient.tsx`（フォーム → 結果 → PDF の 1 ページ完結）
  - `src/app/privacy/page.tsx`
  - `src/app/terms/page.tsx`
  - `src/app/contact/page.tsx`（受け入れ条件記載なしだが Footer から導線あり、ついで検証）
  - `src/app/not-found.tsx`
  - `src/app/error.tsx`
  - `src/app/loading.tsx`（ついで検証）
  - 共通レイアウト: `src/app/layout.tsx` / `src/components/ui/Header.tsx` / `src/components/ui/Footer.tsx`
- **観察観点**（共通）:
  1. **横スクロール非発生**（`document.documentElement.scrollWidth === clientWidth`）
  2. **タップターゲット 44×44px 以上**（WCAG 2.5.5 AAA）
  3. **キーボード起動時のレイアウト維持**（iOS Safari: `100vh` / `dvh` の挙動、`position: sticky` ヘッダの追従）
  4. **可読性**（`text-xs` = 12px が小さすぎないか、行間、色コントラスト）
  5. **タッチ操作で hover-only スタイル に依存していないか**

### 2. `/calculate` の事前コードレビューで把握済みの「特に注力する観点」

- **変更**: なし（観察のみ）
- **対象ファイル**: `src/components/calculate/InputForm.tsx` / `DashboardView.tsx` / `ResultDashboard.tsx` / `PdfDashboard.tsx` / `WarningBanner.tsx`
- **注力チェックリスト**（コードリーディングで導出した懸念点）:
  1. **InputForm の数値入力 `inputBaseClass`** は `h-11`（44px）／`text-base`（16px）で iOS Safari の zoom 抑止条件（≥16px）を満たしている。375px で `<Card className="p-6">` 内に収まることを確認。
  2. **手作業人数ステッパー**（`h-11 w-11` × 2 + 入力欄）は 375px 幅で `gap-2` 込みで横方向に収まるか（特に input 中央が 44px 未満に潰れていないか）。
  3. **更新待ち期間（5 ボタン）** は `flex-col gap-2 sm:flex-row sm:flex-wrap`。モバイルは縦積みで安全。
  4. **内製化状況（5 ボタン）** は `sm:flex-nowrap` で 640px 以上の sm レイアウト時に `shortLabel`（"完全依存"/"一部"/"半分"/"大半"/"完全"）に切り替わる設計。**768px iPad mini 縦** で5 個が横一列に収まり、テキストが折り返さないかを最重点で検証。
  5. **ResultDashboard ヒーロー数値** は `text-[clamp(2.5rem,6vw,4rem)]`。`OKU_THRESHOLD_MAN_YEN` 超の桁数（例「99,999 万円」「1.0 億円」）で 375px 幅でもコンテナ（`Card` の `p-6` 込み）に収まるか。
  6. **Recharts `<ResponsiveContainer width="100%" height={chartHeight}>`** は 375px で `chartHeight=100`／640px 以上で 120px。`MOBILE_QUERY = (max-width: 639px)`（`src/lib/mediaQueries.ts`）に準拠。タブレット（768px）でも軸ラベル（万円表記）が読めるか、Legend が折り返して 2 行になっても破綻しないか。
  7. **PDF ボタン群** は `flex-col gap-3 sm:flex-row sm:justify-center`。`Button size="lg"` は `h-12 px-6`（48px 高）でターゲットサイズ充足。
  8. **PDF 生成中の隠しマウント** （`PdfDashboard`、A4 = `210mm × 297mm`）は `position: absolute; left: -9999px` で本体スクロール幅に影響しない設計。検証時は「モバイルで PDF ダウンロードが完走するか」（特に iOS Safari で `Blob` ダウンロードが Files に保存されるか、Android Chrome の通知から開けるか）を実機で必ず確認。
  9. **WarningBanner**（`min-h-[64px]`、`px-4 py-4 sm:px-5 sm:py-5`）は 375px でアイコン + 2 行テキストが破綻しないか。

### 3. LP セクションの事前コードレビューで把握済みの「特に注力する観点」

- **変更**: なし（観察のみ）
- **対象ファイル**: `src/components/landing/Hero.tsx` / `ProblemSection.tsx` / `ValuePropSection.tsx` / `HowItWorks.tsx` / `FAQ.tsx` / `ClosingCta.tsx`
- **注力チェックリスト**:
  1. **Hero**: 装飾 SVG（`cat-deco-1.svg`）が `absolute -bottom-4 left-[-1.5rem]` で配置されており `overflow-hidden` の親が抑える前提。375px で本文が SVG と被って読みにくくなっていないか。
  2. **Hero CTA リンク**（`h-14`）と Header CTA（`h-9 sm:h-10`）は両方 36px〜56px で、Header CTA が **モバイル時 36px** と 44px 未満。ロゴ + CTA + ナビなしの 14px 高（`h-14`）に収まるための妥協だが、検証時に「タップ精度」を実機で確認しダメなら別 Issue で `min-h-[44px]` 化を検討。
  3. **ProblemSection / ValuePropSection / HowItWorks**: いずれも `grid grid-cols-1 sm:grid-cols-3`。768px では 3 カラムだがカード内本文（`text-sm`）が窮屈にならないか。HowItWorks の矢印（`ArrowDown` / `ArrowRight` の切替）が sm 境界で破綻しないか。
  4. **FAQ Accordion**: `<details><summary>` ベース。`summary` に `cursor: pointer` のみで `min-h` 指定なし → 質問文が 1 行のとき 44px 未満になる可能性。`px-6 py-4` の py-4 で計 ≈ 56px 想定だが計測で確認。
  5. **ClosingCta**: `bg-ink` 上に CTA `bg-canvas`、コントラスト充分。装飾 SVG の `-right-16 -top-16` が overflow を発生させていないか。

### 4. 不具合検出時の修正候補ファイル（事前列挙）

- **新規/変更**: 未定（検出次第サブ Issue 化）
- **修正候補ファイル**（コードレビューから推定される影響範囲）:
  - `src/components/ui/Header.tsx` … モバイル CTA `h-9` の 44px 未満問題が顕在化した場合
  - `src/components/calculate/InputForm.tsx` … 内製化状況 5 ボタンが sm（640px）で折返す場合のラベル/レイアウト調整
  - `src/components/calculate/DashboardView.tsx` … ヒーロー数値 `clamp(2.5rem,6vw,4rem)` の overflow が出た場合の調整、Legend の折返し対策、`chartHeight` の境界値見直し
  - `src/lib/mediaQueries.ts` … `MOBILE_QUERY` のブレークポイント調整が必要となった場合
  - `src/app/globals.css` … iOS Safari ズーム抑止の追加スタイル、`overscroll-behavior` 等の追加が必要な場合
  - `src/app/layout.tsx` の `viewport` … 現状 `themeColor` のみ。`width: "device-width"` / `initialScale: 1` は Next.js デフォルトで付与されるが、iOS Safari の動的 toolbar 対策で `interactiveWidget: "resizes-content"` 等の追加検討
  - `tailwind.config.ts` … `screens.xs`（例 360px）追加が必要となった場合
- **理由**: 受け入れ条件 3「検出した不具合は別 Issue または同 PR で修正済み」に準拠し、修正粒度をファイル単位で見える化することで PR レビューが容易になる。

### 5. 検証結果の記録（成果物）

- **新規/変更**: なし（リポジトリ内ファイル更新は不要）
- **成果物**: 以下の 2 形式で残し、Issue #46 のコメントから両方をリンクする
  1. **検証マトリクス表**: 行＝対象ページ × 列＝5 ビューポート（375 / 390 / 768 / 1024 / 1280 or 1440）。各セルに観点（横スクロール / タップターゲット / キーボード / グラフ / PDF）の OK/NG とスクリーンショット URL。スプレッドシート or Issue コメント本文に Markdown テーブルで記録。
  2. **実機検証ログ**: iOS Safari（iPhone 実機）／Android Chrome（Pixel 実機）での `/calculate` ゴールデンパス（5 項目入力 → 結果表示 → PDF ダウンロード → ファイルが保存されたことを確認）を時系列で記録。動画またはスクショ列で残す。
- **理由**: 受け入れ条件 1「5 つのビューポート × 全ページの検証マトリクスが完了」と条件 4「検証結果を Issue コメントに記録」を満たすため。

## 設計上の考慮点

### 検証ビューポート選定の意図
- **375px**: iPhone SE / 13 mini。最も狭い実機幅。`MOBILE_QUERY = (max-width: 639px)` の挙動確認に必須。
- **390px**: iPhone 14 / 15。シェア最大の現行 iOS 実機幅。
- **768px**: iPad mini 縦。Tailwind `md` ブレークポイント直上。`sm:` の挙動が完全に有効化された状態で、3 カラムグリッド／内製化 5 ボタン横一列／Recharts 高 120px のすべてが効く境界。
- **1024px**: iPad Pro 横。`lg:` ブレークポイント。Hero の `lg:grid-cols-[1.15fr_1fr]` が有効化される境界。
- **1280px / 1440px**: ノート PC〜デスクトップ。`max-w-screen-xl`（1280px）と `max-w-[1024px]`（ダッシュボード）の両方の幅制約を確認。

### 検証ツールの優先順位
1. **Chrome DevTools のデバイスエミュレーション**（必須・全マトリクス分）: タップターゲット計測（`Inspect → Computed → height/width`）、`overflow` 検出（DevTools のレンダリング → "Layout shift regions"）、`prefers-reduced-motion` トグル。
2. **iOS Safari 実機**（必須・`/calculate` のみ）: キーボード起動時の `viewport` 挙動、PDF の Blob ダウンロード後の Files 保存。
3. **Android Chrome 実機**（必須・`/calculate` のみ）: 同上、特に PDF 通知タップから Acrobat / プレビューでの開封確認。
4. **BrowserStack / Lambdatest**（任意）: 上記 2/3 が用意できないとき、または iPad 実機がないときの代替。

### 既知の設計判断との整合
- `MOBILE_QUERY = (max-width: 639px)` と `tailwind.config.ts` の `sm: 640px` は `src/lib/mediaQueries.ts` で意図的に揃えられている。**この境界またぎ**（639px ↔ 640px）でレイアウトが切り替わる瞬間に「Recharts 高さ」「内製化ボタン文言（フル ↔ short）」「フォーム送信ボタン幅」の 3 点が同時に変化する。デバイス幅 640px 直前/直後を必ず一度は手動でリサイズし、`<DashboardView>` のチャート再描画の挙動も確認する。
- PDF 生成は `html2canvas` で **A4 固定の `PdfDashboard`** をキャプチャするため、PDF 自体のレイアウトはビューポート非依存。ただし「モバイルで生成ボタンを押せるか」「ダウンロードトリガーが発火するか」「ファイルが端末ストレージに残るか」は実機固有の挙動なので必ず確認。

### 受け入れ条件カバレッジ
- 条件 1（5 ビューポート × 全ページ）→ 「検証マトリクス表」で担保
- 条件 2（iOS Safari / Android Chrome 実機での `/calculate` 完走）→ 「実機検証ログ」で担保
- 条件 3（不具合は別 Issue / 同 PR で修正済み）→ NG セルから直接サブ Issue を起票し本 Issue にリンク
- 条件 4（検証結果を Issue コメントに記録）→ 上記 5 の成果物リンクをコメント投稿

## 検証方法

1. **準備**:
   - `npm run build && npx serve out -p 3000` で本番同等の静的成果物をローカル配信（`playwright.config.ts` と同じ手順）。または Cloudflare Pages のプレビュー URL を利用。
   - Chrome DevTools のデバイスツールバーに 5 ビューポート（375 / 390 / 768 / 1024 / 1280 / 1440）を登録。
   - iPhone（iOS 17+ Safari）と Android（Chrome 最新版）の実機を準備。同一 Wi-Fi で `serve` 起動 PC へアクセス可能にする（または Cloudflare Pages プレビュー URL を使用）。

2. **DevTools エミュレーションフェーズ**（全ページ × 5 ビューポート）:
   1. 各ページを開き、`document.documentElement.scrollWidth - document.documentElement.clientWidth` を Console で評価して 0 であることを確認（横スクロール非発生）。
   2. DevTools で主要なタップターゲット（Header CTA / Footer リンク / フォーム入力 / ステッパー ± / セグメントボタン × 10 / 「診断する」 / PDF / 再診断 / FAQ summary / Hero CTA / ClosingCta CTA / not-found / error の各リンク）の Computed `height` を測り、44px 未満を NG セルに記録。
   3. `/calculate` で 5 項目入力 → 「診断する」を押下 → ResultDashboard 表示 → DevTools の "Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`" を切り替えて、アニメーション抑止が効くことを確認。
   4. 1280 / 1440 でグラフ Legend が 1 行、375 / 390 で折り返し ≤ 2 行に収まることを確認。

3. **iOS Safari 実機フェーズ**（`/calculate`）:
   1. ホーム画面追加せず通常タブで開き、Header の `sticky top-0` が `position: sticky` で正しく追従することを確認。
   2. 月額ベンダー費用入力欄をタップ → ソフトウェアキーボードが立ち上がる際にズームしないこと（`text-base = 16px` で抑止される設計）。
   3. キーボード表示中に下方向にスクロールしてもレイアウトが破綻しないこと。
   4. 5 項目入力 → 「診断する」 → ResultDashboard 表示 → 「PDF をダウンロード」タップ → ボタンが `disabled` 状態（`PDF生成中…`）に切り替わり、生成完了後に Safari のダウンロードバナー or Files への保存ダイアログが表示されることを確認。
   5. 生成された PDF ファイル（`matatabi-roi-YYYYMMDD-HHmm.pdf`）を Files から開き、A4 1 ページで全要素が見えることを確認。

4. **Android Chrome 実機フェーズ**（`/calculate`）:
   1. iOS と同等の手順で完走確認。
   2. PDF ダウンロード後、通知パネルから PDF を開けること、ローカルの Download フォルダに保存されることを確認。

5. **エッジケース確認**:
   - 内製化「完全内製」を選んで送信し、止血カードが「現状、理想形に近い運用のため削減余地は 0 万円」表示になり、グラフの止血セグメントが消えてもバーが破綻しないことを 375px と 768px で確認。
   - 月額ベンダー費用 = 10000、改修費用 = 5000、人数 = 1000 の最大値で送信し、ヒーロー数値（おそらく数億円）が `clamp(2.5rem,6vw,4rem)` 上限内で 375px のカード幅に収まること、PDF も `OKU_THRESHOLD_MAN_YEN` 超で `heroFontSize: "24pt"` に切り替わって A4 1 ページに収まることを確認。
   - 更新待ち「3〜6ヶ月」「半年〜1年」「1年以上」を選び `WarningBanner`（CRITICAL OPPORTUNITY LOSS）を 375px で表示し、アイコン + 2 行コピーが折返し含めて読めることを確認。
   - `error.tsx` を強制発火（DevTools の Source override 等）し、375px / 768px でレイアウトが破綻しないことを確認。
   - 存在しない URL（例 `/zzz`）にアクセスして `not-found.tsx` の表示を 5 ビューポートで確認。

6. **記録と起票**:
   - 上記 2〜5 の各セルを OK/NG/N/A で埋め、NG セルにはスクリーンショットと「再現手順 / 期待挙動 / 実挙動」を記録してサブ Issue を起票（タイトル例: `fix(calculate): 768px iPad mini で内製化ボタンが折り返す`）。
   - 全マトリクスが OK または起票済みになった時点で受け入れ条件 1〜4 を本 Issue コメントでチェック。
