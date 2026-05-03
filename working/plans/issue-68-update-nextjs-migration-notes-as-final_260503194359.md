# Issue #68 実装計画: nextjs-15-16-migration-notes.md を移行完了後の最終ノートに更新

## Context
`docs/security/nextjs-15-16-migration-notes.md` は Issue #53 段階 1（PR #62）で作成された **影響範囲調査ノート** であり、現状は「調査完了」ステータスのまま（L3）。段階 2A（PR #63、`next@15.5.15` / React 19）と段階 2B + 段階 3（PR #65、`next@16.2.4` / ESLint 9 / Flat Config）が完了したため、本書を「移行完了後の最終ノート」として更新し、実施結果と想定外差分（特に PR #65 で発生したプラン逸脱事項）を追記する必要がある。本作業は純粋な単一ファイル文書更新であり、コード／設定への影響は無い。

GitHub Issue: #68

## 変更対象ファイル

### 1. 文書冒頭の見出しと「ステータス」注記の更新（L1〜L5）
- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/nextjs-15-16-migration-notes.md`
- **変更箇所**: 1 行目（H1 見出し）と 3〜5 行目（ステータス／関連 Issue／関連プランの引用ブロック）
- **変更内容**:
  - H1 見出しを `# Next.js 15 / 16 移行ノート（Issue #53 / Issue #64 完了レポート）` に変更（「段階 1 アウトプット」表現を完了レポート表現に置換）
  - 3 行目の `> ステータス: 調査完了（2026-05-02、…）` を `> ステータス: 移行完了（2026-05-02、PR #62 / PR #63 / PR #65 にて全段階完了）` に置換
  - 4 行目の関連 Issue 行に `#64`（段階 2B 用 Issue、CLOSED 2026-05-02T06:07:53Z）を追加。既存 `#53 / #50 / #11 / #43` は維持
  - 5 行目の関連プラン行に `working/plans/issue-64-nextjs-15-to-16-major-upgrade_260502131649.md`（PR #65 のプラン）を追記
  - 引用ブロック直後に新規行として「**完了 PR**: PR #62（段階 1, merged 2026-05-02 03:58）／ PR #63（段階 2A, merged 2026-05-02 04:14）／ PR #65（段階 2B + 段階 3, merged 2026-05-02 06:07）」サマリ行を 1 行追加
- **理由**: 受け入れ条件 1「冒頭に『移行完了』ステータス注記が追加される」と受け入れ条件 4「段階 1 / 2A / 2B / 3 の最終結果（PR 番号と完了日）が記録される」のサマリ部分を満たす。

### 2. §1「本書の目的」の文体更新（L7〜L11）
- **変更**: 同ファイル §1（L7〜L11）
- **変更箇所**: L9 の「**段階 1（影響範囲調査）** のアウトプットである。後続 PR（…）のレビュー時に…エビデンスとして参照する」と L11 の「本書はその差分を明文化し、段階 2A 以降の判断根拠を残す」
- **変更内容**:
  - L9 を「本書は当初 Issue #53 段階 1 の影響範囲調査として作成され、PR #62 / #63 / #65 で全段階完了後に **移行完了レポート** として再構成された。移行時に**事前に予測した影響**と、**実際に発生した差分**（§7 新設）の対比を提供する」に書き換え
  - L11 末尾を「…段階 2A 以降の判断根拠を残す。実際の §3 差分は段階 2B（PR #65）で `docs/security/jspdf-vulnerabilities.md §6.4.1` に履歴注記として反映済み」に拡張
- **理由**: 文書の役割が「事前調査」から「事後レポート」に変わったことを冒頭部で明示する。

### 3. §2.1「主要バージョン」を「想定 → 実測差分」フォーマットに更新（L15〜L31）
- **変更**: 同ファイル §2.1
- **変更箇所**: L17 リード文と L19〜L31 のバージョン表
- **変更内容**:
  - L17「`package.json`（2026-05-02 時点）より:」を「`package.json` 移行前後（2026-05-02 時点）。**起点列＝段階 1 調査時、最終列＝PR #65 マージ後の実測**:」に置換
  - 表に「最終バージョン（PR #65 後）」列を新設し、`package.json` 実測（L26 `next@^16.2.4`、L27〜28 `react`/`react-dom@^19.0.0`、L38〜39 `@types/react*@^19.0.0`、L40 `eslint@^9`、L41 `eslint-config-next@^16.0.0`、L44 `postcss@^8.5.10`）を反映
  - 表直下に注記行を追加: 「**実測差分**: `eslint` は段階 1 ノート §4.6 の『8 据え置き』方針から `^9` 必須昇格に変更（§7.1 参照）。`postcss` は `^8` から `^8.5.10` への明示固定が必要（§7.3 参照）。`overrides.next.postcss = "^8.5.10"` を `package.json` に追加（§7.3 参照）」
- **理由**: 受け入れ条件 2「§2.x の想定記述が『想定 → 実測差分』フォーマットに更新される」を満たす。`package.json` L26〜L52 の実測値と完全整合させる。

### 4. §2.2「配信モード」の実測差分追記（L33〜L48）
- **変更**: 同ファイル §2.2
- **変更箇所**: L48 末尾（既存 `unoptimized: true` の説明直後）に新段落を追加
- **変更内容**: 「**実測差分（PR #65 後）**: `next.config.mjs` の内容は段階 1 ノートと同一（`output: "export"` / `images.unoptimized: true`）で、Next.js 16 でも変更なし。ただし生成物 `out/` の構造はフラット化された（`out/calculate.html` + `out/calculate/__next.*.txt` 形式へ。詳細 §7.5 / 検証は `out/calculate.html` と `out/calculate/__next._tree.txt` の存在で可能）」を追加
- **理由**: 受け入れ条件 2 のうち §2.2 部分。`out/` 実測（`calculate.html` / `calculate/__next.*.txt` の同居構造）と整合させる。

### 5. §2.3「採用していない Next.js 機能」の実測差分追記（L50〜L63）
- **変更**: 同ファイル §2.3
- **変更箇所**: L63 直後（表の末尾）に新段落を追加
- **変更内容**: 「**実測差分（PR #65 後）**: 表に挙げた 7 キーワードはいずれも段階 2A / 2B でも 0 件のまま維持された。`@next/codemod` 実行による誤書換は発生せず（§4.2 で予告した検証は OK）。本表は移行後も継続して『該当なし』」を追加
- **理由**: 受け入れ条件 2 のうち §2.3 部分。事前想定（不使用）と実測（移行後も不使用維持）が一致したことを明記し、§7 想定外差分との対比軸を作る。

### 6. §2.5「ESLint 設定」を「想定 → 実測差分」フォーマットに更新（L77〜L92）
- **変更**: 同ファイル §2.5（タイトルは「ESLint 設定」のまま、想定形式の準拠例として §2.x シリーズに含めて更新）
- **変更箇所**: L77 リード「`.eslintrc.json`:」と L92 末尾の「`extends` ベースの旧形式…未移行」記述
- **変更内容**:
  - L77 を「`.eslintrc.json`（移行前、PR #65 で削除）:」に変更
  - L92 末尾に新段落を追加: 「**実測差分（PR #65 後）**: `.eslintrc.json` は **削除済み** で `eslint.config.mjs`（Flat Config）に置換された。`next-lint-to-eslint-cli` codemod（`--force` 付き実行）が自動変換し、レガシー設定不可となった（詳細 §7.2）。既存カスタムルール `@typescript-eslint/no-unused-vars`（`argsIgnorePattern`/`varsIgnorePattern`）は `eslint.config.mjs` 内に継承済み。さらに新 ESLint ルール（`react-hooks/set-state-in-effect` / `react-hooks/refs`）が 4 箇所で発火し、`eslint-disable-next-line` 抑制対応となった（§7.4）」
- **理由**: 受け入れ条件 2 の追加適用。段階 1 ノート §4.6 の「ESLint 8 据え置き、Flat Config 別 Issue 化」想定が現実と乖離した点を §2 系で予告し、§7 詳細へ誘導する。

### 7. §4.6 と §5.6 への「実測差分」インライン追記（L142〜L146、L192〜L195）
- **変更**: 同ファイル §4.6（L142〜L146）および §5.6（L192〜L195）
- **変更箇所**: §4.6 末尾（L146 の後）と §5.6 末尾（L195 の後）
- **変更内容**:
  - §4.6 末尾に新段落: 「**実測差分（段階 2A の PR #63 では本想定どおり ESLint 8 据え置きで完了したが、段階 2B の PR #65 で `eslint-config-next@^16` の peer 要件により ESLint 9 + Flat Config 必須移行となった。詳細 §7.1 / §7.2）**」を追加
  - §5.6 末尾に新段落: 「**実測差分（PR #65）**: `eslint-config-next` を `^15.0.0` → `^16.0.0` に更新した結果、本書 §4.6 の想定（v8 互換維持）が崩れ、`eslint@^9` への昇格と Flat Config への自動移行が同時発生した。詳細 §7.1 / §7.2」を追加
- **理由**: 段階 1 ノートの誤想定箇所（§4.6 の v8 互換主張、§5.6 の v15 → v16 想定）を文書中央でインライン補正し、読者が想定と実測の乖離を辿りやすくする。受け入れ条件 2 の補完。

### 8. §6「React 19 同時更新における依存ライブラリ互換性メモ」の実測差分追記（L197〜L209）
- **変更**: 同ファイル §6
- **変更箇所**: L209 末尾
- **変更内容**: 新段落として「**実測差分（PR #63 マージ後）**: `recharts@^2.15.4` / `lucide-react@^0.460.0` / `html2canvas@^1.4.1` / `jspdf@^2.5.2` のいずれもバージョン更新を要さず、ビルドおよび実機描画で問題は発生しなかった。`tailwindcss` / `postcss` は §7.3 のとおり `postcss` のみ `^8.5.10` に明示固定が必要となった」を追加
- **理由**: 受け入れ条件 2 の補完。§6 は §2.x ではないが、想定→実測の対比形式を文書全体で一貫させる。

### 9. §7「移行後の想定外差分」を新設（既存 L211 の §7 を §8 に繰下げる）
- **変更**: 同ファイル
- **変更箇所**: 現在 L211〜L240 にある §7「段階 2A / 2B / 3 への申し送り（チェックリスト）」と L242〜L252 にある §8「関連ファイル」を、それぞれ §8 / §9 に繰り下げる。L210 の直後（§6 の後）に新規 §7「移行後の想定外差分」を挿入する
- **変更内容**:
  - 新 §7 リード: 「本節は段階 1 ノート（PR #62）作成時点では予測されておらず、段階 2A / 2B（PR #63 / #65）の実装中に判明した差分を時系列＋分類別に記録する。後続の Next.js メジャー更新（v17 想定）時の参照用」
  - **§7.1 ESLint 8 → 9 への必要昇格**: 「PR #65 で `eslint-config-next@^16.0.0` を導入した結果、当該パッケージが `eslint@>=9.0.0` を peer 必須としたため、段階 1 ノート §4.6 の『ESLint 8 据え置き、Flat Config 別 Issue 化』方針は維持不可能となり、`eslint@^8` → `^9` のメジャー昇格を同 PR で実施した。`package.json` L40 で `eslint: "^9"` 確定」
  - **§7.2 `.eslintrc.json` → `eslint.config.mjs`（Flat Config）への移行**: 「`npx @next/codemod@canary next-lint-to-eslint-cli .` を `--force` 付きで実行し、`.eslintrc.json` 削除 / `eslint.config.mjs` 新規生成。`next@16` ではレガシー `.eslintrc.*` が動作不可。codemod 生成の未使用 import (`path`, `fileURLToPath`) は手動除去。既存カスタムルールは Flat Config 内に継承済み（`/Users/YS/development/matatabi-calculator/eslint.config.mjs` 参照）」
  - **§7.3 `postcss` `overrides` の必要性**: 「段階 1 ノート §2.1 では `next@16` への更新で `postcss` advisory が自動解消すると想定していたが、`next@16.2.4` がネスト依存に `postcss@8.4.31`（vulnerable）を pin していたため、`package.json` 末尾に `overrides.next.postcss = \"^8.5.10\"`（L49〜L53）を追加して全ネスト依存を強制更新する必要があった。直接依存の `postcss` も `^8` → `^8.5.10` に同時バンプ（L44）。`docs/security/jspdf-vulnerabilities.md §6.3` の overrides 不採用方針は dompurify/jspdf 互換性破壊リスクが理由で、postcss の semver マイナー差分（8.4 → 8.5）には適用されないと判断（PR #65 description の『プランからの逸脱』参照）」
  - **§7.4 新 ESLint ルール（`react-hooks/set-state-in-effect` / `react-hooks/refs`）の発火**: 「Next.js 16 同梱の `eslint-config-next@^16` で新規追加された 2 ルールが既存コードで 4 箇所発火。発火箇所は `src/components/calculate/ResultDashboard.tsx`（`useReducedMotion` / `useIsMobile` の `setX(mql.matches)` 同期、`PdfDashboard` への `generatedAt={generatedAtRef.current ?? new Date()}` 渡し）と `src/hooks/useCountUp.ts`（`setReducedMotion(mql.matches)`）。本 PR では `eslint-disable-next-line` で抑制し理由コメントを併記。`useSyncExternalStore` への正攻法リファクタは別 Issue 候補として切り出し（本 Issue #68 とは別 Issue）」
  - **§7.5 Next.js 16 静的エクスポート構造の変更**: 「v15 までの `out/calculate/index.html` 形式から、v16 では `out/calculate.html`（フラット）+ `out/calculate/__next._full.txt` / `__next._head.txt` / `__next._index.txt` / `__next._tree.txt` / `__next.calculate.__PAGE__.txt` / `__next.calculate.txt`（Turbopack メタデータ）の併存形式に変更（実測値、`/Users/YS/development/matatabi-calculator/out/calculate/` 直下）。`/calculate` URL の到達性は Cloudflare Pages の auto-routing で維持され、Issue #11 の静的アップロード運用と非互換にはならない。本書 §4.5 / §5.5 の検証想定（『`out/calculate/index.html` のレンダリング結果が変わらない』）は文言更新が必要だが、機能要件としては満たされた」
- **理由**: 受け入れ条件 3「§7『移行後の想定外差分』が新設され、ESLint 9 昇格 / Flat Config 移行 / postcss overrides / 新 lint ルール / 静的エクスポート構造変更の 5 件が記録される」を直接満たす。各項目に PR #65 description の根拠と `package.json` / `eslint.config.mjs` / `out/` 実測の出典を組み込む。

### 10. 旧 §7「段階 2A / 2B / 3 への申し送り」を §8 に繰下げ + 「最終結果」セクションに改編
- **変更**: 同ファイル（旧 L211〜L240、繰下げ後 §8）
- **変更箇所**: H2 見出し行と各サブセクション
- **変更内容**:
  - H2 を `## 8. 段階別最終結果（PR 番号 / マージ日）` に変更（旧「段階 2A / 2B / 3 への申し送り（チェックリスト）」から改題）
  - リード文を 1 行追加: 「段階 1 時点ではチェックリスト形式だったが、全段階完了後の本改訂では実施結果として記録する」
  - 旧 §「段階 2A（v15 移行 PR）」を `### 8.1 段階 1（PR #62, merged 2026-05-02 03:58）— 移行調査ノート策定` に置換し、「`docs/security/nextjs-15-16-migration-notes.md` 初版作成（本書）」のみ列挙
  - `### 8.2 段階 2A（PR #63, merged 2026-05-02 04:14）— next@15.5.15 / React 19 採用` を追加し、既存チェックリスト項目（`package.json` 更新 / codemod 実行 / `dynamic({ ssr: false })` 検証 / lint・typecheck・build グリーン / Cloudflare preview デプロイ）を `[x]` 完了形に変換
  - `### 8.3 段階 2B（PR #65, merged 2026-05-02 06:07）— next@16.2.4 / eslint-config-next@^16 / eslint@^9 / Flat Config / postcss overrides` を追加。既存 §段階 2B チェックリストを完了形に変換し、§7.1〜§7.5 への参照リンクを各項目に追記
  - `### 8.4 段階 3（PR #65 同梱, merged 2026-05-02 06:07）— 文書更新` を追加。既存 §段階 3 チェックリスト（`docs/security/jspdf-vulnerabilities.md §6.4` 完了ステータス追記 / §6.4.1 履歴注記 / `README.md` の Next.js バージョン更新 / `.claude/issue-order.md` 注記 / `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` 更新 / `docs/brand/README.md` 更新）を完了形に変換し、PR #65 description の対応箇所と整合させる
- **理由**: 受け入れ条件 4「段階 1 / 2A / 2B / 3 の最終結果（PR 番号と完了日）が記録される」を満たす。「申し送りチェックリスト」は移行完了後には実用価値がないため、同じ構造を保ったまま「実施結果」へ改編することで既存情報を最大限活用する。

### 11. 旧 §8「関連ファイル」を §9 に繰下げ（L242〜L252）
- **変更**: 同ファイル（旧 L242 H2 行）
- **変更箇所**: H2 見出し行と項目末尾
- **変更内容**:
  - H2 を `## 9. 関連ファイル` に変更
  - 既存項目末尾に以下 3 項目を追加:
    - `working/plans/issue-64-nextjs-15-to-16-major-upgrade_260502131649.md` — PR #65 のプラン
    - `eslint.config.mjs` — Flat Config 実装（PR #65 で `.eslintrc.json` から置換）
    - `package.json` `overrides` セクション（L49〜L53） — `postcss` 強制更新の根拠
- **理由**: §7 で参照する追加ファイル群を「関連ファイル」セクションに集約。受け入れ条件 5「関連 Issue #53 / #64 との整合が取れる」のうち、ファイル単位での参照整合性を確保する。

### 12. クロスドキュメント整合性チェック（読み取りのみ、編集対象外）
- **対象**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md` L208（既存の本書への相互参照）
- **確認内容**: 既存記述「実態調査は `docs/security/nextjs-15-16-migration-notes.md §3` を参照」の §3 章番号は本改訂後も変わらないため、編集不要
- **理由**: 受け入れ条件 5「関連 Issue #53 / #64 との整合」と矛盾を起こさないため、既存 §3 の章番号は維持する（§7 新設は §6 と §7「申し送り」の間への挿入で、§3 はずれない）

## 設計上の考慮点

- **既存 §3〜§6 の章番号は維持する**: §7 を §6 と旧 §7 の間に挿入することで、`docs/security/jspdf-vulnerabilities.md §6.4.1` L208 が参照する `nextjs-15-16-migration-notes.md §3` の章番号がずれない。これにより本 Issue の編集対象を当該ファイル単一に閉じ込められる（受け入れ条件 5 のクロスドキュメント整合）。
- **「想定 → 実測差分」フォーマットの粒度**: 受け入れ条件 2 は §2.x（§2.1 / §2.2 / §2.3）を明示しているため、これら 3 節は必須。§2.4「採用している Next.js 機能と使用箇所」は表内の使用ファイルが移行後も同一で「差分なし」が結論となるが、簡潔さのため §2.4 への注記追記は最小限（§7.5 の `next/dynamic` 関連注記で代替し、§2.4 自体は変更しない）に留める。一方 §2.5「ESLint 設定」は §7.1〜§7.2 と直結するため §2.5 にも実測差分を追加する（受け入れ条件 2 の趣旨に沿った拡張）。§4.6 / §5.6 / §6 へのインライン補正も同じ趣旨（読者導線の改善）。
- **§7「想定外差分」と §8「最終結果」の役割分担**: §7 は「予測されなかった事象＝学び」、§8 は「予定どおりに進んだ実施記録」とする。重複を避けるため、§8 の各段階記述では §7 該当項目への章番号参照のみ置き、詳細は §7 に集約する。
- **PR #65 description との整合**: PR #65 description「プランからの逸脱（要レビュー）」セクションが §7.1〜§7.3 と一対一対応するため、文言と数値（バージョン番号、ファイルパス、影響箇所）は PR description を一次出典とする。`react-hooks/set-state-in-effect` 発火箇所（4 箇所、`ResultDashboard.tsx` 3 箇所 + `useCountUp.ts` 1 箇所）も PR description どおりに記載。
- **受け入れ条件 5（#53 / #64 整合）の確認手段**: 編集後に `grep -n '#53\|#64\|#62\|#63\|#65' docs/security/nextjs-15-16-migration-notes.md` で出現箇所が冒頭ステータス・§7.1〜§7.5・§8.1〜§8.4 を覆うことを確認する想定。

## 検証方法

1. **構造整合性**: 編集後ファイルを読み、H2 見出しが §1〜§9 の順で重複なく出現することを確認（`grep -n '^## ' docs/security/nextjs-15-16-migration-notes.md` で 9 行出力）。
2. **受け入れ条件 1**: 冒頭 5 行以内に「移行完了」「PR #62 / #63 / #65」の文字列が出現することを確認。
3. **受け入れ条件 2**: §2.1 / §2.2 / §2.3 / §2.5 のそれぞれに「実測差分」見出しまたは段落が含まれることを確認。
4. **受け入れ条件 3**: §7 配下に §7.1〜§7.5 の 5 サブセクションが揃い、それぞれ「ESLint 9 昇格」「Flat Config 移行」「postcss overrides」「新 lint ルール」「静的エクスポート構造変更」のキーワードを含むことを確認。
5. **受け入れ条件 4**: §8 配下に「段階 1（PR #62）」「段階 2A（PR #63）」「段階 2B（PR #65）」「段階 3（PR #65 同梱）」の 4 つが揃い、各段階にマージ日（2026-05-02）が記載されていることを確認。
6. **受け入れ条件 5**:
   - 本書内の `#53` / `#64` 参照が冒頭ステータス・§8 で整合（CLOSED 済み Issue として参照）
   - `docs/security/jspdf-vulnerabilities.md §6.4.1` L208 が参照する本書 §3 の章番号が変動していないことを `grep -n '^### 3' docs/security/nextjs-15-16-migration-notes.md` で確認
7. **コード差分なしの確認**: `git diff --stat` で変更ファイルが `docs/security/nextjs-15-16-migration-notes.md` 1 件のみであることを確認（影響範囲セクションどおり）。
8. **`npm run build` への影響なし**: 純粋な文書更新であるため再ビルド不要。CI（lint / typecheck）の追加検証も不要。
