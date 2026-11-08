import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ChatContextResponse } from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import {
  runFamilyAgent,
  type AgentEvent,
  type ChatModel,
  type ContentSearcher,
  type HistoryTurn,
} from "./agent.js";
import {
  HISTORY_MAX_TURNS,
  HISTORY_TEXT_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  type ChatRequestDto,
} from "./chat.dto.js";
import { FamilyGraph } from "./family-graph.js";
import { createGemini } from "./gemini.js";
import {
  EMBEDDING_DIMENSIONS,
  PgVectorContentStore,
} from "./pgvector-store.js";
import { loadTreeSnapshot, type AskContext } from "./tree-snapshot.js";

export type ChatAi = {
  model: ChatModel;
  chatModel: string;
  /** null: tắt search_content (phương án dự phòng của ADR-0004). */
  contentStore: Pick<PgVectorContentStore, "forTree"> | null;
};

const DEFAULT_DAILY_LIMIT = 50;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Chỉ giữ vài lượt gần nhất, cắt bớt chữ, và lịch sử phải bắt đầu bằng lượt của người dùng. */
export function trimHistory(history: HistoryTurn[] = []): HistoryTurn[] {
  const recent = history
    .slice(-HISTORY_MAX_TURNS)
    .map((turn) => ({
      role: turn.role,
      text: turn.text.trim().slice(0, HISTORY_TEXT_MAX_LENGTH),
    }))
    .filter((turn) => turn.text);
  while (recent[0]?.role === "assistant") recent.shift();
  return recent;
}

export function suggestionsFor(hasMe: boolean) {
  return [
    ...(hasMe
      ? [
          "Ông nội tôi là ai?",
          "Tôi có bao nhiêu anh chị em?",
          "Cụ tổ đời đầu là gì của tôi?",
        ]
      : ["Ai là cụ tổ đời đầu của dòng họ?"]),
    "Ai sống thọ nhất trong dòng họ?",
    "Dòng họ có bao nhiêu người, mấy đời?",
    "Ai trong họ từng đi bộ đội?",
  ];
}

/** Lỗi trong lúc stream: đổi thành thông báo cho người dùng, không lộ chi tiết nội bộ. */
export function describeChatError(error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 429)
    return {
      code: "AI_RATE_LIMITED",
      message: "Trợ lý AI đang quá tải. Bạn thử lại sau ít phút nhé.",
    };
  if (status === 503 || status === 500)
    return {
      code: "AI_UNAVAILABLE",
      message: "Dịch vụ AI tạm thời gián đoạn. Bạn thử lại sau nhé.",
    };
  return {
    code: "AI_ERROR",
    message:
      "Trợ lý AI gặp lỗi khi trả lời. Bạn thử lại hoặc hỏi cách khác nhé.",
  };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private ai: ChatAi | null = null;
  /** Đếm số câu hỏi mỗi ngày theo user. Lưu trong bộ nhớ: đủ cho một instance (ADR-0001). */
  private readonly usage = new Map<string, { day: string; count: number }>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  protected isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  /** Dựng client Gemini và chỉ mục pgvector một lần, lúc có câu hỏi đầu tiên. */
  protected createAi(): ChatAi {
    const gemini = createGemini();
    const { embeddingModel, embeddingDimensions } = gemini.config;
    let contentStore: PgVectorContentStore | null = null;
    if (process.env.AI_CONTENT_SEARCH === "off")
      this.logger.log("search_content đang tắt (AI_CONTENT_SEARCH=off)");
    else if (embeddingDimensions !== EMBEDDING_DIMENSIONS)
      this.logger.warn(
        `GEMINI_EMBEDDING_DIMENSIONS=${embeddingDimensions} khác cột pgvector (${EMBEDDING_DIMENSIONS}), tắt search_content`,
      );
    else
      contentStore = new PgVectorContentStore(
        this.prisma,
        gemini.embedder,
        `${embeddingModel}@${embeddingDimensions}`,
      );
    return {
      model: gemini.model,
      chatModel: gemini.config.chatModel,
      contentStore,
    };
  }

  private getAi() {
    if (!this.isConfigured())
      throw new ServiceUnavailableException({
        code: "AI_NOT_CONFIGURED",
        message: "Trợ lý AI chưa được bật trên máy chủ (thiếu GEMINI_API_KEY)",
      });
    this.ai ??= this.createAi();
    return this.ai;
  }

  private dailyLimit() {
    const value = Number(process.env.AI_DAILY_QUESTION_LIMIT);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_LIMIT;
  }

  private usedToday(userId: string, now = new Date()) {
    const entry = this.usage.get(userId);
    return entry?.day === dayKey(now) ? entry.count : 0;
  }

  private consumeQuota(userId: string, now = new Date()) {
    const used = this.usedToday(userId, now);
    const limit = this.dailyLimit();
    if (used >= limit)
      throw new HttpException(
        {
          code: "AI_QUOTA_EXCEEDED",
          message: `Bạn đã hỏi đủ ${limit} câu hôm nay. Hẹn bạn ngày mai nhé.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.usage.set(userId, { day: dayKey(now), count: used + 1 });
  }

  /** Chỉ thành viên gia phả mới hỏi được. Người ngoài nhận 404 như TreesService để không lộ gia phả. */
  private async askContext(
    treeId: string,
    userId: string,
  ): Promise<AskContext> {
    const membership = await this.prisma.membership.findUnique({
      where: { treeId_userId: { treeId, userId } },
      select: { personId: true },
    });
    if (!membership)
      throw new NotFoundException({
        code: "TREE_NOT_FOUND",
        message: "Không tìm thấy gia phả",
      });
    return { treeId, userId, mePersonId: membership.personId };
  }

  async context(treeId: string, userId: string): Promise<ChatContextResponse> {
    const context = await this.askContext(treeId, userId);
    const [tree, me] = await Promise.all([
      this.prisma.familyTree.findUniqueOrThrow({
        where: { id: treeId },
        select: { name: true },
      }),
      context.mePersonId
        ? this.prisma.person.findUnique({
            where: { id: context.mePersonId },
            select: { id: true, fullName: true },
          })
        : null,
    ]);
    const limit = this.dailyLimit();
    return {
      treeName: tree.name,
      available: this.isConfigured(),
      me: me ? { personId: me.id, name: me.fullName } : null,
      suggestions: suggestionsFor(Boolean(me)),
      limits: {
        questionMaxLength: QUESTION_MAX_LENGTH,
        dailyQuestions: limit,
        remainingToday: Math.max(0, limit - this.usedToday(userId)),
      },
    };
  }

  /**
   * Kiểm tra cấu hình, quyền, hạn mức và tải dữ liệu dòng họ. Lỗi ở bước này vẫn trả JSON thường
   * (chưa mở stream). Trả về hàm `run` để controller chạy trong luồng SSE.
   */
  async prepare(treeId: string, userId: string, request: ChatRequestDto) {
    const ai = this.getAi();
    const context = await this.askContext(treeId, userId);
    const question = request.question.trim();
    if (!question)
      throw new HttpException(
        { code: "VALIDATION_ERROR", message: "Bạn chưa nhập câu hỏi" },
        HttpStatus.BAD_REQUEST,
      );
    this.consumeQuota(userId);
    const graph = new FamilyGraph(
      await loadTreeSnapshot(this.prisma, treeId),
      context,
    );
    const history = trimHistory(request.history);

    return {
      run: async (emit: (event: AgentEvent) => void, signal: AbortSignal) => {
        const started = Date.now();
        let contentIndex: ContentSearcher | null = null;
        if (ai.contentStore)
          try {
            contentIndex = await ai.contentStore.forTree(graph);
          } catch (error) {
            // Embedding lỗi thì vẫn trả lời bằng các tool còn lại (phương án dự phòng ADR-0004).
            this.logger.warn(
              `Không đồng bộ được embedding cho gia phả ${treeId}: ${error instanceof Error ? error.message : error}`,
            );
          }
        const result = await runFamilyAgent({
          model: ai.model,
          modelName: ai.chatModel,
          graph,
          contentIndex,
          question,
          history,
          onEvent: emit,
          signal,
        });
        this.logger.log(
          `chat tree=${treeId} rounds=${result.rounds} tools=${result.trace.map((t) => t.name).join(",") || "-"} tokens=${result.tokens.input}+${result.tokens.output} ${Date.now() - started}ms`,
        );
        return result;
      },
    };
  }
}
