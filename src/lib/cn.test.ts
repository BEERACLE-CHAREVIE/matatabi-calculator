/**
 * cn (className 合成ヘルパ) の単体テスト。
 *
 * - 仕様: src/lib/cn.ts の JSDoc（`clsx` / `tailwind-merge` を使わない極小実装）
 * - 観点: falsy 値（false / null / undefined）は無視され、空配列は空文字を返す。
 */

import { cn } from "./cn";

describe("cn", () => {
  it("文字列のみ → スペース区切りで連結", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("falsy 値 (undefined / null / false) は無視される", () => {
    expect(cn("a", undefined, false, null, "b")).toBe("a b");
  });

  it("引数なし → 空文字", () => {
    expect(cn()).toBe("");
  });

  it("undefined のみ → 空文字", () => {
    expect(cn(undefined)).toBe("");
  });

  it("空文字を含むケース → 空文字 (filter Boolean が落とす)", () => {
    expect(cn("a", "", "b")).toBe("a b");
  });
});
