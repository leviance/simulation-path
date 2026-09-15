# Project 05 — Coordinate Map

Gói source cho Simulation Path Release 1.

## Yêu cầu

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

## Build bản final

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

## Build starter và checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Mỗi target dùng một source snapshot riêng: `starter/`, `checkpoints/01` … `checkpoints/06`. Snapshot chỉ chứa kiến thức đã xuất hiện đến bài đó; `final/` là bản hoàn chỉnh sạch, không có macro ẩn tính năng.

SDL chỉ phụ trách window, input và present. Thuật toán học tập nằm trong `final/include/lab.hpp` và có thể test không cần cửa sổ.

## Điều khiển và kết quả

- Chuột trái: đặt hoặc kéo world point màu xanh.
- Chuột phải: pan camera; wheel: zoom quanh cursor; `R`: reset camera.
- Resize window: viewport, framebuffer và texture cập nhật theo pixel size mới.
- Title bar hiển thị screen coordinate, world coordinate, tỉ lệ và round-trip error tại con trỏ.

`Camera2D` trong `final/include/lab.hpp` chứa forward/inverse transform, pan và cursor-anchored zoom. Tests kiểm tra round-trip hai chiều, anchor invariant, pan theo hai trục, invalid zoom, clamp và viewport center.
