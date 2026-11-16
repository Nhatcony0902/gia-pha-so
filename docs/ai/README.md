# Chatbot gia phả (LMS-016)

Chatbot agentic RAG theo ADR-0004, dùng Gemini theo ADR-0005. Có API SSE, trang **Hỏi đáp AI** trên web, và lệnh terminal để thử nhanh và chạy bộ đánh giá.

## Chạy thử

1. Bật Docker Desktop, rồi chạy Postgres: `docker compose up -d` ở thư mục gốc (image `pgvector/pgvector` có sẵn extension `vector`).
2. Thêm vào `src/backend/.env` (xem `.env.example`):
   ```
   GEMINI_API_KEY=...        # https://aistudio.google.com/apikey
   ```
   Để trống thì web vẫn chạy, trang Hỏi đáp AI báo "chưa bật".
3. Migrate và seed (trong `src/`): `npm run db:setup`. Migration `person_embeddings` bật extension `vector` và tạo bảng `PersonEmbedding`. Seed có dòng họ mẫu **Họ Lê Đình – làng An Phú** (54 người, 5 đời) và hai tài khoản demo:
   - `minh@example.com` gắn với Lê Đình Minh (đời 3)
   - `nam@example.com` gắn với Lê Đình Nam (đời 4)

   Mật khẩu: `abcd1234` (chung cho mọi tài khoản seed).

4. Trên web (`npm run dev` trong `src/`): đăng nhập, mở gia phả, chọn **Hỏi đáp AI** trên thanh điều hướng (`/trees/:treeId/chat`).
5. Từ terminal (trong `src/backend/`):
   ```
   npm run ai:chat -- "Ông nội tôi là ai?"
   npm run ai:chat -- --as nam@example.com        # hỏi liên tục, gõ exit để thoát
   npm run ai:chat -- --no-search "Ai sống thọ nhất?"   # tắt search_content
   npm run ai:chat -- --memory "Ai từng đi bộ đội?"     # vector trong bộ nhớ, không cần migration
   ```
6. Chạy bộ câu hỏi đánh giá: `npm run ai:eval`. Báo cáo được ghi vào `docs/ai/eval-results/<ngày>-<model>.md`. Chạy một vài câu: `npm run ai:eval -- --only Q01,Q13`.

## Luồng một câu hỏi

```
Web (ChatPage) ──POST /api/trees/:treeId/chat {question, history}──▶ ChatController
                                                                       │ ValidationPipe (≤ 500 ký tự, ≤ 6 lượt lịch sử)
                                                                       ▼
                                                                   ChatService.prepare
                                                                       │ Membership → quyền xem + "tôi"   (404 nếu không phải thành viên)
                                                                       │ hạn mức ngày                      (429 AI_QUOTA_EXCEEDED)
                                                                       │ loadTreeSnapshot → FamilyGraph
◀── SSE: tool / delta / discard / done / error ────────────────────── streamAgentAnswer
                                                                       │ PgVectorContentStore.forTree: embed lại người có văn bản đổi
                                                                       ▼
                                                                   runFamilyAgent: ≤ 4 vòng gọi tool, stream chữ
```

- **Stream:** chữ của model được đẩy ra ngay (`delta`). Nếu model viết vài chữ rồi mới quyết định gọi tool, server gửi `discard` để UI xóa phần đó, kèm `tool` với dòng trạng thái ("Đang xác định quan hệ…"). Sự kiện `done` mang câu trả lời cuối đã làm sạch link, UI thay phần đã stream bằng bản này.
- **Không dùng `@Sse()` của Nest / `EventSource`:** cần POST body và header `Authorization`. Frontend đọc `ReadableStream` qua `authorizedFetch` (tự refresh token khi 401).
- **Hủy:** người dùng bấm Dừng hoặc rời trang thì kết nối đóng, server hủy lượt gọi Gemini (`abortSignal`) để không tốn token.

## Phân quyền và chống bịa

- `treeId` lấy từ URL nhưng phải có `Membership` của tài khoản trong gia phả đó. "Tôi" là `Membership.personId`, client không gửi được.
- Tool chỉ đọc snapshot của đúng dòng họ. LLM chỉ truyền tên hoặc `personId`, id ngoài dòng họ bị từ chối.
- `search_content` trên pgvector luôn join `FamilyTreePerson` theo `treeId` đang hỏi, rồi lọc lại theo snapshot.
- Câu trả lời cuối được kiểm tra: link `[Tên](/trees/…/persons/…)` tới người không thuộc dòng họ (id bịa, dòng họ khác, link ngoài) bị gỡ, chỉ giữ chữ. Những người còn link được trả trong `persons` để UI hiện "Hồ sơ liên quan".

## Vector search (pgvector)

- Bảng `PersonEmbedding(personId, model, contentHash, embedding vector(768))`, một dòng cho mỗi người có tiểu sử/nghề nghiệp/nơi ở. Đọc ghi bằng raw SQL vì Prisma chưa hỗ trợ kiểu `vector`.
- **Re-embed khi dữ liệu đổi:** chưa có hook `ChangeService`, nên trước mỗi câu hỏi `PgVectorContentStore.sync` so `sha256(model + văn bản)` của từng người trong dòng họ với hash đã lưu. Chỉ người mới hoặc có văn bản đổi mới bị embed lại, người không còn văn bản thì bị xóa. Đổi `GEMINI_EMBEDDING_MODEL` thì toàn bộ được embed lại ở câu hỏi kế tiếp. Lần hỏi đầu của một dòng họ 54 người: 1 lượt gọi embedding (35 văn bản); các lần sau: chỉ 1 truy vấn đọc hash.
- Tìm kiếm quét tuần tự (cosine `<=>`) trong phạm vi một dòng họ, không dùng index HNSW: vài nghìn dòng thì quét nhanh hơn, và HNSW lọc sau sẽ làm thiếu kết quả khi lọc theo dòng họ.
- Embedding lỗi (API sập, sai số chiều) thì chatbot vẫn trả lời bằng 4 tool còn lại (phương án dự phòng ADR-0004). `AI_CONTENT_SEARCH=off` để tắt hẳn.

## Giới hạn chi phí

| Giới hạn | Giá trị | Ở đâu |
| --- | --- | --- |
| Độ dài câu hỏi | 500 ký tự | `chat.dto.ts` |
| Lịch sử gửi kèm | 6 lượt gần nhất, mỗi lượt ≤ 2000 ký tự | `trimHistory` |
| Vòng gọi tool | 4 | `MAX_TOOL_ROUNDS` |
| Token đầu vào cộng dồn mỗi câu hỏi | 60 000 | `DEFAULT_MAX_INPUT_TOKENS` |
| Số câu hỏi mỗi tài khoản mỗi ngày | 50 | `AI_DAILY_QUESTION_LIMIT` |
| Tần suất | 10 câu/phút | `@Throttle` ở `ChatController` |

Hạn mức ngày đếm trong bộ nhớ của tiến trình (đủ cho một instance theo ADR-0001), khởi động lại server thì đếm lại. Mỗi câu hỏi ghi log số vòng, tool đã gọi, token và thời gian (không ghi nội dung câu hỏi).

## Cấu trúc (`src/backend/src/modules/ai/`)

| File | Vai trò |
| --- | --- |
| `ai.module.ts`, `chat.controller.ts` | Module Nest, `GET`/`POST /trees/:treeId/chat` |
| `chat.service.ts` | Quyền, hạn mức, dựng dữ liệu, gọi agent |
| `chat.dto.ts` | Kiểm tra body (dùng `ValidationPipe({ expectedType })`, xem ghi chú bên dưới) |
| `sse.ts` | Ghi luồng SSE, heartbeat 15 s, hủy khi client ngắt |
| `agent.ts` | Khai báo tool, system prompt, vòng lặp tool calling có stream, làm sạch link |
| `tree-snapshot.ts` | Tải một dòng họ vào bộ nhớ. Xác định "tôi" và quyền xem qua Membership |
| `family-graph.ts` | Đồ thị cha mẹ – con – vợ chồng, tính đời, tuổi, so lớn nhỏ |
| `tools.ts` | `find_person`, `get_relatives`, `find_relationship`, `get_stats` (hàm thuần, không cần LLM) |
| `pgvector-store.ts` | `search_content` trên pgvector, đồng bộ embedding theo hash |
| `content-search.ts` | Văn bản đại diện một người; bản chỉ mục trong bộ nhớ cho test và `--memory` |
| `gemini.ts` | Client Gemini cho chat và embedding |
| `eval/questions.ts` | 30 câu hỏi đánh giá kèm đáp án |
| `cli/chat.ts`, `cli/eval.ts` | Lệnh `ai:chat`, `ai:eval` |

Frontend: `src/frontend/src/features/chatbot/` (`api.ts` đọc SSE, `useChat.ts` quản lý hội thoại, `ChatMarkdown.tsx` hiển thị câu trả lời, `speech.ts` + `useSpeech.ts` đọc thành tiếng) và `src/frontend/src/pages/ChatPage.tsx`. Hội thoại giữ trong `sessionStorage` theo gia phả.

## Đọc câu trả lời thành tiếng (LMS-020, ADR-0006)

- Dùng Web Speech API (`speechSynthesis`) của trình duyệt. Không gọi backend, không tốn request Gemini.
- Mỗi câu trả lời có nút **Đọc / Dừng đọc**. Nút **Tự đọc** trên thanh tiêu đề bật đọc tự động khi câu trả lời xong (lưu ở `localStorage` key `chatbot:auto-read`). Không đọc lúc đang stream vì phần đó có thể bị `discard` và bản cuối còn được làm sạch link.
- Chọn giọng `vi-*`, ưu tiên giọng "Natural"/"Online" (Edge: HoaiMy, NamMinh), rồi giọng Google. Danh sách giọng rỗng (Chrome Android hay vậy) thì vẫn đọc với `lang = "vi-VN"`. Có giọng nhưng không có giọng tiếng Việt thì không đọc (tránh đọc bằng giọng tiếng Anh) và hiện hướng dẫn cài giọng.
- Trước khi đọc: bỏ markdown và đường link, "1905 – 1988" thành "1905 đến 1988", `05/03/1988` thành "ngày 5 tháng 3 năm 1988", mỗi mục danh sách là một câu. Câu dài cắt thành đoạn ≤ 180 ký tự và đọc lần lượt, vì Chrome hay tự ngắt khi đọc một đoạn dài.
- Tự dừng khi hỏi câu mới, bấm Cuộc trò chuyện mới hoặc rời trang. Safari iOS chỉ cho đọc sau thao tác của người dùng, nên lúc bấm gửi có "mồi" một utterance rỗng để lần tự đọc sau đó không bị chặn.

**Ghi chú về validate:** backend chạy bằng `tsx` (esbuild) nên không có decorator metadata. `ValidationPipe` toàn cục không biết kiểu của `@Body()` và bỏ qua kiểm tra. Endpoint chat truyền `expectedType` để chắc chắn được kiểm tra.

## Kiểm thử

- `npm test` (trong `src/backend/`): tool, vòng lặp agent với model giả dạng stream (thứ tự sự kiện, `discard`, hủy, trần token, lịch sử), làm sạch link, quyền và hạn mức của `ChatService`, định dạng SSE và ngắt kết nối, kế hoạch đồng bộ embedding, câu SQL tìm kiếm có lọc dòng họ, validate DTO.
- Kiểm thử thủ công end-to-end đã chạy với một server Gemini giả (đặt `GEMINI_BASE_URL`): stream qua proxy Vite không bị dồn buffer; `400`/`401`/`404`/`429` đúng; link bịa bị gỡ; trang chat trên desktop và mobile 390 px (không tràn ngang), dừng giữa chừng rồi hỏi lại, lỗi dịch vụ AI hiện thông báo kèm nút Hỏi lại.

## Bộ câu hỏi đánh giá

30 câu, chia 7 nhóm. Đáp án lấy từ dòng họ Lê Đình, và phần dữ liệu của đáp án được kiểm bằng test (`tools.test.ts`).

| Nhóm | Số câu | Kiểm tra điều gì |
| --- | --- | --- |
| Quan hệ trực tiếp | 7 | Đi theo cạnh cha mẹ – con, vợ chồng. Có bẫy: bà nội là vợ kế chứ không phải vợ cả, con nuôi |
| Xưng hô | 5 | Bác/chú/cô, anh/chị họ theo vai, cụ. Có anh chị em cùng cha khác mẹ |
| Thống kê | 5 | Sống thọ nhất, lớn tuổi nhất, đếm người, số đời, nhiều con nhất |
| Nội dung | 4 | Vector search trên tiểu sử: bộ đội, bác sĩ, vào Sài Gòn, thầy đồ |
| Câu ghép | 3 | Phải gọi nhiều tool rồi so sánh, ví dụ cháu nội nào sinh sớm nhất |
| Không có dữ liệu | 3 | Phải nói không biết, không bịa |
| Phạm vi & an toàn | 3 | Không đọc gia phả khác, chống prompt injection, trùng tên phải hỏi lại |

Chấm tự động chỉ dò từ khóa (khớp nguyên từ, phải đúng dấu) nên chỉ để sàng lọc. Trước mỗi demo vẫn cần đọc lại từng câu trả lời trong báo cáo.

## Còn thiếu

- **Chưa chạy `ai:eval` với Gemini thật** (máy phát triển chưa có `GEMINI_API_KEY`). Cần chạy và ghi kết quả đầu tiên vào `docs/ai/eval-results/`, rồi tinh chỉnh prompt theo các câu chưa đạt.
- **Xưng hô do LLM suy ra** từ đường quan hệ, theo quy tắc ghi trong system prompt, nên không tất định. Khi có Relationship Finder (LMS-007), `find_relationship` sẽ trả thẳng cách gọi.
- **Re-embed theo hash lúc hỏi** thay cho hook `ChangeService` (chưa có). Khi có hook thì chuyển sang embed ngay lúc ghi.
- Hạn mức ngày lưu trong bộ nhớ, chưa bền qua khởi động lại và chưa dùng chung khi chạy nhiều instance.
