import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

/** Chatbot gia phả (LMS-016, ADR-0004). LLM + embedding: Gemini (ADR-0005). */
@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class AiModule {}
