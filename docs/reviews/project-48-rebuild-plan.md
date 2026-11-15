# Project 48 — kế hoạch xây lại theo đặc tả

Ngày 15/11/2026. Phạm vi là vector-field inspector 2D, không phải solver chất lưu. Nguồn chuẩn: Project 48, mục 0.4, 0.7–0.10 và 3.4–3.6 của [đặc tả](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

## Khoảng thiếu đã xác nhận

- Ứng dụng hiện mở với 33×25 nút, chưa đạt ít nhất 32×32. Đây chỉ là lưới học; bản cuối phải mở với 65×49, có tùy chọn 129×97 trên cùng miền.
- C++ chủ yếu đưa inspector vào console/window title, chưa có bảng số và legend đọc trực tiếp. Thiếu toggle tracer và chế độ xem sạch.
- Scalar có dữ liệu riêng nhưng chưa có lớp mũi tên gradient độc lập với vận tốc. Các code block chưa có binding snippet marker như hợp đồng hiện tại.
- Canvas đang sao chép cả mảng tracer vào React mỗi frame; cần tách dữ liệu động, khống chế nhịp đọc số và tránh click trước hydration.

## Sản phẩm bàn giao

Giữ chín bài vì chín thay đổi có mục tiêu riêng: mũi tên → trường mẫu/inspector → scalar/gradient → divergence → curl → mép/sai số → tracer → tương tác xoáy → kiểm chứng. Giữ URL hiện tại, sửa nội dung và mã nối vào ứng dụng khi implementation thay đổi. Không ép số bài theo khuôn.

Final C++20/SDL 3.4.8: trường 65×49 mặc định; presets uniform/source/sink/rotation/shear/gradient; scalar bowl/hill độc lập; overlay potential/gradient/div/curl; tracer bilinear/RK2 dt=1/60 và vệt hữu hạn; chỉnh xoáy bằng chuột/bàn phím; pause/step/reset, bật/tắt tracer, inspector, legend, clean view. 33×25 chỉ là lưới học và phép refinement có nhãn rõ. Không gọi các tracer là lượng chất lỏng được bảo toàn.

## Các nhóm bằng chứng phải có

1. Oracle: trường affine và scalar bậc hai, dấu source/sink/curl, Gaussian refinement, curl(gradient), bilinear affine, RK2 so quỹ đạo giải tích, NaN/Inf và budget thời gian.
2. Source: marker lấy từ đúng checkpoint; bài nêu phần có sẵn, dữ liệu mới và lời gọi mới; không có thuật toán tương lai trong snapshot trước bài.
3. Native: starter, chín checkpoint, final và CTest Debug/Release bằng một worker; smoke hữu hạn/capture, kiểm lưới và tracer thực. CMake/ZIP vẫn sinh ngoài Git, không tải lại SDL nếu cache exact3.4.8 có sẵn.
4. Web: TypeScript, registry, budget; từng route, điều khiển Canvas/keyboard/pointer, reduced motion, đổi theme/tiến độ, source và ZIP trên server người dùng đang mở nếu có. Không tự bật server.
5. Package: danh sách/bytes/hash của ZIP khớp nguồn. Git hygiene không có library/build/output.

Mỗi tiến trình dài phải có watchdog và hủy process tree. Kết quả toàn site ngoài Project 48 được báo riêng, không sửa test để hợp thức hóa hiện trạng.
