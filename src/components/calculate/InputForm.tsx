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
} from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  if (n < 1) return { error: "1 万円以上で入力してください" };
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

const inputBaseClass =
  "block w-full rounded-md border border-line bg-canvas px-3 h-11 text-base text-ink " +
  "placeholder:text-ink/40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "aria-[invalid=true]:border-[#B45656]";

const stepperButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-canvas text-lg text-ink " +
  "hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const segmentBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const segmentSelectedClass = "border-ink bg-ink text-canvas";
const segmentUnselectedClass =
  "border-line bg-canvas text-ink hover:bg-line/30";

export type InputFormProps = {
  onSubmit: (input: CalculationInput) => void;
  className?: string;
};

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
    <Card className={className}>
      <form noValidate onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* (1) 月額ベンダー費用 */}
        <div className="space-y-2">
          <label
            htmlFor={fieldId("monthlyVendorCostManYen")}
            className="block text-sm font-medium text-ink"
          >
            月額ベンダー費用
            <span className="ml-2 text-xs font-normal text-ink/70">
              （万円／月）
            </span>
          </label>
          <input
            ref={(el) => {
              fieldRefs.current.monthlyVendorCostManYen = el;
            }}
            id={fieldId("monthlyVendorCostManYen")}
            type="number"
            inputMode="numeric"
            min={1}
            max={10_000}
            step={1}
            placeholder="例: 50"
            className={inputBaseClass}
            value={form.monthlyVendorCostManYen}
            aria-required="true"
            aria-invalid={errors.monthlyVendorCostManYen ? "true" : "false"}
            aria-describedby={describedBy("monthlyVendorCostManYen")}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              updateField("monthlyVendorCostManYen", e.target.value)
            }
            onBlur={() => validateOnBlur("monthlyVendorCostManYen")}
          />
          <p id={helpId("monthlyVendorCostManYen")} className="text-xs text-ink/70">
            現在ベンダーに支払っている IT 関連の月額費用（保守・運用・開発受託等の合計）
          </p>
          {errors.monthlyVendorCostManYen ? (
            <p
              id={errorId("monthlyVendorCostManYen")}
              role="alert"
              className="flex items-center gap-1 text-sm text-[#B45656]"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{errors.monthlyVendorCostManYen}</span>
            </p>
          ) : null}
        </div>

        {/* (2) 改修費用 */}
        <div className="space-y-2">
          <label
            htmlFor={fieldId("repairCostManYen")}
            className="block text-sm font-medium text-ink"
          >
            改修費用
            <span className="ml-2 text-xs font-normal text-ink/70">
              （万円／回）
            </span>
          </label>
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
            className={inputBaseClass}
            value={form.repairCostManYen}
            aria-required="true"
            aria-invalid={errors.repairCostManYen ? "true" : "false"}
            aria-describedby={describedBy("repairCostManYen")}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              updateField("repairCostManYen", e.target.value)
            }
            onBlur={() => validateOnBlur("repairCostManYen")}
          />
          <p id={helpId("repairCostManYen")} className="text-xs text-ink/70">
            1 回あたりの改修・機能追加の発注費用。年 3 回想定で試算します
          </p>
          {errors.repairCostManYen ? (
            <p
              id={errorId("repairCostManYen")}
              role="alert"
              className="flex items-center gap-1 text-sm text-[#B45656]"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{errors.repairCostManYen}</span>
            </p>
          ) : null}
        </div>

        {/* (3) 手作業人数（ステッパー） */}
        <div className="space-y-2">
          <label
            htmlFor={fieldId("manualWorkerCount")}
            className="block text-sm font-medium text-ink"
          >
            手作業に従事する人数
            <span className="ml-2 text-xs font-normal text-ink/70">（人）</span>
          </label>
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
              className={inputBaseClass}
              value={form.manualWorkerCount}
              aria-required="true"
              aria-invalid={errors.manualWorkerCount ? "true" : "false"}
              aria-describedby={describedBy("manualWorkerCount")}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateField("manualWorkerCount", e.target.value)
              }
              onBlur={() => validateOnBlur("manualWorkerCount")}
            />
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
          <p id={helpId("manualWorkerCount")} className="text-xs text-ink/70">
            手作業・定型業務に従事している人数。AI 自動化の対象人数を試算します
          </p>
          {errors.manualWorkerCount ? (
            <p
              id={errorId("manualWorkerCount")}
              role="alert"
              className="flex items-center gap-1 text-sm text-[#B45656]"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{errors.manualWorkerCount}</span>
            </p>
          ) : null}
        </div>

        {/* (4) 更新待ち期間 */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-ink">
            更新待ち期間
            <span className="ml-2 text-xs font-normal text-ink/70">（月）</span>
          </legend>
          <div
            role="radiogroup"
            aria-required="true"
            aria-invalid={errors.updateWaitMonths ? "true" : "false"}
            aria-describedby={describedBy("updateWaitMonths")}
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
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
          <p id={helpId("updateWaitMonths")} className="text-xs text-ink/70">
            修正・改修依頼を出してから反映されるまでの平均期間
          </p>
          {errors.updateWaitMonths ? (
            <p
              id={errorId("updateWaitMonths")}
              role="alert"
              className="flex items-center gap-1 text-sm text-[#B45656]"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{errors.updateWaitMonths}</span>
            </p>
          ) : null}
        </fieldset>

        {/* (5) 内製化状況 */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-ink">
            内製化の進捗状況
          </legend>
          <div
            role="radiogroup"
            aria-required="true"
            aria-invalid={errors.insourcingLevel ? "true" : "false"}
            aria-describedby={describedBy("insourcingLevel")}
            className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap"
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
                    "sm:flex-1",
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
          <p id={helpId("insourcingLevel")} className="text-xs text-ink/70">
            社内で IT 業務をどの程度内製化しているか。既に内製化された割合は試算から除外します
          </p>
          {errors.insourcingLevel ? (
            <p
              id={errorId("insourcingLevel")}
              role="alert"
              className="flex items-center gap-1 text-sm text-[#B45656]"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{errors.insourcingLevel}</span>
            </p>
          ) : null}
        </fieldset>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            診断する
          </Button>
        </div>
      </form>
    </Card>
  );
}
