# Project 18 — Near-plane Clipper

Chương trình SDL3 cho một tam giác chuyển động qua near plane mà không tạo tọa độ chiếu vô hạn. Nửa trái cửa sổ là mặt cắt camera space; nửa phải là viewport sau clipping và rasterization.

## Điều khiển

- `1`: cả ba vertex nằm trong vùng nhìn thấy.
- `2`: một vertex nằm trước near plane.
- `3`: hai vertex nằm trước near plane.
- `4`: cả triangle nằm ngoài.
- `5`: vertex nằm đúng trên near plane.
- `A` / `D`: dịch triangle theo trục Z.
- Kéo chuột trong mặt cắt bên trái: dịch triangle theo Z.
- `Space`: chạy hoặc tạm dừng phép quét qua near plane.
- `N`: tiến một bước khi đang dừng.
- `V`: so clipper với cách loại bỏ cả triangle khi chỉ một vertex không hợp lệ.
- `R`: đặt lại preset hiện tại.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Build mặc định tạo `project_18_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_18_starter` và bảy target `project_18_checkpoint_1` đến `project_18_checkpoint_7`.

## Cấu trúc gói

- `starter/`: window, renderer, streaming texture và CPU framebuffer để tự bắt đầu.
- `checkpoints/01..07/`: source độc lập ở cuối từng bài.
- `final/`: chương trình hoàn chỉnh.
- `tests/`: kiểm thử signed distance, giao điểm, bốn trường hợp clipping, triangulation, projection guard và raster callback mà không mở window.

Project dùng C++20, CMake 3.24+, SDL 3.4.8 và không dùng OpenGL, GLM hay API clipping có sẵn.
