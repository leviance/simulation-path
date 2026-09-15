# Project 08 — Mouse Turret

Ứng dụng SDL3 dựng một tháp pháo quay dần về phía chuột. Chương trình dùng dot product để đo mức độ cùng hướng, suy góc bằng `acos`, tách vector projection và kiểm tra mục tiêu có nằm trong vùng khóa hay không.

## Yêu cầu và cách build

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

```bash
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Build mặc định tạo `project_8_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm starter và sáu target `project_8_checkpoint_1` đến `project_8_checkpoint_6`.

## Điều khiển bản hoàn chỉnh

- Di chuyển chuột: thay đổi vị trí mục tiêu.
- `Space`: tạm dừng hoặc tiếp tục việc quay tự động.
- `↑` / `↓`: tăng hoặc giảm tốc độ quay.
- `[` / `]`: thu hẹp hoặc mở rộng nửa góc của vùng khóa mục tiêu.
- `R`: khôi phục hướng nòng súng, mục tiêu và các tham số ban đầu.
- `Escape`: thoát.

Nòng súng màu vàng biểu diễn hướng hiện tại. Vector projection màu xanh dương cho biết mục tiêu nằm bao xa theo hướng nòng súng; đoạn màu đỏ là phần lệch vuông góc. Mục tiêu chuyển sang xanh lá khi nằm trong vùng khóa.

## Cấu trúc source

- `starter/`: cửa sổ, framebuffer, resize và hệ trục đã chạy được.
- `checkpoints/01..06/`: sáu chương trình độc lập, mỗi chương trình chỉ chứa kiến thức đã học tới bài tương ứng.
- `final/`: ứng dụng hoàn chỉnh, không dùng macro checkpoint.
- `tests/`: kiểm tra dot product, góc, projection, hướng quay, giới hạn bước quay và vùng khóa mà không cần mở cửa sổ.
