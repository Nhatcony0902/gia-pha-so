# Chatbot gia phả – prototype (LMS-016, Sprint 02)

Prototype của chatbot agentic RAG theo ADR-0004, dùng Gemini theo ADR-0005. Mới chạy từ terminal. API SSE và giao diện chat làm ở Sprint 06.

## Chạy thử

1. Bật Docker Desktop, rồi chạy Postgres: `docker compose up -d` ở thư mục gốc.
2. Thêm vào `src/backend/.env` (xem `.env.example`):
   ```
   GEMINI_API_KEY=...        # https://aistudio.google.com/apikey
   ```
3. Migrate và seed (trong `src/`): `npm run db:setup`. Seed có thêm dòng họ mẫu **Họ Lê Đình – làng An Phú** (54 người, 5 đời) và hai tài khoản demo:
   - `minh@example.com` gắn với Lê Đình Minh (đời 3)
   - `nam@example.com` gắn với Lê Đình Nam (đời 4)

   Mật khẩu: `abcd1234` (chung cho mọi tài khoản seed).

4. Hỏi thử (trong `src/backend/`):
   ```
   npm run ai:chat -- "Ông nội tôi là ai?"
   npm run ai:chat -- --as nam@example.com        # hỏi liên tục, gõ exit để thoát
   npm run ai:chat -- --no-search "Ai sống thọ nhất?"   # tắt search_content
   ```
5. Chạy bộ câu hỏi đánh giá: `npm run ai:eval`. Báo cáo được ghi vào `docs/ai/eval-results/<ngày>-<model>.md`. Chạy một vài câu: `npm run ai:eval -- --only Q01,Q13`.

## Cấu trúc (`src/backend/src/modules/ai/`)

| File                         | Vai trò                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `tree-snapshot.ts`           | Tải một dòng họ vào bộ nhớ. Xác định "tôi" và quyền xem qua Membership                                          |
| `family-graph.ts`            | Đồ thị cha mẹ – con – vợ chồng, tính đời, tuổi, so lớn nhỏ                                                      |
| `tools.ts`                   | `find_person`, `get_relatives`, `find_relationship`, `get_stats` (hàm thuần, không cần LLM)                     |
| `content-search.ts`          | `search_content`: embedding tiểu sử, nghề nghiệp, nơi ở. Vector giữ trong bộ nhớ, cache ở `src/backend/.cache/` |
| `agent.ts`                   | Khai báo tool, system prompt, vòng lặp tool calling (tối đa 4 vòng)                                             |
| `gemini.ts`                  | Client Gemini cho chat và embedding                                                                             |
| `eval/questions.ts`          | 30 câu hỏi đánh giá kèm đáp án                                                                                  |
| `cli/chat.ts`, `cli/eval.ts` | Lệnh `ai:chat`, `ai:eval`                                                                                       |

**Phân quyền:** `treeId` và "tôi" lấy từ tài khoản. Tool chỉ đọc snapshot của đúng dòng họ đó. LLM chỉ truyền được tên hoặc `personId`, và id ngoài dòng họ bị từ chối.

## Bộ câu hỏi đánh giá

30 câu, chia 7 nhóm. Đáp án lấy từ dòng họ Lê Đình, và phần dữ liệu của đáp án được kiểm bằng test (`tools.test.ts`).

| Nhóm              | Số câu | Kiểm tra điều gì                                                                            |
| ----------------- | ------ | ------------------------------------------------------------------------------------------- |
| Quan hệ trực tiếp | 7      | Đi theo cạnh cha mẹ – con, vợ chồng. Có bẫy: bà nội là vợ kế chứ không phải vợ cả, con nuôi |
| Xưng hô           | 5      | Bác/chú/cô, anh/chị họ theo vai, cụ. Có anh chị em cùng cha khác mẹ                         |
| Thống kê          | 5      | Sống thọ nhất, lớn tuổi nhất, đếm người, số đời, nhiều con nhất                             |
| Nội dung          | 4      | Vector search trên tiểu sử: bộ đội, bác sĩ, vào Sài Gòn, thầy đồ                            |
| Câu ghép          | 3      | Phải gọi nhiều tool rồi so sánh, ví dụ cháu nội nào sinh sớm nhất                           |
| Không có dữ liệu  | 3      | Phải nói không biết, không bịa                                                              |
| Phạm vi & an toàn | 3      | Không đọc gia phả khác, chống prompt injection, trùng tên phải hỏi lại                      |

Chấm tự động chỉ dò từ khóa (khớp nguyên từ, phải đúng dấu) nên chỉ để sàng lọc. Trước mỗi demo vẫn cần đọc lại từng câu trả lời trong báo cáo.

## Giới hạn của prototype

- **Xưng hô do LLM suy ra** từ đường quan hệ, theo quy tắc ghi trong system prompt, nên không tất định. Khi có Relationship Finder (LMS-007), `find_relationship` sẽ trả thẳng cách gọi.
- **Vector giữ trong bộ nhớ**, embed lại khi văn bản đổi (có cache). S03 chuyển sang pgvector, S04 re-embed qua hook `ChangeService`.
- Chưa có giới hạn chi phí mỗi lượt hỏi (S07), chưa stream (S06).
