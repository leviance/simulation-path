# Project 01 — Hello Pixels

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

- `1`: gradient; `2`: checkerboard; `3`: deterministic noise.
- `Escape` hoặc nút Close: thoát.
- Resize window: framebuffer và streaming texture được tạo lại theo pixel size mới.

Target `project_1_final` dùng toàn bộ tính năng. `final/src/main.cpp` chứa SDL lifetime và present path; `final/include/lab.hpp` chứa color packing, framebuffer và ba pattern; `tests/tests.cpp` kiểm tra indexing và bounds.
