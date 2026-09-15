# Project 33 — CPU/GPU Triangle

Project này vẽ cùng một tam giác bằng hai pipeline trong cùng cửa sổ SDL3/OpenGL 3.3 Core:

- panel trái: C++ transform + CPU barycentric rasterizer → RGBA8 framebuffer → OpenGL texture;
- panel phải: cùng vertex data + GLSL vertex/fragment shader → GPU rasterizer;
- phím `P`: đọc color ở triangle centroid bằng `glReadPixels` và so với CPU expected color.

Mục tiêu không phải chứng minh GPU luôn nhanh hơn. Ta dùng triangle nhỏ để nối từng stage OpenGL với renderer CPU đã tự xây ở Project 15–16.

## Cấu trúc

```text
starter/                 SDL window và event loop trước OpenGL
checkpoints/01..09/      source độc lập sau từng bài
final/                   ứng dụng hoàn chỉnh
source-template/         nguồn chuẩn sinh starter/checkpoint/final
tests/tests.cpp          CTest cho math/raster contract, không mở window
CMakeLists.txt           final mặc định; bật checkpoint bằng option
```

Các file học chính:

```text
include/pipeline.hpp     vertex contract, CPU transform/raster, viewport math, validation
include/gl_api.hpp       OpenGL function pointers được load qua SDL context
include/gpu_renderer.hpp shader program, VBO/VAO, CPU texture presenter, readback
src/main.cpp             SDL/OpenGL lifecycle, input, render hai panel và cleanup
```

## Build final

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Trên Visual Studio hoặc generator đa cấu hình, hãy giữ `--config Debug`/`Release`. Lần configure đầu cần mạng để FetchContent tải đúng SDL 3.4.8.

## Build mọi checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Các target gồm `project_33_starter`, `project_33_checkpoint_1` … `project_33_checkpoint_9`, `project_33_final` và `project_33_tests`.

## Điều khiển final

- `Space`: chạy/tạm dừng rotation.
- `N`: tiến đúng 10°.
- `Arrow keys`: dịch triangle trong NDC.
- `Q` / `E`: giảm/tăng scale.
- `C`: đổi solid/smooth color.
- `P`: đọc GPU color ở centroid và in comparison report hữu hạn.
- `R`: reset transform và pause.
- `Esc`: thoát.

App pause mặc định. `glReadPixels` chỉ chạy khi bấm `P`, không chạy mỗi frame.

## OpenGL contract

Project yêu cầu OpenGL 3.3 Core và không dùng GLAD/GLEW. `SDL_GL_GetProcAddress` chỉ được gọi sau khi context đã được tạo và làm current. Trên Windows, function pointers được coi là gắn với lifetime của context hiện tại.

`GpuVertex` có đúng năm `float`:

```text
positionX positionY red green blue
```

VAO đọc position ở location 0 và color ở location 1. CPU và GLSL cùng áp dụng transform theo thứ tự rotate → scale → translate.

## Validation

CTest kiểm code CPU thuần:

- `GpuVertex` stride/offset;
- transform order;
- NDC ↔ CPU top-left screen round-trip;
- NDC ↔ GPU bottom-left window round-trip;
- barycentric weights và solid/smooth color contract;
- deterministic CPU raster checksum;
- tolerance sau RGBA8 quantization.

Runtime probe so interior fragment tại centroid. Không dùng triangle edge làm pass/fail vì CPU/GPU có thể khác coverage rule quanh biên dù cả hai implementation đều hợp lệ.

## Tài liệu chuẩn

- [SDL_GL_CreateContext](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext)
- [SDL_GL_GetProcAddress](https://wiki.libsdl.org/SDL3/SDL_GL_GetProcAddress)
- [SDL_GetWindowSizeInPixels](https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels)
- [Khronos OpenGL reference pages](https://registry.khronos.org/OpenGL-Refpages/gl4/html/)
