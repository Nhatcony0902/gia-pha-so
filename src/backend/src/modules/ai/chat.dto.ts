import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import type { ChatImageMimeType } from "@family-tree/shared-types";
import {
  CHAT_IMAGE_MAX_BASE64_LENGTH,
  CHAT_IMAGE_MIME_TYPES,
} from "./chat-image.js";

/** Giới hạn độ dài để chặn chi phí mỗi lượt hỏi (LMS-016, S07). */
export const QUESTION_MAX_LENGTH = 500;
export const HISTORY_MAX_TURNS = 6;
export const HISTORY_TEXT_MAX_LENGTH = 2000;

const historyMessage = { message: "Lịch sử hội thoại không hợp lệ" };

export class ChatHistoryTurnDto {
  @IsIn(["user", "assistant"], historyMessage) role!: "user" | "assistant";
  @IsString(historyMessage) @MaxLength(4000, historyMessage) text!: string;
}

const imageMessage = { message: "Ảnh gửi kèm không hợp lệ" };

/** Kiểm tra hình thức. Nội dung (magic bytes, dung lượng thật) kiểm ở `decodeChatImage`. */
export class ChatImageDto {
  @IsIn(CHAT_IMAGE_MIME_TYPES, {
    message: "Chỉ nhận ảnh JPEG, PNG hoặc WebP",
  })
  mimeType!: ChatImageMimeType;

  @IsString(imageMessage)
  @MinLength(1, imageMessage)
  // cho phép thêm chút khoảng trắng/xuống dòng trong base64
  @MaxLength(CHAT_IMAGE_MAX_BASE64_LENGTH + 4096, {
    message: "Ảnh quá lớn",
  })
  data!: string;
}

export class ChatRequestDto {
  @IsString({ message: "Câu hỏi phải là chữ" })
  @MinLength(1, { message: "Bạn chưa nhập câu hỏi" })
  @MaxLength(QUESTION_MAX_LENGTH, {
    message: `Câu hỏi tối đa ${QUESTION_MAX_LENGTH} ký tự`,
  })
  question!: string;

  @IsOptional()
  @IsArray(historyMessage)
  @ArrayMaxSize(20, historyMessage)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryTurnDto)
  history?: ChatHistoryTurnDto[];

  @IsOptional()
  @IsObject(imageMessage)
  @ValidateNested()
  @Type(() => ChatImageDto)
  image?: ChatImageDto;
}
