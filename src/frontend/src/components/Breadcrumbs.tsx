import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function Breadcrumbs({
  items,
  light = false,
  className = "",
}: {
  items: BreadcrumbItem[];
  light?: boolean;
  className?: string;
}) {
  const linkClass = light
    ? "text-content-secondary hover:text-white"
    : "text-[#63756d] hover:text-ink-strong";
  const currentClass = light ? "text-white" : "text-ink";

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex min-w-0 items-center gap-2 text-sm ${className}`}
    >
      {items.map((item, index) => {
        const current = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="contents">
            {index > 0 && (
              <ChevronRight
                size={15}
                className={
                  light ? "shrink-0 text-outline" : "shrink-0 text-[#9aa9a2]"
                }
                aria-hidden="true"
              />
            )}
            {!current && item.to ? (
              <Link
                to={item.to}
                className={`shrink-0 whitespace-nowrap font-medium no-underline transition-colors ${linkClass}`}
              >
                {item.label}
              </Link>
            ) : (
              <strong
                className={`truncate font-display font-semibold ${currentClass}`}
                aria-current={current ? "page" : undefined}
              >
                {item.label}
              </strong>
            )}
          </span>
        );
      })}
    </nav>
  );
}
