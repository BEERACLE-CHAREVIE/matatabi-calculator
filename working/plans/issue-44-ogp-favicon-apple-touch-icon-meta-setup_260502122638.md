# OGP 画像 / favicon / apple-touch-icon の整備と PWA Manifest 追加プラン

## Context
Issue #44 では、`src/app/layout.tsx` が `og:image` として `/opengraph-image.png` を参照しているのに `public/` 配下に画像が無いため SNS シェアやブラウザタブ・スマホホーム画面でブランドが表現できていない、という問題提起がされている。

ただし、コードベース実機を調査したところ、以下が判明した（Issue 本文の前提とは一部実態が異なる）。

- `src/app/` 配下には既に Next.js App Router のファイルベース API による画像資産が配置済み:
  - `src/app/favicon.ico`（16x16/32x32 マルチサイズ ICO）
  - `src/app/icon.svg`（モダンブラウザ向け SVG、`#72665B` ベースのねこモチーフ）
  - `src/app/apple-icon.png`（180x180 PNG）
  - `src/app/opengraph-image.png`（1200x630 PNG）
- `next build`（`output: "export"`）後の `out/index.html` には Next.js が自動的に `<link rel="icon">` / `<link rel="apple-touch-icon">` / `<meta property="og:image">` / `<meta name="twitter:image">` を注入していることを HTML から確認済み。
- 一方、`manifest.json` / `src/app/manifest.ts` は **存在しない**。`src/app/layout.tsx` の `metadata.icons` / `metadata.manifest` も未設定。
- `src/app/layout.tsx` 64 行目の `twitter.images: ["/opengraph-image.png"]` は、ファイルベース API による `og-image` の自動 hash 付き URL ではなく素のパスを直書きしているため、ファイルベース API による og-image との二重指定で挙動がズレる懸念がある（実 HTML を見ると `og:image` 側はハッシュ付き、`twitter:image` 側はハッシュ無しで生成されており不整合）。

以上を踏まえ、本 Issue のスコープは以下に再定義する:

1. App Router ファイルベース API 流儀に統一（`public/` への重複配置は行わない）
2. PWA 用の **Manifest を新規追加**（最大の未対応項目）
3. `layout.tsx` の `metadata.manifest` を追記し、`metadata.icons` / `twitter.images` の重複・不整合を解消
4. 画像バイナリは既存の暫定資産をそのまま使う（最終差し替えはデザイン担当者が後続 Issue で対応する前提）

GitHub Issue: #44

## 変更対象ファイル

### 1. PWA Web App Manifest を新規作成（App Router 流儀のメタデータルート）
- **新規**: `/Users/YS/development/matatabi-calculator/src/app/manifest.ts`
- **変更箇所**: 新規ファイル。Next.js の `MetadataRoute.Manifest` 型を使ったデフォルトエクスポート関数を 1 つ定義。
- **変更内容**: 以下の内容を持つ TypeScript モジュールを作成する。
  - `name`: `"またたび計算機"` （`SITE_NAME` と一致）
  - `short_name`: `"またたび計算機"`（短縮表記が無いブランドのためフルネーム流用）
  - `description`: `layout.tsx` の `SITE_DESCRIPTION` と同等（または同モジュールから import して二重管理回避）
  - `start_url`: `"/"`
  - `scope`: `"/"`
  - `display`: `"standalone"`（ホーム画面追加時にブラウザ Chrome を隠す）
  - `orientation`: `"portrait"`
  - `lang`: `"ja"`
  - `background_color`: `"#F8F6F2"`（`tailwind.config.ts` の `canvas` / `offwhite`）
  - `theme_color`: `"#F8F6F2"`（`layout.tsx` 69 行目 `viewport.themeColor` と一致）
  - `icons`: 配列で以下 3 件
    - `{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }`
    - `{ src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" }`
    - `{ src: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon", purpose: "any" }`
  - `categories`: `["business", "productivity", "finance"]`（任意、PWA 配信時の参考）
- **理由**: Issue 受け入れ条件「manifest.json の内容が PWA 要件（name / short_name / icons / theme_color）を満たす」を満たす唯一の未対応項目。`src/app/manifest.ts` 形式（メタデータルート）は静的エクスポートでも `out/manifest.webmanifest` として生成されるため、`output: "export"` でも問題なく動く。`public/manifest.json` ではなく TS 形式を選ぶことで、`SITE_NAME` / `SITE_DESCRIPTION` 等を `layout.tsx` と同じ値の単一ソースで保てる。

### 2. `metadata.manifest` を追加し、`twitter.images` の重複指定を削除
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- **変更箇所**:
  - `metadata` オブジェクト（31〜66 行目）
  - 具体的には: `twitter` ブロック（60〜65 行目）の `images` プロパティ削除、および新規プロパティ `manifest: "/manifest.webmanifest"` を `metadata` 直下に追加。
- **変更内容**:
  1. `metadata.manifest` に `"/manifest.webmanifest"` を指定する（Next.js の `src/app/manifest.ts` は既定で `/manifest.webmanifest` として配信される）。
  2. `twitter.images: ["/opengraph-image.png"]`（64 行目）を **削除**。理由は本文「設計上の考慮点」参照。`twitter.card: "summary_large_image"` だけ残せば、Next.js が `src/app/opengraph-image.png` を検出して `twitter:image` を自動生成する。
  3. `metadata.icons` は **明示記述しない**。Next.js が `src/app/icon.svg` / `src/app/favicon.ico` / `src/app/apple-icon.png` を自動検出して `<link rel="icon" />` 等を生成するため、Issue 本文の `metadata.icons` 追加要件は「ファイルベース API 採用時には不要」と整理する（プラン本文「設計上の考慮点」で明記）。
- **理由**:
  - `metadata.manifest` の追加で受け入れ条件「`src/app/layout.tsx` の `metadata.icons` / `metadata.manifest` が更新済み」のうち `manifest` 側を満たす。
  - `twitter.images` の重複削除は、現状ビルド済み HTML で `og:image` がハッシュ付き URL（`opengraph-image.png?daedb8584fcafd22`）なのに対し `twitter:image` はハッシュ無し URL になっている不整合を解消し、CDN キャッシュ越しでも同一画像が確実に取れるようにするため。
  - `icons` を明示記述しないのは、ファイルベース API（`src/app/icon.*` / `src/app/apple-icon.*` / `src/app/favicon.ico`）と `metadata.icons` 配列を二重に書くと Next.js のドキュメント上「`metadata.icons` が優先され、ファイルベース検出が無視される」ため。既存資産が活きる方を選ぶ。

### 3. （任意・スコープ要相談）デザイントークン文書への追記
- **変更**: `/Users/YS/development/matatabi-calculator/docs/design-tokens.md`
- **変更箇所**: 文書末尾に「PWA / メタデータ資産」セクションを追加。
- **変更内容**: `manifest.ts` の `theme_color` / `background_color` / 画像資産の所在（`src/app/icon.svg` 等）を「アイコン・OGP 画像のソース・オブ・トゥルース」として明記。
- **理由**: 同文書の §1 が「ブレ防止のための一次情報源」と謳っているため、icon / OGP の置き場所と色値の根拠を 1 ヶ所に集約しておくと後続デザイン差し替え時の混乱を防げる。Issue 受け入れ条件には含まれていないため、レビュアー判断で省略可。

## 設計上の考慮点

### A. App Router ファイルベース API vs `public/` への静的配置
本プロジェクトに適切なのは **App Router ファイルベース API（既に部分採用済み）** と判断する。理由は以下:

1. **既に半分以上採用済み**: `src/app/{favicon.ico, icon.svg, apple-icon.png, opengraph-image.png}` が配置されており、`out/index.html` には Next.js 自動生成の link / meta タグが正しく出力済み。`public/` に再配置すると同じ画像が 2 箇所に存在し、片方を更新し忘れる事故が起きやすい。
2. **静的エクスポート（`output: "export"`）と整合**: メタデータルート（`manifest.ts` / `icon.tsx` 等）は静的エクスポート時に通常のファイルとして `out/` 配下に書き出されるため、Cloudflare Pages 配信に支障が無い。
3. **キャッシュバスティング**: ファイルベース API ではビルド時に URL へハッシュが自動付与され（例: `/icon.svg?34549737ee5a17be`）、画像差し替え時のブラウザ強制更新コストが下がる。`public/` 配置だとこの恩恵が無い。
4. **`metadata.icons` を書かなくて済む**: ファイルベース API による自動検出が `metadata.icons` の手書きより堅牢で、ファイルを差し替えただけで HTML 側も追従する。

ただし、**Manifest だけは `manifest.ts` を採用（静的 `public/manifest.json` ではない）**。理由は `SITE_NAME` / `SITE_DESCRIPTION` 等の値を `layout.tsx` と単一ソースで共有できるため、コピーライティング修正が 1 箇所で済む。

### B. 画像プレースホルダーの取り扱い
本タスクでは Claude は画像バイナリを生成しない。既存資産の取扱方針:

- `src/app/favicon.ico`（15086 byte, 16/32px マルチサイズ）: **暫定として継続採用**。`docs/spec/warning-copy.md` 等の確定パレットに沿った猫モチーフ。差し替えは別 Issue（#9 ブランド資産タスク）で対応。
- `src/app/icon.svg`（406 byte, 32x32 viewBox）: **暫定として継続採用**。本文ロゴ（`public/brand/logo-header.svg`）のシンボル部分と同モチーフで色値も一致しており、矛盾なし。
- `src/app/apple-icon.png`（2154 byte, 180x180）: **暫定として継続採用**。
- `src/app/opengraph-image.png`（53215 byte, 1200x630, 8-bit RGB）: **暫定として継続採用**。サイズ要件（受け入れ条件「1200x630px で配置されている」）を `file` コマンドで確認済み。

最終的にデザイン担当者が差し替える前提で、本 Issue のスコープは「meta 配線と manifest 追加」に限定する。差し替え時はファイル名を変えなければ `src/app/` 内の上書きだけで完結し、コード変更は不要（ファイルベース API の利点）。

### C. `twitter:image` ハッシュ不整合の補足
現状ビルド HTML を確認したところ、

- `og:image` → `https://roi.nekonimatatabi.com/opengraph-image.png?daedb8584fcafd22`（ファイルベース API 由来、ハッシュ付き）
- `twitter:image` → `https://roi.nekonimatatabi.com/opengraph-image.png`（`layout.tsx` 64 行目の手書き由来、ハッシュ無し）

の二重指定が並存している。実体は同じ画像を指すのでプレビュー上の表示は壊れていないが、CDN キャッシュ更新時に Twitter Card 側だけ古い画像を引いてしまう可能性がある。`twitter.images` を削除すれば Next.js が `og:image` と同じハッシュ付き URL を `twitter:image` にも自動展開してくれる（Next.js 14.2 系の `Metadata` 仕様で確認）。

### D. 既存コード規約への適合
- `tailwind.config.ts` の `canvas` / `offwhite` は同一 HEX `#F8F6F2`。`manifest.ts` ではコメントで `"// matches tailwind canvas / offwhite"` のように出典を明記し、将来パレット変更時の見落としを防ぐ。
- `layout.tsx` 既存の `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_URL` 定数（24〜29 行目）は文字列リテラルとしてエクスポートされていないため、`manifest.ts` から直接 import するには **`export` 修飾子の追加** が必要。本プランでは `manifest.ts` 側に値を再記述する案（DRY を一部諦める）と、`layout.tsx` 側に `export` を追加する案（厳密 DRY）の 2 択があるが、**後者を推奨**（コピペ箇所を増やしたくないため）。実装時は `export const SITE_NAME = ...` / `export const SITE_DESCRIPTION = ...` の形に変更する。

## 検証方法

1. `npm run typecheck` で TypeScript 型エラーが無いこと（`MetadataRoute.Manifest` 型適用、`metadata.manifest` の型一致）。
2. `npm run lint` で ESLint 警告が無いこと。
3. `npm run build` 実行後、`out/manifest.webmanifest` が生成され、JSON として valid であること（`cat /Users/YS/development/matatabi-calculator/out/manifest.webmanifest | python3 -m json.tool` で確認）。
4. `out/index.html` を `grep` し、以下が含まれることを確認:
   - `<link rel="manifest" href="/manifest.webmanifest"/>` 相当
   - `<link rel="icon" ...>` / `<link rel="apple-touch-icon" ...>` が引き続き自動生成されていること
   - `<meta property="og:image" ...>` と `<meta name="twitter:image" ...>` が **同じ URL（同じハッシュ付き）** を指すこと
5. `npm run dev` でローカル起動し、Chrome DevTools の Application パネル → Manifest セクションで以下を目視確認:
   - name / short_name / theme_color / background_color / start_url が manifest.ts と一致
   - icons リストに 3 件登録され、プレビュー画像が表示される
6. ブラウザタブの favicon が Chrome / Safari / Firefox で表示されること。
7. iOS Safari の「ホーム画面に追加」で `apple-icon.png` が 180x180 で適用されること（実機 or Safari Responsive Design Mode）。
8. Twitter Card Validator（`https://cards-dev.twitter.com/validator`）に本番 URL を入力し、`summary_large_image` カードに `opengraph-image.png` がプレビューされること。
9. Facebook Sharing Debugger（`https://developers.facebook.com/tools/debug/`）で `og:image` / `og:title` / `og:description` が正しく取得できること。
10. Lighthouse PWA 監査で `Web app manifest meets the installability requirements` の項目がパスすること（`name` / `short_name` / `icons`(192px 以上) / `start_url` / `display` / `background_color`）。なお 192/512 PNG が無い暫定状態では一部警告が出る可能性があり、その場合は `apple-icon.png`（180px）の他に 192/512 を後続で追加するかは別 Issue でフォロー。
