"use client";

/**
 * 診断フォーム（基本 5 項目）。
 *
 * - 仕様: docs/spec/input-form.md §4（基本 5 項目）/ §6（バリデーション）/ §8（エラー表示）/ §9（単位変換）
 * - 設計: ローカル `useState` のみで完結する Controlled-on-Submit パターン。
 *         送信時に `manYenToYen` で円単位へ変換し、`CalculationInput` を親へ渡す。
 *         詳細設定 3 項目（時給／1日時間／月稼働日数）は本コンポーネントの
 *         スコープ外（`calculate()` 側で `DEFAULT_*` を fallback する）。
 */

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { INSOURCING_LEVELS, type InsourcingLevel } from "@/lib/constants";
import { manYenToYen, type CalculationInput } from "@/lib/calculation";

const UPDATE_WAIT_OPTIONS = [
  { value: 0.5, label: "すぐ対応（〜1ヶ月）" },
  { value: 1.5, label: "1〜2ヶ月" },
  { value: 4.5, label: "3〜6ヶ月" },
  { value: 9, label: "半年〜1年" },
  { value: 18, label: "1年以上" },
] as const;
type UpdateWaitValue = (typeof UPDATE_WAIT_OPTIONS)[number]["value"];

type FormState = {
  monthlyVendorCostManYen: string;
  repairCostManYen: string;
  manualWorkerCount: string;
  updateWaitMonths: UpdateWaitValue | null;
  insourcingLevel: InsourcingLevel | null;
};
type FieldKey = keyof FormState;
type FieldErrors = Partial<Record<FieldKey, string>>;

type ParsedValues = {
  monthlyVendorCostManYen: number;
  repairCostManYen: number;
  manualWorkerCount: number;
  updateWaitMonths: UpdateWaitValue;
  insourcingLevel: InsourcingLevel;
};

const INITIAL_STATE: FormState = {
  monthlyVendorCostManYen: "",
  repairCostManYen: "",
  manualWorkerCount: "",
  updateWaitMonths: null,
  insourcingLevel: null,
};

const FIELD_ORDER: FieldKey[] = [
  "monthlyVendorCostManYen",
  "repairCostManYen",
  "manualWorkerCount",
  "updateWaitMonths",
  "insourcingLevel",
];

const SIGNED_INTEGER_PATTERN = /^-?\d+$/;

function validateMonthlyVendor(raw: string): { error?: string; value?: number } {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: "月額費用を入力してください" };
  if (!SIGNED_INTEGER_PATTERN.test(trimmed)) {
    return { error: "整数で入力してください" };
  }
  const n = Number(trimmed);
  if (n < 0) return { error: "0 万円以上で入力してください" };
  if (n > 10_000) return { error: "10,000 万円以下で入力してください" };
  return { value: n };
}

function validateRepair(raw: string): { error?: string; value?: number } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { error: "改修費用を入力してください（発生していない場合は 0）" };
  }
  if (!SIGNED_INTEGER_PATTERN.test(trimmed)) {
    return { error: "整数で入力してください" };
  }
  const n = Number(trimmed);
  if (n < 0) return { error: "0 以上で入力してください" };
  if (n > 5_000) return { error: "5,000 万円以下で入力してください" };
  return { value: n };
}

function validateWorkerCount(raw: string): { error?: string; value?: number } {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: "手作業人数を入力してください" };
  if (!SIGNED_INTEGER_PATTERN.test(trimmed)) {
    return { error: "整数で入力してください" };
  }
  const n = Number(trimmed);
  if (n < 0) return { error: "0 以上で入力してください" };
  if (n > 1_000) return { error: "1,000 人以下で入力してください" };
  return { value: n };
}

function validate(form: FormState): {
  errors: FieldErrors;
  values: ParsedValues | null;
} {
  const errors: FieldErrors = {};
  const monthly = validateMonthlyVendor(form.monthlyVendorCostManYen);
  if (monthly.error) errors.monthlyVendorCostManYen = monthly.error;

  const repair = validateRepair(form.repairCostManYen);
  if (repair.error) errors.repairCostManYen = repair.error;

  const worker = validateWorkerCount(form.manualWorkerCount);
  if (worker.error) errors.manualWorkerCount = worker.error;

  if (form.updateWaitMonths === null) {
    errors.updateWaitMonths = "選択肢から 1 つ選んでください";
  }
  if (form.insourcingLevel === null) {
    errors.insourcingLevel = "選択肢から 1 つ選んでください";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }
  return {
    errors,
    values: {
      monthlyVendorCostManYen: monthly.value!,
      repairCostManYen: repair.value!,
      manualWorkerCount: worker.value!,
      updateWaitMonths: form.updateWaitMonths!,
      insourcingLevel: form.insourcingLevel!,
    },
  };
}

// 数字入力共通スタイル: 編集型の細罫枠 + 大きめ tabular-nums + 紙下地。
const inputBaseClass =
  "block w-full rounded-xl border border-line/55 bg-canvas px-4 h-12 fig-mono text-[17px] text-ink " +
  "placeholder:text-ink/35 placeholder:font-sans " +
  "transition-[border-color,box-shadow] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:border-accent " +
  "aria-[invalid=true]:border-[#B45656] aria-[invalid=true]:bg-[#B45656]/[0.04]";

const stepperButtonClass =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line/55 bg-canvas text-[18px] text-ink " +
  "transition-[background-color,color,border-color,opacity] duration-150 " +
  "hover:border-ink hover:bg-ink hover:text-canvas " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-canvas disabled:hover:text-ink disabled:hover:border-line/55";

const segmentBaseClass =
  "group/seg inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-[14px] font-medium " +
  "transition-[background-color,color,border-color,transform] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const segmentSelectedClass =
  "border-ink bg-ink text-canvas shadow-card";
const segmentUnselectedClass =
  "border-line/55 bg-canvas text-ink hover:border-ink hover:-translate-y-px";

export type InputFormProps = {
  onSubmit: (input: CalculationInput) => void;
  className?: string;
};

/** 編集型のフィールドラッパ。番号 + ラベル + ヘルプ + 入力 + エラーをまとめる。 */
function FieldRow({
  index,
  label,
  unit,
  help,
  children,
  error,
  errorId,
  helpId,
}: {
  index: number;
  label: ReactNode;
  unit?: ReactNode;
  help: ReactNode;
  children: ReactNode;
  error?: string;
  errorId: string;
  helpId: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-7 sm:gap-y-2">
      {/* 番号列 */}
      <div className="flex items-baseline gap-3 sm:flex-col sm:items-start sm:gap-1.5 sm:pt-0.5">
        <span
          aria-hidden="true"
          className="fig-mono text-[12px] text-ink/45"
        >
          Q.{String(index).padStart(2, "0")}
          <span className="ml-0.5 text-ink/30">/05</span>
        </span>
        <span
          aria-hidden="true"
          className="hidden h-px w-7 bg-line/60 sm:block"
        />
      </div>

      {/* ラベル + 入力列 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mincho text-[16px] font-semibold text-ink sm:text-[17px]">
            {label}
          </span>
          {unit ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55">
              {unit}
            </span>
          ) : null}
        </div>
        {children}
        <p id={helpId} className="text-[13px] leading-relaxed text-ink/65">
          {help}
        </p>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-sm text-[#B45656]"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function InputForm({ onSubmit, className }: InputFormProps) {
  const formId = useId();
  const fieldId = (key: FieldKey) => `${formId}-${key}`;
  const errorId = (key: FieldKey) => `${formId}-${key}-error`;
  const helpId = (key: FieldKey) => `${formId}-${key}-help`;

  const fieldRefs = useRef<Record<FieldKey, HTMLElement | null>>({
    monthlyVendorCostManYen: null,
    repairCostManYen: null,
    manualWorkerCount: null,
    updateWaitMonths: null,
    insourcingLevel: null,
  });

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});

  const updateField = <K extends FieldKey>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateOnBlur = (key: FieldKey) => {
    const result = validate(form);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.errors[key]) {
        next[key] = result.errors[key];
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const focusFirstError = (errs: FieldErrors) => {
    const firstKey = FIELD_ORDER.find((k) => errs[k]);
    if (!firstKey) return;
    const target = fieldRefs.current[firstKey];
    if (target && typeof target.focus === "function") target.focus();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = validate(form);
    if (!result.values) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    const input: CalculationInput = {
      monthlyVendorCost: manYenToYen(result.values.monthlyVendorCostManYen),
      repairCost: manYenToYen(result.values.repairCostManYen),
      manualWorkerCount: result.values.manualWorkerCount,
      updateWaitMonths: result.values.updateWaitMonths,
      insourcingLevel: result.values.insourcingLevel,
    };
    onSubmit(input);
  };

  const describedBy = (key: FieldKey) =>
    cn(helpId(key), errors[key] ? errorId(key) : undefined) || undefined;

  const workerCountNumber = Number(form.manualWorkerCount.trim() || "0");
  const workerCountIsZero =
    form.manualWorkerCount.trim() === "" || workerCountNumber <= 0;
  const workerCountAtMax = workerCountNumber >= 1_000;

  const adjustWorkerCount = (delta: 1 | -1) => {
    const parsed = Number(form.manualWorkerCount.trim() || "0");
    const base = Number.isFinite(parsed) ? parsed : 0;
    const next = Math.min(1_000, Math.max(0, Math.floor(base) + delta));
    updateField("manualWorkerCount", String(next));
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-line/55 bg-canvas/85 backdrop-blur-[1px] shadow-card",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-50"
      />

      {/* 伝票風ヘッダ */}
      <div className="relative flex items-center justify-between border-b border-line/40 px-6 py-4 sm:px-9">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/55">
            Input Sheet · 5 fields
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
          Browser-only
        </span>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-10 px-6 py-9 sm:gap-12 sm:px-10 sm:py-12"
      >
        {/* (1) 月額ベンダー費用 */}
        <FieldRow
          index={1}
          label={
            <label htmlFor={fieldId("monthlyVendorCostManYen")}>
              月額ベンダー費用
            </label>
          }
          unit="万円 / 月"
          help="現在ベンダーに支払っている IT 関連の月額費用（保守・運用・開発受託等の合計）。中小企業の典型レンジは月額 1〜500 万円"
          error={errors.monthlyVendorCostManYen}
          errorId={errorId("monthlyVendorCostManYen")}
          helpId={helpId("monthlyVendorCostManYen")}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 fig-mono text-[15px] text-ink/40"
            >
              ¥
            </span>
            <input
              ref={(el) => {
                fieldRefs.current.monthlyVendorCostManYen = el;
              }}
              id={fieldId("monthlyVendorCostManYen")}
              type="number"
              inputMode="numeric"
              min={0}
              max={10_000}
              step={1}
              placeholder="例: 50"
              className={cn(inputBaseClass, "pl-9")}
              value={form.monthlyVendorCostManYen}
              aria-required="true"
              aria-invalid={errors.monthlyVendorCostManYen ? "true" : "false"}
              aria-describedby={describedBy("monthlyVendorCostManYen")}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateField("monthlyVendorCostManYen", e.target.value)
              }
              onBlur={() => validateOnBlur("monthlyVendorCostManYen")}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/45"
            >
              万円
            </span>
          </div>
        </FieldRow>

        <FieldDivider />

        {/* (2) 改修費用 */}
        <FieldRow
          index={2}
          label={
            <label htmlFor={fieldId("repairCostManYen")}>
              改修費用
            </label>
          }
          unit="万円 / 回"
          help="1 回あたりの改修・機能追加の発注費用。四半期改修＋軽微 1 回除外で年 3 回想定で試算します（業界通念）"
          error={errors.repairCostManYen}
          errorId={errorId("repairCostManYen")}
          helpId={helpId("repairCostManYen")}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 fig-mono text-[15px] text-ink/40"
            >
              ¥
            </span>
            <input
              ref={(el) => {
                fieldRefs.current.repairCostManYen = el;
              }}
              id={fieldId("repairCostManYen")}
              type="number"
              inputMode="numeric"
              min={0}
              max={5_000}
              step={1}
              placeholder="例: 30"
              className={cn(inputBaseClass, "pl-9")}
              value={form.repairCostManYen}
              aria-required="true"
              aria-invalid={errors.repairCostManYen ? "true" : "false"}
              aria-describedby={describedBy("repairCostManYen")}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateField("repairCostManYen", e.target.value)
              }
              onBlur={() => validateOnBlur("repairCostManYen")}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/45"
            >
              万円
            </span>
          </div>
        </FieldRow>

        <FieldDivider />

        {/* (3) 手作業人数（ステッパー） */}
        <FieldRow
          index={3}
          label={
            <label htmlFor={fieldId("manualWorkerCount")}>
              手作業に従事する人数
            </label>
          }
          unit="人"
          help="手作業・定型業務に従事している人数。AI 自動化の対象人数を試算します（時給 2,500 円・1 日 2 時間・月 20 日の業界標準値で計算）"
          error={errors.manualWorkerCount}
          errorId={errorId("manualWorkerCount")}
          helpId={helpId("manualWorkerCount")}
        >
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-label="1 人減らす"
              className={stepperButtonClass}
              disabled={workerCountIsZero}
              onClick={() => adjustWorkerCount(-1)}
            >
              −
            </button>
            <div className="relative flex-1">
              <input
                ref={(el) => {
                  fieldRefs.current.manualWorkerCount = el;
                }}
                id={fieldId("manualWorkerCount")}
                type="number"
                inputMode="numeric"
                min={0}
                max={1_000}
                step={1}
                placeholder="例: 5"
                className={cn(inputBaseClass, "text-center")}
                value={form.manualWorkerCount}
                aria-required="true"
                aria-invalid={errors.manualWorkerCount ? "true" : "false"}
                aria-describedby={describedBy("manualWorkerCount")}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("manualWorkerCount", e.target.value)
                }
                onBlur={() => validateOnBlur("manualWorkerCount")}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/45"
              >
                人
              </span>
            </div>
            <button
              type="button"
              aria-label="1 人増やす"
              className={stepperButtonClass}
              disabled={workerCountAtMax}
              onClick={() => adjustWorkerCount(1)}
            >
              ＋
            </button>
          </div>
        </FieldRow>

        <FieldDivider />

        {/* (4) 更新待ち期間 */}
        <FieldRow
          index={4}
          label="更新待ち期間"
          unit="月"
          help="修正・改修依頼を出してから反映されるまでの平均期間"
          error={errors.updateWaitMonths}
          errorId={errorId("updateWaitMonths")}
          helpId={helpId("updateWaitMonths")}
        >
          <div
            role="radiogroup"
            aria-label="更新待ち期間"
            aria-required="true"
            aria-invalid={errors.updateWaitMonths ? "true" : "false"}
            aria-describedby={describedBy("updateWaitMonths")}
            className="flex flex-wrap gap-2"
          >
            {UPDATE_WAIT_OPTIONS.map((opt, idx) => {
              const selected = form.updateWaitMonths === opt.value;
              return (
                <button
                  key={opt.value}
                  ref={(el) => {
                    if (idx === 0) fieldRefs.current.updateWaitMonths = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    segmentBaseClass,
                    selected ? segmentSelectedClass : segmentUnselectedClass,
                  )}
                  onClick={() => updateField("updateWaitMonths", opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </FieldRow>

        <FieldDivider />

        {/* (5) 内製化状況 */}
        <FieldRow
          index={5}
          label="内製化の進捗状況"
          help="社内で IT 業務をどの程度内製化しているか。既に内製化された割合は試算から除外します"
          error={errors.insourcingLevel}
          errorId={errorId("insourcingLevel")}
          helpId={helpId("insourcingLevel")}
        >
          <div
            role="radiogroup"
            aria-label="内製化の進捗状況"
            aria-required="true"
            aria-invalid={errors.insourcingLevel ? "true" : "false"}
            aria-describedby={describedBy("insourcingLevel")}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {INSOURCING_LEVELS.map((opt, idx) => {
              const selected = form.insourcingLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  ref={(el) => {
                    if (idx === 0) fieldRefs.current.insourcingLevel = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={opt.label}
                  className={cn(
                    segmentBaseClass,
                    "w-full",
                    selected ? segmentSelectedClass : segmentUnselectedClass,
                  )}
                  onClick={() => updateField("insourcingLevel", opt.value)}
                >
                  <span className="sm:hidden">{opt.label}</span>
                  <span className="hidden sm:inline">{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </FieldRow>

        {/* Submit row */}
        <div className="flex flex-col gap-5 border-t border-line/40 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55">
            <span className="fig-mono text-accent">All fields</span>
            <span className="mx-2 text-ink/30">·</span>
            ブラウザ内で計算 / 送信なし
          </p>
          <button
            type="submit"
            className="group relative inline-flex h-14 items-center justify-center gap-3 self-start overflow-hidden rounded-full bg-ink px-8 text-[16px] font-medium text-canvas shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:self-auto sm:text-[17px]"
          >
            <span className="relative z-10">診断する</span>
            <ArrowRight
              aria-hidden="true"
              className="relative z-10 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1.5"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </button>
        </div>
      </form>
    </article>
  );
}

function FieldDivider() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line/40" />
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink/30">
        ·
      </span>
      <span className="h-px w-12 bg-line/40" />
    </div>
  );
}
