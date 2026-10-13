import { useQuery } from "@tanstack/react-query";
import type { PersonListItem } from "@family-tree/shared-types";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Columns3,
  ListFilter,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  { key: "clanBranch", label: "Chi họ" },
  { key: "generationName", label: "Đời / thế hệ" },
  { key: "familyPosition", label: "Vai vế" },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email" },
];

type Filter = {
  mode?: "contains" | "empty" | "not-empty";
  text?: string;
  values?: string[];
  sort?: "asc" | "desc";
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
  const [filters, setFilters] = useState<Partial<Record<Key, Filter>>>({});
  const [open, setOpen] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
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
      <div className="grid h-full place-items-center text-[#61736a]">
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
      className={`min-h-0 overflow-auto bg-[#edf2ee] p-4 transition-[margin-right] duration-250 md:p-6 ${sidebarOpen ? "min-[801px]:mr-92" : ""}`}
      aria-label="Danh sách thành viên"
    >
      <div className="mx-auto max-w-[95rem]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-2xl">Danh sách thành viên</h1>
            <p className="mt-1 mb-0 text-sm text-[#61736a]">
              Hiển thị {rows.length}/{query.data?.persons.length ?? 0} thành
              viên
            </p>
          </div>
          <div
            className="relative"
            ref={open === "columns" ? popupRef : undefined}
          >
            <button
              type="button"
              onClick={() => setOpen(open === "columns" ? null : "columns")}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#b9cac1] bg-white px-3 py-2 text-sm font-bold text-[#29473f]"
            >
              <Columns3 size={17} /> Chọn cột
            </button>
            {open === "columns" && (
              <div className="absolute top-full right-0 z-20 mt-2 grid max-h-96 w-64 gap-1 overflow-auto rounded-xl border border-[#c8d5ce] bg-white p-2 shadow-xl">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#edf2ef]"
                  >
                    <input
                      type="checkbox"
                      checked={visible.includes(column.key)}
                      onChange={() =>
                        setVisible((current) =>
                          current.includes(column.key)
                            ? current.filter((key) => key !== column.key)
                            : [...current, column.key],
                        )
                      }
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#c8d5ce] bg-white shadow-[0_10px_30px_rgba(27,54,47,0.08)]">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#e3ebe7] text-[#29473f]">
              <tr>
                <th className="w-16 px-4 py-3 text-center">STT</th>
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    className="relative border-l border-[#cad7d0] px-4 py-3"
                  >
                    <span className="flex items-center gap-2">
                      {column.label}
                      <button
                        type="button"
                        aria-label={`Lọc cột ${column.label}`}
                        onClick={() =>
                          setOpen(open === column.key ? null : column.key)
                        }
                        className={`grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent hover:bg-white ${filters[column.key] ? "text-[#a06e2b]" : "text-[#60746a]"}`}
                      >
                        <ListFilter size={15} />
                      </button>
                    </span>
                    {open === column.key && (
                      <ColumnPopup
                        column={column}
                        value={filters[column.key] ?? {}}
                        onChange={(value) =>
                          setFilters((current) => ({
                            ...current,
                            [column.key]: value,
                          }))
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
                  <td className="px-4 py-3 text-center tabular-nums text-[#71827a]">
                    {index + 1}
                  </td>
                  {activeColumns.map((column) => (
                    <td
                      key={column.key}
                      className="max-w-72 border-l border-[#edf1ef] px-4 py-3"
                    >
                      <span className="block truncate">
                        {column.key === "fullName" ? (
                          <span className="flex items-center gap-2">
                            {person.avatarUrl ? (
                              <img
                                src={person.avatarUrl}
                                alt=""
                                className="size-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-[#dbe6e0] font-bold">
                                {person.fullName[0]}
                              </span>
                            )}
                            <strong>{person.fullName}</strong>
                          </span>
                        ) : (
                          format(valueOf(person, column.key), column)
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-12 text-center text-[#71827a]">
              Không có thành viên phù hợp với bộ lọc.
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
          className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "asc" ? "border-[#a06e2b] bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
        >
          <ArrowDownAZ size={15} /> Tăng dần
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...draft, sort: "desc" })}
          className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 ${draft.sort === "desc" ? "border-[#a06e2b] bg-[#fff8ec]" : "border-[#d6e0db] bg-white"}`}
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
            <label
              key={key}
              className="flex items-center gap-2 rounded-md p-1.5 hover:bg-[#edf2ef]"
            >
              <input
                type="checkbox"
                checked={draft.values?.includes(key) ?? false}
                onChange={() =>
                  setDraft({
                    ...draft,
                    values: draft.values?.includes(key)
                      ? draft.values.filter((item) => item !== key)
                      : [...(draft.values ?? []), key],
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <>
          <select
            value={draft.mode ?? "contains"}
            onChange={(event) =>
              setDraft({ ...draft, mode: event.target.value as Filter["mode"] })
            }
            className="w-full rounded-lg border border-[#c8d5ce] bg-white p-2"
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
              className="mt-2 w-full rounded-lg border border-[#c8d5ce] p-2"
            />
          )}
        </>
      )}
      <div className="mt-4 flex justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft({});
            onChange({});
            onClose();
          }}
          className="flex items-center gap-1 rounded-lg border-0 bg-transparent px-2 py-2 text-[#687a71]"
        >
          <RotateCcw size={14} /> Đặt lại
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(draft);
            onClose();
          }}
          className="flex items-center gap-1 rounded-lg border-0 bg-[#29473f] px-3 py-2 font-bold text-white"
        >
          <Check size={14} /> Áp dụng
        </button>
      </div>
    </div>
  );
}
