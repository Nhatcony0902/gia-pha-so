import type { EventCategory } from "@family-tree/shared-types";

export const categoryLabel: Record<EventCategory | "BIRTH" | "DEATH", string> =
  {
    DEATH_ANNIVERSARY: "Giỗ / tưởng niệm",
    REUNION: "Họp mặt gia đình",
    CEREMONY: "Nghi lễ",
    WEDDING: "Cưới hỏi",
    BIRTHDAY: "Sinh nhật",
    MEETING: "Cuộc họp",
    OTHER: "Khác",
    BIRTH: "Ngày sinh",
    DEATH: "Ngày mất",
  };

export const eventCategories = Object.entries(categoryLabel).filter(
  ([key]) => key !== "BIRTH" && key !== "DEATH",
) as Array<[EventCategory, string]>;

export const categoryTone: Record<EventCategory | "BIRTH" | "DEATH", string> = {
  DEATH_ANNIVERSARY: "#8b665e",
  REUNION: "#2f7667",
  CEREMONY: "#926b25",
  WEDDING: "#a64f68",
  BIRTHDAY: "#4f70a8",
  MEETING: "#65549a",
  OTHER: "#687a71",
  BIRTH: "#3e7968",
  DEATH: "#806660",
};
