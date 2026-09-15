# Project 04 — Tiny 2D Rasterizer

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

- Nhấn/kéo chuột trái để di chuyển endpoint gần hơn; cả A và B đều kéo được.
- `D` chọn DDA, `B` chọn Bresenham; `O` lần lượt chọn tám preset octant; mũi tên trái/phải chọn bước trong inspector 9×9, `Home` về bước đầu.
- `T` chạy 7 lượt benchmark trên cùng 20.000 đoạn và in median, build mode, đơn vị cùng checksum ra terminal.
- Final scene hiển thị line, filled/outline rectangle và midpoint circle.

`final/include/lab.hpp` chứa DDA, Bresenham, dữ liệu từng bước cho inspector, rectangle, filled rectangle và circle. Tests bao phủ đoạn suy biến, đủ tám octant, hai đầu và tính liên thông ở cả hai hướng, kích thước rectangle, bốn điểm ngoài cùng, độ đối xứng và sai lệch bán kính của circle.
