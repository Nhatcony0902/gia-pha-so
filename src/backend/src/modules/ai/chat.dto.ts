import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

/** Giới hạn độ dài để chặn chi phí mỗi lượt hỏi (LMS-016, S07). */
export const QUESTION_MAX_LENGTH = 500;
export const HISTORY_MAX_TURNS = 6;
export const HISTORY_TEXT_MAX_LENGTH = 2000;

const historyMessage = { message: "Lịch sử hội thoại không hợp lệ" };

export class ChatHistoryTurnDto {
  @IsIn(["user", "assistant"], historyMessage) role!: "user" | "assistant";
  @IsString(historyMessage) @MaxLength(4000, historyMessage) text!: string;
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
}
