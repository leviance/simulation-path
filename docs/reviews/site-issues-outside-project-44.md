# Các lỗi toàn site ngoài phạm vi Project 44

Theo lựa chọn của người dùng ngày 14/11/2026: hoàn tất Project 44 trước, báo cáo các lỗi cũ riêng. Hồ sơ này **không ghi nhận đã sửa** các vấn đề bên dưới.

Nguồn: lần kiểm production toàn site `.validation/p44-site-1794647400072.log`, 325/331 pass, 6 fail trong 178,85 giây. Đây là snapshot của lượt đó, không phải số kiểm lại trên trạng thái cuối P44. Mỗi assertion có thể dừng ở ca lỗi đầu tiên; không suy ra rằng ngoài các vị trí đã hiện ra thì mọi project khác đều sạch.

| Nhóm kiểm                 | Vấn đề đã hiện ra                                                                     | Hướng xử lý riêng                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render các project/lesson | Project 42 `particle-morph-studio` thiếu textual Canvas readout trong HTML được kiểm. | Kiểm cả fallback/initial state và readout khi có dữ liệu; cung cấp thông tin có nghĩa, không chỉ thêm class để thỏa test.                                   |
| Internal links            | `/roadmap/39` trả 404.                                                                | Xác định link authored còn trỏ đường dẫn cũ; sửa sang sản phẩm đã phát hành hoặc thêm alias có phạm vi rõ. Không chuyển mọi ID không hợp lệ thành redirect. |
| Lazy client chunk         | Entry `charged-particle-chamber` của Project 38 là 34.144 bytes, vượt budget hiện có. | Tách controller/render/readout theo ranh giới thực; kiểm lại mọi entry thay vì chỉ ca đầu tiên. Không tăng budget hoặc thu nhỏ simulation để qua test.      |
| Hợp đồng giáo trình       | Project 39 `04-mask-tren-gpu.mdx` thiếu titled C++ checkpoint.                        | Bổ sung đoạn wiring C++ thật nối vào ứng dụng/checkpoint, có giải thích, thay vì thêm block vô nghĩa để làm xanh test.                                      |
| Validation Debug/Release  | Project 42 `10-studio-mot-trieu-hat.mdx` chưa hướng dẫn Debug validation.             | Bổ sung build target tests và `ctest -C Debug` đúng source; giữ kiểm Release và không phụ thuộc assert/NDEBUG.                                              |
| Code giảng dạy 4 spaces   | `morph_app.hpp` của Project 42 có dòng thụt 10 spaces.                                | Sửa nguồn authored, đồng bộ excerpt rồi sinh checkpoint; không sửa riêng output hoặc tắt rule.                                                              |

Lượt lint toàn repo trước đó `.validation/p44-lint-1794644327607.log` báo 178 errors/13 warnings. Sau lượt ấy đã sửa riêng các điểm thuộc tích hợp P44; chưa đếm lại toàn bộ lint nên không gọi con số cũ là số lỗi hiện còn. Cần một đợt riêng để phân loại và sửa theo file/project.

P44 có bộ render/browser/source riêng đã qua; điều đó không biến các lỗi trên thành đã khắc phục hoặc chứng nhận CI toàn site xanh. Đợt chốt P44 không sửa source, lesson hay metadata của các project này.
