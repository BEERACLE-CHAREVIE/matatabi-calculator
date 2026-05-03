# Issue #46 全ページ モバイル/タブレット最適化 検証マトリクス結果

- 実施日: 2026-05-03
- ブランチ: `feature/issue-46-strict-mobile-tablet-optimization-test_20260503`
- 検証ツール: Playwright (chromium / firefox / webkit) × 5 ビューポート
- 自動検証スクリプト: `e2e/responsive-matrix.spec.ts`
- ローカル配信: `npm run build && npx serve out -p 3000` (本番同等の静的成果物)

## 1. 検証マトリクス（自動化部分）

各セルは Playwright によるアサーションの結果。`OK` = `pass`、`FIX` = 自動検出された不具合を本 PR で修正済み。

| ページ \ ビューポート | 375x812 | 390x844 | 768x1024 | 1024x1366 | 1440x900 |
|---|---|---|---|---|---|
| `/` ランディング | OK | OK | OK | OK | OK |
| `/calculate` フォーム | OK | OK | OK | OK | OK |
| `/calculate` 結果ダッシュボード | OK | OK | OK | OK | OK |
| `/privacy` | OK | OK | OK | OK | OK |
| `/terms` | OK | OK | OK | OK | OK |
| `/contact` | OK | OK | OK | OK | OK |

各セルでアサートした観点（`e2e/responsive-matrix.spec.ts` 参照）:
1. `<meta name="viewport">` が `width=device-width` を含む。
2. `documentElement.scrollWidth - clientWidth <= 2`（横スクロール非発生、1px 計算誤差を許容）。
3. Header (`role="banner"`) と Footer の可視性。
4. 全 `<a href>` / `<button>` / `[role="button"|"radio"|"link"]` / `<summary>` のうち、WCAG 2.5.5 インライン例外（`display: inline`）を除く要素が **44×44px 以上** であること。
5. `/calculate` 結果ダッシュボードの PDF / 再診断ボタンが 44px 以上、ヒーロー数値が可視。

実行結果: **全 3 ブラウザ × 5 ビューポート × 6 ページ = 90 テスト pass**（chromium / firefox / webkit）。

## 2. 自動検証で検出 → 本 PR で修正した不具合

事前コードレビュー（プラン §1〜3）で懸念されていた点と、新規に検出された点を含む。

| 種別 | 該当ファイル | 修正前 | 修正後 |
|---|---|---|---|
| Header CTA タップターゲット | `src/components/ui/Header.tsx` | `h-9 px-3 sm:h-10` (36–40px) | `h-11 px-3 sm:px-4` (44px) |
| Header ロゴ Link | `src/components/ui/Header.tsx` | ロゴ画像高 28–32px のみ | `inline-flex min-h-11 items-center` |
| Footer 法務リンク × 3 | `src/components/ui/Footer.tsx` | `text-xs` 12px のテキストリンク | `inline-flex min-h-11 items-center` 付与 |
| `/contact` メールリンク | `src/app/contact/page.tsx` | テキスト高 16px のみ | `inline-flex min-h-11 items-center` |
| `/contact` 戻る Link | `src/app/contact/page.tsx` | テキスト高 14px のみ | `inline-flex min-h-11 items-center` |
| `/privacy` 戻る Link | `src/app/privacy/page.tsx` | テキスト高 14px のみ | `inline-flex min-h-11 items-center` |
| `/terms` 戻る Link | `src/app/terms/page.tsx` | テキスト高 14px のみ | `inline-flex min-h-11 items-center` |
| InputForm ステッパー −/＋ | `src/components/calculate/InputForm.tsx` | flex 内で `w-full` input に圧迫され 38×44px | `shrink-0` 追加で `44×44` を担保 |

## 3. 本 PR の対象外（実機確認が必要・受け入れ条件 2）

自動化できない以下の項目は、ユーザーによる実機確認が必要。受け入れ条件 2（iOS Safari / Android Chrome 実機での `/calculate` ゴールデンパス完走）の充足はマージ後の実機確認で担保する。

- **iOS Safari (iPhone 実機)**: `/calculate` で
  1. ソフトウェアキーボード起動時にズームしないこと（`text-base = 16px` で抑止される設計）
  2. キーボード表示中にレイアウトが破綻しないこと
  3. PDF ダウンロード後、Safari ダウンロードバナー → Files への保存ダイアログ
  4. 生成 PDF (`matatabi-roi-YYYYMMDD-HHmm.pdf`) の A4 1 ページ可読性
- **Android Chrome (Pixel 等実機)**: 同様の `/calculate` 完走と通知パネルからの PDF 開封
- **Recharts グラフの軸ラベル可読性 / Legend 折返し**: 768px / 1024px で目視確認
- **エッジケース**: 「完全内製」選択時の止血カード = 0 円表示 / `clamp(2.5rem,6vw,4rem)` での桁あふれ確認

検証時に追加の不具合が見つかった場合は、サブ Issue を起票して Issue #46 にリンクする運用（プラン §6 受け入れ条件 3）。

## 4. 受け入れ条件カバレッジ

| # | 受け入れ条件 | 充足状況 |
|---|---|---|
| 1 | 5 ビューポート × 全ページの検証マトリクスが完了 | **充足**（自動検証 90/90 pass、本ドキュメントが成果物） |
| 2 | iOS Safari / Android Chrome 実機での `/calculate` ゴールデンパス完走 | **マージ後ユーザー実機確認**（§3 参照） |
| 3 | 検出した不具合は別 Issue または同 PR で修正済み | **充足**（同 PR で 8 件修正、§2 参照） |
| 4 | 検証結果を Issue コメントに記録 | **充足予定**（PR マージ後に本ドキュメントを Issue #46 へ転記） |
