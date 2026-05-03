# プライバシーポリシー・利用規約の法務レビュー最終化

## Context

`/privacy`（`src/app/privacy/page.tsx`）および `/terms`（`src/app/terms/page.tsx`）は現在ドラフト表記のまま公開されており、(1) 冒頭に「⚠️ 本ドキュメントはドラフトです」バナー、(2) 末尾に制定日 `2026-XX-XX`、(3) プライバシー §6 の「連絡先は法務レビュー後に確定」という 3 点のプレースホルダが残っている。`docs/legal/REASONING.md` の運用ルール（「Markdown ソースと TSX 転記版の二層構造」「同一コミット内で同時に更新」）に従い、Markdown ソース（`docs/legal/privacy.md` / `docs/legal/terms.md`）と TSX 転記版（`page.tsx`）を一括で最終版に差し替える。本プランは **法務レビュー完了済み** を前提とし、確定値（制定日／連絡先／法務指摘の本文反映）を `{{TBD-*}}` プレースホルダで定義する。実行前に法務チームから確定値を入手して埋める必要がある。

GitHub Issue: #45

## 確定が必要な値（実行前に法務チームから入手）

以下のプレースホルダを実行前に確定値で置換する。プラン本文の「変更内容」欄ではこのプレースホルダ名で参照する。

- `{{TBD-EFFECTIVE-DATE}}`: 制定日。`YYYY-MM-DD` 形式（例: `2026-05-10`）。`docs/legal/REASONING.md` 11 行目の「判断日: 2026-05-01」以降の日付であること
- `{{TBD-CONTACT-EMAIL}}`: 連絡先メールアドレス（株式会社ねこにまたたびの法務窓口アドレス）。お問い合わせフォームを採用する場合は `{{TBD-CONTACT-FORM-URL}}` も指定
- `{{TBD-CONTACT-MODE}}`: `email` / `form` / `email+form` のいずれか。連絡導線の方式
- `{{TBD-LEGAL-FINDINGS}}`: 法務レビューでの指摘事項（本文修正が必要な箇所のリスト）。指摘がない場合は空でよい
- `{{TBD-REVIEW-DATE}}`: 法務レビュー受領日（`docs/legal/REASONING.md` の「依頼日」「最終承認日」用）
- `{{TBD-REVIEWER}}`: レビュー担当者の氏名・所属（同上）
- `{{TBD-REVIEW-COMMIT}}`: 本 PR のマージコミット SHA（マージ後に `docs/legal/REASONING.md` に追記する場合のみ。本プランでは PR 本文に手動追記タスクとして残す方針）

> **注意**: 上記が未入手のまま `/execute-plan` を起動するとプレースホルダがそのままコミットされる。実行前に必ず法務チームから受領した確定値で本プラン文中の `{{TBD-*}}` を全置換すること。

## 変更対象ファイル

### 1. プライバシーポリシー（公開ページ・TSX）からドラフト警告バナーを削除

- **変更**: `src/app/privacy/page.tsx`
- **変更箇所**: 15–17 行目の `<p className="mb-6 rounded-md border border-line/60 bg-line/10 p-3 text-sm text-ink/80">⚠️ 本ドキュメントはドラフトです。最終版は法務レビュー後に確定します。</p>` ブロック
- **変更内容**: 当該 `<p>` 要素を完全に削除する。直後にある `<h1 className="text-2xl font-bold sm:text-3xl">プライバシーポリシー</h1>` が `<article>` 直下の最初の子要素になるよう調整。隣接する空行も整理して 1 行の余白に収める
- **理由**: 受け入れ条件「ドラフト警告バナーが削除されている」を満たすため。法務承認済みであるためドラフト表記は不要

### 2. プライバシーポリシー §6（公開ページ・TSX）の「連絡先は法務レビュー後に確定」を確定窓口に置換

- **変更**: `src/app/privacy/page.tsx`
- **変更箇所**: 116–118 行目（§6「開示・訂正・削除等の請求」内の `<p>` 要素）。具体的には末尾の括弧書き `（連絡先は法務レビュー後に確定）` 部分
- **変更内容**: `{{TBD-CONTACT-MODE}}` の値に応じて以下のいずれかに置換する:
  - `email`: 「請求方法および本ポリシーに関するお問い合わせは、`{{TBD-CONTACT-EMAIL}}` までご連絡ください。」（メールアドレスは `<a href="mailto:{{TBD-CONTACT-EMAIL}}" className="text-accent hover:underline">{{TBD-CONTACT-EMAIL}}</a>` でリンク化）
  - `form`: 「請求方法および本ポリシーに関するお問い合わせは、お問い合わせフォーム（`<a href="{{TBD-CONTACT-FORM-URL}}" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">こちら</a>`）よりご連絡ください。」
  - `email+form`: 上記両方を併記
- **理由**: 受け入れ条件「連絡先が明記されている（メールアドレスまたはお問い合わせフォームへのリンク）」を満たすため。本ファイルは現在 `import Link from "next/link";` を冒頭で取り込んでいるが、外部 URL の場合は `<a>` タグで `target="_blank" rel="noopener noreferrer"` を付与する（`Link` は内部遷移用のため）

### 3. プライバシーポリシー（公開ページ・TSX）の制定日プレースホルダを確定日に置換

- **変更**: `src/app/privacy/page.tsx`
- **変更箇所**: 129 行目 `<p className="text-sm text-ink/70">制定日: 2026-XX-XX（法務レビュー後に確定）</p>`
- **変更内容**: `<p className="text-sm text-ink/70">制定日: {{TBD-EFFECTIVE-DATE}}</p>` に置換。「（法務レビュー後に確定）」の括弧書きも削除
- **理由**: 受け入れ条件「制定日が確定日に置換されている」を満たすため。`docs/legal/REASONING.md` の運用ルールに沿い、改定履歴は Markdown 側のみで管理し、TSX 公開ページは制定日（最終更新日）のみを末尾に表示する設計を維持する

### 4. 利用規約（公開ページ・TSX）からドラフト警告バナーを削除

- **変更**: `src/app/terms/page.tsx`
- **変更箇所**: 15–17 行目の `<p className="mb-6 rounded-md border border-line/60 bg-line/10 p-3 text-sm text-ink/80">⚠️ 本ドキュメントはドラフトです。最終版は法務レビュー後に確定します。</p>` ブロック
- **変更内容**: 当該 `<p>` 要素を完全に削除し、直後の `<h1>利用規約</h1>` が `<article>` 直下の最初の子要素になるよう調整
- **理由**: プライバシー側（変更 1）と同じく、受け入れ条件「ドラフト警告バナーが削除されている」を満たすため

### 5. 利用規約（公開ページ・TSX）の制定日プレースホルダを確定日に置換

- **変更**: `src/app/terms/page.tsx`
- **変更箇所**: 127 行目 `<p className="text-sm text-ink/70">制定日: 2026-XX-XX（法務レビュー後に確定）</p>`
- **変更内容**: `<p className="text-sm text-ink/70">制定日: {{TBD-EFFECTIVE-DATE}}</p>` に置換
- **理由**: 受け入れ条件「制定日が確定日に置換されている」を満たすため

### 6. プライバシーポリシー Markdown ソースからドラフト警告ブロックを削除

- **変更**: `docs/legal/privacy.md`
- **変更箇所**: 1 行目のタイトル `# プライバシーポリシー（ドラフト）` および 3 行目の引用ブロック `> ⚠️ 本ドキュメントはドラフトです。最終版は法務レビュー後に確定します（Issue #13 / docs/legal/REASONING.md 参照）。`
- **変更内容**:
  - 1 行目を `# プライバシーポリシー` に変更（「（ドラフト）」を削除）
  - 3 行目の引用ブロック行と直後の空行を削除
- **理由**: `docs/legal/REASONING.md` の「同時更新の原則」に従い、TSX 側（変更 1）と Markdown ソースを同一コミット内で同時に更新する

### 7. プライバシーポリシー Markdown §6 の連絡先プレースホルダを確定値に置換

- **変更**: `docs/legal/privacy.md`
- **変更箇所**: 51 行目の括弧書き「（連絡先は法務レビュー後に確定）」と、53 行目の HTML コメント `<!-- TODO(Issue #5 / Issue #13): ... -->`
- **変更内容**:
  - 51 行目: 変更 2 と同じ文面（Markdown 形式での確定連絡先文。メールリンクは `<{{TBD-CONTACT-EMAIL}}>` または `[こちら]({{TBD-CONTACT-FORM-URL}})` を使用）に置換
  - 53 行目: TODO コメント行と前後の空行を整理して削除（残置すると未完了タスクが永続化するため）
- **理由**: 受け入れ条件「`docs/legal/REASONING.md` の判断と本文に矛盾がない」を満たし、Markdown とTSX で連絡先文言を完全一致させるため

### 8. プライバシーポリシー Markdown §8 制定・改定履歴の制定日プレースホルダを確定日に置換

- **変更**: `docs/legal/privacy.md`
- **変更箇所**: 62 行目 `- 制定: 2026-XX-XX（法務レビュー後に確定）`
- **変更内容**: `- 制定: {{TBD-EFFECTIVE-DATE}}` に置換(「（法務レビュー後に確定）」削除)
- **理由**: TSX 側（変更 3）と同期させるため。Markdown 側は今後の改定履歴の記録場所として残す（`REASONING.md` の運用ルール）

### 9. 利用規約 Markdown ソースからドラフト警告ブロックを削除

- **変更**: `docs/legal/terms.md`
- **変更箇所**: 1 行目のタイトル `# 利用規約（ドラフト）` および 3 行目の引用ブロック
- **変更内容**:
  - 1 行目を `# 利用規約` に変更
  - 3 行目の引用ブロック行と直後の空行を削除
- **理由**: TSX 側（変更 4）との同時更新原則を維持するため

### 10. 利用規約 Markdown §第 9 条の制定日プレースホルダを確定日に置換

- **変更**: `docs/legal/terms.md`
- **変更箇所**: 55 行目 `- 制定: 2026-XX-XX（法務レビュー後に確定）`
- **変更内容**: `- 制定: {{TBD-EFFECTIVE-DATE}}` に置換
- **理由**: TSX 側（変更 5）との同期

### 11. 法務指摘事項の本文反映（条件付き）

- **変更**: `src/app/privacy/page.tsx` / `src/app/terms/page.tsx` / `docs/legal/privacy.md` / `docs/legal/terms.md`（指摘箇所に応じて該当ファイルのみ）
- **変更箇所**: `{{TBD-LEGAL-FINDINGS}}` で指定された各指摘の該当条文。指摘がなければ本変更はスキップ
- **変更内容**: 指摘ごとに、Markdown と TSX の **両方** を同時に書き換える。例えば「§5 Cookie 等の利用に Cloudflare のプライバシーポリシー URL を明記すべき」という指摘なら `privacy.md` §5（45–47 行目）と `src/app/privacy/page.tsx` の §5（96–110 行目）の両方を修正する
- **理由**: 受け入れ条件「法務指摘事項の本文反映」と「`docs/legal/REASONING.md` の判断と本文に矛盾がない」を同時に満たすため。`REASONING.md` の電気通信事業法外部送信規律・個人情報保護法・Cloudflare Web Analytics の Cookie 不発行扱いに関する判断（36–42 行目）と矛盾する変更は行わない。指摘が `REASONING.md` の判断自体を覆す場合は、本プランの実行前に `REASONING.md` も併せて更新する別タスクとして切り出すこと

### 12. 法務レビュー結果の `REASONING.md` への追記

- **変更**: `docs/legal/REASONING.md`
- **変更箇所**: 68–78 行目の「## 法務レビュー結果」節
- **変更内容**:
  - 72 行目 `- **依頼日**: _未実施_` → `- **依頼日**: {{TBD-REVIEW-DATE}}`
  - 73 行目 `- **レビュー担当**: _未実施_` → `- **レビュー担当**: {{TBD-REVIEWER}}`
  - 74 行目 `- **指摘事項**: _未実施_` → 指摘がある場合は箇条書きで列挙、ない場合は `- **指摘事項**: なし（軽微な文言のみ修正済み）` 等
  - 75 行目 `- **対応コミット**: _未実施_` → 本 PR マージ後のコミット SHA を記録（マージ前は `本 PR (#NN)` と PR 番号で代用し、マージ後の手動更新タスクとして PR 本文に明記）
  - 76 行目 `- **最終承認日**: _未実施_` → `- **最終承認日**: {{TBD-REVIEW-DATE}}`（受領日と同一の場合）
- **理由**: `REASONING.md` 70 行目の「本節は法務レビュー完了後に追記する」という運用に従う。受け入れ条件「`docs/legal/REASONING.md` の判断と本文に矛盾がない」を満たすために、レビュー履歴を残す

### 13. お問い合わせ窓口リンクのフッター追加（`{{TBD-CONTACT-MODE}}` がフォーム採用の場合のみ）

- **変更**: `src/components/ui/Footer.tsx`
- **変更箇所**: 18–37 行目の `<nav aria-label="法務情報">` 内の `<ul>` リスト
- **変更内容**: `{{TBD-CONTACT-MODE}}` が `form` または `email+form` の場合に限り、「プライバシーポリシー」「利用規約」のリンク群と同じパターンで「お問い合わせ」項目を `<li>` として追加する。フォーム URL が外部の場合は `<a href="{{TBD-CONTACT-FORM-URL}}" target="_blank" rel="noopener noreferrer">` を使用、内部の場合は既存の `<Link>` パターンを踏襲。`{{TBD-CONTACT-MODE}}` が `email` のみの場合は本変更はスキップ（メールアドレスは §6 本文に記載済みのため重複導線は不要）
- **理由**: Issue 「影響範囲」節で「場合により: お問い合わせ窓口の有無により `src/components/Footer.tsx` のリンク追加」と記載されている条件付き対応。なお Issue 本文の `src/components/Footer.tsx` というパス記載は誤りで、実ファイルは `src/components/ui/Footer.tsx`（`src/components/ui/index.ts` 経由でエクスポート）に存在する点に注意

### 14. （任意・実行時判断）`docs/legal/REASONING.md` の冒頭運用ルールの整合性確認

- **変更**: `docs/legal/REASONING.md`（実質的な書き換えなし、確認のみ）
- **変更箇所**: 36–42 行目「法令適用範囲」節および 61–66 行目「Markdown ソースと TSX 転記版の二層構造の運用ルール」節
- **変更内容**: 法務指摘で `REASONING.md` の判断自体（電気通信事業法外部送信規律の解釈、Cloudflare Web Analytics の Cookie 不発行扱い、個人情報保護法の適用範囲）が修正される場合のみ、該当行を更新する。それ以外は変更しない
- **理由**: 受け入れ条件「`docs/legal/REASONING.md` の判断と本文に矛盾がない」を満たすため。判断の更新は法務との合意が前提となるため、本プラン実行時点で指摘されていれば対応、なければスキップ

## 設計上の考慮点

- **二層構造（Markdown ソース ↔ TSX 転記版）の同時更新**: `docs/legal/REASONING.md` 61–66 行目で明文化されている運用ルールに従い、必ず Markdown と TSX を **同一コミット** 内で更新する。コミット前に `git diff docs/legal/privacy.md src/app/privacy/page.tsx` および `git diff docs/legal/terms.md src/app/terms/page.tsx` を目視確認し、文言の乖離がないことを保証する
- **連絡先のリンク化方針**: メールアドレスは `mailto:` リンク、外部フォームは新規タブ（`target="_blank" rel="noopener noreferrer"`）、内部フォーム（同サイト内）は既存パターンの `next/link` を使用する。これは `Footer.tsx` の既存実装パターンに合わせたもの
- **ドラフトバナーの削除に伴うレイアウト**: バナー削除によって `<article>` 直下の `<h1>` 上のマージン（バナーが持っていた `mb-6`）が失われるが、`<article>` 自体に `text-ink` のみで上マージンはなく、`<main>` の `py-10` が外側余白を担保しているため、`<h1>` 側に追加の `mt-*` を付与する必要は基本的にない。視覚確認で違和感があれば `<h1>` に `mt-2` 程度を付与するが、デフォルトでは無修正
- **法務指摘がない場合のスコープ最小化**: 受け入れ条件は (1) バナー削除 (2) 制定日確定 (3) 連絡先確定 (4) `REASONING.md` との整合 (5) 本番表示確認の 5 点。指摘がなければ変更 1〜10 と 12 のみで完結し、変更 11・13・14 はスキップ可能
- **「Issue #13 参照」の表記**: 本 Issue は #45 だが、ドラフト引用ブロックの内部参照は Issue #13（要否判断 Issue）を指しており、削除対象。`REASONING.md` の文中に残る #13 参照は履歴情報として保持する
- **CLAUDE.md / `.claude/rules/` の不在**: 本プロジェクトには `CLAUDE.md` も `.claude/rules/` も存在しない（確認済み）。コーディング規約は既存ファイル（特に `Footer.tsx`、`page.tsx` の双方）の Tailwind クラス命名・`text-ink` `text-accent` `border-line/60` 等のデザイントークン使用パターンを踏襲する
- **テスト・E2E への影響**: `e2e/golden-path.spec.ts` および `src/components/calculate/*.test.tsx` には privacy / terms / ドラフトバナー関連のアサーションは存在しないことを確認済み（`grep` 結果ヒットなし）。新規テストの追加は不要

## 検証方法

1. **静的検査**: 以下のコマンドを順に実行し、すべて成功することを確認する
   - `npm run lint`（ESLint 違反がないこと）
   - `npm run typecheck`（TypeScript 型エラーがないこと）
   - `npm run build`（Next.js 16 の静的エクスポート / プリレンダリングが成功すること。`/privacy` `/terms` の HTML 出力が `out/` 以下に生成される）
2. **既存ユニットテスト**: `npm run test` で全テストがパスすること（本変更でロジック改修はないため、リグレッションは想定されない）
3. **E2E（任意）**: 連絡先導線をフッターに追加した場合（変更 13 を実施した場合）のみ `npm run test:e2e` を実行し、`golden-path.spec.ts` がフッター変更でも通過することを確認
4. **ローカルでの目視確認**:
   - `npm run dev` を起動し、`http://localhost:3000/privacy` と `http://localhost:3000/terms` を開く
   - ドラフトバナーが消えていること
   - 制定日が確定日（`{{TBD-EFFECTIVE-DATE}}`）になっていること
   - プライバシー §6 の連絡先が `{{TBD-CONTACT-MODE}}` に応じた文言になっており、メール／フォームのリンクがクリックできること
   - フッターの「プライバシーポリシー」「利用規約」リンクが両ページから機能すること、必要に応じて「お問い合わせ」リンクが追加されていること
5. **整合性チェック**: `git diff` で以下の対応関係を目視確認
   - `docs/legal/privacy.md` ↔ `src/app/privacy/page.tsx`
   - `docs/legal/terms.md` ↔ `src/app/terms/page.tsx`
   - `docs/legal/REASONING.md` の「法務レビュー結果」節が更新されており、本文と矛盾しないこと（特に §5 Cookie 等の利用、§1 取得情報の Cloudflare Web Analytics に関する記述）
6. **本番デプロイ後の確認（受け入れ条件 5 の対応）**: マージ後、Cloudflare Pages の本番環境で `/privacy` `/terms` を再度開き、上記 4 と同等の確認を行う。これは PR マージ後の手動タスクとして PR 本文に明記する
