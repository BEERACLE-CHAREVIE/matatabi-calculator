import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // primary は ink/canvas で WCAG AA 4.5:1 を満たす組み合わせ (#72665B on #F8F6F2 ≈ 5.0:1)。
  // accent は色味として薄く CTA テキストとのコントラスト比が 1.8:1 程度しか出ないため非採用。
  primary: "bg-ink text-canvas hover:opacity-90",
  secondary: "border border-line bg-canvas text-ink hover:bg-line/30",
  ghost: "bg-transparent text-ink hover:bg-line/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...rest}
    />
  );
});
