import { useQuery } from "@tanstack/react-query";
import type { PersonListItem } from "@family-tree/shared-types";
import { Columns3, FilterX, ListFilter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeading } from "../../components/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { compactSecondaryButtonClass } from "../../lib/ui-classes";
import {
  ColumnFilterPopup,
  StyledCheckbox,
  type ColumnFilter,
} from "./ListFilterControls";
import { getTreePersons } from "./api";

type Key = keyof PersonListItem;
type Column = {
  key: Key;
  label: string;
  enumValues?: Array<[string, string]>;
  date?: boolean;
  default?: boolean;
};
const columns: Column[] = [
  { key: "fullName", label: "Họ và tên", default: true },
  { key: "preferredName", label: "Tên thường gọi", default: true },
  {
    key: "gender",
    label: "Giới tính",
    default: true,
    enumValues: [
      ["MALE", "Nam"],
      ["FEMALE", "Nữ"],
      ["OTHER", "Khác"],
      ["UNKNOWN", "Chưa rõ"],
    ],
  },
  { key: "birthDate", label: "Ngày sinh", date: true, default: true },
  { key: "birthPlace", label: "Nơi sinh", default: true },
  {
    key: "isDeceased",
    label: "Trạng thái",
    default: true,
    enumValues: [
      ["false", "Còn sống"],
      ["true", "Đã mất"],
    ],
  },
  { key: "deathDate", label: "Ngày mất", date: true },
  { key: "deathPlace", label: "Nơi mất" },
  { key: "hometown", label: "Quê quán", default: true },
  { key: "currentResidence", label: "Nơi ở hiện tại" },
  { key: "nationality", label: "Quốc tịch" },
  { key: "ethnicity", label: "Dân tộc" },
  { key: "religion", label: "Tôn giáo" },
  { key: "occupation", label: "Nghề nghiệp", default: true },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email" },
];

type Filter = ColumnFilter;
const isFilterActive = (filter?: Filter) => {
  if (!filter) return false;
  return Boolean(
    filter.sort ||
    filter.mode === "empty" ||
    filter.mode === "not-empty" ||
    filter.values?.length ||
    ((filter.mode ?? "contains") === "contains" && filter.text?.trim()),
  );
};
const valueOf = (person: PersonListItem, key: Key) => person[key];
const format = (value: unknown, column: Column) => {
  if (value === null || value === undefined || value === "") return "—";
  if (column.enumValues)
    return (
      column.enumValues.find(([key]) => key === String(value))?.[1] ??
      String(value)
    );
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

const defaultColumnWidth = (key: Key) => (key === "fullName" ? 320 : 180);
const minColumnWidth = (key: Key) => (key === "fullName" ? 200 : 112);

export function MemberList({
  treeId,
  onSelectPerson,
  sidebarOpen,
}: {
  treeId: string;
  onSelectPerson: (id: string) => void;
  sidebarOpen: boolean;
}) {
  const query = useQuery({
    queryKey: ["tree-persons", treeId],
    queryFn: () => getTreePersons(treeId),
  });
  const [visible, setVisible] = useState<Key[]>(
    columns.filter((column) => column.default).map((column) => column.key),
  );
  const [draftVisible, setDraftVisible] = useState<Key[]>(visible);
  const [columnWidths, setColumnWidths] = useState<Record<Key, number>>(
    () =>
      Object.fromEntries(
        columns.map((column) => [column.key, defaultColumnWidth(column.key)]),
      ) as Record<Key, number>,
  );
  const [filters, setFilters] = useState<Partial<Record<Key, Filter>>>({});
  const [open, setOpen] = useState<string | null>(null);
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
  const tableWidth =
    64 +
    activeColumns.reduce(
      (total, column) => total + columnWidths[column.key],
      0,
    );
  const rows = useMemo(() => {
    let result = [...(query.data?.persons ?? [])];
    for (const column of columns) {
      const filter = filters[column.key];
      if (!filter) continue;
      result = result.filter((person) => {
        const raw = valueOf(person, column.key);
        const empty = raw === null || raw === undefined || raw === "";
        if (filter.values?.length && !filter.values.includes(String(raw)))
          return false;
        if (filter.mode === "empty") return empty;
        if (filter.mode === "not-empty") return !empty;
        if ((filter.mode ?? "contains") === "contains" && filter.text) {
          const searchText = normalizeSearch(filter.text);
          return (
            normalizeSearch(raw).includes(searchText) ||
            normalizeSearch(format(raw, column)).includes(searchText)
          );
        }
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
  }, [filters, query.data]);

  if (query.isLoading)
    return (
      <div className="grid h-full place-items-center text-ink-muted">
        Đang tải danh sách thành viên…
      </div>
    );
  if (query.isError)
    return (
      <div className="grid h-full place-items-center text-[#8d3d32]">
        Không thể tải danh sách thành viên.
      </div>
    );
  return (
    <section
      className={`min-h-0 overflow-hidden bg-surface-page p-4 transition-[margin-right] duration-250 md:p-6 ${sidebarOpen ? "min-[801px]:mr-92" : ""}`}
      aria-label="Danh sách thành viên"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[95rem] flex-col">
        <PageHeading
          title="Danh sách thành viên"
          description={
            <>Hiển thị {rows.length}/{query.data?.persons.length ?? 0} thành viên</>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="relative"
              ref={open === "columns" ? popupRef : undefined}
            >
              <button
                type="button"
                onClick={() => {
                  if (open === "columns") {
                    setOpen(null);
                    return;
                  }
                  setDraftVisible(visible);
                  setOpen("columns");
                }}
                className={compactSecondaryButtonClass}
              >
                <Columns3 size={17} /> Chọn cột
              </button>
              {open === "columns" && (
                <div className="absolute top-full right-0 z-20 mt-2 flex max-h-96 w-72 flex-col rounded-xl border border-border-control bg-white p-2 shadow-xl">
                  <div className="grid min-h-0 gap-1 overflow-auto">
                    <StyledCheckbox
                      className="rounded-lg px-2 py-2 text-sm font-bold hover:bg-surface-hover"
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
                        className="rounded-lg px-2 py-2 text-sm hover:bg-surface-hover"
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
                      onClick={() => {
                        setVisible(draftVisible);
                        setFilters((current) => {
                          const next = { ...current };
                          for (const column of columns) {
                            if (!draftVisible.includes(column.key)) {
                              delete next[column.key];
                            }
                          }
                          return next;
                        });
                        setOpen(null);
                      }}
                      className="rounded-lg bg-ink-strong px-4 py-2 text-sm font-bold text-white hover:bg-[#203b34]"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label={`Xóa tất cả bộ lọc; ${activeFilterCount} bộ lọc đang áp dụng`}
              onClick={() => {
                setFilters({});
                setOpen(null);
              }}
              className={compactSecondaryButtonClass}
            >
              <FilterX size={16} />
              <span>Xóa bộ lọc ({activeFilterCount})</span>
            </button>
          </div>
        </PageHeading>
        <SurfaceCard as="div" variant="table">
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
            </colgroup>
            <thead className="sticky top-0 z-10 bg-surface-raised text-ink-strong">
              <tr>
                <th className="w-16 px-4 py-3 text-center">STT</th>
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    className="relative border-l border-border-default px-4 py-3"
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
                        className={`grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent hover:bg-white ${isFilterActive(filters[column.key]) ? "text-accent-deep" : "text-[#60746a]"}`}
                      >
                        <ListFilter size={15} />
                      </button>
                    </span>
                    <button
                      type="button"
                      aria-label={`Thay đổi độ rộng cột ${column.label}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
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
                        const nextWidth = Math.max(
                          minColumnWidth(column.key),
                          resize.startWidth + event.clientX - resize.startX,
                        );
                        setColumnWidths((current) => ({
                          ...current,
                          [column.key]: nextWidth,
                        }));
                      }}
                      onPointerUp={() => {
                        resizingColumn.current = null;
                      }}
                      onLostPointerCapture={() => {
                        resizingColumn.current = null;
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key !== "ArrowLeft" &&
                          event.key !== "ArrowRight"
                        )
                          return;
                        event.preventDefault();
                        const delta = event.key === "ArrowRight" ? 16 : -16;
                        setColumnWidths((current) => ({
                          ...current,
                          [column.key]: Math.max(
                            minColumnWidth(column.key),
                            current[column.key] + delta,
                          ),
                        }));
                      }}
                      className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 after:absolute after:top-1/4 after:right-0.5 after:h-1/2 after:w-px after:bg-[#aebfb6] hover:after:bg-focus focus-visible:outline-2 focus-visible:outline-focus"
                    />
                    {open === column.key && (
                      <ColumnFilterPopup
                        column={column}
                        value={filters[column.key] ?? {}}
                        onChange={(value) =>
                          setFilters((current) => {
                            const next = { ...current };
                            if (Object.keys(value).length === 0) {
                              delete next[column.key];
                            } else {
                              next[column.key] = value;
                            }
                            if (value.sort) {
                              for (const otherColumn of columns) {
                                if (otherColumn.key === column.key) continue;
                                const otherFilter = next[otherColumn.key];
                                if (!otherFilter?.sort) continue;

                                const withoutSort = { ...otherFilter };
                                delete withoutSort.sort;
                                if (isFilterActive(withoutSort)) {
                                  next[otherColumn.key] = withoutSort;
                                } else {
                                  delete next[otherColumn.key];
                                }
                              }
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
              </tr>
            </thead>
            <tbody>
              {rows.map((person, index) => (
                <tr
                  key={person.id}
                  onClick={() => onSelectPerson(person.id)}
                  tabIndex={0}
                  onKeyDown={(event) =>
                    event.key === "Enter" && onSelectPerson(person.id)
                  }
                  className={`cursor-pointer border-t border-[#e0e7e3] hover:bg-[#edf4f0] focus:bg-[#edf4f0] focus:outline-none ${person.isDeceased ? "bg-[repeating-linear-gradient(-45deg,rgba(111,123,117,0.05),rgba(111,123,117,0.05)_5px,transparent_5px,transparent_10px)] text-[#68756f] saturate-[.65]" : ""}`}
                >
                  <td className="px-4 py-3 text-center tabular-nums text-ink-subtle">
                    {index + 1}
                  </td>
                  {activeColumns.map((column) => (
                    <td
                      key={column.key}
                      className="min-w-0 overflow-hidden border-l border-[#edf1ef] px-4 py-3"
                    >
                      {column.key === "fullName" ? (
                        <span className="flex min-w-0 items-center gap-2">
                          {person.avatarUrl ? (
                            <img
                              src={person.avatarUrl}
                              alt=""
                              className="size-8 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dbe6e0] font-bold">
                              {person.fullName[0]}
                            </span>
                          )}
                          <strong
                            className="min-w-0 truncate"
                            title={person.fullName}
                          >
                            {person.fullName}
                          </strong>
                        </span>
                      ) : (
                        <span
                          className="block truncate"
                          title={format(valueOf(person, column.key), column)}
                        >
                          {format(valueOf(person, column.key), column)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-12 text-center text-ink-subtle">
              Không có thành viên phù hợp với bộ lọc.
            </div>
          )}
        </SurfaceCard>
      </div>
    </section>
  );
}
