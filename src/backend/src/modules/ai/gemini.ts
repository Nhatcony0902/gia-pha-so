import { GoogleGenAI } from "@google/genai";
import type { Embedder } from "./content-search.js";

/** Cấu hình Gemini lấy từ biến môi trường (ADR-0005). Đổi model không cần sửa code. */
export function geminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new Error(
      "Thiếu GEMINI_API_KEY trong src/backend/.env (lấy key ở https://aistudio.google.com/apikey)",
    );
  return {
    apiKey,
    chatModel: process.env.GEMINI_CHAT_MODEL ?? "gemini-3.8-flash",
    embeddingModel:
      process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
    embeddingDimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 768),
  };
}

export function createGemini() {
  const config = geminiConfig();
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const embedder: Embedder = {
    async embed(texts, kind) {
      const vectors: number[][] = [];
      for (let i = 0; i < texts.length; i += 100) {
        const response = await client.models.embedContent({
          model: config.embeddingModel,
          contents: texts.slice(i, i + 100),
          config: {
            taskType:
              kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
            outputDimensionality: config.embeddingDimensions,
          },
        });
        for (const embedding of response.embeddings ?? [])
          vectors.push(embedding.values ?? []);
      }
      return vectors;
    },
  };
  return { config, model: client.models, embedder };
}
