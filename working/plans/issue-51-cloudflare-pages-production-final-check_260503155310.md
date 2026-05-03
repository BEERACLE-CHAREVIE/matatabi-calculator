# 本番環境変数・Cloudflare Pages デプロイ最終確認 計画

## Context
本実装フェーズが完了し公開前の最終確認として、Cloudflare Pages の設定（環境変数 / 自動デプロイ / DNS / SSL/TLS / HSTS）が README に記載した運用方針と整合しているかを確認し、必要に応じて最小限のコード補完（`public/_headers` による HSTS 初期値の段階導入）を行う。本 Issue は「設定確認のみ」が原則で、コード改修は HSTS 段階導入のための `public/_headers` 追加のみとする。
GitHub Issue: #51

調査の結果、現状コード側は既に以下を満たしており、追加のコード改修は不要であることを確認した。

- `next.config.mjs`: `output: "export"`、`images.unoptimized: true` 設定済み（静的エクスポート → `out/` 出力）
- `src/app/site-metadata.ts`: `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roi.nekonimatatabi.com"` で本番フォールバック設定済み
- `src/app/layout.tsx`: `metadataBase: new URL(SITE_URL)` で OG / Twitter Card を絶対 URL 化、`NEXT_PUBLIC_CF_BEACON_TOKEN` 未設定時は `<Script>` を出力しない no-op フォールバック実装済み（14 / 86-92 行目）
- `src/lib/analytics.ts`: `isAnalyticsEnabled = Boolean(CF_BEACON_TOKEN)` による no-op 判定実装済み
- `src/app/robots.ts` / `src/app/sitemap.ts`: `force-static` で `SITE_URL` を絶対 URL として埋め込み済み
- `src/app/opengraph-image.png`: Next.js App Router の規約パスに OG 画像を配置済み（ビルド時 `metadataBase` により絶対 URL 化されることを `out/index.html` で確認）
- `out/` には `/`, `/calculate`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml` が静的生成されることを確認

ただし、**`public/_headers` ファイルが存在しない**ため、HSTS 初期値（`max-age=300`）の Response Header 付与をどう実現するかが論点になる。Cloudflare ダッシュボード側の Transform Rules / Security Headers で対応する案と、`public/_headers` をリポジトリ管理する案の二択。本計画では**リポジトリ管理（`public/_headers` 追加）を採用**する。理由は: (a) 設定が PR レビュー対象になり再現性が高い、(b) Cloudflare Pages は `public/_headers` を自動的に出力ルートにコピーしヘッダ適用する公式機能、(c) 段階引き上げ時も PR 単発で完結する。

## 変更対象ファイル

### 1. HSTS 初期値・基本セキュリティヘッダの段階導入用 `_headers` 追加
- **新規**: `public/_headers`
- **変更箇所**: 新規ファイル（Next.js は `public/` 配下を `out/` へそのままコピーするため、ビルド成果物 `out/_headers` として配置され、Cloudflare Pages がこれを認識する）
- **変更内容**: 全パス（`/*`）に対して以下のレスポンスヘッダを返すよう記述する。
  - `Strict-Transport-Security: max-age=300`（受け入れ条件「HSTS の初期値（`max-age=300`）が応答ヘッダに含まれる」を満たす最小値）
  - `X-Content-Type-Options: nosniff`（標準的な MIME スニフ防止。Cloudflare Pages 側で重複ヘッダにならないことを確認）
  - `Referrer-Policy: strict-origin-when-cross-origin`（プライバシー配慮の標準値）
  - `X-Frame-Options: SAMEORIGIN`（Cloudflare Web Analytics の挙動と整合）
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`（本サイトは利用しないため空許可）
  - 本ファイルにはコメントとして「初期値 max-age=300 / 1〜2 週間後に max-age=31536000; includeSubDomains へ昇格（別 Issue 化を検討）」を `#` 行で明記する
- **理由**: README §独自ドメイン運用方針および本 Issue の「HSTS 段階導入」要件を満たすため。`public/_headers` はリポジトリで設定管理することで PR レビュー可能になり、引き上げ時もコミット単発で完結する。Cloudflare Pages の仕様上、`out/_headers` としてビルド出力に存在すれば自動的に適用される。

### 2. README デプロイ節の補強（任意 / 確認結果が出た後で更新）
- **変更**: `README.md`
- **変更箇所**: 「独自ドメイン運用方針」段落の HSTS 行（133 行目付近）と、「Cloudflare Pages 側の設定値」表（106-114 行目付近）
- **変更内容**:
  - HSTS 行の脚注として「初期値は `public/_headers` で配信」を追記
  - Cloudflare ダッシュボード側で重複ヘッダを設定しない旨の注記を追加（`public/_headers` と Transform Rules の二重設定で `Strict-Transport-Security` が衝突するのを防ぐため）
- **理由**: 設定の責務分離（リポジトリ側 vs Cloudflare ダッシュボード側）を明確にし、後続の HSTS 引き上げ Issue や運用引き継ぎを容易にする。

注: README 改修は Issue 完了の必須要件ではない（受け入れ条件に含まれない）。実装時に Cloudflare 側設定との重複が発覚した場合のみ実施する。

## 設計上の考慮点

### `public/_headers` をリポジトリ管理する選択について
- **採用理由**: Cloudflare Pages 公式機能で、ビルド出力の `_headers` を自動認識する。Transform Rules を使う案より PR レビュー可能性が高く、段階引き上げ時の差分も最小。
- **注意点**: Cloudflare ダッシュボード側で同じヘッダを Transform Rules / HSTS UI で重複設定すると衝突する。Cloudflare の SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) UI は無効（`Disable HSTS` 状態）にしておき、`public/_headers` 一元管理する。
- **段階引き上げの運用**: 1〜2 週間の安定運用後、`public/_headers` 1 行を `max-age=31536000; includeSubDomains` に書き換える PR を別 Issue で作成。Preload 申請はさらに後段の別 Issue。

### 環境変数の Preview スコープ運用
- README §必須環境変数では Preview に「プレビュー用 `*.pages.dev` URL（プロジェクト固定 URL）」を設定する方針。本 Issue 本文では「`*.pages.dev` で動的に解釈される構成（または preview 用の固定値）」とあるため、**プロジェクト固定 URL**（例: `https://matatabi-calculator.pages.dev`）を Preview スコープに設定する。これによりプレビューデプロイで OG / canonical が固定 URL になる（個別 deployment URL に追従しないが、SEO 影響は無いプレビュー環境のため許容）。
- `NEXT_PUBLIC_CF_BEACON_TOKEN` は Production スコープのみ。Preview は未設定とすることで `src/app/layout.tsx` の `<Script>` が出力されず、`src/lib/analytics.ts` の `isAnalyticsEnabled` も `false` になる。

### コード変更を最小化する原則
- 本 Issue は確認主体のため、`_headers` 追加以外のコード改修は行わない。OG 画像の絶対 URL 化、`metadataBase`、`force-static` 設定は既に完了済み。

## 検証方法

検証は「(A) Cloudflare ダッシュボード側設定確認」「(B) コード変更（`_headers`）」「(C) デプロイ後の動作確認」の 3 段階で実施する。

### A. Cloudflare ダッシュボード設定の事前確認（コード改修不要）
1. **Pages プロジェクト設定** → Settings → Builds & deployments
   - Production branch = `main`、Build command = `npm run build`、Build output directory = `out`、`NODE_VERSION=20` であることを確認
2. **環境変数（Settings → Environment variables）**
   - Production スコープ:
     - `NEXT_PUBLIC_SITE_URL = https://roi.nekonimatatabi.com`
     - `NEXT_PUBLIC_CF_BEACON_TOKEN = <Web Analytics で発行された token>`
   - Preview スコープ:
     - `NEXT_PUBLIC_SITE_URL = https://matatabi-calculator.pages.dev`（プロジェクト固定 URL）
     - `NEXT_PUBLIC_CF_BEACON_TOKEN` は **未設定**であること
3. **DNS（Cloudflare DNS タブ）**
   - `roi.nekonimatatabi.com` が Pages プロジェクトを指す CNAME（Proxied = ON）であること
4. **SSL/TLS（SSL/TLS タブ）**
   - SSL/TLS encryption mode = **Full (strict)**
   - Edge Certificates → Always Use HTTPS = On / Automatic HTTPS Rewrites = On / Minimum TLS Version = 1.2
   - HSTS UI は **Disable**（`public/_headers` 一元管理のため）
5. **Pages → Custom domains**
   - `roi.nekonimatatabi.com` がアクティブで証明書発行済みであること

### B. `public/_headers` 追加 PR の検証
6. ブランチを切り `public/_headers` を追加 → push し PR（`develop` ベース）を作成
7. Cloudflare Pages の自動 Preview ビルドが完走し、Preview URL が発行されることを確認（受け入れ条件「feature ブランチでの preview URL が発行され、機能が動作する」）
8. Preview URL に対して以下を `curl -I` で実行し、`Strict-Transport-Security: max-age=300` が付与されていること、`X-Content-Type-Options` 等の他ヘッダが期待値であることを確認
9. `develop` → `main` への PR / マージで本番デプロイが起動することを確認（受け入れ条件「`main` への push で本番デプロイが完走する」）

### C. 本番デプロイ後の動作確認
10. **HTTPS 接続確認**: ブラウザで `https://roi.nekonimatatabi.com/` を開き、証明書が有効でエラーが出ないこと
11. **主要ページ 200 確認**（受け入れ条件「主要ページがすべて 200 で返る」）
    ```
    curl -sI https://roi.nekonimatatabi.com/
    curl -sI https://roi.nekonimatatabi.com/calculate
    curl -sI https://roi.nekonimatatabi.com/privacy
    curl -sI https://roi.nekonimatatabi.com/terms
    curl -sI https://roi.nekonimatatabi.com/robots.txt
    curl -sI https://roi.nekonimatatabi.com/sitemap.xml
    ```
    すべて `HTTP/2 200` を返すことを確認
12. **HSTS ヘッダ確認**: 上記 `curl -I` の各レスポンスに `strict-transport-security: max-age=300` が含まれることを確認（受け入れ条件「HSTS の初期値（`max-age=300`）が応答ヘッダに含まれる」）
13. **OG 画像 絶対 URL 確認**:
    ```
    curl -s https://roi.nekonimatatabi.com/ | grep -oE 'og:image[^"]*"[^"]+"'
    ```
    `https://roi.nekonimatatabi.com/opengraph-image.png?...` の絶対 URL が出力されること、および `curl -I https://roi.nekonimatatabi.com/opengraph-image.png?...` が `HTTP/2 200` を返すことを確認
14. **Cloudflare Web Analytics PV 確認**: 本番ページを 1〜2 PV 訪問した後、Cloudflare ダッシュボード → Web Analytics で `roi.nekonimatatabi.com` のページビューが 5〜30 分以内に計測表示されることを確認
15. **HTML への beacon 埋込確認**: 本番 HTML レスポンスに `static.cloudflareinsights.com/beacon.min.js` への `<script>` が含まれること、Preview URL のレスポンスには**含まれない**ことを確認（環境変数スコープ分離の動作確認）
16. **redirect 動作確認**: `curl -I http://roi.nekonimatatabi.com/` が `301 → https://...` を返すことを確認（Always Use HTTPS）

### D. Issue への記録
17. 上記 1〜16 の確認結果（チェックリスト形式）と `curl -I` の出力ハイライトを Issue #51 のコメントとして投稿（受け入れ条件「確認結果が Issue コメントに記録されている」）
