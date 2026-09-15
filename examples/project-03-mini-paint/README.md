# Project 03 — Mini Paint

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

- Giữ chuột trái để vẽ; interpolation nối mọi mouse sample.
- `1`/`2`: đổi màu; `[`/`]`: giảm/tăng brush radius; `C`: clear.
- `Escape` hoặc nút Close: thoát.

`sampleStroke` trong `final/include/lab.hpp` là code thuần được unit test. `final/src/main.cpp` tích hợp input, circular brush, framebuffer và texture present.
