# Project 36 — Ray-marched Shape Room

Project này vẽ một căn phòng có sphere, box và torus mà không tạo mesh riêng cho ba vật thể. OpenGL chỉ rasterize một fullscreen triangle; fragment shader dựng camera ray, hỏi Signed Distance Function (SDF) và tiến dọc ray bằng sphere tracing.

## Sản phẩm hoàn chỉnh

- fullscreen triangle sinh từ `gl_VertexID`, không cần VBO cho object geometry;
- một camera ray chuẩn hóa cho mỗi fragment, đúng aspect và field of view;
- SDF có dấu cho sphere, axis-aligned box, torus và năm plane của căn phòng mở;
- sphere-tracing loop có `maximumSteps`, `hitEpsilon` và `maximumDistance` rõ ràng;
- normal lấy từ central differences của cùng scene SDF;
- material ID đi cùng khoảng cách gần nhất, không suy đoán lại sau khi hit;
- Lambert lighting, gamma correction và soft shadow hữu hạn;
- orbit camera bằng pointer capture, wheel zoom và ba debug view cho steps/hit/normal;
- F5 compile/link candidate shader và chỉ thay last-good program khi thành công.

## Cấu trúc source

```text
source-template/
  include/gl_api.hpp             OpenGL 3.3 function loader tối thiểu
  include/raymarch_math.hpp      camera ray, SDF, tracing, normal, shadow và validation CPU
  include/raymarch_renderer.hpp  file reader, compile/link, fullscreen VAO và uniform upload
  shaders/raymarch.vert          fullscreen triangle từ gl_VertexID
  shaders/raymarch.frag          pipeline ray marching thay đổi theo checkpoint
  src/main.cpp                   SDL/OpenGL lifecycle, camera input, F5 và title diagnostics
tests/tests.cpp                  CTest thuần CPU, không mở window
```

`starter`, `checkpoints/01..09` và `final` được sinh từ `source-template`. Shader của mỗi target nằm trong đúng snapshot đó và được copy cạnh executable sau build.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --target project_36_final
./build/Debug/project_36_final
```

Với Ninja hoặc generator một cấu hình, executable thường nằm trực tiếp trong `build/`. SDL được khóa ở 3.4.8 và luôn link qua `SDL3::SDL3`.

## Điều khiển

| Phím/thao tác | Tác dụng |
|---|---|
| Kéo chuột trái | Orbit camera, pointer được capture tới khi mouse up |
| Cuộn chuột | Đổi khoảng cách camera trong giới hạn an toàn |
| `[` / `]` | Giảm/tăng `maximumSteps` theo 16 |
| `-` / `=` | Giảm/tăng `hitEpsilon` |
| `D` | Đổi Beauty → Step heatmap → Hit mask → Normal |
| `Space` | Chạy/dừng chuyển động của đèn |
| `N` | Tiến đúng 0,1 giây khi pause |
| `F5` | Đọc lại shader, compile/link candidate và thử commit |
| `R` | Reset camera, time, tracing settings và debug view |
| `Escape` | Thoát |

## Chín checkpoint

1. Vẽ fullscreen triangle và đọc `gl_FragCoord` theo framebuffer pixels.
2. Dựng camera basis và một world-space ray cho mỗi fragment.
3. Viết Sphere SDF, đọc dấu âm/zero/dương trên một lát cắt.
4. Thêm sphere-tracing loop cùng ba guard dừng hữu hạn.
5. Ước lượng normal bằng central differences và tô Lambert.
6. Thêm Box SDF và Torus SDF mà không tạo vertex/index mới.
7. Ghép distance cùng material ID, thêm floor/ceiling/back/side planes.
8. Bắn shadow ray, tạo soft shadow và điều khiển orbit camera.
9. Thêm debug views, named validation, failure experiments và cleanup hoàn chỉnh.

## Nghiệm thu

```bash
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

CTest kiểm camera ray, dấu của Sphere SDF, bề mặt Box/Torus, hit/miss guard, normal, material IDs và shadow range bằng code CPU thuần. Việc compile GLSL thật vẫn cần OpenGL context; hãy dùng F5 để thử compile error và xác nhận last-good image không biến mất.

## Tài liệu API chính thức

- [gl_VertexID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml)
- [glDrawArrays](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawArrays.xhtml)
- [GLSL length](https://registry.khronos.org/OpenGL-Refpages/gl4/html/length.xhtml)
- [GLSL cross](https://registry.khronos.org/OpenGL-Refpages/gl4/html/cross.xhtml)
- [SDL_CaptureMouse](https://wiki.libsdl.org/SDL3/SDL_CaptureMouse)
