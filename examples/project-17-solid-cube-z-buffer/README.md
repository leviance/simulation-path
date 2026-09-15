# Project 17 — Solid Cube và Z-buffer

Chương trình SDL3 vẽ khối lập phương đặc sáu mặt màu hoàn toàn bằng CPU. Mười hai triangle đi qua projection, rasterization, barycentric depth interpolation và Z-buffer trước khi color buffer được đưa lên streaming texture.

## Điều khiển

- Kéo chuột trái: xoay cube theo hai trục.
- `1` / `2` / `3`: nhìn ba mặt, nhìn thẳng mặt trước hoặc tạo nhiều vùng chồng lấp.
- `D`: bật/tắt depth test.
- `O`: đảo thứ tự mười hai triangle.
- `V`: chuyển giữa color buffer và depth buffer grayscale.
- `Space`: cho cube quay hoặc tạm dừng.
- `N`: tiến một bước khi đang dừng.
- `R`: đặt lại toàn bộ trạng thái.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Build mặc định tạo `project_17_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_17_starter` và bảy target `project_17_checkpoint_1` đến `project_17_checkpoint_7`.

## Cấu trúc gói

- `starter/`: window, renderer, streaming texture và CPU framebuffer trống.
- `checkpoints/01..07/`: source độc lập ở cuối từng bài.
- `final/`: chương trình hoàn chỉnh, có comment và controls đầy đủ.
- `tests/`: kiểm tra mesh topology, NDC depth, buffer lifecycle, fragment test và draw-order invariance mà không mở window.

Project dùng C++20, CMake 3.24+, SDL 3.4.8 và không dùng OpenGL, GLM hay Z-buffer có sẵn.
