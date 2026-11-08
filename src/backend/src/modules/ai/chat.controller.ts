import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ChatRequestDto } from "./chat.dto.js";
import { ChatService, describeChatError } from "./chat.service.js";
import { streamAgentAnswer } from "./sse.js";

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller("trees/:treeId/chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  /** Thông tin cho màn hình chat: "tôi" là ai, câu hỏi gợi ý, hạn mức còn lại. */
  @Get()
  context(
    @Param("treeId") treeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chat.context(treeId, request.user.userId);
  }

  /** Hỏi chatbot. Trả về luồng SSE (`ChatStreamEvent`), lỗi trước khi mở luồng thì trả JSON như mọi API. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async ask(
    @Param("treeId") treeId: string,
    // Chỉ rõ kiểu DTO: chạy bằng tsx (esbuild) không có decorator metadata, ValidationPipe
    // toàn cục không biết kiểu của body nên sẽ bỏ qua kiểm tra.
    @Body(
      new ValidationPipe({
        expectedType: ChatRequestDto,
        whitelist: true,
        transform: true,
      }),
    )
    body: ChatRequestDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const session = await this.chat.prepare(treeId, request.user.userId, body);
    await streamAgentAnswer(response, session.run, describeChatError);
  }
}
