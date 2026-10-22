# Project 18 — Near-plane Clipper

Tự cắt tam giác trong camera space trước phép chia phối cảnh. Sản phẩm là ứng dụng C++/SDL3 có bề mặt RGB đi xuyên near plane và camera, không bỏ cả hình khi chỉ một đỉnh ở ngoài.

## Thử tự làm trước

Từ rasterizer CPU của Project 16 và kiến thức camera của Project 15, thử xây một chương trình cho phép dịch tam giác theo Z, sinh 0/1/2 tam giác đầu ra và so với cách discard-whole. Giữ camera/world riêng, có debug before/after và một chế độ sạch vẫn còn cảnh phối cảnh. Không dùng clamp Z của đỉnh nguồn để che lỗi.

Website giải thích từng thay đổi qua tám bài. Làm trong `starter/`; `checkpoints/01..08/` là các bản tham khảo độc lập, không nhận thay đổi bạn viết trong Starter.

| Bài | Phần tự viết |
| --- | --- |
| 1 | Dữ liệu tam giác, held input/drag, render baseline |
| 2 | Plane, signed distance và half-space chính xác |
| 3 | Segment-plane intersection và nội suy RGB |
| 4 | Sutherland–Hodgman, dedup endpoint, polygon có thứ tự |
| 5 | Triangle fan, winding và geometry suy biến |
| 6 | Nối clip → project → raster, đối chứng discard |
| 7 | Sweep, pause/step, invariant và oracle độc lập |
| 8 | Lưới world, camera độc lập, clean mode, kiểm bản hoàn chỉnh |

## Build và chạy

C++20, CMake 3.24+, compiler hỗ trợ C++20. CMake dùng FetchContent khóa SDL **3.4.8**, link `SDL3::SDL3`; lần configure đầu cần mạng. Không dùng OpenGL/GLM hoặc API geometry có sẵn.

Windows / Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
.\build\Debug\project_18_final.exe
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Build mặc định chỉ tạo final và tests. Bật BUILD_CHECKPOINTS để có thêm Starter và tám target `project_18_checkpoint_1` … `project_18_checkpoint_8`. Để chạy mã người học, build target `project_18_starter` rồi mở executable tương ứng. Với generator single-config trên Linux/macOS, thêm `-DCMAKE_BUILD_TYPE=Debug` lúc configure, executable nằm ngay trong `build/`; cần các development packages nền tảng SDL được hướng dẫn trong Getting Started.

CTest mặc định kiểm `final/include`. Sau khi tự viết đủ tám bài, sửa dòng target_include_directories của project_18_tests trong CMakeLists.txt **của gói đã giải nén** sang `starter/include`, configure lại, build app/tests và chạy cả Debug lẫn Release. Tests của bản tham khảo không chứng minh Starter của bạn đúng.

## Điều khiển bản hoàn chỉnh

- `1..5`: all-inside, one-out, two-out, all-out, on-plane.
- Giữ `A/D` hoặc kéo ngang trong viewport: dịch vật thể theo Z, giới hạn [−4,3].
- `W/S`: near trong [0.25,2].
- `V`: clip/discard trên cùng geometry.
- `Space`: chạy/dừng sweep 0.75 unit/s; `N`: bước 0.08 khi paused.
- `J/L`: camera X; `I/K`: camera Z; không sửa world hoặc preset.
- `F`: clean/debug; `R`: reset preset đang chọn; `Esc`: thoát.
- Blur, ẩn, minimize hoặc resize: pause, nhả capture và xóa held state.

Viewport chính 1100×600 khi debug, 1100×800 khi clean. Phần 200 hàng dưới dành cho HUD và mặt cắt ZX nhỏ: xám là nguồn, xanh lá là polygon giữ lại, trắng là giao điểm, tím là đường chéo fan. Clean vẫn vẽ RGB surface và lưới world.

## Source và kiểm chứng

`source-template/` là nguồn authored trong repository website; generator sinh Starter/checkpoint/final vào các thư mục không được Git theo dõi. ZIP đã có snapshot và CMake, không cần chạy website hoặc generator để build C++.

- `types.hpp`: các kiểu dữ liệu và helper cơ bản.
- `clip.hpp`: classify, giao điểm optional, polygon dedup, fan, violation.
- `raster.hpp`: projection guard và rasterizer top-left thuần C++.
- `scene.hpp`, `controls.hpp`: state, preset và input.
- `framebuffer.hpp`, `view.hpp`: ảnh CPU, phối cảnh/lưới và debug.
- `presentation.hpp`, `src/main.cpp`: SDL lifecycle và upload/present.
- `tests/tests.cpp`: runner không mở window; còn hoạt động khi NDEBUG bật.

Kiểm độc lập gồm midpoint/RGB, diện tích 3/4 và 1/4, winding, sáu hoán vị, tiếp xúc điểm/đoạn, NaN/invalid/capacity, sweep toán 1001 vị trí và raster mask đối chiếu ray gặp tam giác nguồn. Không render framebuffer lớn trong vòng sweep hàng nghìn lần.

Half-space chính xác là z≥near; epsilon chỉ đánh dấu gần plane trong HUD. Endpoint đúng trên plane được giữ nguyên. Đoạn song song ngoài plane không sinh giao điểm giả; dz rất nhỏ nhưng thật sự crossing vẫn được xử lý.

## Giới hạn có chủ đích

Một tam giác để cô lập bài toán cắt near. Chưa có Z-buffer, culling, clipping năm plane khác hoặc perspective-correct color. RGB tại giao điểm dùng t camera-space; fragment dùng barycentric screen-space. Canvas chỉ minh họa bằng buffer nhỏ hơn, không thay ứng dụng native.

`--smoke` mở cửa sổ ẩn và chạy hữu hạn để kiểm SDL init, present, resize và clean. Nó không thay kiểm thử trực tiếp mouse/keyboard/HiDPI.
