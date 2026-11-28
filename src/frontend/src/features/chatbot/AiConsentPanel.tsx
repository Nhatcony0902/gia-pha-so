import { useMutation } from "@tanstack/react-query";
import type {
  AiSettings,
  UpdateAiSettingsRequest,
} from "@family-tree/shared-types";
import { LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { useId, useState } from "react";
import {
  compactDangerButtonClass,
  compactSecondaryButtonClass,
  primaryButtonClass,
} from "../../lib/ui-classes";
import { updateAiSettings } from "./api";

/**
 * Đồng ý dùng AI cho gia phả (LMS-023, ADR-0008). Chưa bật thì chatbot không gửi gì sang Gemini.
 * Admin thấy nút bật kèm giải thích dữ liệu nào được gửi; thành viên khác chỉ thấy lời nhắn.
 */

function useAiSettings(treeId: string, onChanged: () => void) {
  return useMutation({
    mutationFn: (body: UpdateAiSettingsRequest) =>
      updateAiSettings(treeId, body),
    onSuccess: onChanged,
  });
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Không lưu được cài đặt AI";

function LivingDetailsOption({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-[#b7832f]"
      />
      <span>
        Cho AI xem cả nghề nghiệp, nơi ở, tiểu sử và ngày sinh đầy đủ của{" "}
        <strong>người còn sống</strong>. Chỉ chọn khi các thành viên đã đồng ý.
        Không chọn thì AI chỉ biết tên, giới tính, năm sinh, quê quán và quan hệ
        của họ.
      </span>
    </label>
  );
}

export function AiConsentPanel({
  treeId,
  settings,
  onChanged,
}: {
  treeId: string;
  settings: AiSettings;
  onChanged: () => void;
}) {
  const [shareLiving, setShareLiving] = useState(settings.shareLivingDetails);
  const save = useAiSettings(treeId, onChanged);

  return (
    <section className="mx-auto grid w-full max-w-xl gap-4 rounded-2xl border border-border-default bg-surface p-5 text-left sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f6ead3] text-accent-deep">
          <ShieldCheck size={22} />
        </span>
        <div className="grid gap-1">
          <h1 className="m-0 font-display text-xl font-semibold text-ink">
            Trợ lý AI chưa được bật
          </h1>
          <p className="m-0 text-sm text-ink-muted">
            Trợ lý AI chạy trên dịch vụ Gemini của Google, nên phải gửi dữ liệu
            gia phả ra ngoài. Trưởng họ (Admin) cần đồng ý trước.
          </p>
        </div>
      </div>

      {settings.canManage ? (
        <>
          <div className="grid gap-1.5 text-sm text-ink-soft">
            <p className="m-0 font-bold text-ink">
              Khi bật, mỗi câu hỏi có thể gửi sang Gemini:
            </p>
            <ul className="m-0 grid gap-1 pl-5">
              <li>Tên, giới tính, đời, quan hệ cha mẹ – con – vợ chồng.</li>
              <li>
                Năm sinh, năm mất, quê quán; tiểu sử và nơi an táng của người đã
                mất.
              </li>
              <li>
                Hồ sơ của chính người đang hỏi; câu hỏi và ảnh họ tự gửi kèm.
              </li>
            </ul>
            <p className="m-0">
              Không gửi số điện thoại, email, địa chỉ, nhóm máu, giấy tờ tùy
              thân. Admin tắt được bất cứ lúc nào, khi tắt máy chủ xóa luôn dữ
              liệu tìm kiếm đã tạo cho AI.
            </p>
          </div>
          <LivingDetailsOption
            checked={shareLiving}
            onChange={setShareLiving}
            disabled={save.isPending}
          />
          {save.isError && (
            <p role="alert" className="m-0 text-sm text-[#a33d32]">
              {errorText(save.error)}
            </p>
          )}
          <button
            type="button"
            className={primaryButtonClass}
            disabled={save.isPending}
            onClick={() =>
              save.mutate({ enabled: true, shareLivingDetails: shareLiving })
            }
          >
            {save.isPending && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            Đồng ý và bật trợ lý AI
          </button>
        </>
      ) : (
        <p className="m-0 rounded-lg border border-[#c4d6cd] bg-[#f1f7f4] px-3 py-2 text-sm text-ink-soft">
          Admin của gia phả chưa bật trợ lý AI. Bạn nhờ trưởng họ vào trang này
          để xem dữ liệu nào được gửi đi và bật nếu đồng ý.
        </p>
      )}
    </section>
  );
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Dòng trạng thái riêng tư dưới ô hỏi. Admin mở ra để đổi tùy chọn hoặc tắt AI. */
export function AiPrivacyNote({
  treeId,
  settings,
  onChanged,
}: {
  treeId: string;
  settings: AiSettings;
  onChanged: () => void;
}) {
  const save = useAiSettings(treeId, onChanged);
  const summary = settings.shareLivingDetails
    ? "AI xem được chi tiết người còn sống"
    : "Chi tiết người còn sống được ẩn với AI";

  if (!settings.canManage)
    return (
      <span className="inline-flex items-center gap-1">
        <ShieldCheck size={13} className="shrink-0" /> {summary}
      </span>
    );

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer items-center gap-1 underline-offset-2 hover:underline">
        <ShieldCheck size={13} className="shrink-0" /> {summary}
        {settings.enabledAt && ` · bật ngày ${formatDay(settings.enabledAt)}`}
      </summary>
      <div className="mt-2 grid gap-2.5 rounded-lg border border-border-default bg-surface p-3">
        <LivingDetailsOption
          checked={settings.shareLivingDetails}
          disabled={save.isPending}
          onChange={(value) =>
            save.mutate({ enabled: true, shareLivingDetails: value })
          }
        />
        {save.isError && (
          <p role="alert" className="m-0 text-sm text-[#a33d32]">
            {errorText(save.error)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={compactDangerButtonClass}
            disabled={save.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Tắt trợ lý AI cho cả gia phả? Mọi người sẽ không hỏi được nữa cho tới khi bật lại.",
                )
              )
                save.mutate({ enabled: false });
            }}
          >
            <ShieldOff size={15} /> Tắt trợ lý AI
          </button>
          {save.isPending && (
            <span className={compactSecondaryButtonClass} aria-live="polite">
              <LoaderCircle size={15} className="animate-spin" /> Đang lưu…
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
