# Project 49 — xây lại từ sản phẩm đầu ra

Nguồn chuẩn: Project 49 và các mục 0.4, 0.7–0.10, 3.4–3.6 trong [đặc tả v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không sửa hoặc hạ yêu cầu chuẩn để hợp thức hóa hiện trạng.

Người dùng yêu cầu thay toàn bộ bản cũ vì sản phẩm giống demo chất lượng thấp. Phương án sửa nối tiếp thành 12 bài cũng đã được bỏ. Bản dự phòng có hash nằm trong `.validation/retired-project-49-2026-11-15T12-41-32-139Z`; không commit bản dự phòng, build, thư viện hay ZIP sinh tự động. Người dùng đã duyệt **hướng hình khói trắng** từ ảnh C++ chạy lưới 256² trong 180 tick; đây là duyệt hướng hình, chưa phải nghiệm thu toàn bộ tương tác.

## Thiết kế thay thế

- Ứng dụng C++/SDL3 hoàn chỉnh trước, rồi giải thích đúng source đang chạy; không dùng Canvas thay native.
- Hai luồng phun trắng liên tục, viewport lớn, sạch; tracer màu tùy chọn. Click thêm khói, drag chỉ khuấy, Paint/Erase/Probe riêng. Không phủ noise giả hoặc hạt hoạt ảnh ngoài solver.
- Tự viết MAC, RK2, hai projection và lần lượt Jacobi → CG → PCG/multigrid; dùng MacCormack có limiter và confinement để giữ cấu trúc. Nêu rõ giới hạn của mô hình đồ họa, không gọi đây là mô phỏng vật lý/ánh sáng 3D chính xác tuyệt đối.
- Mặc định 128² cho tương tác, tùy chọn 256² để tăng chi tiết. Tất cả scalar/cạnh đều thực sự được cấp phát, cập nhật và vẽ. Lưới nhỏ phục vụ học; hierarchy thô chỉ giải pressure correction.
- **15 bài theo nội dung**: scaffold/texture, brush, scalar transport, MAC, Jacobi, projection, velocity transport, nguồn/lực/input, viscosity, clock, CG, MacCormack, confinement, multigrid và nghiệm thu. URL cũ có alias theo cơ chế sẵn có; nội dung cũ được thay, không giữ hai giáo trình song song.
- Mỗi bài giải thích vấn đề, công thức, toàn hàm từ đúng snapshot, vị trí gọi, dự đoán/lỗi cố ý, DoD và bài tập. Source đầy đủ và ZIP khớp nhau; snippet markers thay kiểm token-subsequence lỏng.
- Canvas giữ dữ liệu số ngoài React, chỉ gửi bảng số nhỏ tối đa 8 Hz; có reduced-motion, DPR, capture, keyboard và dispose. Viewport dùng cùng scalar, palette và công thức với C++.

## Nghiệm thu bắt buộc

1. Oracle độc lập: affine/RK2/translation, MAC flux, Jacobi tính tay, eigenmode Neumann, projection 128², viscosity equation, limiter/confinement, NaN và clock. Không dùng hình đẹp thay số đo.
2. Sinh 15 checkpoint, kiểm không có thuật toán tương lai trong snapshot sớm; code trong bài trích nguyên đoạn đúng snapshot.
3. Giải nén ZIP, đối chiếu từng byte/digest; build starter, 15 checkpoint và final bằng một worker trong Debug/Release; CTest có giới hạn 20 giây.
4. Kiểm TypeScript, cú pháp, style, architecture và Git hygiene; build production và kiểm tất cả route P49. Không tuyên bố toàn site 100% nếu chưa kiểm hoặc còn lỗi ngoài phạm vi.
5. Native input bằng ComputerUse nếu công cụ khả dụng; Canvas qua localhost nếu người dùng đang bật. Tự kiểm localhost, không hỏi lại và không tự khởi động server.

Mỗi job có watchdog và deadline tổng, chỉ chạy một job nặng mỗi lần; không để kiểm thử kéo dài hàng giờ hoặc chạy bù vô hạn. Không commit/push trong yêu cầu xây lại. Kết quả thực tế được ghi riêng trong báo cáo nghiệm thu; kế hoạch không phải bằng chứng đã đạt.
