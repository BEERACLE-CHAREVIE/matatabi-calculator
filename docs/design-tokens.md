# またたび計算機 デザイントークン運用ガイド

## 1. このドキュメントの目的

- 各 UI 実装 PR でクラス名選択にブレを出さないための一次情報源。
- カラー（Issue #7）/ 余白・角丸・シャドウ・タイポ補強（Issue #10）の運用ルールをまとめる。
- 暫定値 / 確定値の境界を示す。

ソース・オブ・トゥルース:

- 値の物理定義: `tailwind.config.ts` の `theme.extend`
- グローバル base スタイル: `src/app/globals.css` の `@layer base`
- 雛形コンポーネント: `src/components/ui/`
- ヘルパ: `src/lib/cn.ts`

---

## 2. カラー（Issue #7 で確定済み、再掲）

ロール別 4 トークン + パレット名 4 トークン（同 HEX、用途別エイリアス）:

| ロール | パレット名 | HEX | 主な用途 |
|---|---|---|---|
| `canvas` | `offwhite` | `#F8F6F2` | ページ背景 / カード背景 / Button 上のテキスト |
| `ink` | `ash` | `#72665B` | 本文テキスト / 主要 UI のフォアグラウンド |
| `line` | `greige` | `#BEB5AA` | 罫線 / 区切り（不透明度修飾と併用、例 `border-line/50`） |
| `accent` | `misty` | `#9CAEB8` | CTA / リンク / フォーカスリング |

設計方針:

- HEX は `tailwind.config.ts` に直書きし、CSS 変数を挟まない（`getComputedStyle` を経由せず JS から色値を取得する場面で扱いを単純化するため）。
- ライトモード固定。マスター設計書 §3.3 にダークモード指定はないため、`darkMode` / `prefers-color-scheme: dark` は意図的に持ち込まない。

---

## 3. 余白の運用ルール

`tailwind.config.ts` の `theme.extend.spacing` に **追加しない**。Tailwind デフォルトスケール（4px 刻み）をそのまま使う。揃いはコードベース上の運用ルールで担保する。

| 用途 | 推奨クラス | 数値 |
|---|---|---|
| セクション間（縦） | `space-y-6`（モバイル `space-y-4`） | 24px / 16px |
| カード間（縦） | `gap-6`（モバイル `gap-4`） | 24px / 16px |
| カード padding | `p-6`（モバイル `p-4`） | 24px / 16px |
| カード内の見出しと本文 | `space-y-3` または `mb-3` | 12px |
| インライン要素間（アイコン + テキスト） | `gap-2` または `gap-3` | 8px / 12px |
| ヒーロー上下余白（ResultDashboard） | `py-12`（モバイル `py-8`） | 48px / 32px |
| ページの左右マージン | `px-6`（モバイル `px-4`） | 24px / 16px |
| 最大幅（ダッシュボード） | `max-w-[1024px]` | spec 確定値、任意値 |
| 最大幅（グラフ） | `max-w-[960px]` | 同上 |
| 最大幅（補助カード） | `max-w-[720px]` | 同上 |

任意値（`max-w-[1024px]` 等）は Tailwind が自動生成するため `theme.extend` への登録は不要。後続実装で 3 箇所以上で同じ任意値を書くと判明した場合は、その時点でセマンティックキー化を別 Issue で検討する。

---

## 4. 角丸の用途マッピング

`tailwind.config.ts` の `theme.extend.borderRadius` に **追加しない**。Tailwind デフォルトをそのまま使い、用途で揃える。

| 用途 | 推奨クラス | 数値 | 理由 |
|---|---|---|---|
| ボタン / 入力フィールド | `rounded-md` | 6px | 業務系 UI の標準サイズ |
| Tab / Pill 型ボタン | `rounded-full` | — | 切替系を視覚的に区別 |
| カード（デフォルト） | `rounded-xl` | 12px | 「大人の余裕」 |
| カード（大型 / ヒーロー） | `rounded-2xl` | 16px | ResultDashboard 主要カード等 |
| バッジ / タグ | `rounded-full` | — | バッジは丸ピル型で統一 |
| グラフのバー先端 | `rounded-sm` | 2px | Recharts `<Bar radius={[2,2,0,0]}>` |
| 警告バナー | `rounded-xl` | 12px | カードと同じトーン |
| モーダル / シート | `rounded-2xl` / `rounded-t-2xl`（モバイルボトムシート） | 16px | 必要発生時に追加 |

雛形 `Card` のデフォルト角丸は `rounded-xl` で固定。`<Card variant="hero">` のような大型バリアントは本 Issue では実装せず、必要発生時に別 Issue で追加する。

---

## 5. シャドウの用途マッピング

`theme.extend.boxShadow` に ink (`#72665B`) ベースの rgba を 3 種だけ追加。Tailwind デフォルト（`shadow-md` 等）の黒シャドウは canvas 上で濁って見えるため、原則使わない。

| 用途 | 推奨クラス | 値 |
|---|---|---|
| カード（静止） | `shadow-card` | `0 1px 2px ..., 0 1px 3px ...`（ink 5% / 4%） |
| カード（hover） | `hover:shadow-card-hover` | `0 4px 12px ..., 0 2px 4px ...`（ink 10% / 6%） |
| モーダル / トースト / ドロップダウン | `shadow-floating` | `0 12px 24px -4px ...`（ink 12%） |
| グラフ / 入力フィールド | shadow なし | border + 余白で表現 |
| 警告バナー | shadow なし | border + 背景色で表現 |

> 数値は暫定。実 UI が画面に並んだ際の見え方で再調整余地あり（§10 申し送り参照）。
> Tailwind デフォルト（`shadow-sm` / `shadow-md` 等）は **原則使わない**。例外的に必要になった時点で本ドキュメントを更新する。

---

## 6. タイポグラフィ補強

`fontSize` / `lineHeight` には何も追加しない。Tailwind デフォルトスケール（`text-xs`〜`text-9xl`）を使う。

追加するのは `letterSpacing.warning` のみ:

| キー | 値 | 用途 |
|---|---|---|
| `letterSpacing.warning` | `0.06em` | WarningBanner の英字見出し（例 `CRITICAL OPPORTUNITY LOSS`）。`docs/spec/warning-copy.md` の 0.05em〜0.08em の中央値 |

ヒーロー数値の `clamp(2.5rem, 6vw, 4rem)` は ResultDashboard 内 1 箇所でしか使わない想定のため、実装側で `text-[clamp(2.5rem,6vw,4rem)]` などの任意値で個別に書く。2 箇所以上で再利用したくなった時点でトークン化を別 Issue で検討。

---

## 7. フォーカスリング

a11y のベースラインとして 2 段構えで運用する。

### 7.1 グローバル（`src/app/globals.css`）

```css
*:focus-visible {
  outline: 2px solid #9caeb8;
  outline-offset: 2px;
  border-radius: 2px;
}
```

`*:focus-visible` で **すべての要素** に accent 色 2px の outline を当てる。ネイティブ `outline` プロパティを使うことでレイアウト計算に影響しない。

### 7.2 雛形コンポーネント側

`Button` 等の主要インタラクティブ要素は `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` を付与し、`box-shadow` ベースの `ring` ユーティリティへ切り替える。リング色 / 太さ / オフセット色は `theme.extend.ringColor.DEFAULT` / `ringWidth.DEFAULT` / `ringOffsetColor.DEFAULT` で集約しているため、`ring-2 ring-offset-2` を書くだけで accent + canvas オフセットが当たる。

> グローバル outline は「予期しない focusable 要素にもリングが出る」セーフティネット。意図的なリングはコンポーネント側で明示する。

---

## 8. 共通コンポーネントの variant 一覧

### 8.1 `Button`（`src/components/ui/Button.tsx`）

- `variant`: `primary` / `secondary` / `ghost`
- `size`: `sm` / `md` / `lg`（デフォルト `md`）
- `type` 属性のデフォルトは `"button"`（フォーム内で誤って submit させない）
- `forwardRef` 対応済

| variant | クラス | 用途 |
|---|---|---|
| `primary` | `bg-ink text-canvas hover:opacity-90` | CTA（WCAG AA 4.5:1 適合、§10 参照） |
| `secondary` | `border border-line bg-canvas text-ink hover:bg-line/30` | 補助 |
| `ghost` | `bg-transparent text-ink hover:bg-line/20` | カード内サブアクション |

| size | クラス | 高さ |
|---|---|---|
| `sm` | `h-8 px-3 text-sm` | 32px |
| `md` | `h-10 px-4 text-base` | 40px |
| `lg` | `h-12 px-6 text-base` | 48px |

`asChild`（Radix Slot 相当）は持たない。`<Link>` を Button スタイルで描画したい場合はラップして対応する。

### 8.2 `Card`（`src/components/ui/Card.tsx`）

- `variant` なし（最小設計）
- デフォルトクラス: `rounded-xl border border-line/50 bg-canvas shadow-card p-6`
- モバイル padding 切替は呼び出し側で `<Card className="p-4 sm:p-6">` のようにクラスを渡す
- `forwardRef` 対応済

> `Card.Header` / `Card.Body` / `Card.Footer` 等の composition API は本 Issue では実装しない（YAGNI）。

### 8.3 本 Issue では含めない雛形

- `Input` / `Select` / `Textarea` / `Label` 等のフォーム部品ラッパは Issue #2 で必要に応じて追加する。
- `Skeleton` / `Spinner` / `Toast` / `Tooltip` / `Modal` 等は必要発生時に別 Issue で起票。

---

## 9. `cn` ヘルパの使い方

`src/lib/cn.ts` は外部依存ゼロの 1 行実装:

```ts
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
```

使い方:

```tsx
<button className={cn("px-4 py-2", isActive && "bg-accent", className)} />
```

注意点:

- **`tailwind-merge` は使わない**。同一 Tailwind プロパティの上書きは保証されない（CSS 出力順依存）。
- 雛形コンポーネント側のクラスを呼び出し側 `className` で上書きしたい場合は、衝突するプロパティ（例 `p-6` と `p-4`）を両方出力するのではなく、**雛形側のクラスを再構築できるよう設計する** か、呼び出し側で完全な指定を渡す（`<Card className="p-4 sm:p-6">`）。
- 配列やオブジェクト記法（`cn({ active: true })`）はサポートしない。必要発生時に拡張する別 Issue を起票。
- `tailwind-merge` の `twMerge` は同じ rest 引数 signature を持つため、将来差し替えが必要になった場合の API 互換性は保たれる。

---

## 10. 暫定 vs 確定の境界、および申し送り

| 項目 | 状態 | 備考 |
|---|---|---|
| カラー 4 ロール（canvas / ink / line / accent） | 確定（Issue #7） | パレット名 4 トークンは中立キーとして併用可 |
| spacing カスタムキー | 不採用（確定） | Tailwind デフォルトのみ運用、運用ルールは §3 |
| borderRadius カスタムキー | 不採用（確定） | Tailwind デフォルトのみ運用、用途マッピングは §4 |
| `boxShadow.card` / `card-hover` / `floating` の rgba 数値 | **暫定** | 実 UI が並んだ際の見え方で再調整余地あり。再調整は本 Issue 完了後の Issue #2 / #3 PR の中で「気付いたら微調整」運用 |
| `letterSpacing.warning` = 0.06em | 暫定（中央値） | spec の 0.05em〜0.08em 範囲、実装で判断 |
| ringColor / ringWidth / ringOffsetColor の DEFAULT | 確定 | accent #9CAEB8 / 2px / canvas #F8F6F2 |
| Button primary のコントラスト比 | 確定（Issue #34） | `bg-ink text-canvas`（#72665B on #F8F6F2 ≈ 5.0:1）で WCAG AA を満たす。accent on canvas text の約 1.8:1 を回避するため (b) `bg-ink` への切替を採用。accent は引き続き focus-visible リング / 装飾アイコン / リンク文字色として運用 |
| spec ファイル（`docs/spec/result-dashboard.md` 等）の旧パレット参照 | 未対応 | Issue #22 で別途置換予定。後続実装は本 §2 のロールに読み替えて使う |
| PDF 内 (`PdfDashboard`) で `shadow-card` を使うか | 未確定 | html2canvas のラスタライズで濁る可能性。Issue #5 実装時に `shadow-none` 運用の判断余地を残す |

---

## 11. 意思決定ログ

各意思決定の根拠は `working/plans/issue-10_design-tokens-and-components.md` の該当節を参照する。

| 決定 | プラン参照 |
|---|---|
| spacing カスタムキーを追加しない | §2.3 |
| borderRadius カスタムキーを追加しない | §3.3 |
| ink ベースの shadow を 3 種追加（黒シャドウ不採用） | §4.3 |
| `letterSpacing.warning` のみ追加、`fontSize.hero` 等は追加しない | §5.3 |
| ringColor / ringWidth / ringOffsetColor の DEFAULT を集約 | §6.2 |
| `*:focus-visible` グローバル outline + 雛形側で ring 上書き | §7.3, §17.1 |
| shadcn/ui を採用しない（自前最小実装） | §8.1 〜 §8.2 |
| `cn` を極小自前実装にする（`clsx` / `tailwind-merge` 不採用） | §8.3 |
| `Input` / フォーム部品ラッパは本 Issue では作らない | §8.2.3 |
| `Card` の variant / composition API は持たない | §8.2.2, §21 R15 |

---

## 12. PWA / メタデータ資産

ブラウザタブ / SNS シェア / ホーム画面追加で表示される画像とメタ情報のソース・オブ・トゥルース。Issue #44 でファイルベース API + `manifest.ts` 方式に統一。

### 12.1 画像資産（Next.js App Router ファイルベース API）

| 資産 | 配置パス | サイズ | 用途 | 暫定/確定 |
|---|---|---|---|---|
| favicon | `src/app/favicon.ico` | 16x16 / 32x32 マルチサイズ | ブラウザタブ | 暫定（最終差し替えは別 Issue） |
| icon (SVG) | `src/app/icon.svg` | 32x32 viewBox | モダンブラウザ | 暫定 |
| apple-touch-icon | `src/app/apple-icon.png` | 180x180 | iOS ホーム画面 | 暫定 |
| OG / Twitter card | `src/app/opengraph-image.png` | 1200x630 | SNS シェア時のプレビュー | 暫定 |

差し替え時は `src/app/` 内のファイルを上書きするだけで HTML 側の `<link>` / `<meta>` が自動追従する（コード変更不要）。`public/` への重複配置は行わない。

### 12.2 PWA Web App Manifest

`src/app/manifest.ts` に集約。ビルド時に `out/manifest.webmanifest` として出力され、`<link rel="manifest" href="/manifest.webmanifest" />` で参照される。

| プロパティ | 値 | 出典 |
|---|---|---|
| `name` / `short_name` | `SITE_NAME`（"またたび計算機"） | `src/app/layout.tsx` から re-export |
| `description` | `SITE_DESCRIPTION` | `src/app/layout.tsx` から re-export |
| `background_color` | `#F8F6F2` | §2 `canvas` / `offwhite` |
| `theme_color` | `#F8F6F2` | `layout.tsx` の `viewport.themeColor` と一致 |
| `display` | `standalone` | ホーム画面追加時にブラウザ Chrome を隠す |
| `start_url` / `scope` | `/` | LP ルート |

`background_color` / `theme_color` の HEX を変える際は §2 のカラーロールも合わせて更新する。
