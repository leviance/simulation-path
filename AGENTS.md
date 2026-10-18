# Hướng dẫn làm việc với roadmap

## Tài liệu tham chiếu chuẩn

Đọc [Product Specification v4 — 78 project](docs/specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md) trước khi xây dựng hoặc review một project. Đây là nguồn chuẩn cho số thứ tự, tên, sản phẩm cuối, phạm vi, quy mô, tương tác, ràng buộc kỹ thuật và Acceptance Criteria của roadmap.

- Roadmap gồm Project 01–72 và sáu project cầu nối tùy chọn 73–78.
- Project 66–78 giữ nguyên thứ tự trong bản hoàn thiện; không gộp Widget Tree với Box Layout hoặc TinyCSS với TinyFlex.
- Tự quyết số bài, thứ tự giải thích và checkpoint theo nội dung. Không thu nhỏ sản phẩm cuối để vừa với một khuôn bài học.
- Canvas hỗ trợ giảng dạy, không thay thế ứng dụng C++/SDL3 hoàn chỉnh được yêu cầu.
- `course/roadmap.ts`, metadata, lesson, source và tests là phần triển khai; không thay thế đặc tả sản phẩm. Không mặc định project hiện có đã đáp ứng spec chỉ vì build/test thành công.
- Nếu phát hiện khác biệt với spec, nêu rõ khác biệt. Không tự sửa hoặc hạ yêu cầu của tài liệu chuẩn để hợp thức hóa hiện trạng.

Đọc thêm [ARCHITECTURE.md](ARCHITECTURE.md) về cấu trúc repository, nguồn authored, output được sinh và giới hạn chạy build/test.
