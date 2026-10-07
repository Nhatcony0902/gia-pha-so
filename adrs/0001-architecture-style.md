# ADR-0001: Architecture Style

- **Trạng thái:** Proposed
- **Ngày:** 2026-10-07

## Bối cảnh
- Nhóm 4 người, trong đó 3 người code (Sơn BE, Quân FE, Nhật AI) và Bình phụ trách tài liệu; 14 tuần; phạm vi tương đương kế hoạch cho 4 người code.
- Nhiều domain: phả hệ, cộng tác/duyệt thay đổi, media, AI, sự kiện.
- Mọi thay đổi của Editor phải đi qua quy trình duyệt (D2). Vì vậy cần một "cửa" ghi dữ liệu duy nhất.

## Quyết định
- **Modular monolith** ở backend: một ứng dụng NestJS, mỗi domain là một module (xem ADR-0003). Các module chỉ gọi nhau qua service, không truy cập thẳng bảng của module khác.
- **SPA** ở frontend (React + Vite), giao tiếp qua **REST** (`specs/api-contracts.md`), cộng thêm **WebSocket** cho thông báo/bình luận realtime và **SSE** cho chatbot stream.
- **Một cửa ghi cho dữ liệu phả hệ:** mọi thao tác tạo/sửa/xóa Person, Relationship, LifeEvent đều là một "command" gửi tới `ChangeService`:
  - Admin: áp dụng ngay và ghi audit log.
  - Editor: tạo `ChangeRequest` ở trạng thái `PENDING`.
  - Thiết kế cơ chế này từ Sprint 02 (khi đó mọi người đều là Admin), để Sprint 05 chỉ cần bật nhánh Editor, không phải refactor.
- Thuật toán đồ thị (BFS, xưng hô) viết thành **hàm thuần TypeScript**, không phụ thuộc DB, để test độc lập.

## Các phương án đã cân nhắc
- **Microservices:** quá nặng về vận hành cho nhóm 3 người code.
- **Next.js full-stack:** không cần SEO/SSR (app chỉ dùng sau khi đăng nhập). Tài liệu đã chọn Vite + NestJS riêng.
- **Ghi thẳng CRUD, thêm duyệt sau:** rẻ lúc đầu nhưng Sprint 05 phải sửa lại toàn bộ đường ghi.

## Hệ quả
- (+) Một codebase, một lần deploy, dễ debug. Module rõ ràng nên sau này tách ra dễ.
- (+) Approval workflow, audit log và AI re-embedding đều có sẵn một điểm để móc vào.
- (−) Đường ghi phức tạp hơn CRUD thường ngay từ Sprint 02.
