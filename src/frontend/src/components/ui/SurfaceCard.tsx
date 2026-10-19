import type { HTMLAttributes } from "react";
import { surfaceCardClass } from "../../lib/ui-classes";

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div" | "li";
  variant?: "card" | "table";
};

const variantClass = {
  card: surfaceCardClass,
  table:
    "min-h-0 flex-1 overflow-auto rounded-card border border-border-control bg-surface shadow-[0_10px_30px_rgba(27,54,47,0.08)]",
};

export function SurfaceCard({
  as: Element = "section",
  variant = "card",
  className = "",
  ...props
}: SurfaceCardProps) {
  return (
    <Element
      className={`${variantClass[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
