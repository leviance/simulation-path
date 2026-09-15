# Project 16 — Triangle Rasterizer

Project này nhận ba vertex đã nằm trong screen space rồi tự quyết định từng pixel nào thuộc bề mặt tam giác. Chương trình không dùng `SDL_RenderGeometry`: C++ tự dựng bounding box, tính edge function tại pixel center, áp dụng top-left rule và nội suy màu barycentric; SDL3 chỉ đưa CPU framebuffer lên cửa sổ và nhận input.

## Cấu trúc gói source

- `starter/`: framebuffer SDL3 và các primitive vẽ cơ bản, chưa có triangle rasterizer.
- `checkpoints/01..07/`: snapshot chạy độc lập tương ứng với bảy lesson.
- `final/`: ứng dụng hoàn chỉnh có kéo vertex, preset, pause/single-step, fill-rule toggle và barycentric color.
- `tests/`: kiểm thử bounds, winding, coverage, shared-edge ownership và barycentric invariants mà không mở window.
- `source-template/`: nguồn chuẩn dùng để sinh starter/checkpoint/final; người học thường không cần sửa thư mục này.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target chính là `project_16_final`. Các target học tập lần lượt là `project_16_starter` và `project_16_checkpoint_1` tới `project_16_checkpoint_7`.

## Điều khiển bản final

- Kéo `A`, `B`, `C`: thay hình tam giác.
- `1–5`: tam giác thường, đảo winding, suy biến, cắt bởi viewport và cặp tam giác chung cạnh.
- `T`: đổi giữa inclusive rule và top-left rule.
- `C`: đổi solid color và barycentric RGB.
- `Space`: pause/resume quá trình quét candidate pixel.
- `N`: khi pause, tiến thêm một candidate pixel.
- `Up/Down`: khi pause, tiến/lùi 100 candidate pixel.
- `R`: khôi phục preset hiện tại.
- `Escape`: thoát.

Project 16 chưa có Z-buffer và chưa clip tam giác trong camera space. Hai phần đó lần lượt thuộc Project 17 và Project 18.
