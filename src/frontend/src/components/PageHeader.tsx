import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export function PageBreadcrumbBar({
  items,
  children,
  light = false,
  breadcrumbClassName,
  headerClassName = "border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5",
  contentClassName = "w-full justify-between gap-4",
}: {
  items: BreadcrumbItem[];
  children?: ReactNode;
  light?: boolean;
  breadcrumbClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  return (
    <header className={`h-16 ${headerClassName}`}>
      <div className={`flex h-full items-center ${contentClassName}`}>
        <Breadcrumbs
          items={items}
          light={light}
          className={breadcrumbClassName}
        />
        {children}
      </div>
    </header>
  );
}

export function PageHeading({
  title,
  eyebrow,
  children,
  className = "mb-4",
  eyebrowClassName = "m-0 text-xs font-bold tracking-widest text-accent-deep",
  titleClassName = "m-0 font-display text-2xl",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
}) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow != null && <p className={eyebrowClassName}>{eyebrow}</p>}
        <h1 className={titleClassName}>{title}</h1>
      </div>
      {children}
    </header>
  );
}
