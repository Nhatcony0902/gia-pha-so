# ADR-0004: Chatbot dùng RAG có tool calling (agentic RAG)

- **Trạng thái:** Proposed
- **Ngày:** 2026-10-17

## Bối cảnh
- LMS-016 yêu cầu chatbot trả lời được các câu như "Ông nội tôi là ai?", "Tôi có quan hệ gì với X?", "Ai sống thọ nhất?". Chatbot chỉ được trả lời dựa trên dữ liệu thật và chỉ đọc dữ liệu của dòng họ mà user có quyền xem.
- ADR-0002 mới chốt "pipeline RAG tự viết, embedding lưu trong pgvector", chưa nói pipeline định tuyến câu hỏi ra sao.
- Gia phả là dữ liệu có cấu trúc (đồ thị Person–Relationship). Phần văn bản tự do (tiểu sử, kỷ niệm, sự kiện) chiếm ít.

Bảng dưới so sánh các loại chatbot theo 4 tiêu chí:

| Tiêu chí | FAQ bot | LLM thuần | RAG thuần (vector → LLM) | RAG + tool calling |
|---|---|---|---|---|
| Tool use: gọi Relationship Finder, SQL thống kê | Không | Không | Không | Có |
| Reasoning: suy luận nhiều bước (tôi → cha → cha của cha) | Không | Có nhưng không có dữ liệu | Yếu, chỉ thấy top-k đoạn văn | Có, gọi nhiều tool rồi ghép kết quả |
| Dynamic decision: chọn đường xử lý theo câu hỏi | Không, câu trả lời soạn sẵn | Không | Không, câu nào cũng đi vector | Có |
| Grounding: dữ liệu riêng từng dòng họ, có phân quyền | Soạn tay, cố định | Không, dễ bịa | Có, nhưng không tính tổng hợp được | Có |
| Trả lời được 3 câu mẫu của LMS-016 | 0/3 | 0/3 | ~0–1/3 | 3/3 |

RAG thuần thất bại vì:
- "Ai sống thọ nhất?" là phép tính trên toàn bộ dòng họ. Vector search chỉ trả về k bản ghi gần nhất.
- Xưng hô tiếng Việt (chú/bác, anh em họ đời thứ n) phụ thuộc `birthOrder`. Để LLM tự suy từ đoạn văn thì không tất định. Relationship Finder (LMS-007) đã giải đúng bài này.

## Quyết định
Chatbot dùng **tool calling có sẵn của LLM** với một bộ tool nhỏ, cố định. LLM tự quyết gọi tool nào, gọi mấy lần, rồi viết câu trả lời từ kết quả tool. Vector search chỉ là một trong các tool.

| Tool | Dùng cho | Nguồn |
|---|---|---|
| `find_person(name)` | Tìm người theo tên/tên gọi/bí danh, xử lý dấu và trùng tên | Truy vấn Person trong dòng họ |
| `get_relatives(personId, relation)` | Cha mẹ, con, vợ chồng, anh chị em | Cạnh Relationship |
| `find_relationship(fromId, toId)` | Quan hệ và xưng hô giữa hai người | Service Relationship Finder (LMS-007) |
| `get_stats(metric)` | Các thống kê định nghĩa sẵn: thọ nhất, số người theo đời, theo giới tính… | Truy vấn SQL viết sẵn |
| `search_content(query)` | Câu hỏi về nội dung văn bản: tiểu sử, kỷ niệm, sự kiện | Vector search trên pgvector |

Ràng buộc:
- **Phân quyền nằm ở tầng tool, không nằm ở prompt.** `treeId`, `userId` và "tôi" (Person gắn với user trong dòng họ) lấy từ request đã xác thực rồi tool tự gắn vào. LLM không truyền được các giá trị này, nên dù bị prompt injection cũng không đọc được dòng họ khác.
- **Không cho LLM tự sinh SQL** (text-to-SQL). Mọi truy vấn đều viết sẵn và có tham số.
- Mỗi câu hỏi được tối đa **4 vòng gọi tool**. Quá giới hạn thì trả lời "không đủ dữ liệu".
- Mỗi tool trả về `personId` để câu trả lời gắn link tới hồ sơ.
- Không tìm được dữ liệu thì nói không biết. Prompt cấm dùng kiến thức ngoài kết quả tool.
- Trả lời qua SSE (ADR-0001): stream cả trạng thái gọi tool ("Đang tìm quan hệ…") lẫn nội dung trả lời.
- Bộ tool viết thành service trong module `ai`, gọi sang các module khác qua service (ADR-0001). Mỗi tool test riêng được, không cần LLM.

## Các phương án đã cân nhắc
- **FAQ bot:** không trả lời được câu nào phụ thuộc dữ liệu từng dòng họ.
- **LLM thuần:** không có dữ liệu dòng họ nên bịa, vi phạm tiêu chí "không bịa" của LMS-016.
- **RAG thuần:** không tính được thống kê, suy luận nhiều bước yếu, xưng hô không tất định.
- **Bộ phân loại câu hỏi → một nhánh xử lý** (kế hoạch S05 ban đầu): dễ test hơn nhưng mỗi câu chỉ đi một nhánh, nên không xử lý được câu ghép như "Con của chú tôi ai lớn tuổi nhất?" (`find_relationship`/`get_relatives` rồi so tuổi). Giữ lại làm phương án dự phòng nếu tool calling không ổn định với LLM đã chọn.
- **Agent tự chủ nhiều bước / framework agent (LangChain.js…):** thừa cho 5 tool và trái lựa chọn "pipeline tự viết" của ADR-0002. Vòng lặp tool calling tự viết chỉ khoảng vài chục dòng.

## Hệ quả
- (+) Trả lời được câu hỏi quan hệ, thống kê, nội dung văn bản và câu ghép bằng một vòng lặp duy nhất.
- (+) Câu trả lời về quan hệ dùng lại kết quả tất định của LMS-007, giải trình được trước hội đồng.
- (+) Nếu vector search bị trễ, chỉ cần tắt tool `search_content`. Các tool còn lại vẫn trả lời được phần lớn câu hỏi (khớp phương án dự phòng của LMS-016).
- (−) Phải chọn LLM hỗ trợ tool calling tốt (bổ sung cho lựa chọn LLM ở ADR-0002).
- (−) Một câu hỏi tốn nhiều lượt gọi LLM hơn RAG thuần. Cần giới hạn số vòng gọi và chi phí mỗi lượt hỏi (LMS-016, S07).
- (!) Cần có trước: liên kết user ↔ Person trong dòng họ (để hiểu "tôi"), service Relationship Finder, và cơ chế phân quyền theo dòng họ. Xem phần đánh giá hiện trạng trong LMS-016.
