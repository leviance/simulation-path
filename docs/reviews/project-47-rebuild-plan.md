# Project 47 — xây lại tấm kim loại nóng

Ngày 15/11/2026 (Asia/Bangkok). Nguồn chuẩn: Project 47 và hợp đồng 0.4, 0.7, 0.9–0.10, 3.4 trong [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

## Khoảng cách đã xác nhận

Bản hiện tại có nền sai phân hữu ích: double buffer, stencil, kiểm biên và cosine mode. Nhưng final chỉ 64×48, thấp hơn mức tối thiểu 128×128. Native chỉ đổi D/dt bằng phím, không có slider. Mọi cấu hình bất ổn đều bị chặn nên người học chưa quan sát được phân kỳ. Vẽ từng ô và thông tin chủ yếu ở title/terminal chưa đủ cho công cụ thí nghiệm lớn. Canvas clone cả field vào React mỗi lần publish.

Không đổi đặc tả để hợp thức hóa các thiếu sót này. Nguồn lúc bắt đầu được giữ trong `.validation/retired-project-47-v1`. Đây là kế hoạch trước triển khai; kết quả và phạm vi nghiệm thu được ghi riêng trong [hồ sơ kiểm chứng Project 47](project-47-rebuild-verification.md).

## Đích đến

Một ứng dụng C++20/SDL 3.4.8 có heatmap 192×192, tô nóng/lạnh, heater giữ nhiệt độ, biên cách nhiệt/vành lạnh, slider D và dt, pause/step/reset, preset, probe và chế độ xem sạch. Default dx=dy=0,5 đơn vị độ dài, D=1,5 đơn vị độ dài²/giây mô hình, dt=1/30 giây; rx+ry=0,4. Các lưới 128/192/256 ở bản lớn cùng phủ miền cách nhiệt 96×96, nên đổi độ phân giải đồng thời đổi h và giới hạn dt.

Theta chuẩn hóa, không tự gán Celsius/Joule. Heater áp đặt theta, không phải nguồn công suất cố định. Bảo toàn tích phân rời rạc chỉ được kiểm khi biên cách nhiệt và không có heater/input. Vành lạnh giữ tâm các ô ngoài ở 0, khác hình học ghost-cell cách nhiệt; không đánh đồng hai miền khi bàn về convergence.

Chế độ thường chặn bước sai CFL trước khi publish. Chế độ thí nghiệm cho phép bước không ổn định để thấy đổi dấu/growth thật, không clamp nghiệm. Giới hạn 400 bước, dừng trước khi ghi nhận candidate có |theta| > 16, từ chối NaN/Inf và giữ field finite cuối. Nhãn/thang màu phải phân biệt dữ liệu vượt 0–1 với clipping chỉ để vẽ.

## Trình tự dạy dự kiến

1. Vẽ field nhỏ bằng SDL, phân biệt theta với màu.
2. Tô bằng chuột/phím, tọa độ và nét liền.
3. Từ trao đổi giữa hai ô tới sai phân 1D/double buffer.
4. Stencil năm điểm cho mặt phẳng.
5. Biên và heater; khi nào được nói bảo toàn.
6. Điều kiện ổn định, D/dt và thí nghiệm phân kỳ có giới hạn.
7. Streaming texture, lưới lớn và quan hệ h/dt.
8. Preset, probe, đồ thị và cách đọc số liệu.
9. Kiểm luật/reference, sai số không gian/thời gian, benchmark hữu hạn và bàn giao mã đầy đủ.

Không tạo bài cho đủ khuôn. Mỗi checkpoint phải chạy độc lập; thuật toán chưa học không ẩn sẵn sau một cờ mà người học chỉ cần bật. Khung SDL/UI được cung cấp phải được chỉ rõ.

## Bằng chứng phải có

- Oracle độc lập theo thông lượng qua từng cạnh, constant/impulse, symmetry, biên và nguồn; không gọi lại cùng Laplacian để tự chứng minh.
- Cosine eigenmode Neumann: phân biệt nghiệm của scheme rời rạc với nghiệm PDE liên tục. Refinement giữ miền/thời điểm và giảm dt theo h², không gộp các sai số thành một epsilon.
- Mốc 192×192 thực sự update/render toàn field; số ô, buffers, visits và các timing có phạm vi rõ. Benchmark Release cùng input, warm-up/repeats/raw samples; không hứa FPS chung.
- Build starter/từng checkpoint/final và CTest Debug/Release từ ZIP; snippet liên tiếp từ đúng snapshot; không commit snapshots, build tree, ZIP hoặc thư viện.
- Canvas dùng cùng tên biến/công thức, pointer capture/keyboard, DPR, reduced motion, pause/reset/preset và cleanup. Kiểm trực tiếp khi localhost có sẵn, không tự bật server.

Mỗi job có supervisor, deadline và một worker cho native build. Không commit/push khi chưa có yêu cầu riêng.
