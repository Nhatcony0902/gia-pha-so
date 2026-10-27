import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export function PageBreadcrumbBar({
  items,
  children,
  light = false,
  breadcrumbClassName,
  headerClassName = "border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 py-[0.85rem]",
  contentClassName = "flex w-full flex-col items-start justify-between gap-4 min-[801px]:flex-row min-[801px]:items-center",
}: {
  items: BreadcrumbItem[];
  children?: ReactNode;
  light?: boolean;
  breadcrumbClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  return (
    <header className={headerClassName}>
      <div className={contentClassName}>
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
  description,
  children,
  className = "mb-4",
  eyebrowClassName = "m-0 text-xs font-bold tracking-widest text-accent-deep",
  titleClassName = "m-0 font-display text-2xl",
  descriptionClassName = "mt-1 mb-0 text-sm text-ink-muted",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow != null && <p className={eyebrowClassName}>{eyebrow}</p>}
        <h1 className={titleClassName}>{title}</h1>
        {description != null && (
          <p className={descriptionClassName}>{description}</p>
        )}
      </div>
      {children}
    </header>
  );
}