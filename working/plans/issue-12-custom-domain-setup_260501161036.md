# Issue #12 実装プラン — 独自ドメインを Cloudflare Pages に接続する

## Context

本リポジトリ（`matatabi-calculator`）は Issue #11 で Cloudflare Pages との GitHub 連携と静的エクスポート（`output: 'export'` → `out/`）を確立済み（develop 最新コミット `eca6078`）。本番／プレビュー環境変数 `NEXT_PUBLIC_SITE_URL` の運用ルールも README に明文化されており、現状は Cloudflare Pages が発行する暫定 `*.pages.dev` URL を本番値として使用している状態にある。

本 Issue #12 はフェーズ3「インフラ／デプロイ」の仕上げとして、**独自ドメインを Cloudflare DNS に登録し、Cloudflare Pages のカスタムドメインとして接続、HTTPS で安定アクセスできる状態を作る**ことが目的である。マスター設計書（`.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §2.3）でも「Domain: Cloudflare にて管理（SSL/TLS の標準装備）」と明記されており、Cloudflare 一気通貫の前提は確定済みである。

ただし本 Issue 着手時点で **使用ドメインが未確定**（リポジトリ・ドキュメント・spec を全文検索しても具体的なドメイン文字列の記載は無く、`src/app/layout.tsx` のフォールバックも `https://matatabi-calculator.example` というプレースホルダ）であり、また **SSL/TLS モードの方針も未確定**（Cloudflare ダッシュボード側の Default 値はゾーンによって変わる）。

そのため本プランでは:

1. **意思決定 M0**（使用ドメインと SSL/TLS モードの確定）を先頭に置き、ステークホルダー判断を必須項目として明記
2. **ユーザー手動作業**（Cloudflare ダッシュボードでの DNS / カスタムドメイン / SSL 設定）と **リポジトリ側変更**（環境変数・README・`metadataBase` フォールバック）を厳格に分離
3. **リポジトリ側変更はドメイン確定後の最小更新に絞る**方針とし、実装の重い変更（`public/robots.txt` / `public/sitemap.xml` 整備、HSTS Preload 申請、Search Console 登録など）は後続 Issue へ送る

を取る。Cloudflare Pages のダッシュボード作業が中心であり、リポジトリ側 diff は数行〜十数行に収まる見込み。

GitHub Issue: #12

---

## 設計上の考慮点

### A. 使用ドメインの選定（M0 で確定する事項）

調査結果として、リポジトリ・spec・マスター設計書・README いずれにも **具体的な独自ドメイン文字列の記載は無い**。確認した参照箇所:

| 参照元 | 記載内容 | 判定 |
|---|---|---|
| `src/app/layout.tsx:20` | `process.env.NEXT_PUBLIC_SITE_URL ?? "https://matatabi-calculator.example"` | プレースホルダ。実ドメインのヒントなし |
| `README.md` 「必須環境変数」節 | 「本番ドメイン確定までは Cloudflare Pages が発行する `*.pages.dev` URL を暫定値として設定」 | 本 Issue で確定する旨が明記済み |
| マスター設計書 §2.3 | 「Domain: Cloudflare にて管理」 | 管理元の指定のみ |
| `.claude/issue-order.md` #12 | 「Cloudflare DNS、SSL/TLS モード (Full等) の方針確定と適用」 | タスク列挙のみ |

したがって **本プランは具体ドメインを推測しない**。ステークホルダー（株式会社ねこにまたたびのドメイン管理者）からの指定を受けて確定する。候補となり得るドメイン形態の **例（プレースホルダ）** は次の通り:

- **Apex を本番にするケース**: `matatabi.example.com`（コーポレート配下サブドメイン運用）／ `matatabi-calculator.com`（製品独自ドメイン）など
- **www を本番にするケース**: `www.matatabi.example.com`（リダイレクト元として apex も保持）

> 上記はあくまで M0 の議論時に並べる候補形態の例であり、実ドメインの推測は行わない。

### B. SSL/TLS モードの選定（Cloudflare Pages × カスタムドメイン）

Cloudflare の SSL/TLS モードは「ブラウザ ↔ Cloudflare」と「Cloudflare ↔ オリジン」の二段で証明書を扱う。Cloudflare Pages を利用する場合、**「オリジン」は Cloudflare の内部インフラ（Pages の Edge ネットワーク）**であり、外部の自前サーバではない。各モードの適合性:

| モード | ブラウザ ↔ CF | CF ↔ オリジン | Cloudflare Pages での適合性 | 採否 |
|---|---|---|---|---|
| **Off** | HTTP のみ | — | HTTPS を強制できない。Issue 本文「HTTPS アクセスの最終確認」を満たせない | 不可 |
| **Flexible** | HTTPS | HTTP（暗号化なし） | Pages のオリジン到達が HTTP 化されるため Mixed Content / Redirect Loop の典型ケース。**Cloudflare Pages では非推奨** | 不可 |
| **Full** | HTTPS | HTTPS（証明書検証なし） | Pages 側は有効な証明書を返すので動作するが、検証スキップは余計なリスク | 非推奨 |
| **Full (strict)** | HTTPS | HTTPS（証明書検証あり） | Cloudflare Pages は信頼できる証明書を返すため検証が必ず通る。**最も推奨** | **採用** |

**推奨方針**: **Full (strict)** を採用する。Cloudflare Pages は `.pages.dev` および接続したカスタムドメインに対して Cloudflare 管理の有効な証明書を提供するため、`Full (strict)` で問題なく動作し、かつ最も安全側に倒せる。

> 注: Cloudflare Dashboard の SSL/TLS モード設定は **ゾーン単位**であり、ゾーン内に既存サイト（自前オリジン）が同居している場合は影響範囲を確認したうえで適用する。Pages 専用の新規ゾーンであれば即適用可。

### C. Apex ドメインと www サブドメインの DNS レコード設計

Cloudflare Pages にカスタムドメインを接続する際、**Apex（`example.com`）** と **www サブドメイン（`www.example.com`）** で必要なレコード種別が異なる。Cloudflare では以下を使い分ける:

| ホスト | 採用レコード | 補足 |
|---|---|---|
| **Apex（`example.com`）** | **CNAME → `<project>.pages.dev`**（Cloudflare の **CNAME flattening** が自動で apex に CNAME を許容） | DNS 仕様上 apex に CNAME は不可だが、Cloudflare はゾーン APEX で CNAME を保存し、解決時に A/AAAA に展開してくれる。代替として A/AAAA を直接登録する案もあるが、Pages の Edge IP は将来変動するため CNAME 方式を推奨 |
| **www（`www.example.com`）** | **CNAME → `<project>.pages.dev`** | サブドメインなので素直に CNAME |

**「正規」の方向性**（どちらを公式 URL にするか）の選択肢:

- **(P1) Apex を正規** （`example.com`）: 短く覚えやすい。`www.example.com` は 301 リダイレクトでレガシーアクセス受け
- **(P2) www を正規** （`www.example.com`）: 古典的運用。CDN 切替や CORS 制約に強い。`example.com` は 301 リダイレクト元

**推奨**: 本プロジェクトは静的サイトかつ Cloudflare Pages 一気通貫であり、CDN 切替や CORS の懸念がないため **(P1) Apex を正規** を推奨。ただし最終決定は M0 で確定する。

#### Cloudflare Pages 側のカスタムドメイン登録挙動

Pages プロジェクトの「Custom domains」に `example.com` と `www.example.com` の両方を追加できる。**両方追加した場合、どちらでアクセスしても 200 を返す**（リダイレクトは設定しない限り発生しない）。「片方を正規にしてもう片方を 301 する」ためには **Bulk Redirect / Single Redirect ルール**（Cloudflare → Rules → Redirect Rules）を別途設定する必要がある。

### D. リダイレクト設計（M0 の決定に基づく）

(P1) Apex を正規とする場合の Single Redirect Rule 例:

- **マッチ条件**: `Hostname equals www.example.com`
- **アクション**: `Dynamic redirect` → `concat("https://example.com", http.request.uri.path)` / Status `301` / `Preserve query string: ON`

(P2) www を正規とする場合は逆向きに同等のルールを 1 本入れる。

### E. HSTS（HTTP Strict Transport Security）の取り扱い

Cloudflare の SSL/TLS → Edge Certificates → HSTS で有効化できる。**初回ローンチ時は短い `max-age`（例: 300 秒〜1日）で開始**し、リダイレクトループや証明書事故が起きないことを 1〜2 週間観察してから本格運用 `max-age=31536000` + `includeSubDomains` に引き上げる、という段階導入が安全。**`preload` フラグ送信および hstspreload.org への申請は本 Issue では行わない**（後続 Issue で扱う）。

### F. Cloudflare Pages の `Always Use HTTPS` 設定

ゾーンの SSL/TLS → Edge Certificates → **Always Use HTTPS = On** を有効化することで、HTTP → HTTPS の自動 301 を Cloudflare Edge が肩代わりする。Pages 側の自前リダイレクト設定は不要になる。

### G. リポジトリ側変更を最小化する方針

ドメイン確定後にリポジトリ側で確実に必要となる変更は、現状の調査範囲で次の 3 点に集約される:

1. **Cloudflare Pages の Production / Preview の `NEXT_PUBLIC_SITE_URL` 環境変数を実ドメインに更新**（ダッシュボード作業。リポジトリ側の `.env*` を作る必要はない）
2. **`src/app/layout.tsx` の `metadataBase` フォールバック値**（`"https://matatabi-calculator.example"`）を実ドメインに置換
3. **`README.md` 「デプロイ」節および「必須環境変数」節**の暫定 URL 記述を実ドメインに更新

`public/robots.txt` / `public/sitemap.xml` の整備、`<link rel="canonical">` の出力、Google Search Console 登録、HSTS Preload 申請、`_redirects` ファイル運用などは **本 Issue の必須スコープ外** とし、後続の SEO/運用 Issue（未起票）で扱う。

> 本 Issue 完了時点ではドメイン未確定リスクが残り得る。**ドメインが M0 で確定しなかった場合は、本 Issue ではダッシュボード作業のみ進めず、リポジトリ側変更も含めて完全停止し、ドメイン確定を別 Issue（または本 Issue の延期）で追跡する**ことを推奨。

### H. スコープ外（明示）

| 項目 | 理由・送り先 |
|---|---|
| `public/robots.txt` の追加 | 静的サイトの SEO 整備として別 Issue。本 Issue ではドメイン到達性確認に集中 |
| `public/sitemap.xml` の追加 | 同上。Next.js 14 App Router では `app/sitemap.ts` 動的生成も選択肢があり、設計判断を要する |
| Google Search Console / Bing Webmaster Tools 登録 | アクセス解析 Issue #14 と並走で別途 |
| HSTS Preload リスト申請（hstspreload.org） | 本 Issue 完了後 1〜2 週間の安定運用を経てから別 Issue で |
| `<link rel="canonical">` の Next.js metadata 経由出力 | SEO 整備 Issue で扱う |
| メールホスティング（MX レコード）整備 | 本サービスはメール送受信を行わないため不要。要件発生時に別 Issue |
| Cloudflare Access による preview URL の認証保護 | 運用方針判断を要するため別 Issue |
| ドメインのレジストラ側 NS レコード変更（外部レジストラから Cloudflare DNS へ移管する場合） | 既に Cloudflare DNS 管理下にある前提。レジストラ移管が必要な場合は前提タスクとして M0 で別行に切り出す |

---

## 変更対象ファイル

> ## 凡例
> 本 Issue は **「意思決定（M0）」** → **「ユーザーが Cloudflare ダッシュボードで実施する作業（M1〜M4）」** → **「リポジトリで実施するコード／設定変更（1〜3）」** の 3 段構成。M0 が確定しない限り M1 以降は着手しない。リポジトリ側変更（1〜3）は M2 までのダッシュボード作業が成功してから着手する。

### M0. 【意思決定】使用ドメインと SSL/TLS モードを確定する

- **作業者**: ステークホルダー（ドメイン管理者 + プロダクトオーナー）
- **場所**: チーム内の合意プロセス（Issue #12 のコメントスレッド、または別途のミーティング）
- **手順**:
  1. **使用ドメインの確定**:
     - Apex / www のいずれを本番（正規）として運用するか
     - 候補: `<corporate-zone>.<tld>` 配下のサブドメイン運用（例: `matatabi.<corporate-zone>.<tld>`）／製品専用の独自ドメイン取得（例: `<product-name>.<tld>`）
     - 既存 Cloudflare アカウント内に該当ゾーンが存在するか、無ければレジストラ側 NS 切替が必要かを確認
  2. **SSL/TLS モードの確定**: §設計上の考慮点 B の表に基づき **Full (strict)** を選定。同ゾーンに他サイトが同居している場合は既存サイトへの影響範囲を確認
  3. **正規ホストの確定**: §設計上の考慮点 D に従い、Apex 正規（推奨）／www 正規 のどちらかを決定
  4. **HSTS 段階導入の合意**: §設計上の考慮点 E の段階導入（短 max-age → 長 max-age）方針を承認
  5. 決定内容を Issue #12 のコメントに次の形式で記録:
     - 採用ドメイン: `<実ドメイン>`
     - 正規ホスト: `apex` / `www`
     - SSL/TLS モード: `Full (strict)`
     - HSTS 初期 `max-age`: `<秒数>`
- **完了条件**: 上記 4 項目が Issue コメントに残ること。**M0 が未完の場合 M1 以降に進まない**
- **理由**: ドメイン名と SSL/TLS モードはリポジトリ側からは決められない判断であり、ステークホルダー合意が前提。本 Issue が「ダッシュボード作業」と「リポジトリ側変更」のいずれにも先行する意思決定ゲート

### M1. 【ユーザー手動作業】Cloudflare DNS にレコードを追加する

- **作業者**: Cloudflare アカウントのドメイン管理者
- **場所**: Cloudflare ダッシュボード → 該当ゾーン → DNS → Records
- **前提**: M0 完了。当該ドメインのゾーンが Cloudflare DNS 管理下に存在すること（外部レジストラ管理下なら NS 切替が事前に必要）
- **手順**:
  1. **Apex を本番にする場合**:
     - Type: `CNAME` / Name: `@`（Apex） / Target: `<project>.pages.dev` / Proxy status: **Proxied（オレンジ雲）**
     - Cloudflare の CNAME flattening が自動で適用される
     - 併設: Type: `CNAME` / Name: `www` / Target: `<project>.pages.dev` / Proxy: **Proxied**
  2. **www を本番にする場合**:
     - Type: `CNAME` / Name: `www` / Target: `<project>.pages.dev` / Proxy: **Proxied**
     - 併設: Type: `CNAME` / Name: `@` / Target: `<project>.pages.dev` / Proxy: **Proxied**（apex → www の Redirect Rule を別途設定するため、apex も Pages に向ける）
  3. すべて Proxied 状態（オレンジ雲）になっていることを目視確認。Proxy が Off だと Cloudflare の SSL/TLS / WAF / リダイレクトルールが適用されない
- **理由**: Issue 本文タスク「Cloudflare DNS にレコード追加」を実施する手順。CNAME flattening と Proxied 必須は Cloudflare Pages の標準パターン

### M2. 【ユーザー手動作業】Cloudflare Pages にカスタムドメインを接続する

- **作業者**: Cloudflare アカウント保有者
- **場所**: Cloudflare ダッシュボード → Workers & Pages → `matatabi-calculator` プロジェクト → Custom domains
- **手順**:
  1. **Set up a custom domain** をクリックし、Apex（例: `example.com`）を入力 → 接続。Cloudflare が DNS の整合を検出して即時に発行を試みる
  2. 同じ手順で www（例: `www.example.com`）も追加
  3. 両エントリのステータスが **Active** になり、`Initializing certificate...` → `Active` まで遷移することを確認（通常数分以内）
  4. Pages のデプロイは再キックされない（DNS のみの変更）。既存 Production デプロイの成果物がそのまま新ドメインで配信される
- **理由**: Issue 本文タスク「Cloudflare Pages にカスタムドメインを接続」を実施。証明書発行は Cloudflare 側が自動処理

### M3. 【ユーザー手動作業】SSL/TLS モードと HTTPS 強制 / リダイレクトルールを適用する

- **作業者**: Cloudflare アカウント保有者
- **場所**: Cloudflare ダッシュボード → 該当ゾーン
- **手順**:
  1. **SSL/TLS → Overview**: 暗号化モードを **Full (strict)** に設定（M0 で確定済みの方針）
  2. **SSL/TLS → Edge Certificates**:
     - **Always Use HTTPS = On**（HTTP → HTTPS 自動 301）
     - **Automatic HTTPS Rewrites = On**（Mixed Content 防止）
     - **Minimum TLS Version = 1.2**（推奨）
     - **HSTS**: M0 で合意した初期 `max-age`（例: 300 秒）で **Enable**。`Apply HSTS to subdomains` / `Preload` は **段階導入のため初期は Off**
  3. **Rules → Redirect Rules → Create rule**（M0 で決定した正規ホストに従って 1 本作成）:
     - 正規が apex の場合: `Hostname equals www.example.com` → `Dynamic redirect` `concat("https://example.com", http.request.uri.path)` / 301 / Preserve query string On
     - 正規が www の場合: `Hostname equals example.com` → `concat("https://www.example.com", http.request.uri.path)` / 301 / Preserve query string On
- **理由**: Issue 本文タスク「SSL/TLS モード（Full 等）の方針確定と適用」「HTTPS アクセスの最終確認」を成立させるための前提整備

### M4. 【ユーザー手動作業】Cloudflare Pages の `NEXT_PUBLIC_SITE_URL` 環境変数を実ドメインに更新する

- **作業者**: Cloudflare アカウント保有者
- **場所**: Cloudflare ダッシュボード → Pages プロジェクト `matatabi-calculator` → Settings → Environment variables
- **手順**:
  1. **Production** の `NEXT_PUBLIC_SITE_URL` を `https://<正規ホスト>`（M0 確定値、末尾スラッシュなし）に更新
  2. **Preview** の `NEXT_PUBLIC_SITE_URL` は方針判断:
     - **(推奨)** プレビュー固定 URL（`<project>.pages.dev`）または `<branch>.<project>.pages.dev` 形式の暫定値のまま据え置き。プレビューで OG 画像生成等を行わないなら影響なし
     - 必要なら別ステージング用サブドメイン（例: `staging.example.com`）を取得して同様に DNS / カスタムドメイン接続を行う（**本 Issue ではスコープ外。別 Issue で**）
  3. 環境変数更新後、**手動で再デプロイをトリガ**して `metadataBase` の値を反映（Pages の env 変更だけでは再ビルドされない仕様のため）。Deployments → 最新 Production デプロイ → **Retry deployment**
- **理由**: `src/app/layout.tsx` の `metadataBase` がビルド時に `process.env.NEXT_PUBLIC_SITE_URL` を読むため、env 更新後に再ビルドが必要。これにより本番 URL の OG / Twitter Card の絶対 URL が正しく解決される

---

### 1. `src/app/layout.tsx` の `metadataBase` フォールバック値を実ドメインに更新する

- **変更**: `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- **変更箇所**: 19–20 行目
- **変更内容**:
  - 現状の `process.env.NEXT_PUBLIC_SITE_URL ?? "https://matatabi-calculator.example"` のフォールバック文字列 `"https://matatabi-calculator.example"` を **M0 で確定した実ドメインの正規 URL**（例: `"https://<実ドメイン>"`）に置換
  - 末尾スラッシュは付けない（`new URL()` は付与してもしなくても許容するが、リポジトリ全体の表記は無しで統一）
- **理由**: 環境変数未設定時のフォールバック先が架空ドメインのままだと、ローカルビルドや CI 上で意図せず誤った OG / Twitter Card URL が生成される。Cloudflare Pages 側で env 設定漏れがあった場合の保険にもなる。**本変更は M0 確定が前提**であり、未確定時はこの変更を含めず Issue を分割する

### 2. `README.md` の「デプロイ」節と「必須環境変数」節を実ドメインで埋める

- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**:
  - 「必須環境変数」節（71–76 行目）の Production 行
  - 必要に応じて「デプロイ」節（52–69 行目）の冒頭に独自ドメインへの言及を追記
- **変更内容**:
  1. 「必須環境変数」節の Production 行（現在「本番ドメイン確定までは Cloudflare Pages が発行する `*.pages.dev` URL を暫定値として設定」）を、**実ドメインを記載した恒久版**に置換:
     - Production: `https://<実ドメイン>`（Issue #12 で確定）
     - Preview: 既存の `*.pages.dev` 表記を維持（変更不要）
  2. 「デプロイ」節の冒頭または末尾に、独自ドメイン運用方針の 1 段落を追記:
     - 正規ホスト（Apex / www のどちらか）と、もう一方からの 301 リダイレクト
     - SSL/TLS モード = Full (strict)、Always Use HTTPS = On、HSTS 適用済み の旨
     - 詳細な Cloudflare ダッシュボード設定値は本プラン（または Issue #12 のコメント）参照、と一行で誘導
- **理由**: Issue #11 で導入した README の「本番ドメイン確定までは暫定 URL」記述は本 Issue #12 で解消するアンカーであり、Issue クローズと同時に確定値で書き換えるのが筋。後続オンボーディングでの混乱防止

### 3. `public/robots.txt` / `public/sitemap.xml` の要否判定（本 Issue ではファイル追加しない）

- **変更**: 行わない（`/Users/YS/development/matatabi-calculator/public/` 配下にファイルを追加しない）
- **対応内容**:
  - 本 Issue では **判定のみ** を PR 本文 / Issue コメントに記録:
    - **判定**: 本サービスは公開予定の単一ページアプリであり、現状 `app/page.tsx` 1 枚構成。`robots.txt` / `sitemap.xml` の整備は SEO 整備の文脈で行うべきであり、独自ドメイン接続そのものには必須ではない
    - **送り先**: 別 Issue（未起票。フェーズ4 周辺のフォローアップ Issue として「SEO 基本整備」のような名前で起票検討）
  - もしステークホルダーが Search Console 登録を本 Issue の一部としたい場合は、Search Console の所有権確認方法（Cloudflare DNS の TXT レコード方式が容易）の追加 M ステップを足してから判断する
- **理由**: Issue #12 のスコープ（DNS 設定 / カスタムドメイン接続 / SSL / HTTPS 確認）に SEO 整備は含まれていない。スコープ膨張防止と段階リリースの観点から、本 Issue では判定の記録のみで十分

---

## 検証方法

> 検証は **「DNS と TLS 終端」** → **「リダイレクト挙動」** → **「アプリ反映」** → **「外形監視」** の順で実施する。

### 1. DNS 解決と Proxied 状態の確認

1. ローカル環境から `dig <実ドメイン> +short` を実行し、Cloudflare のエッジ IP（`104.x.x.x` / `172.67.x.x` 等の Cloudflare レンジ、または同等の IPv6）が返ること
2. `dig www.<実ドメイン> +short` も同様に Cloudflare レンジを返すこと
3. Cloudflare ダッシュボード → DNS で対象レコードがすべて **Proxied（オレンジ雲）** であること
4. （オプション）`dig +trace <実ドメイン>` で NS が Cloudflare（`*.ns.cloudflare.com`）に向いていること

### 2. HTTPS 接続と証明書チェーンの確認

1. `curl -I https://<実ドメイン>/` で HTTP/2 200、`server: cloudflare`、`content-type: text/html` を確認
2. `curl -I http://<実ドメイン>/` で 301 / `location: https://<実ドメイン>/` を確認（Always Use HTTPS が効いていること）
3. `openssl s_client -connect <実ドメイン>:443 -servername <実ドメイン> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates` で証明書 Subject / Issuer（Cloudflare の中間 CA）/ 有効期限を確認
4. **SSL Labs** （`https://www.ssllabs.com/ssltest/analyze.html?d=<実ドメイン>`）で **Grade A 以上** を確認。Full (strict) + TLS 1.2 以上 + HSTS が反映されていること
5. `www.<実ドメイン>` についても同様に 1〜4 を実施

### 3. Apex / www のリダイレクト挙動確認

1. M0 で「Apex 正規」とした場合:
   - `curl -I https://www.<実ドメイン>/` → 301 + `location: https://<実ドメイン>/`
   - `curl -I https://www.<実ドメイン>/?utm_source=test` → 301 + `location: https://<実ドメイン>/?utm_source=test`（**Preserve query string** が効いていること）
2. M0 で「www 正規」とした場合は逆向きで同様の確認
3. 末尾スラッシュ／パスありのケース（例: `/foo`）でもリダイレクトが期待ドメインへ向くこと
4. リダイレクトループ（302/301 の繰り返し）が発生しないこと（`curl -IL` で 1 回の 301 を経て 200 に到達）

### 4. アプリ動作と `metadataBase` 反映確認

1. `https://<実ドメイン>/` をブラウザで開き、アプリが正常表示されること（`<title>またたび計算機</title>`）
2. ページソースの `<head>` 内に以下が含まれること:
   - `<meta property="og:url" content="https://<実ドメイン>/">` または相対 `/` が `metadataBase` で解決された絶対 URL になっていること
   - `<meta property="og:site_name" content="またたび計算機">`
   - `<meta name="twitter:card" content="summary_large_image">`
3. `<link rel="icon">` が解決され 200 を返すこと（既存 Issue #9 の素材が引き続き機能）
4. DevTools Network タブで `/_next/static/...` のチャンクがすべて 200 / `application/javascript` を返すこと
5. **OG 画像のキャッシュ更新確認**: Facebook Sharing Debugger（`https://developers.facebook.com/tools/debug/`）と Twitter Card Validator で実ドメイン URL を検証し、新ドメイン基準の OG プレビューが取得できること（任意）

### 5. HSTS の段階運用検証

1. `curl -I https://<実ドメイン>/` のレスポンスヘッダに `strict-transport-security: max-age=<M0で決めた秒数>` が含まれること
2. 1〜2 週間運用したのち、リダイレクトループ・証明書事故が発生していないことを Cloudflare Analytics / Real User Monitoring で確認
3. 安定確認後、別 Issue で `max-age=31536000; includeSubDomains` への引き上げと（必要なら）`preload` 申請を扱う

### 6. SEO / Search Console（言及のみ・本 Issue 必須範囲外）

- Google Search Console 登録、`sitemap.xml` 作成、`robots.txt` 作成は **別 Issue で扱う**（本プラン §設計上の考慮点 H）
- 本 Issue 完了時点で Search Console 登録を希望する場合は、Cloudflare DNS の TXT レコード追加方式（M1 と同じ画面で完結）が最短。希望があれば本 Issue M ステップを 1 つ追加する判断を M0 段階で確定すること

### 7. ロールバック手順（万一の備え）

- **DNS が解決しない／証明書発行が失敗する**: Cloudflare Pages → Custom domains で当該エントリを削除、DNS レコードも削除して `*.pages.dev` 運用に戻し、原因切り分け
- **リダイレクトループ**: Rules → Redirect Rules を一時無効化、Always Use HTTPS の併用と矛盾していないかを確認
- **Mixed Content / 表示崩れ**: Automatic HTTPS Rewrites が Off になっていないか、`metadataBase` の env が古い値のままになっていないかを確認、再デプロイ
- **HSTS の事故**: HSTS は短 `max-age` 段階運用のため、設定 Off 後に既設定 `max-age` の経過を待てば自動失効する（preload 未申請なら復旧可能）
