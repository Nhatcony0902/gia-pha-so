import type { SnapshotPerson, TreeSnapshot } from "./tree-snapshot.js";

/**
 * Riêng tư khi gửi dữ liệu gia phả sang dịch vụ AI (LMS-023, ADR-0008).
 *
 * - AI chỉ chạy khi Admin của gia phả đã bật (đồng ý gửi dữ liệu sang Gemini).
 * - Mặc định chi tiết của người còn sống bị ẩn trước khi vào tool: chỉ giữ tên, giới tính,
 *   năm sinh, quê quán và quan hệ, đủ để trả lời câu hỏi quan hệ và thống kê.
 * - Hồ sơ của chính người đang hỏi không bị ẩn: họ tự hỏi về mình.
 *
 * Ẩn ngay trên snapshot, trước khi dựng FamilyGraph, nên mọi tool (kể cả search_content và
 * embedding) đều chỉ thấy bản đã ẩn.
 */
export type AiTreeSettings = {
  aiEnabledAt: Date | null;
  aiShareLivingDetails: boolean;
};

/** Các trường bị ẩn với người còn sống. Ngày sinh được rút về năm. */
export const HIDDEN_LIVING_FIELDS = [
  "occupation",
  "currentResidence",
  "biography",
] as const satisfies ReadonlyArray<keyof SnapshotPerson>;

export function isAiEnabled(settings: Pick<AiTreeSettings, "aiEnabledAt">) {
  return settings.aiEnabledAt !== null;
}

function hideLivingDetails(person: SnapshotPerson): SnapshotPerson {
  const birthYear = person.birthDate?.getUTCFullYear();
  return {
    ...person,
    birthDate:
      birthYear === undefined ? null : new Date(Date.UTC(birthYear, 0, 1)),
    birthDatePrecision: birthYear === undefined ? null : "YEAR",
    occupation: null,
    currentResidence: null,
    biography: null,
    detailsHidden: true,
  };
}

/** Bản snapshot được phép gửi sang AI theo cài đặt của gia phả. Không sửa snapshot gốc. */
export function snapshotForAi(
  snapshot: TreeSnapshot,
  settings: Pick<AiTreeSettings, "aiShareLivingDetails">,
  mePersonId: string | null,
): TreeSnapshot {
  if (settings.aiShareLivingDetails) return snapshot;
  return {
    ...snapshot,
    persons: snapshot.persons.map((person) =>
      person.isDeceased || person.id === mePersonId
        ? person
        : hideLivingDetails(person),
    ),
  };
}

/** Thêm vào system prompt khi có người bị ẩn chi tiết, để model không nói "gia phả chưa có". */
export const PRIVACY_RULES = `
Riêng tư: người có "detailsHidden": true là người còn sống mà dòng họ chọn không chia sẻ chi tiết với AI. Với họ bạn chỉ biết tên, giới tính, năm sinh, quê quán và quan hệ. Ai hỏi nghề nghiệp, nơi ở, tiểu sử hay ngày sinh cụ thể của họ thì nói thông tin này được ẩn theo cài đặt riêng tư của dòng họ và mời xem trang hồ sơ, không nói là gia phả không có.`;
