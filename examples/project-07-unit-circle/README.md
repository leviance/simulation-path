# Project 07 — Unit Circle Visualizer

Ứng dụng SDL3 minh họa radian, `sin`, `cos`, vận tốc góc, hình chiếu, đồ thị tuần hoàn và phép suy góc bằng `atan2`.

## Yêu cầu và cách build

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

```bash
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Build mặc định tạo `project_7_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm starter và sáu target `project_7_checkpoint_1` đến `project_7_checkpoint_6`.

## Điều khiển bản hoàn chỉnh

- `Space`: tạm dừng hoặc tiếp tục chuyển động tự động.
- `↑` / `↓`: tăng hoặc giảm vận tốc góc.
- Kéo điểm vàng trên đường tròn: chuyển sang điều khiển góc bằng chuột và dùng `atan2` để suy góc.
- `R`: đưa góc về 35°, khôi phục vận tốc ban đầu và xóa lịch sử đồ thị.
- `Escape`: thoát.

Màu xanh lá biểu diễn `sin(angle)`, màu xanh dương biểu diễn `cos(angle)`. Hai vector thành phần đi từ tâm; các đường xám chỉ dóng đầu kim về trục. Đồ thị giữ tối đa 360 mẫu và đặt chúng trên một cửa sổ thời gian 6 giây bằng timestamp.

## Cấu trúc source

- `starter/`: cửa sổ, framebuffer, resize và vòng lặp SDL3 đã chạy được.
- `checkpoints/01..06/`: sáu phiên bản độc lập, mỗi phiên bản chỉ chứa kiến thức đã học đến bài tương ứng.
- `final/`: chương trình hoàn chỉnh, không còn macro checkpoint.
- `tests/`: kiểm tra đổi độ/radian, chuẩn hóa góc, unit circle, vận tốc góc, chu kỳ, lịch sử đồ thị và `atan2` mà không cần mở cửa sổ.
