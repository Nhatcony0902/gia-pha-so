import type {
  PersonNode,
  PrimitiveRelationship,
} from "@family-tree/shared-types";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Columns3,
  FilterX,
  ListFilter,
  Minus,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
} from "../../lib/ui-classes";

type Row = {
  relationship: PrimitiveRelationship;
  type: string;
  firstPerson: string;
  secondPerson: string;
  status: string;
  birthOrder: number | null;
  marriageOrder: number | null;
  startedAt: string | null;
  endedAt: string | null;
  first?: PersonNode;
  second?: PersonNode;
};
type Key = Exclude<keyof Row, "relationship" | "first" | "second">;
type Column = {
  key: Key;
  label: string;
  default?: boolean;
  date?: boolean;
  enumValues?: Array<[string, string]>;
};
type Filter = {
  mode?: "contains" | "empty" | "not-empty";
  text?: string;
  values?: string[];
  sort?: "asc" | "desc";
};

const columns: Column[] = [
  {
    key: "type",
    label: "Loại quan hệ",
    default: true,
    enumValues: [
      ["Cha/mẹ – con", "Cha/mẹ – con"],
      ["Vợ chồng", "Vợ chồng"],
    ],
  },
  { key: "firstPerson", label: "Thành viên thứ nhất", default: true },
  { key: "secondPerson", label: "Thành viên thứ hai", default: true },
  {
    key: "status",
    label: "Trạng thái",
    default: true,
    enumValues: [
      ["Cha/mẹ ruột", "Cha/mẹ ruột"],
      ["Cha/mẹ nuôi", "Cha/mẹ nuôi"],
      ["Kết hôn", "Kết hôn"],
      ["Ly hôn", "Ly hôn"],
      ["Ly thân", "Ly thân"],
      ["Góa", "Góa"],
    ],
  },
  { key: "birthOrder", label: "Thứ tự sinh" },
  { key: "marriageOrder", label: "Lần kết hôn" },
  { key: "startedAt", label: "Ngày bắt đầu", date: true, default: true },
  { key: "endedAt", label: "Ngày kết thúc", date: true, default: true },
];

const statusLabel = (relationship: PrimitiveRelationship) => {
  if (relationship.type === "PARENT_CHILD")
    return relationship.parentKind === "ADOPTIVE"
      ? "Cha/mẹ nuôi"
      : "Cha/mẹ ruột";
  switch (relationship.marriageStatus) {
    case "DIVORCED":
      return "Ly hôn";
    case "SEPARATED":
      return "Ly thân";
    case "WIDOWED":
      return "Góa";
    default:
      return "Kết hôn";
  }
};
const valueOf = (row: Row, key: Key) => row[key];
const format = (value: unknown, column: Column) => {
  if (value === null || value === undefined || value === "") return "—";
  if (column.date)
    return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(
      new Date(String(value)),
    );
  return String(value);
};
const normalizeSearch = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .trim();
const isFilterActive = (filter?: Filter) =>
  Boolean(
    filter?.sort ||
    filter?.mode === "empty" ||
    filter?.mode === "not-empty" ||
    filter?.values?.length ||
    ((filter?.mode ?? "contains") === "contains" && filter?.text?.trim()),
  );
const defaultColumnWidth = (key: Key) =>
  key === "firstPerson" || key === "secondPerson" ? 270 : 180;
const minColumnWidth = (key: Key) =>
  key === "firstPerson" || key === "secondPerson" ? 200 : 120;

function StyledCheckbox({
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
        className={`grid size-4 shrink-0 place-items-center rounded-[4px] border border-[#8fa198] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#52796e] ${checked || indeterminate ? "border-[#29473f] bg-[#29473f] text-white" : "bg-white text-transparent"}`}
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

function PersonCell({
  person,
  role,
  onSelect,
}: {
  person?: PersonNode;
  role?: string;
  onSelect: (id: string) => void;
}) {
  if (!person) return <span className="text-[#8d3d32]">Không tìm thấy</span>;
  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className="flex max-w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent p-1 text-left text-[#29473f] hover:bg-[#e6efea] focus-visible:bg-[#e6efea] focus-visible:outline-2 focus-visible:outline-[#52796e]"
    >
      {person.avatarUrl ? (
        <img
          src={person.avatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dbe6e0] font-bold">
          {person.fullName[0]}
        </span>
      )}
      <span className="min-w-0">
        <strong className="block truncate">{person.fullName}</strong>
        {role && <small className="block text-[#71827a]">{role}</small>}
      </span>
    </button>
  );
}

export function RelationshipList({
  persons,
  relationships,
  deletingId,
  sidebarOpen,
  onSelectPerson,
  onEdit,
  onDelete,
}: {
  persons: PersonNode[];
  relationships: PrimitiveRelationship[];
  deletingId?: string;
  sidebarOpen: boolean;
  onSelectPerson: (id: string) => void;
  onEdit: (relationship: PrimitiveRelationship) => void;
  onDelete: (relationship: PrimitiveRelationship) => void;
}) {
  const people = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  );
  const sourceRows = useMemo<Row[]>(
    () =>
      relationships.map((relationship) => ({
        relationship,
        type:
          relationship.type === "PARENT_CHILD" ? "Cha/mẹ – con" : "Vợ chồng",
        firstPerson:
          people.get(relationship.fromPersonId)?.fullName ?? "Không tìm thấy",
        secondPerson:
          people.get(relationship.toPersonId)?.fullName ?? "Không tìm thấy",
        status: statusLabel(relationship),
        birthOrder: relationship.birthOrder,
        marriageOrder: relationship.marriageOrder,
        startedAt: relationship.startedAt,
        endedAt: relationship.endedAt,
        first: people.get(relationship.fromPersonId),
        second: people.get(relationship.toPersonId),
      })),
    [people, relationships],
  );
  const [visible, setVisible] = useState<Key[]>(
    columns.filter((column) => column.default).map((column) => column.key),
  );
  const [draftVisible, setDraftVisible] = useState<Key[]>(visible);
  const [filters, setFilters] = useState<Partial<Record<Key, Filter>>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<Key, number>>(
    () =>
      Object.fromEntries(
        columns.map((column) => [column.key, defaultColumnWidth(column.key)]),
      ) as Record<Key, number>,
  );
  const popupRef = useRef<HTMLDivElement>(null);
  const resizingColumn = useRef<{
    key: Key;
    startX: number;
    startWidth: number;
  } | null>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const activeColumns = columns.filter((column) =>
    visible.includes(column.key),
  );
  const activeFilterCount = columns.filter((column) =>
    isFilterActive(filters[column.key]),
  ).length;
  const rows = useMemo(() => {
    let result = [...sourceRows];
    for (const column of columns) {
      const filter = filters[column.key];
      if (!filter) continue;
      result = result.filter((row) => {
        const raw = valueOf(row, column.key);
        const empty = raw === null || raw === undefined || raw === "";
        if (filter.values?.length && !filter.values.includes(String(raw)))
          return false;
        if (filter.mode === "empty") return empty;
        if (filter.mode === "not-empty") return !empty;
        if ((filter.mode ?? "contains") === "contains" && filter.text)
          return normalizeSearch(raw).includes(normalizeSearch(filter.text));
        return true;
      });
    }
    const sorted = columns.find((column) => filters[column.key]?.sort);
    if (sorted) {
      const direction = filters[sorted.key]!.sort === "asc" ? 1 : -1;
      result.sort(
        (left, right) =>
          String(valueOf(left, sorted.key) ?? "").localeCompare(
            String(valueOf(right, sorted.key) ?? ""),
            "vi",
            { numeric: true },
          ) * direction,
      );
    }
    return result;
  }, [filters, sourceRows]);
  const tableWidth =
    64 +
    activeColumns.reduce(
      (total, column) => total + columnWidths[column.key],
      0,
    ) +
    190;

  return (
    <section
      className={`min-h-0 overflow-hidden bg-[#edf2ee] p-4 transition-[margin-right] duration-250 md:p-6 ${sidebarOpen ? "min-[801px]:mr-92" : ""}`}
      aria-label="Danh sách quan hệ"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[95rem] flex-col">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-2xl">Danh sách quan hệ</h1>
            <p className="mt-1 mb-0 text-sm text-[#61736a]">
              Hiển thị {rows.length}/{relationships.length} quan hệ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="relative"
              ref={open === "columns" ? popupRef : undefined}
            >
              <button
                type="button"
                onClick={() => {
                  if (open === "columns") return setOpen(null);
                  setDraftVisible(visible);
                  setOpen("columns");
                }}
                className={compactSecondaryButtonClass}
              >
                <Columns3 size={17} /> Chọn cột
              </button>
              {open === "columns" && (
                <div className="absolute top-full right-0 z-30 mt-2 flex max-h-96 w-72 flex-col rounded-xl border border-[#c8d5ce] bg-white p-2 shadow-xl">
                  <div className="grid min-h-0 gap-1 overflow-auto">
                    <StyledCheckbox
                      className="rounded-lg px-2 py-2 text-sm font-bold hover:bg-[#edf2ef]"
                      checked={draftVisible.length === columns.length}
                      indeterminate={
                        draftVisible.length > 0 &&
                        draftVisible.length < columns.length
                      }
                      onChange={() =>
                        setDraftVisible(
                          draftVisible.length === columns.length
                            ? []
                            : columns.map((column) => column.key),
                        )
                      }
                      label="Chọn tất cả"
                    />
                    {columns.map((column) => (
                      <StyledCheckbox
                        key={column.key}
                        className="rounded-lg px-2 py-2 text-sm hover:bg-[#edf2ef]"
                        checked={draftVisible.includes(column.key)}
                        onChange={() =>
                          setDraftVisible((current) =>
                            current.includes(column.key)
                              ? current.filter((key) => key !== column.key)
                              : [...current, column.key],
                          )
                        }
                        label={column.label}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end border-t border-[#e4ebe7] pt-2">
                    <button
                      type="button"
                      className={compactPrimaryButtonClass}
                      onClick={() => {
                        setVisible(draftVisible);
                        setFilters((current) => {
                          const next = { ...current };
                          for (const column of columns)
                            if (!draftVisible.includes(column.key))
                              delete next[column.key];
                          return next;
                        });
                        setOpen(null);
                      }}
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className={compactSecondaryButtonClass}
              onClick={() => {
                setFilters({});
                setOpen(null);
              }}
              aria-label={`Xóa tất cả bộ lọc; ${activeFilterCount} bộ lọc đang áp dụng`}
            >
              <FilterX size={16} /> Xóa bộ lọc ({activeFilterCount})
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#c8d5ce] bg-white shadow-[0_10px_30px_rgba(27,54,47,0.08)]">
          <table
            className="table-fixed border-collapse text-left text-sm"
            style={{ width: "100%", minWidth: tableWidth }}
          >
            <colgroup>
              <col style={{ width: 64 }} />
              {activeColumns.map((column) => (
                <col
                  key={column.key}
                  style={{ width: columnWidths[column.key] }}
                />
              ))}
              <col style={{ width: 190 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#e3ebe7] text-[#29473f]">
              <tr>
                <th className="w-16 px-4 py-3 text-center">STT</th>
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    className="relative border-l border-[#cad7d0] px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2 pr-1">
                      <span className="min-w-0 truncate" title={column.label}>
                        {column.label}
                      </span>
                      <button
                        type="button"
                        aria-label={`Lọc cột ${column.label}`}
                        onClick={() =>
                          setOpen(open === column.key ? null : column.key)
                        }
                        className={`grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent hover:bg-white ${isFilterActive(filters[column.key]) ? "text-[#a06e2b]" : "text-[#60746a]"}`}
                      >
                        <ListFilter size={15} />
                      </button>
                    </span>
                    <button
                      type="button"
                      aria-label={`Thay đổi độ rộng cột ${column.label}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        resizingColumn.current = {
                          key: column.key,
                          startX: event.clientX,
                          startWidth: columnWidths[column.key],
                        };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        const resize = resizingColumn.current;
                        if (!resize || resize.key !== column.key) return;
                        setColumnWidths((current) => ({
                          ...current,
                          [column.key]: Math.max(
                            minColumnWidth(column.key),
                            resize.startWidth + event.clientX - resize.startX,
                          ),
                        }));
                      }}
                      onPointerUp={() => (resizingColumn.current = null)}
                      onLostPointerCapture={() =>
                        (resizingColumn.current = null)
                      }
                      className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 after:absolute after:top-1/4 after:right-0.5 after:h-1/2 after:w-px after:bg-[#aebfb6] hover:after:bg-[#52796e]"
                    />
                    {open === column.key && (
                      <ColumnPopup
                        column={column}
                        value={filters[column.key] ?? {}}
                        onChange={(value) =>
                          setFilters((current) => {
                            const next = { ...current };
                            if (!isFilterActive(value)) delete next[column.key];
                            else next[column.key] = value;
                            if (value.sort)
                              for (const other of columns) {
                                if (other.key === column.key) continue;
                                const otherFilter = next[other.key];
                                if (!otherFilter?.sort) continue;
                                const withoutSort = { ...otherFilter };
                                delete withoutSort.sort;
                                if (isFilterActive(withoutSort))
                                  next[other.key] = withoutSort;
                                else delete next[other.key];
                              }
                            return next;
                          })
                        }
                        onClose={() => setOpen(null)}
                        popupRef={popupRef}
                      />
                    )}
                  </th>
                ))}
                <th className="border-l border-[#cad7d0] px-4 py-3 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.relationship.id}
                  className="border-t border-[#e0e7e3] hover:bg-[#edf4f0]"
                >
                  <td className="px-4 py-3 text-center tabular-nums text-[#71827a]">
                    {index + 1}
                  </td>
                  {activeColumns.map((column) => (
                    <td
                      key={column.key}
                      className="min-w-0 overflow-hidden border-l border-[#edf1ef] px-4 py-3"
                    >
                      {column.key === "firstPerson" ? (
                        <PersonCell
                          person={row.first}
                          role={
                            row.relationship.type === "PARENT_CHILD"
                              ? "Cha/mẹ"
                              : undefined
                          }
                          onSelect={onSelectPerson}
                        />
                      ) : column.key === "secondPerson" ? (
                        <PersonCell
                          person={row.second}
                          role={
                            row.relationship.type === "PARENT_CHILD"
                              ? "Con"
                              : undefined
                          }
                          onSelect={onSelectPerson}
                        />
                      ) : (
                        <span className="block truncate">
                          {format(valueOf(row, column.key), column)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="border-l border-[#edf1ef] px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={compactSecondaryButtonClass}
                        onClick={() => onEdit(row.relationship)}
                      >
                        <Pencil size={15} /> Sửa
                      </button>
                      <button
                        type="button"
                        className={compactDangerButtonClass}
                        disabled={deletingId === row.relationship.id}
                        onClick={() => onDelete(row.relationship)}
                      >
                        <Trash2 size={15} />
                        {deletingId === row.relationship.id
                          ? "Đang xóa…"
                          : "Xóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-12 text-center text-[#71827a]">
              {relationships.length
                ? "Không có quan hệ phù hợp với bộ lọc."
                : "Gia phả chưa có quan hệ nào."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ColumnPopup({
  column,
  value,
  onChange,
  onClose,
  popupRef,
}: {
  column: Column;
  value: Filter;
  onChange: (value: Filter) => void;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
}) {
  const [draft, setDraft] = useState<Filter>(() => ({
    ...value,
    ...(!column.enumValues && !value.mode ? { mode: "contains" as const } : {}),
  }));
  return (
    <div
      ref={popupRef}
      className="absolute top-[calc(100%-0.25rem)] left-3 z-30 mt-2 w-72 rounded-xl border border-[#c8d5ce] bg-white p-3 font-normal shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mt-0 mb-2 text-xs font-bold tracking-wider text-[#71827a] uppercase">
        Sắp xếp
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDraft({ ...draft, sort: "asc" })}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "asc" ? "border-[#a06e2b] bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
        >
          <ArrowDownAZ size={15} /> Tăng dần
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...draft, sort: "desc" })}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "desc" ? "border-[#a06e2b] bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
        >
          <ArrowUpAZ size={15} /> Giảm dần
        </button>
      </div>
      <p className="mt-4 mb-2 text-xs font-bold tracking-wider text-[#71827a] uppercase">
        Lọc
      </p>
      {column.enumValues ? (
        <div className="grid gap-1">
          {column.enumValues.map(([key, label]) => (
            <StyledCheckbox
              key={key}
              className="rounded-md p-1.5 text-sm hover:bg-[#edf2ef]"
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
              setDraft({ ...draft, mode: event.target.value as Filter["mode"] })
            }
            className="w-full cursor-pointer rounded-lg border border-[#c8d5ce] bg-white p-2"
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
              className="mt-3 w-full rounded-lg border border-[#c8d5ce] p-2 focus:border-[#52796e] focus:outline-none"
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
