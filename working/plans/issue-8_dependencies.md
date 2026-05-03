# Issue #8 実装プラン — 依存ライブラリを追加する (lucide-react / jsPDF / html2canvas / グラフ)

## 0. このプランの性格

本プランは **「実装コードを書かないで `package.json` だけ太らせる」** という、Issue #6（雛形作成）・Issue #7（Tailwind トークン）に続く **3 番目の「土台 Issue」** のためのプランです。成果物は `package.json` / `package-lock.json` の差分のみであり、`src/` 配下のソース変更を **意図的に含めません**（実装は #2 / #3 / #4 / #5 の本実装フェーズ Issue で行う）。

本 Issue の唯一のゴール:

> **「後続の実装 Issue が `import { AlertTriangle } from "lucide-react"` や `await import('jspdf')` を即座に書ける状態」** をリポジトリ上に確定させる。

そのため本プランの判断軸は次の 3 点に集約されます:

1. **何を入れるか** — `lucide-react` / `jspdf` / `html2canvas` / `recharts` の 4 本。これは Issue #3（グラフ）と Issue #5（PDF）で確定済みなので「選定」ではなく「**バージョン確定**」と「**依存区分（dependencies / devDependencies）**」の判断に集中する。
2. **何を入れないか** — 型定義パッケージ（`@types/jspdf` 等）、サブセットフォントファイル、`modularizeImports` 設定、実装コード、各種ユーティリティ（`jspdf-autotable` 等）。これらは「不要」または「別 Issue」と本プランで明示する。
3. **どう壊さないか** — 既存依存（Next.js 14.2.35 / React 18 / Tailwind 3.4 / TypeScript 5）の解決を壊さないこと、`npm run lint` / `npm run typecheck` / `npm run build` が引き続き通ること。

Issue #6 が「初めてコードを入れる境界点」、Issue #7 が「初めて見た目を整える境界点」だったのに対し、本 Issue は **「後続実装 Issue が `import` 文を書ける境界点」** に位置します。

---

## 1. 概要

### 何をやるか

- `lucide-react` を追加（警告バナーの `alert-triangle`、凡例の `piggy-bank` / `sparkles` 等のアイコン提供元）
- `jspdf` を追加（PDF コンテナ生成。html2canvas の出力を A4 に貼付）
- `html2canvas` を追加（隠し DOM の PNG ラスタライズ）
- `recharts` を追加（積み上げ横棒グラフ。`<BarChart layout="vertical">` + `<Bar stackId="a" />`）
- 各ライブラリの **バージョンを固定**（`package.json` のキャレット表記で帯を確定し、`package-lock.json` で完全固定）
- **`@types/...` の要否を確認した上で「不要」を明文化** する（Issue #5 で既に結論済みだが、本プラン上で再確認）
- `dependencies` vs `devDependencies` の **振り分けを確定**

### なぜ重要か（下流への影響）

- **Issue #3（結果ダッシュボード実装）** — `recharts` が `package.json` に入っていないと `import { BarChart } from "recharts"` を書いた瞬間にビルドが落ちる。`ResultDashboard` の `next/dynamic` 遅延ロードもバンドルに対象が居ないと意味がない
- **Issue #4（警告コピー）** — `lucide-react` が無いと `<AlertTriangle />` が描画できず、Amber 600 アイコン付き警告バナーの最初の 1 行も書けない
- **Issue #5（PDF レポート）** — `jspdf` + `html2canvas` の **両方**が揃って初めて `src/lib/pdf.ts` を書き始められる。`await import('jspdf')` は依存が入っていないと TS2307（モジュールが見つからない）で typecheck が落ちる
- **`package-lock.json` の確定** — Cloudflare Pages（Issue #11）のビルドで再現性を担保するため、本 Issue の時点で **lockfile を commit に含める** ことが必須
- **バンドルサイズ管理の起点** — `lucide-react` / `recharts` は tree-shake が効かなかった場合に LCP 1 秒目標（マスター設計書 §1.4）を破壊する量のサイズ。本 Issue で **「個別 import を強制する文化」** をプラン上に明記し、後続 PR レビューで弾けるようにしておく

### 本 Issue のスコープ外（明示）

| 項目 | 担当 |
|---|---|
| `src/lib/pdf.ts`（jsPDF + html2canvas を実際に呼ぶ実装） | 実装フェーズの別 Issue（#5 仕様準拠） |
| `src/components/ResultDashboard.tsx`（Recharts を実際に使う実装） | 実装フェーズの別 Issue（#3 仕様準拠） |
| `src/components/WarningBanner.tsx`（lucide-react を使う警告バナー） | 実装フェーズの別 Issue（#4 仕様準拠） |
| `public/fonts/` への Noto Sans JP サブセット配置 | 別 Issue（フォント実装 Issue。本 Issue では html2canvas 主体方針を確認するのみ） |
| `next.config.mjs` の `modularizeImports` 設定 | §2 Step 7 の判断結果として「本 Issue では入れない」 |
| Cloudflare Pages 向け設定（`@cloudflare/next-on-pages`） | Issue #11 |
| Tailwind 余白/角丸/シャドウのトークン拡張 | Issue #10 |
| デザイン素材（猫モチーフ、ファビコン、OGP） | Issue #9 |

---

## 2. 意思決定ステップ

本 Issue は「ただ npm install するだけ」に見えるが、**バージョン固定の粒度**・**依存区分**・**型定義の要否**・**動作確認の方法**の 4 点について意思決定が必要です。順に Pros/Cons を比較し推奨を提示します。

### Step 1. バージョン固定の粒度（キャレット ^x.y.z か完全固定 x.y.z か）

#### 選択肢 A: 既存依存に倣ってキャレット運用（`^2.5.2` など）— **推奨**
- **Pros**:
  - 既存 `next: 14.2.35`（厳密固定）と `react: ^18` / `tailwindcss: ^3.4.1` / `typescript: ^5`（キャレット）の **混在運用に揃う**。新規 4 本を全部完全固定すると既存運用と齟齬が生じる
  - パッチリリース（バグ修正・セキュリティ修正）を手作業の `package.json` 編集なしで取り込める
  - **`package-lock.json` で実質的に完全固定されている**ため、`npm install` の再現性は揃う（CI も Cloudflare Pages も lockfile を尊重）
  - メジャー更新（破壊的変更）は自動では入らないため、`recharts` v3 や `jspdf` v3 を誤って取得するリスクは無い
- **Cons**:
  - `npm update` を実行されるとマイナー / パッチが上がる。チームの運用ルールで `npm update` を禁止する明示が要る（README 等で）

#### 選択肢 B: 完全固定（`2.5.2` のようにキャレット無し）
- **Pros**:
  - `package.json` を読むだけで正確な版が分かる（lockfile を見に行かなくて済む）
  - パッチですらヘッドが動かないので、再現性がプラトニックに保証される
- **Cons**:
  - 既存依存（`react: ^18`）と運用が割れる。コードレビュー時に「なぜここだけ固定？」と質問が出る
  - 軽微なパッチも手作業で更新する必要があり、保守コストが上がる
  - Renovate / Dependabot 自動 PR が「caret → caret」更新ではなく「fixed → fixed」更新となるため、設定の調整が必要になる場合がある

#### 選択肢 C: ライブラリごとに使い分け（PDF 系は固定、それ以外はキャレット）
- **Pros**: PDF 系は破壊的変更の影響が大きい（フォント周り・画像周り）ので固定にする合理性はある
- **Cons**: 一貫性が無くなる。「なぜ recharts はキャレットで jspdf は固定？」と再度説明が必要

**推奨: 選択肢 A（キャレット運用）**。既存運用との一貫性、`package-lock.json` による再現性、保守コストの低さが揃う。**ただし `jspdf` だけは v3 系の破壊的変更を踏まないようバージョン帯を意識的に `^2.5.x` に留めるため `package.json` 上は `^2.5.2`（マイナー込みの帯）として書く**（caret は SemVer 上 `^2.5.2` であれば `2.x.y(x>=5)` を許容するため、これで v3 を弾ける）。

> 注: SemVer のキャレット規則上、`^2.5.2` は `>=2.5.2 <3.0.0` を許容するため、`2.5.x` だけに絞ったわけではなく `2.6.x` / `2.7.x` も入る。「v3 を踏まない」ことだけが本プランの目的なので、これで十分。

---

### Step 2. `recharts` のマイナー固定値

Issue #3 §5.1 で「Recharts v2 系」が確定。本 Issue では **マイナー固定値**を提案する。

- 2026-04-25 時点で安定流通しているのは **`recharts@2.12.x`** 帯（`2.12.7` が最終マイナーの実績版として広く使われている）。それ以降の `2.13.x` / `2.14.x` も React 18 互換は維持されているが、本プロジェクトの構成（Next 14.2.35 + React 18.3.x）でビルド検証が枯れているのは `2.12.x` 帯まで
- **推奨値: `"recharts": "^2.12.7"`**
  - キャレットなので `2.13.x` 等が入っても自動更新可（`package-lock.json` でロック）
  - v3 を絶対に踏まない
- **TypeScript 型定義**: 公式同梱（`@types/recharts` は **不要**）。`recharts/types/...` で内部型を直接 import する場合のみ留意（実装側 Issue で扱う）

---

### Step 3. `jspdf` / `html2canvas` のバージョン帯

Issue #5 §10.1 / §10.2 で帯は確定済み。本プランで具体値に落とす。

- **`jspdf`**: **`"jspdf": "^2.5.2"`** を推奨
  - Issue #5 §10.1 の「`^2.5.x` 帯」と完全整合
  - v3 系は API 互換性の破壊（`new jsPDF` のオプション形式変更等）があり、本プロジェクトのコード例（`pdf-report.md §13` の `new jsPDF("p", "mm", "a4")`）が動かなくなるリスクがあるため絶対に入れない
  - 公式型定義同梱（`@types/jspdf` 不要）
- **`html2canvas`**: **`"html2canvas": "^1.4.1"`** を推奨
  - Issue #5 §10.2 の「`^1.4.x` 帯」と整合。1.4.1 は長期間メンテされている安定タグ
  - v2 系は本記事執筆時点（2026-04-25）でまだ正式 GA タグの普及が浅く、Issue #5 のコード例（`html2canvas(element, { scale: 2, ... })`）の互換性検証が枯れていない
  - 公式型定義同梱（`@types/html2canvas` 不要）

---

### Step 4. `lucide-react` のバージョン帯

Lucide は活発に更新されているライブラリで、メジャー版番号が 0.x のまま運用されているのが特徴（**0.x 系で SemVer の互換性ポリシーは「マイナー = 機能追加 / パッチ = 修正」を厳格に守る運用**）。

- 2026-04-25 時点で安定流通しているのは **`lucide-react@0.460.x`** 帯前後
- **推奨値: `"lucide-react": "^0.460.0"`**
  - キャレット運用で 0.x 系の場合、SemVer 規則上 `^0.460.0` は `>=0.460.0 <0.461.0`（マイナー固定相当）になる点に注意。これは Lucide 側のアイコン削除・改名による破壊的変更を踏まないための **意図的な保守的設定**
  - 後続でアイコン追加が必要になり 0.461 以降を使いたい場合は、`package.json` を明示的に書き換えて取り込む運用とする
- **TypeScript 型定義**: 公式同梱（`@types/lucide-react` 不要）
- **React 18 互換性**: `lucide-react` は React 16.8+ を要求し、React 18 完全対応

---

### Step 5. `@types/...` の要否確認結果（明文化）

| パッケージ | 公式型定義同梱? | `@types/...` 追加要? | 確認方法 |
|---|---|---|---|
| `jspdf@^2.5.2` | はい（`dist/types/index.d.ts`） | **不要** | `npm view jspdf types` で `dist/types/index.d.ts` が出る |
| `html2canvas@^1.4.1` | はい（`dist/types/html2canvas.d.ts`） | **不要** | `npm view html2canvas types` で確認 |
| `recharts@^2.12.7` | はい（`types/index.d.ts`） | **不要** | `npm view recharts types` |
| `lucide-react@^0.460.0` | はい（`dist/lucide-react.d.ts`） | **不要** | `npm view lucide-react types` |

**結論: 4 本とも `@types/...` を追加する必要は無い**。本 Issue では `devDependencies` に `@types/jspdf` 等を一切追加しない。Issue #5 §10.1 / §10.2 の事前確定とも整合。

---

### Step 6. `dependencies` vs `devDependencies` の振り分け

- **判断基準**: ランタイムでブラウザに配布される（= バンドルされる）コードが直接 import するライブラリは `dependencies`、ビルド・テスト・型チェックなど開発時にのみ参照されるものは `devDependencies`
- **本 Issue の 4 本は全て、ランタイムで `import`（または動的 import）される** ため、**全て `dependencies`**
  - `lucide-react`: 警告バナー・凡例の React コンポーネントとして JSX で描画
  - `jspdf` / `html2canvas`: `await import()` で動的ロードされるが、バンドルされる対象であることに変わりは無い（dependencies）
  - `recharts`: クライアントコンポーネントの JSX で描画

#### 選択肢の検討（参考）

「動的 import するなら `devDependencies` でも動く」という議論はあるが、本プロジェクトは **Cloudflare Pages の本番ビルドで `npm install --production` を使う可能性がある**（Issue #11 で確定予定）。`--production` 環境では `devDependencies` が解決されないため、動的 import 対象でも `dependencies` に置く方が安全。

**結論: 4 本とも `dependencies`**。

---

### Step 7. `lucide-react` のバンドルサイズ対策（`modularizeImports` 設定の要否）

`lucide-react` は **全アイコン同梱で 1MB 超**。素朴に `import { AlertTriangle } from "lucide-react"` と書いた場合の挙動が、本 Issue で確認すべき最重要ポイント。

#### 観測事実（公式ドキュメント / 既知情報）

- `lucide-react` は ESM tree-shake 対応（`package.json` に `"sideEffects": false` 設定済み）
- Webpack（Next.js 14 のデフォルトバンドラ）は ESM tree-shake を effect 設定込みで実行するため、**個別 named import であれば未使用アイコンは production ビルドで除外される**
- ただし `import * as LucideIcons from "lucide-react"` のような名前空間 import を書くと tree-shake が効かず全体が含まれる（PR レビューで弾く必要あり）
- `next.config.mjs` の `modularizeImports`（pre-bundle 段階で `import { X } from "lucide-react/dist/esm/icons/x"` 相当に書き換える設定）は **lucide-react 公式が個別ファイルパスでの import を保証していない**ため、入れない方が安全

#### 選択肢

##### 選択肢 A: 何もしない（個別 named import の運用ルールのみ）— **推奨**
- **Pros**:
  - Webpack の tree-shake で十分効く（実装済みの挙動）
  - `modularizeImports` の設定不備でビルドが壊れるリスクが無い
  - `lucide-react` 側の内部ファイルパス変更に追従する必要が無い
- **Cons**: 開発者が `import * as` を書いてしまった場合に CI で気付けない（ESLint `no-restricted-imports` 等で弾く運用は別 Issue）

##### 選択肢 B: `next.config.mjs` に `modularizeImports` を追加
- **Pros**: tree-shake が効かない万一の事態でも個別ファイルからの import が強制される
- **Cons**: lucide-react 公式が個別パスを保証していないため、ライブラリ更新で内部パスが変わると壊れる。本 Issue で `next.config.mjs` を触ると Issue #11（Cloudflare Pages）の自由度を狭めるリスクもある

**推奨: 選択肢 A**。本 Issue では `next.config.mjs` を一切触らない。tree-shake の前提（個別 named import）は本プラン §6 R1 に明記し、後続 Issue のコードレビューで担保する。

> 検証は §5 Step 5 の `npm run build` で `.next/` 出力サイズを目視確認することで間接的に行う。

---

### Step 8. 動作確認方法（最小サンプルを書く・書かない）

本 Issue の最大の論点。**`package.json` に依存だけ追加して `import` を一切書かないと、依存が壊れているかどうか確認できない**。一方で「実装コードを書かない」スコープ縛りもある。

#### 選択肢 A: 最小サンプルを書かず、`npm install` / `npm run build` の通過のみで確認 — **推奨**
- **Pros**:
  - 本 Issue の「実装コードを書かない」スコープを完全に守れる
  - PR の diff が `package.json` / `package-lock.json` のみで極小、レビューが速い
  - **実依存の動作確認は後続 Issue（#3 / #4 / #5）の本実装で必然的に行われる**ため、本 Issue で先取りする必要は無い
- **Cons**:
  - 「ビルド成果物に含まれていない依存」が壊れていても気付けない（が、`npm install` 自体が成功した時点で peer dependencies の解決は通っているため、import 時にしか起きないエラーは限定的）
  - 「うっかり `@types/jspdf` を入れ忘れて型エラー」のようなケースは、本 Issue では検出できない（が、§5 で確認したとおり型定義は同梱なので `@types/...` は不要）

#### 選択肢 B: 最小スモークテスト用の検証ファイルを `src/` 配下に書く（後で削除）
- **Pros**: 4 本とも import が通ることを `npm run typecheck` / `npm run build` で機械的に確認できる
- **Cons**:
  - 「未使用 import」の ESLint 警告（`@typescript-eslint/no-unused-vars` または `no-unused-vars`）が出る。回避するには eslint-disable コメントを書くか、ダミーで使う必要があり、それ自体が実装コードに踏み込んでしまう
  - 後続 PR で削除されることが前提のコードを commit する不整合
  - Issue #3 / #4 / #5 の本実装で同じ import を書くため、本 Issue で先取りする価値が薄い

#### 選択肢 C: 検証専用の `scripts/check-deps.mjs` を `package.json` の scripts に追加して `node scripts/check-deps.mjs` で `require/import` を試す
- **Pros**: src/ を汚さずに import 動作確認できる
- **Cons**:
  - `scripts/` ディレクトリの新設は本 Issue のスコープ外（別 Issue で運用方針を決めるべき）
  - Next.js の依存（特に `next/dynamic` 経由の挙動）は Node スクリプトでは検証できないため、結局 `npm run build` での検証に戻る
  - スクリプトファイル自体が「実装コード」と区別が曖昧

**推奨: 選択肢 A（最小サンプル無し / `npm install` + `npm run build` の通過のみで確認）**。

理由:
1. `npm install` の成功 = peer dependencies の整合性確認（React 18 互換等）
2. `npm run build` の成功 = 既存コードに対するインストール影響が無いことの確認
3. **本物の import 検証は後続 Issue で必然的に実施される** ため二度手間
4. 本 Issue のスコープ縛り（実装コード無し）と完全整合

ただし、**PR 本文に「依存を追加した時点では実コードからの import は無い。Issue #3 / #4 / #5 の本実装 PR で動作検証される」旨を明記する**ことを必須化する。

---

### Step 9. 遅延ロード方針の `package.json` への影響（特になし、と確認）

Issue #3（`ResultDashboard` を `next/dynamic` 経由で遅延ロード）と Issue #5（`jspdf` / `html2canvas` を `await import()` で動的ロード）は、いずれも **実装コード側の挙動**であり、`package.json` の依存登録方法には影響しない。

- `next/dynamic` は Next.js 同梱（追加依存不要）
- `await import('jspdf')` は ESM 標準の動的 import（バンドラが自動的に code-splitting する）

本 Issue は **依存登録のみ** を扱うので、このセクションは「変更無し」を確認するだけで終わる。

---

### Step 10. インストール順序（コマンド単位）

#### 選択肢 A: 4 本まとめて 1 コマンドで `npm install` — **推奨**
- **Pros**:
  - lockfile 解決が 1 回で済み、依存解決の効率が良い
  - PR の diff が分かりやすい（`package.json` への 4 行追加が同一コミット内）
- **Cons**: 万一どれかの解決が壊れた場合、原因特定がやや難しい（が、4 本とも独立で他依存が無いため衝突は起きにくい）

#### 選択肢 B: 1 本ずつ `npm install` してコミットを分ける
- **Pros**: 各ライブラリ追加の影響を `package-lock.json` の差分単位で観察できる
- **Cons**: PR がコミット 4 個 + lockfile 4 回更新で冗長。レビューコストが増える

**推奨: 選択肢 A（1 コマンドで一括）**。

```bash
npm install \
  lucide-react@^0.460.0 \
  jspdf@^2.5.2 \
  html2canvas@^1.4.1 \
  recharts@^2.12.7
```

`--save` は `npm@10` のデフォルト（`dependencies` 追加）。`-D` フラグは付けない（Step 6 の結論で全部 `dependencies`）。

---

### Step 11. PR / コミット分割戦略

#### 選択肢 A: 1 コミット（依存追加のみ）— **推奨**
- **Pros**:
  - 変更範囲が `package.json` / `package-lock.json` のみで小さく、論理的に不可分
  - レビューが圧倒的に速い
- **Cons**: 特になし

#### 選択肢 B: 「依存追加」+「ドキュメント更新（README に依存一覧を追記）」の 2 コミット
- **Pros**: README に依存一覧を載せるとセットアップが楽になる
- **Cons**: README 更新は本 Issue のタスクに無い。スコープ膨張

**推奨: 選択肢 A**。コミットメッセージ例:

```
chore(deps): UI/PDF/グラフライブラリを追加 (#8)

- lucide-react ^0.460.0  (icon: AlertTriangle / PiggyBank / Sparkles)
- jspdf ^2.5.2           (PDF コンテナ生成、公式型同梱)
- html2canvas ^1.4.1     (DOM → PNG ラスタライズ、公式型同梱)
- recharts ^2.12.7       (積み上げ横棒、SVG ベース、公式型同梱)

全て dependencies。@types/* は不要（公式型定義同梱を確認）。
バージョン固定方針はキャレットで統一し、jspdf v3 / recharts v3 等
メジャー破壊変更を踏まないことを SemVer caret で担保。

実コードからの import は本 Issue では追加しない。動作検証は
Issue #3 / #4 / #5 の本実装 PR で行う。
```

---

## 3. 実装ステップ（順序付き）

### Step 1. ブランチ作成

```bash
cd /Users/YS/development/matatabi-calculator
git checkout develop
git pull origin develop
git checkout -b feature/dependencies_20260425
```

ブランチ名は既存の `feature/nextjs-scaffolding_20260424` / `feature/tailwind-design-tokens_20260425` の命名規則（`feature/<topic>_<yyyymmdd>`）に従う。

### Step 2. 既存ワーキングツリーの確認

```bash
git status --short
```

期待する出力（本プラン作成時点）:
- `M .gitignore`（`node_modules` 追記の未コミット変更）
- `?? working/`（プラン保存先、untracked）
- `?? .claude/issue-order.md`（untracked）

これらは Issue #8 とは別件のため、本 Issue の PR には含めない（`git checkout -- .gitignore` で戻すか、別 PR で扱う運用方針を Issue #6 完了時の合意に従う）。

### Step 3. 4 本まとめてインストール

```bash
npm install \
  lucide-react@^0.460.0 \
  jspdf@^2.5.2 \
  html2canvas@^1.4.1 \
  recharts@^2.12.7
```

期待される `package.json` 差分:

```diff
   "dependencies": {
     "react": "^18",
     "react-dom": "^18",
-    "next": "14.2.35"
+    "next": "14.2.35",
+    "lucide-react": "^0.460.0",
+    "jspdf": "^2.5.2",
+    "html2canvas": "^1.4.1",
+    "recharts": "^2.12.7"
   },
```

`devDependencies` には一切追加しない。

> 補足: `npm install` 実行時にインストールされた **実バージョン** は最新パッチに依存する。例えば `lucide-react@^0.460.0` の解決結果が `0.460.0` か `0.460.1` かはレジストリ状態で決まり、`package-lock.json` に固定される。実バージョンの確認方法は §5 Step 4 参照。

### Step 4. peer dependencies 警告の確認

`npm install` 実行ログを確認し、以下の警告が **出ていないこと** を確認:

- `npm WARN ERESOLVE` 系（依存解決失敗）
- `npm WARN deprecated` 系で **致命的なもの**（Recharts 内部の `d3` 系のごく軽微な deprecation 警告は許容）
- `peer react@...` の不整合（React 18 系で全部解決される想定）

警告が出る場合、原因を `npm ls <package>` で特定。`react@^18` と各依存の peer 要求が衝突する例が代表的（`recharts@2.12.x` は `react: ^16.8 || ^17 || ^18` を peer 要求するため衝突しないはず）。

### Step 5. 静的検証

```bash
npm run typecheck
npm run lint
npm run build
```

期待: 3 つともエラー 0 件で終了。

- **`typecheck`**: 既存 `src/app/layout.tsx` / `src/app/page.tsx` は新依存を import していないため、型エラーは増えない想定
- **`lint`**: 同上、警告も増えない想定
- **`build`**: 新依存はバンドル対象に入らない（誰も import していない）ため、出力サイズも変わらない想定

### Step 6. 公式型定義同梱の確認（記録用）

PR 本文に貼るための実証コマンド:

```bash
npm view lucide-react types
npm view jspdf types
npm view html2canvas types
npm view recharts types
```

各コマンドが値を返すこと（`undefined` でないこと）を確認。`undefined` が返る場合は本プラン §2 Step 5 の判断が誤りなので、`@types/...` の追加要否を再検討する。

### Step 7. インストールされた実バージョンの記録

```bash
npm ls lucide-react jspdf html2canvas recharts --depth=0
```

出力された実バージョンを PR 本文に貼ることで、レビュアーが lockfile を読まずに版を確認できるようにする。

### Step 8. コミット

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore(deps): UI/PDF/グラフライブラリを追加 (#8)

- lucide-react ^0.460.0  (icons: AlertTriangle / PiggyBank / Sparkles)
- jspdf ^2.5.2           (PDF コンテナ生成、公式型同梱)
- html2canvas ^1.4.1     (DOM → PNG ラスタライズ、公式型同梱)
- recharts ^2.12.7       (積み上げ横棒、SVG ベース、公式型同梱)

全て dependencies に追加。@types/* は不要（公式型定義の同梱を npm view で確認済み）。
SemVer caret により jspdf v3 / recharts v3 / html2canvas v2 のメジャー破壊変更を踏まない。

実コードからの import は本 Issue では追加しない。動作検証は
Issue #3 / #4 / #5 の本実装 PR で実施する。
EOF
)"
```

### Step 9. プッシュと PR 作成

```bash
git push -u origin feature/dependencies_20260425
gh pr create --base develop --title "依存ライブラリを追加 (lucide-react / jsPDF / html2canvas / Recharts) (#8)" --body "$(cat <<'EOF'
## 概要

Issue #8 に基づき、後続実装 Issue（#3 / #4 / #5）が即座に着手できるよう
4 本のライブラリを `dependencies` に追加した。

## 追加した依存（package.json 上の表記 → 解決された実版）

| パッケージ | package.json | 実版 (npm ls) | 公式型同梱 |
|---|---|---|---|
| lucide-react | ^0.460.0 | <実値> | はい |
| jspdf | ^2.5.2 | <実値> | はい |
| html2canvas | ^1.4.1 | <実値> | はい |
| recharts | ^2.12.7 | <実値> | はい |

## 意思決定サマリー

- バージョン固定: キャレット運用（既存依存と整合、SemVer で v3 等メジャー破壊を防止）
- 依存区分: 全部 dependencies（Cloudflare Pages の `--production` ビルド時の解決を保証）
- 型定義: `@types/...` は 4 本とも不要（公式型同梱を `npm view <pkg> types` で確認）
- `next.config.mjs` の `modularizeImports`: 入れない（lucide-react は ESM tree-shake 既定で動作、内部パス保証なし）

## スコープ外

- `src/lib/pdf.ts` 等の実装コード → Issue #3 / #4 / #5 の本実装 PR で対応
- `public/fonts/` のサブセットフォント配置 → 別 Issue（Issue #5 §4 参照）
- `next.config.mjs` の Cloudflare Pages 対応 → Issue #11

## 検証

- [x] `npm install` 成功、ERESOLVE 警告なし
- [x] `npm run typecheck` エラー 0 件
- [x] `npm run lint` エラー 0 件
- [x] `npm run build` 成功
- [x] `npm view <pkg> types` で 4 本とも公式型定義同梱を確認

## プラン参照

`working/plans/issue-8_dependencies.md`
EOF
)"
```

---

## 4. 新規生成・変更されるファイル一覧

### 本 Issue で **変更**

- `/Users/YS/development/matatabi-calculator/package.json` — `dependencies` に 4 行追加
- `/Users/YS/development/matatabi-calculator/package-lock.json` — `npm install` による自動更新（4 本 + 推移依存）

### 本 Issue で **新規生成しない**

- `src/` 配下の任意のファイル（実装コードは書かない）
- `public/` 配下の任意のファイル（フォント・素材は別 Issue）
- `scripts/` ディレクトリ（検証スクリプトは書かない、§2 Step 8 結論）
- `next.config.mjs` への変更（`modularizeImports` 等は入れない、§2 Step 7 結論）
- `.eslintrc.json` への変更（`no-restricted-imports` 等の lint 強化は別 Issue）

### 本 Issue で **触らない**（後続 Issue 担当）

| ファイル / 領域 | 担当 Issue |
|---|---|
| `src/components/ResultDashboard.tsx`（Recharts 実装） | Issue #3 の実装フェーズ |
| `src/components/WarningBanner.tsx`（lucide-react 実装） | Issue #4 の実装フェーズ |
| `src/lib/pdf.ts`（jspdf + html2canvas 実装） | Issue #5 の実装フェーズ |
| `public/fonts/`（Noto Sans JP サブセット配置） | フォント実装 Issue（別途起票） |
| `next.config.mjs` の Cloudflare Pages 対応 | Issue #11 |
| `tailwind.config.ts` の余白・角丸・シャドウ | Issue #10 |
| 猫モチーフ素材・ファビコン・OGP | Issue #9 |
| ESLint カスタムルール（`no-restricted-imports` で `import * as` 禁止 等） | 別 Issue（コード品質改善） |

---

## 5. 検証手順（Issue クローズのためのチェックリスト）

### 依存追加の整合性

- [ ] `package.json` の `dependencies` に **4 本（lucide-react / jspdf / html2canvas / recharts）** が追加されている
- [ ] `package.json` の `devDependencies` には **新規追加が無い**（`@types/...` を入れていない）
- [ ] 4 本のバージョン表記がすべて **キャレット**（`^x.y.z` 形式）になっている
- [ ] `jspdf` のバージョン表記が `^2.5.2` 系（v3 を踏まない）
- [ ] `html2canvas` のバージョン表記が `^1.4.1` 系（v2 を踏まない）
- [ ] `recharts` のバージョン表記が `^2.12.7` 系（v3 を踏まない）
- [ ] `lucide-react` のバージョン表記が `^0.460.x` 系
- [ ] `package-lock.json` が更新され commit に含まれている

### 公式型定義の同梱確認

- [ ] `npm view lucide-react types` が値を返す（`undefined` でない）
- [ ] `npm view jspdf types` が値を返す
- [ ] `npm view html2canvas types` が値を返す
- [ ] `npm view recharts types` が値を返す

### 動作確認

- [ ] `npm install` がエラー / ERESOLVE 警告なしで完了
- [ ] `npm run typecheck` がエラー 0 件で終了
- [ ] `npm run lint` がエラー 0 件で終了
- [ ] `npm run build` が成功し `.next/` が生成される
- [ ] `npm run dev` 起動後、`http://localhost:3000` が引き続き表示される（Issue #7 のスウォッチページが壊れていないこと）

### スコープ厳守

- [ ] `src/` 配下に新規ファイル / 既存ファイルへの import 追加が **無い**
- [ ] `next.config.mjs` に変更が **無い**
- [ ] `tailwind.config.ts` に変更が **無い**
- [ ] `public/` 配下に変更が **無い**

### Git / PR

- [ ] ブランチ名が `feature/dependencies_20260425`
- [ ] コミットが 1 個（`package.json` + `package-lock.json` の追加のみ）
- [ ] PR が `develop` をベースに作成されている
- [ ] PR 本文に「実バージョン表」「意思決定サマリー」「スコープ外」「検証結果」が記載されている

---

## 6. 考慮事項・リスク

### R1: `lucide-react` のバンドルサイズと tree-shake 担保

- 全アイコン同梱で 1MB 超のため、**素朴な `import * as Icons from "lucide-react"` を書くと LCP 1 秒目標（マスター設計書 §1.4）が壊れる**
- 対策: 後続 Issue のコードで個別 named import (`import { AlertTriangle } from "lucide-react"`) を徹底する
- 本 Issue では実装コードを書かないため発火しないが、**PR 本文と本プラン §2 Step 7 にこの方針を明記** することで後続 Issue のコードレビュアーが弾ける状態を作る
- 検証: 後続 Issue の本実装 PR で `npm run build` 後に `.next/static/chunks/` のサイズを観察し、`lucide-react` 全体（>1MB）が混入していないことを確認

### R2: `recharts` のバンドルサイズと `next/dynamic` 遅延ロード

- Recharts は約 100kB（min+gzip）。LCP 1 秒目標と整合させるため、**Issue #3 §11 R8 で `ResultDashboard` の `next/dynamic` 遅延ロードが既に確定**
- 本 Issue では「依存を追加するだけ」のため、遅延ロード実装は行わない
- 検証: 後続 Issue の本実装 PR で `next build` 出力に `recharts` を含む chunk が分離していることを確認

### R3: `recharts` v2 / React 18 の `"use client"` 境界

- Recharts v2 はクライアント側でのみ動作（SSR 不可、内部で `window` / `ResizeObserver` を参照）
- 対策: Issue #3 §11 R1 で `ResultDashboard` / `DashboardView` への `"use client"` 指定が既に確定
- 本 Issue では実装コードを書かないため発火しないが、後続 Issue の実装で **クライアントコンポーネント境界を明示する**ことが必須

### R4: `html2canvas` の Safari / iPad メモリ制約

- iPad Safari の Canvas メモリ制約（16M px²）に触れると `html2canvas` が失敗する
- 対策: Issue #5 §3 / §10 で `scale: 2` を上限とする方針が既に確定
- 本 Issue では発火しない

### R5: `jspdf` v3 を誤って取得しないようバージョン指定を厳密にする

- v3 系は API 互換性が破壊されており、Issue #5 のコード例（`new jsPDF("p", "mm", "a4")` 等）が動かなくなる
- 対策: `^2.5.2` で SemVer caret が `<3.0.0` を保証する
- **`npm install jspdf` のように版指定無しでインストールすると最新（v3 系）が入るリスクがある**ため、本プラン §3 Step 3 で必ず版指定を含むコマンドを実行する

### R6: lockfile 競合（npm vs yarn vs pnpm）

- `packageManager: npm@10.9.2` が `package.json` に明記済み（Issue #6 で確定）。Corepack enforce により他のパッケージマネージャでのインストールは弾かれる
- **追加対策不要**

### R7: 既存 ESLint 設定（`eslint-config-next`）と新依存のインポート順ルール

- `eslint-config-next` の標準ルールには `import/order` の自動 fix は含まれない
- 本 Issue は import 文を書かないため発火しないが、後続 Issue で大量の import を書く際にスタイルを統一する別 Issue（Prettier / `eslint-plugin-import` 導入）が必要になる可能性あり
- **本 Issue では何もしない**

### R8: 動作確認用に「未使用 import」を一時的に置いた場合の ESLint 警告対処

- §2 Step 8 の選択肢 B（最小サンプル）を採用した場合、未使用 import が ESLint 警告になる
- 対策: §2 Step 8 で **選択肢 A（最小サンプル無し）** を推奨し、未使用 import を作らない
- 本プランの推奨に従えば発火しない

### R9: バージョン固定方針が #11 / 後続実装 Issue で齟齬を生まないか

- Cloudflare Pages（Issue #11）のビルドは `package-lock.json` を尊重するため、本 Issue で固定された版が本番デプロイでも使われる（再現性 OK）
- 後続実装 Issue で「`recharts` の特定マイナー版機能が必要」となった場合、`package.json` を編集して `^2.13.0` に上げる運用となる。これは Renovate / Dependabot で半自動化される範囲
- **本 Issue で決めた版は固定値ではなく「下限保証」** であることを PR 本文で明示する

### R10: html2canvas + Tailwind / next/font の SVG レンダリング互換性

- `html2canvas` は外部 CSS / Web フォント / SVG の取り扱いに既知のクセがある（特に CORS）
- Issue #5 §3.1 で「`useCORS: false`」「DOM 側で `next/font` 解決」を確定済み
- 本 Issue では発火しないが、後続 Issue（Issue #5 実装フェーズ）で実機検証が必須

### R11: `peer dependencies` の警告が出た場合の対応

- 既存依存（Next 14.2.35 / React 18.x / TypeScript ^5）と新依存の peer 要求は本来衝突しない想定
- 万一 `npm install` 中に `npm WARN ERESOLVE` が出た場合、`--legacy-peer-deps` で逃げるのではなく、**該当ライブラリのバージョン帯を見直す**
- 例: `recharts@2.12.7` の peer に `react@^16.8 || ^17 || ^18` 以外が含まれていた場合、本プランの推奨版を再検討

### R12: 4 本以外の依存ライブラリ追加要望（jspdf-autotable / lucide-react/dist/esm/icons など）への対応

- `jspdf-autotable`（表組生成）、`recharts/types/...` の内部型直 import、Lucide の特定アイコンファイル直 import などを後続実装で要求される可能性あり
- 本 Issue では **明示的に「4 本のみ」を扱う** とスコープを切る。追加要望は別 Issue で起票
- 本 Issue の PR 本文に「他のライブラリは別 Issue で扱う」と一文残す

### R13: `lucide-react` 0.x 系のバージョン運用注意

- 0.x 系は SemVer 上「マイナー版が破壊的変更を含み得る」契約だが、`lucide-react` は実運用上「マイナー = 機能追加」「パッチ = 修正」を厳格に守っている
- ただし `^0.460.0` のキャレットは SemVer の規則上 `>=0.460.0 <0.461.0`（マイナー固定相当）になる点を本プラン §2 Step 4 で説明済み
- 後続 Issue でアイコン追加が必要となり 0.461 以降が要る場合、`package.json` の手動編集で取り込む。Renovate / Dependabot 自動 PR でもこの 1 階層上のバージョン更新がトリガされる

---

## 7. 関連ファイル

### 既存の参照元（仕様確定済み）

- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — マスター設計書 §1.4 LCP 1 秒目標 / §2.1 技術要件 / §2.2 jsPDF + html2canvas 採用根拠
- `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md` — Issue #3 §5.1 Recharts 採用根拠 / §5.3 Issue #8 への申し送り（Recharts v2 系、`^2.x.y` 検討）/ §11 R1 `"use client"` / §11 R8 `next/dynamic`
- `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` — Issue #5 §10.1 jspdf `^2.5.x` / §10.2 html2canvas `^1.4.x` / §10.1, §10.2 公式型定義同梱（`@types/...` 不要）/ §3.1 html2canvas 主体方針（jsPDF 側フォント埋め込み不要）
- `/Users/YS/development/matatabi-calculator/docs/spec/warning-copy.md` — Issue #4 で確定した `alert-triangle` Lucide アイコン使用箇所
- `/Users/YS/development/matatabi-calculator/.claude/issue-order.md` — フェーズ1 #8 の位置付け、`lucide-react` を含む依存追加の射程

### 既存プロジェクト現状（本 Issue で変更対象 / 参照）

- `/Users/YS/development/matatabi-calculator/package.json` — 本 Issue で `dependencies` に 4 行追加
- `/Users/YS/development/matatabi-calculator/package-lock.json` — `npm install` による自動更新
- `/Users/YS/development/matatabi-calculator/next.config.mjs` — 本 Issue では **触らない**（参照のみ、`modularizeImports` 不採用根拠 §2 Step 7）
- `/Users/YS/development/matatabi-calculator/tailwind.config.ts` — 本 Issue では触らない（Issue #10 担当）
- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx` — 本 Issue では触らない（参照のみ、`next/font/google` 採用済み）
- `/Users/YS/development/matatabi-calculator/src/app/page.tsx` — 本 Issue では触らない（Issue #7 のスウォッチページ）
- `/Users/YS/development/matatabi-calculator/.gitignore` — 本 Issue では触らない（`node_modules` 追記の未コミット変更は別件）
