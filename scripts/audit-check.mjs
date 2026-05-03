// 設計根拠: docs/security/jspdf-vulnerabilities.md §6.2 (α)
// 関連 Issue: #67（audit-level critical → high 引き上げ）
//
// 概要:
//   `npm audit --json` の出力を解析し、severity が critical / high の advisory のうち、
//   `ALLOWED_GHSA_IDS` に列挙された「到達不能と判定済み」のものを除外したうえで、
//   残存件数が 1 件以上なら exit code 1 で赤化する。
//
// 設計上の注意:
//   - Node 標準 API のみで完結する ESM スクリプトとして実装する（追加依存を避けるため）。
//   - `npm audit` は脆弱性検知時に exit code 1 を返すが、本スクリプトでは exit code を
//     無視し、stdout JSON のみを解析する（`vulnerabilities` キーは exit code に関係なく出力される）。
//   - severity フィルタは本スクリプト側で行う（`npm audit --audit-level` は最終 exit code 判定に
//     しか作用しないため、JSON 出力には全 severity が含まれる前提で扱う）。
//
// 除外リスト変更時のガバナンス:
//   `ALLOWED_GHSA_IDS` への追加・削除は `docs/security/jspdf-vulnerabilities.md §2` の
//   到達経路分析と §6.2 / §6.5 の運用方針を必ず再評価すること。許可リストを「単なる無視リスト」
//   に堕ちさせないために、各エントリにコメントで §2.X への参照を明記する。

import { spawnSync } from "node:child_process";

// 到達不能と判定済みの既知 advisory（docs/security/jspdf-vulnerabilities.md §2 / §6.5）。
// 実測時点で残存しているものを列挙する。新規 advisory 追加時は §2 の到達経路分析を必ず更新すること。
const ALLOWED_GHSA_IDS = new Set([
  // §2.1: jspdf Path Traversal — pdf.save() の filename は buildPdfFilename() のテンプレート生成。到達不能。
  "GHSA-f8cm-6447-x5h2",
  // §2.2: jspdf ReDoS / DoS — 攻撃者制御文字列が jspdf の正規表現／処理経路に到達する経路なし。到達不能。
  "GHSA-w532-jxjh-hjhj",
  "GHSA-8mvj-3j78-4qmw",
  // §2.4: 以下は Issue #67 着手時点で §1 表に未掲載だった jspdf 高位 advisory。
  //       いずれも本アプリで未使用の jspdf API（AcroForm / addJS / BMP・GIF デコーダ /
  //       new window paths / FreeText 等）に紐づき、§2.4 で到達不能と判定済み。
  "GHSA-pqxr-3g65-p328", // PDF Injection in AcroFormChoiceField（AcroForm 未使用）
  "GHSA-95fx-jjr5-f39c", // BMP DoS in BMPDecoder（PNG 経路のみ使用）
  "GHSA-9vjf-qc39-jprp", // PDF Object Injection via addJS Method（addJS 未使用）
  "GHSA-67pg-wm7f-q7fj", // GIF DoS（GIF 経路未使用）
  "GHSA-p5xg-68wr-hm3m", // AcroForm RadioButton PDF Injection（AcroForm 未使用）
  "GHSA-7x6v-j9x4-qf24", // PDF Object Injection via FreeText color（FreeText 注釈未使用）
  "GHSA-wfv2-pwc8-crg5", // HTML Injection in New Window paths（pdf.html() / openWindow 未使用）
]);

const GHSA_ID_RE = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i;

// `npm audit --json` では `via[].url` に GitHub Advisory URL が必ず入る。
// `via[].source` は数値（advisory ID 整数）のため GHSA-ID 抽出には使わない。
export function extractGhsaId(via) {
  if (!via || typeof via !== "object") return null;
  if (typeof via.url !== "string") return null;
  const m = via.url.match(GHSA_ID_RE);
  return m ? m[0] : null;
}

function runNpmAudit() {
  const result = spawnSync("npm", ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    console.error("Failed to spawn `npm audit`:", result.error);
    process.exit(2);
  }
  if (!result.stdout || result.stdout.length === 0) {
    console.error("`npm audit --json` returned empty stdout. stderr:");
    console.error(result.stderr ?? "(empty)");
    process.exit(2);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.error("Failed to parse `npm audit --json` output:", e);
    console.error("stdout (head):", result.stdout.slice(0, 500));
    process.exit(2);
  }
}

export function collectAdvisories(report) {
  const vulnerabilities = report?.vulnerabilities ?? {};
  const advisories = [];
  const seen = new Set();
  for (const [pkgName, info] of Object.entries(vulnerabilities)) {
    const viaList = Array.isArray(info?.via) ? info.via : [];
    for (const via of viaList) {
      if (typeof via !== "object" || via === null) continue;
      const ghsaId = extractGhsaId(via);
      if (!ghsaId) continue;
      const key = `${pkgName}|${ghsaId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      advisories.push({
        package: pkgName,
        ghsaId,
        severity: via.severity ?? "unknown",
        title: via.title ?? "(no title)",
        url: via.url ?? "",
      });
    }
  }
  return advisories;
}

function formatRow(a) {
  return `  [${a.severity.padEnd(8)}] ${a.package.padEnd(28)} ${a.ghsaId}  ${a.title}`;
}

function main() {
  const report = runNpmAudit();
  const all = collectAdvisories(report);

  const blockingSeverities = new Set(["critical", "high"]);
  const blocking = all.filter((a) => blockingSeverities.has(a.severity));

  const blocked = blocking.filter((a) => !ALLOWED_GHSA_IDS.has(a.ghsaId));
  const suppressed = blocking.filter((a) => ALLOWED_GHSA_IDS.has(a.ghsaId));

  if (suppressed.length > 0) {
    console.log("INFO: Allowed advisories suppressed (see docs/security/jspdf-vulnerabilities.md §2):");
    for (const a of suppressed) console.log(formatRow(a));
    console.log("");
  }

  if (blocked.length === 0) {
    const allowedList = Array.from(ALLOWED_GHSA_IDS).join(", ");
    console.log(`No blocking advisories. Allowed GHSA-IDs: ${allowedList}`);
    process.exit(0);
  }

  console.error("BLOCKING: critical / high advisories not in ALLOWED_GHSA_IDS:");
  for (const a of blocked) console.error(formatRow(a));
  console.error("");
  console.error(
    "Add a §2 reachability analysis in docs/security/jspdf-vulnerabilities.md before allowlisting,",
  );
  console.error("or update the affected dependency.");
  process.exit(1);
}

main();
