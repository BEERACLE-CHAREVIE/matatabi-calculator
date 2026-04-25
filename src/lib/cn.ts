/**
 * 条件付き className 連結ヘルパ。
 *
 * - 用途: 雛形コンポーネントのデフォルトクラスと呼び出し側 className を結合する。
 * - 設計: clsx / tailwind-merge を使わない極小実装。外部依存ゼロを維持する。
 *   同一 Tailwind プロパティの上書きが必要な場合は呼び出し側で完全なクラスを
 *   渡さず、雛形側のクラスを構成し直す方針とする (詳細: docs/design-tokens.md)。
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
