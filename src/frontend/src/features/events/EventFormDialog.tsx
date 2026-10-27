import type {
  EventCategory,
  FamilyEventDetail,
  FamilyEventInput,
} from "@family-tree/shared-types";
import { CalendarPlus, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DialogShell } from "../family-tree/ManagementDialogs";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formLabelClass,
} from "../../lib/ui-classes";
import { eventCategories } from "./constants";

const localInputValue = (value?: string | null, allDay = false) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return allDay
    ? day
    : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIso = (value: string, allDay: boolean) =>
  new Date(allDay ? `${value}T00:00:00` : value).toISOString();

export function EventFormDialog({
  event,
  onClose,
  onSave,
  pending,
}: {
  event?: FamilyEventDetail | null;
  onClose: () => void;
  onSave: (input: FamilyEventInput) => void;
  pending?: boolean;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(
    event?.category ?? "DEATH_ANNIVERSARY",
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [isAllDay, setAllDay] = useState(event?.isAllDay ?? false);
  const [startAt, setStartAt] = useState(
    localInputValue(event?.startAt, event?.isAllDay),
  );
  const [endAt, setEndAt] = useState(
    localInputValue(event?.endAt, event?.isAllDay),
  );

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    onSave({
      title: title.trim(),
      category,
      description: description.trim() || null,
      location: location.trim() || null,
      startAt: toIso(startAt, isAllDay),
      endAt: endAt ? toIso(endAt, isAllDay) : null,
      isAllDay,
    });
  };

  return (
    <DialogShell
      title={event ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={formLabelClass}>
            Tên sự kiện
            <input
              className={formFieldClass}
              required
              maxLength={200}
              value={title}
              onChange={(input) => setTitle(input.target.value)}
              placeholder="Ví dụ: Giỗ họ năm 2027"
              autoFocus
            />
          </label>
          <label className={formLabelClass}>
            Phân loại
            <select
              className={formFieldClass}
              value={category}
              onChange={(input) =>
                setCategory(input.target.value as EventCategory)
              }
            >
              {eventCategories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-label">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(input) => {
              const checked = input.target.checked;
              setStartAt(
                localInputValue(
                  startAt ? toIso(startAt, isAllDay) : null,
                  checked,
                ),
              );
              setEndAt(
                localInputValue(endAt ? toIso(endAt, isAllDay) : null, checked),
              );
              setAllDay(checked);
            }}
          />
          Sự kiện cả ngày
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={formLabelClass}>
            Bắt đầu
            <input
              className={formFieldClass}
              required
              type={isAllDay ? "date" : "datetime-local"}
              value={startAt}
              onChange={(input) => setStartAt(input.target.value)}
            />
          </label>
          <label className={formLabelClass}>
            Kết thúc (không bắt buộc)
            <input
              className={formFieldClass}
              type={isAllDay ? "date" : "datetime-local"}
              min={startAt || undefined}
              value={endAt}
              onChange={(input) => setEndAt(input.target.value)}
            />
          </label>
        </div>
        <label className={formLabelClass}>
          Địa điểm
          <input
            className={formFieldClass}
            maxLength={500}
            value={location}
            onChange={(input) => setLocation(input.target.value)}
            placeholder="Nhà thờ họ, địa chỉ…"
          />
        </label>
        <label className={formLabelClass}>
          Mô tả
          <textarea
            className={`${formFieldClass} min-h-28 resize-y`}
            maxLength={5000}
            value={description}
            onChange={(input) => setDescription(input.target.value)}
            placeholder="Nội dung, chương trình, lưu ý cho người tham gia…"
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-border-default pt-4">
          <button
            type="button"
            className={compactSecondaryButtonClass}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={compactPrimaryButtonClass}
            disabled={pending || !title.trim() || !startAt}
          >
            {event ? <Save size={16} /> : <CalendarPlus size={16} />}
            {pending ? "Đang lưu…" : event ? "Lưu thay đổi" : "Tạo sự kiện"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
