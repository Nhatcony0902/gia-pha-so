import { ArrowDownAZ, ArrowUpAZ, Check, Minus, RotateCcw } from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
} from "../../lib/ui-classes";

export type ColumnFilter = {
  mode?: "contains" | "empty" | "not-empty";
  text?: string;
  values?: string[];
  sort?: "asc" | "desc";
};

type FilterableColumn = {
  enumValues?: Array<[string, string]>;
};

export function StyledCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: ReactNode;
  className: string;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        aria-checked={indeterminate ? "mixed" : checked}
        ref={(input) => {
          if (input) input.indeterminate = indeterminate;
        }}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid size-4 shrink-0 place-items-center rounded-[4px] border border-[#8fa198] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${checked || indeterminate ? "border-ink-strong bg-ink-strong text-white" : "bg-white text-transparent"}`}
      >
        {indeterminate ? (
          <Minus size={12} strokeWidth={3} />
        ) : (
          <Check size={12} strokeWidth={3} />
        )}
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  );
}

export function ColumnFilterPopup({
  column,
  value,
  onChange,
  onClose,
  popupRef,
}: {
  column: FilterableColumn;
  value: ColumnFilter;
  onChange: (value: ColumnFilter) => void;
  onClose: () => void;
  popupRef: RefObject<HTMLDivElement>;
}) {
  const [draft, setDraft] = useState<ColumnFilter>(() => ({
    ...value,
    ...(!column.enumValues && !value.mode ? { mode: "contains" as const } : {}),
  }));

  return (
    <div
      ref={popupRef}
      className="absolute top-[calc(100%-0.25rem)] left-3 z-30 mt-2 w-72 rounded-xl border border-border-control bg-white p-3 font-normal shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mt-0 mb-2 text-xs font-bold tracking-wider text-ink-subtle uppercase">
        Sắp xếp
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDraft({ ...draft, sort: "asc" })}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "asc" ? "border-accent-deep bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
        >
          <ArrowDownAZ size={15} /> Tăng dần
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...draft, sort: "desc" })}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "desc" ? "border-accent-deep bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
        >
          <ArrowUpAZ size={15} /> Giảm dần
        </button>
      </div>
      <p className="mt-4 mb-2 text-xs font-bold tracking-wider text-ink-subtle uppercase">
        Lọc
      </p>
      {column.enumValues ? (
        <div className="grid gap-1">
          {column.enumValues.map(([key, label]) => (
            <StyledCheckbox
              key={key}
              className="rounded-md p-1.5 text-sm hover:bg-surface-hover"
              checked={draft.values?.includes(key) ?? false}
              onChange={() =>
                setDraft({
                  ...draft,
                  values: draft.values?.includes(key)
                    ? draft.values.filter((item) => item !== key)
                    : [...(draft.values ?? []), key],
                })
              }
              label={label}
            />
          ))}
        </div>
      ) : (
        <>
          <select
            value={draft.mode ?? "contains"}
            onChange={(event) =>
              setDraft({
                ...draft,
                mode: event.target.value as ColumnFilter["mode"],
              })
            }
            className="w-full cursor-pointer rounded-lg border border-border-control bg-white p-2"
          >
            <option value="contains">Có chứa</option>
            <option value="empty">Để trống</option>
            <option value="not-empty">Không để trống</option>
          </select>
          {(draft.mode ?? "contains") === "contains" && (
            <input
              autoFocus
              value={draft.text ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, text: event.target.value })
              }
              placeholder="Nhập nội dung…"
              className="mt-3 w-full rounded-lg border border-border-control p-2 focus:border-focus focus:outline-none"
            />
          )}
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft({});
            onChange({});
            onClose();
          }}
          className={compactSecondaryButtonClass}
        >
          <RotateCcw size={14} /> Đặt lại
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(draft);
            onClose();
          }}
          className={compactPrimaryButtonClass}
        >
          <Check size={14} /> Áp dụng
        </button>
      </div>
    </div>
  );
}
