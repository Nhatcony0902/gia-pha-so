# ADR-0005: Dùng Gemini cho cả LLM và embedding của chatbot

- **Trạng thái:** Proposed
- **Ngày:** 2026-10-29

## Bối cảnh

- ADR-0002 để ngỏ "LLM API (Claude hoặc GPT), Nhật chốt ở Sprint 01" và lưu ý nếu chọn Claude thì phải thêm một nhà cung cấp embedding.
- ADR-0004 cần LLM gọi tool (function calling) ổn định, và một embedding model cho tool `search_content`.
- Việc chốt nhà cung cấp đang trễ từ Sprint 01, chặn prototype của Sprint 02. Nhóm đã có sẵn API key Gemini (Google AI Studio).

## Quyết định

Dùng **Gemini API** (SDK `@google/genai`) cho cả hai việc:

| Việc                    | Model mặc định                                                         | Biến môi trường                                         |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Chat + function calling | `gemini-3.8-flash`                                                     | `GEMINI_CHAT_MODEL`                                     |
| Embedding               | `gemini-embedding-001`, 768 chiều, `taskType` RETRIEVAL_DOCUMENT/QUERY | `GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS` |

- Tên model chỉ nằm trong biến môi trường, không viết cứng trong code. Google đổi và ngừng model khá nhanh, nên đổi model không cần sửa code.
- Code gọi Gemini gom vào `src/backend/src/modules/ai/gemini.ts`. Vòng lặp agent chỉ phụ thuộc interface `ChatModel` (một hàm `generateContent`), test bằng model giả.

## Các phương án đã cân nhắc

- **Claude + Voyage AI (hoặc OpenAI) embeddings:** function calling tốt, nhưng cần hai nhà cung cấp, hai key và hai chỗ cấu hình.
- **GPT + OpenAI embeddings:** một nhà cung cấp, nhưng nhóm chưa có key.
- **Model chạy local (Ollama…):** không tốn phí API, nhưng máy của nhóm và server deploy khó chạy nổi model đủ tốt cho function calling tiếng Việt.

## Hệ quả

- (+) Một nhà cung cấp, một key cho cả chat lẫn embedding.
- (+) Dùng free tier của AI Studio được trong lúc phát triển.
- (−) Free tier giới hạn số request mỗi phút. Script đánh giá phải tự thử lại khi gặp lỗi 429.
- (−) Theo điều khoản của Google, dữ liệu gửi qua free tier có thể được dùng để cải thiện sản phẩm. Dữ liệu mẫu là hư cấu nên không sao, nhưng trước khi demo bằng dữ liệu gia đình thật thì phải chuyển sang gói trả phí hoặc xin đồng ý.
- (!) Số chiều embedding (768) sẽ cố định trong cột pgvector (S03). Đổi embedding model hoặc số chiều thì phải embed lại toàn bộ.
- (!) Nếu sau này đổi sang Claude/GPT, chỉ cần viết lại `gemini.ts` theo interface `ChatModel` và `Embedder`. Định dạng tool của mỗi hãng khác nhau nên phải chuyển đổi khai báo tool.
