# Project 13 — Khối lập phương wireframe CPU

Từ tám đỉnh trong local space, tự biến đổi, chiếu và raster mười hai cạnh vào framebuffer. Ứng dụng C++/SDL3 có viewport toàn cửa sổ, sàn 3D, world axes, hai phép chiếu và điều khiển đầy đủ. Canvas trên website chỉ hỗ trợ học; source này chạy độc lập.

## Thử tự xây trước

Dựng cube 8 đỉnh/12 cạnh, kéo chuột xoay, WASD/QE di chuyển theo world, wheel zoom, P đổi perspective/orthographic và R reset. Không dùng OpenGL, GLM hoặc SDL line primitives. Giữ local vertices gốc, clip từng đoạn trước raster; tắt debug không làm mất cube.

Dùng tám phép chiếu cho cache đỉnh gốc. Near/far clipping có thể sinh endpoint mới cần chiếu bổ sung; bộ đếm đó tách khỏi cache và không tính sàn/trục. Depth cue/sắp average Z không phải hidden-surface removal hoặc Z-buffer.

## Lộ trình bảy checkpoint

1. Tám local vertex, index ổn định, marker perspective.
2. Mười hai edge bằng index, cache và clip/Bresenham.
3. Xoay local rồi translate; hai order theo trục world cố định.
4. Perspective/orthographic, khớp tỉ lệ tại camera Z=6.
5. Keyboard state theo dt, mouse capture, zoom có giới hạn.
6. Depth cue, tự quay/pause/step và chế độ sạch.
7. Oracle tính tay, invariant và nghiệm thu toàn bộ ứng dụng.

Học từ `starter/`; từng `checkpoints/01..07/` và `final/` là source chạy độc lập. Không cần copy từng snippet vào một main.cpp lớn.

## Build và chạy

Cần C++20, CMake ≥3.24 và compiler (Windows: Visual Studio 2022 Desktop development with C++). Lần configure đầu cần mạng để FetchContent tải SDL **3.4.8**; link qua `SDL3::SDL3`.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
./build/Release/project_13_final.exe
```

Target mặc định là final và tests. Option trên thêm starter và checkpoint_1..7. Với Ninja/Makefiles, chọn `-DCMAKE_BUILD_TYPE=Debug` hoặc Release và tìm executable trực tiếp trong build/.

## Điều khiển final

| Thao tác | Kết quả |
| --- | --- |
| Chuột trái kéo | Yaw/pitch, theo logical pixel |
| A/D · Q/E · W/S | −/+X · −/+Y · +/−Z, 2 world unit/s |
| Mũi tên · PageUp/Down | Pitch/yaw · roll, nấc 5° |
| Wheel hoặc +/− | Lens zoom 0.5×–2×, không đổi model position |
| P · O | Phép chiếu · thứ tự XYZ/ZYX |
| Space · N | Tự quay/tạm dừng · tiến 0.1s khi dừng |
| C · F | Depth cue · debug/showcase |
| F1..F5 | Mặc định · chính diện · xa · cắt near · lệch khung |
| [ / ] · R · Esc | Sensitivity · reset toàn bộ · thoát |

Camera đứng ở gốc, nhìn +Z. W đẩy model ra xa, không phải di chuyển camera FPS. Zoom thay scale/FOV của phép chiếu; trong ortho, đổi model Z không đổi kích thước ảnh nhưng wheel vẫn phóng đại. Resize/HiDPI letterbox bảng logic 1100×800, không kéo méo world. Focus loss, reset/preset, resize và mất capture đều kết thúc drag.

## File và kiểm chứng

- `include/framebuffer.hpp`: pixel, disc và Bresenham.
- `include/projection.hpp`, `rotation.hpp`: toán nền P11/P12, độc lập trong ZIP.
- `include/lab.hpp`: cube/index/edge và invariant.
- `include/scene.hpp`: state, transform, phép chiếu và input math.
- `include/pipeline.hpp`: cache, clipping và thứ tự cạnh.
- `include/view.hpp`: CPU renderer và thống kê của frame.
- `include/presentation.hpp`, `src/main.cpp`: SDL input/timing/texture/HUD.
- `tests/tests.cpp`: không cần window, vẫn báo lỗi trong Release.

CTest kiểm topology, độ dài cạnh, pivot, phép quay 90°, pixel oracle perspective/ortho, near/far/screen clipping, dt, đường chéo, zoom và pixel của chế độ sạch. Thử thêm input, thả ngoài cửa sổ, mất focus và HiDPI trên desktop; test số không chứng minh đầy đủ trải nghiệm đó. `--smoke` chạy 12 frame ẩn để kiểm tra resource/upload/present, không thay cho kiểm thử người dùng.
