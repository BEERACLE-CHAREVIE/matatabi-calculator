import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement>;

const baseClasses =
  "rounded-xl border border-line/50 bg-canvas shadow-card p-6";

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cn(baseClasses, className)} {...rest} />;
});
