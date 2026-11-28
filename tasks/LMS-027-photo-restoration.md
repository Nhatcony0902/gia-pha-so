# LMS-027: Phục chế và tô màu ảnh cũ

- **Trạng thái:** Todo
- **Owner:** _(Nhật giao)_
- **Sprint:** Nếu dư thời gian
- **Spec liên quan:** `specs/features.md` (A3, D4)
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 5 (mức "Nâng cao")

## User story
Là thành viên dòng họ, tôi muốn làm rõ và tô màu ảnh cũ của ông bà để lưu giữ và in vào sách gia phả.

## Tiêu chí chấp nhận
- [ ] Trên ảnh hồ sơ hoặc ảnh ký ức: nút "Phục chế" (khử nhiễu, làm nét, sửa vết xước) và "Tô màu"
- [ ] Dùng mô hình có sẵn, không tự huấn luyện
- [ ] Ảnh kết quả lưu thành bản mới, **giữ ảnh gốc**; so sánh trước/sau bằng thanh trượt
- [ ] Ảnh đã qua AI luôn có nhãn "Ảnh đã được AI xử lý" khi xem, tải về và khi in
- [ ] Chỉ chạy khi gia phả đã bật AI (ADR-0008)
- [ ] Đánh giá: ≥ 10 ảnh mẫu; khảo sát 5 người chấm 1–5 (rõ hơn, giữ đúng khuôn mặt); báo cáo trường hợp làm sai mặt người

## Ghi chú kỹ thuật
- Ứng viên: GFPGAN / CodeFormer (khuôn mặt), Real-ESRGAN (làm nét), DeOldify (tô màu) qua dịch vụ có sẵn hoặc chạy local. Chọn bằng ADR mới.
