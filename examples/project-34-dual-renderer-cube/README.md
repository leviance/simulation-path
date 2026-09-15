# Project 34 — Dual Renderer Cube

Project này vẽ cùng một khối lập phương từ đúng một `CubeScene` và một indexed mesh:

- `F1`: C++ transform, CPU triangle rasterizer và CPU Z-buffer tạo framebuffer RGBA8;
- `F2`: OpenGL 3.3 Core dùng VBO, EBO, VAO, GLSL MVP, depth test và face culling;
- đổi renderer không reset góc xoay, depth, culling hoặc framebuffer pixel size.

Mục tiêu không phải dùng FPS để kết luận GPU nhanh hơn. Project khóa input, matrix convention và visibility contract trước, rồi mới cho phép chuyển backend.

## Cấu trúc

```text
starter/                 SDL/OpenGL foundation kế thừa Project 33
checkpoints/01..09/      source độc lập sau từng bài
final/                   ứng dụng hoàn chỉnh
source-template/         nguồn chuẩn sinh starter/checkpoint/final
tests/tests.cpp          CTest cho mesh, MVP, depth, culling và shared state
CMakeLists.txt           final mặc định; bật checkpoint bằng option
```

## Build final

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Lần configure đầu cần mạng để FetchContent tải đúng SDL 3.4.8.

## Build mọi checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Các target gồm `project_34_starter`, `project_34_checkpoint_1` … `project_34_checkpoint_9`, `project_34_final` và `project_34_tests`.

## Điều khiển final

- `F1`: chọn CPU rasterizer.
- `F2`: chọn OpenGL GPU renderer.
- `Space`: chạy hoặc tạm dừng rotation.
- `N`: tiến đúng 10°.
- Kéo chuột trái: xoay cube và pause.
- `D`: bật/tắt depth test ở backend đang dùng.
- `C`: bật/tắt back-face culling ở backend đang dùng.
- `R`: reset scene, chọn CPU và pause.
- `Esc`: thoát.

## Shared contract

`GpuCubeVertex` chứa sáu `float`: position xyz và color rgb. Mỗi mặt giữ bốn vertices để có màu riêng; EBO dùng sáu indices để tạo hai triangles trên mặt đó. Toàn cube có 24 vertices, 36 indices và 12 triangles.

C++ `Mat4` và GLSL `mat4` cùng dùng column-major storage. CPU gọi `transform(mvp, position)`; vertex shader gọi `uMvp * vec4(aPosition, 1.0)`. Cả hai dùng cùng near/far, FOV, aspect, CCW winding, `LESS` depth compare và back-face culling.

## Validation

CTest không mở window. Nó kiểm vertex layout, index bounds, clip coordinates, depth order independence, culling, deterministic CPU checksum và việc đổi renderer không sửa `CubeScene`.

## Tài liệu chuẩn

- [SDL_GetWindowSizeInPixels](https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels)
- [glDrawElements](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawElements.xhtml)
- [glDepthFunc](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDepthFunc.xhtml)
- [glCullFace](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCullFace.xhtml)
- [glFrontFace](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glFrontFace.xhtml)
