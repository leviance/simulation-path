# Project 35 — Phòng thí nghiệm shader

Tự xây dựng một công cụ sửa GLSL khi ứng dụng đang chạy. Bốn hiệu ứng fullscreen — Gradient Aurora, Circle Ripples, Mandelbrot và Noise Flow — dùng chung một SDL window, OpenGL context và renderer. Shader lỗi không làm mất program tốt gần nhất; sửa file rồi thử tiếp, không cần restart.

## Học gì và bắt đầu ở đâu?

Sau Project 33–34, bạn đã biết tạo context, nạp hàm OpenGL và quản lý tài nguyên. Project này chuyển trọng tâm sang quy trình thử shader: đọc file → compile từng stage → link → kiểm active uniforms → thay program an toàn. Sau đó dùng công cụ vừa xây để học procedural shading, số phức và noise.

Hãy thử tự làm một cửa sổ có dải màu từ shader ngoài executable trước khi đọc hướng dẫn. Sản phẩm cuối phải có đủ bốn effect, reload thủ công/tự động, mouse/time/zoom, lỗi dễ đọc và showcase sạch; một cube đổi màu chưa đáp ứng đề bài.

Giáo trình có mười bước, không yêu cầu hoàn thành cả gallery ngay từ bài đầu:

1. Đọc file GLSL và vẽ fullscreen triangle.
2. Compile status, file/stage và shader info log.
3. Link program, reflection và kiểu/size uniform.
4. Candidate transaction, last-good, generation/attempts.
5. Polling, file status/size/timestamp và debounce.
6. Time, resolution, mouse, zoom, high-DPI và pause/step.
7. Gradient palette và vòng tròn có sóng/viền sáng.
8. Mandelbrot, phép lặp hữu hạn và reference CPU.
9. Value noise, fBm năm octave và domain warp.
10. Debug/error overlay, showcase, verification và cleanup.

## Build độc lập

Cần C++20, CMake 3.24+, compiler hiện đại và driver hỗ trợ OpenGL 3.3 Core. Trên Windows dùng Visual Studio 2022 Desktop development with C++. Linux/macOS dùng compiler và dependency SDL theo Getting Started của khóa học.

Gói ZIP có sẵn CMake, starter, checkpoints/01–10, final và tests. Nếu clone repository website, chạy generate:course từ root trước để tạo chúng; không sửa trực tiếp các snapshot được sinh.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_35_final --parallel 2
./build/Debug/project_35_final.exe
```

Visual Studio đặt executable trong build/Debug hoặc build/Release. Với Ninja/Make một cấu hình, đặt CMAKE_BUILD_TYPE khi configure và chạy executable trực tiếp trong build, không thêm đuôi .exe trên Linux/macOS.

SDL khóa ở 3.4.8, đường mặc định dùng FetchContent và link SDL3::SDL3. BUILD_CHECKPOINTS mặc định tắt: final là app mặc định; bật option để có starter và từng checkpoint. CTest không tạo window.

## Sửa đúng shader đang được đọc

Terminal in SHADER DIRECTORY. Khi chạy final, sửa final/shaders/lab.vert hoặc fragment được chọn: gradient.frag, circle.frag, mandelbrot.frag, noise.frag. Chỉ cần Save, không build lại C++.

CMake ưu tiên source directory của đúng snapshot. Bản fallback cạnh executable nằm trong shaders/<target-name>/, nên hai target build song song không ghi đè shader nhau. Nếu source directory không tồn tại, ứng dụng dùng fallback; --shader-dir cho phép chỉ rõ một thư mục khác.

Startup có gradient nhúng dự phòng. Nếu file ngoài thiếu/hỏng, app vẫn có hình và báo lỗi. Bản cuối không dùng shader nhúng để thay thế gallery: cả bốn effect có file GLSL riêng, được compile bởi driver thật.

## Điều khiển

| Phím/thao tác | Tác dụng |
| --- | --- |
| 1–4 | Chọn gradient, circle, Mandelbrot, noise |
| F5 | Đọc lại file, thử candidate, commit nếu hợp lệ |
| A | Bật/tắt auto reload; mặc định bật |
| Kéo chuột trái | Đổi uMouse; capture khi kéo |
| Cuộn hoặc +/− | Đổi uZoom trong khoảng 0.25–8 |
| Mũi tên | Đổi mouse không cần chuột |
| Space | Pause/chạy time |
| N | Pause và tiến 1/30 giây |
| R | Reset time/mouse/zoom và pause; không đổi effect/program |
| Tab | Debug/showcase; lỗi vẫn hiện trong showcase |
| PgUp/PgDn | Cuộn log |
| Escape | Hủy lần kéo; nếu không kéo thì thoát |

Đổi effect/reload không reset time/mouse/zoom/pause. Mất focus sẽ pause và nhả capture. Uniform mouse dùng framebuffer pixels gốc dưới trái; input SDL được chuẩn hóa theo logical size rồi chuyển một lần khi upload.

Zoom là tham số do từng shader diễn giải: circle thay radius, Mandelbrot thu hẹp miền phức, noise tăng mật độ chi tiết. Nó không phải camera chung.

## Kiểm chứng

```bash
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Debug/project_35_final.exe --verify
./build/Release/project_35_final.exe --verify
```

CTest kiểm I/O có giới hạn, fingerprint có stage separator, transaction metadata, debounce và phục hồi file, tọa độ high-DPI, clock/zoom, Mandelbrot và noise. Runner không dựa vào assert bị tắt khi NDEBUG.

--verify cần OpenGL context thật, kiểm cả bốn effect ở hai kích thước và tổng 40 pixel probes so CPU reference (RGB tolerance 6/255). Nó kiểm uniform thật, time/mouse/zoom, lỗi compile/link/missing/type, repair, giữ last-good và tài nguyên được giải phóng. Không gọi đây là so mọi pixel hoặc kiểm input desktop.

Reference dùng công thức mặc định trong shader_effects.hpp. Nếu tự đổi GLSL, hãy khôi phục source chuẩn trước khi chạy verifier, hoặc sửa cả reference/expected results theo công thức mới. Các điểm gần biên Mandelbrot có thể nhạy float; verifier chọn điểm ổn định, không cam kết toàn ảnh giống bit trên mọi GPU.

Kiểm thủ công riêng: Save file trong editor, F5/A, chuyển 1–4 nhiều lần, resize, DPR khác 1, kéo ra ngoài rồi nhả, Escape hủy kéo, focus lost, pause/step/reset, log dài và lỗi trong showcase. Ghi riêng kết quả CPU, GPU và desktop.

### Chế độ hữu hạn để kiểm tự động

- --smoke: chạy bốn frame rồi thoát.
- --capture image.bmp: snapshot time = 1.25 giây rồi thoát.
- --effect 1..4: chọn effect.
- --showcase: ẩn HUD thường.
- --error-demo: cố ý tạo compile error trong bộ nhớ, không sửa file.
- --shader-dir path: dùng thư mục shader được chỉ định.

Finite loop có thời hạn nội bộ; --verify cũng có deadline giữa các bước. Khi tự động hóa vẫn phải bọc executable bằng watchdog/process supervisor có hard timeout và dọn process tree: deadline trong app không ngắt được lời gọi driver bị kẹt. Không đưa GPU viewer vào CTest thuần CPU.

## Cấu trúc nguồn chuẩn

```text
source-template/
  include/
    pipeline.hpp             scene, snapshot và transaction metadata
    gl_api.hpp               nạp hàm OpenGL bằng SDL
    shader_files.hpp         đọc file, stamp và debounce
    shader_renderer.hpp      compile/link/reflection, transaction và draw
    shader_defaults.hpp      recovery shader nhúng
    shader_input.hpp         hành vi bàn phím
    shader_effects.hpp       reference CPU cho bốn hiệu ứng
    shader_overlay.hpp       chữ ASCII trên surface, upload texture
    shader_validation.hpp    kiểm driver/readback/resource
    shader_application.hpp   SDL/context, event loop, watcher và lifecycle
  shaders/                   vertex và bốn fragment shader
  src/main.cpp               gọi ứng dụng
tests/tests.cpp              pure CPU CTest
```

Overlay dùng SDL_CreateSoftwareRenderer trên surface riêng rồi upload GL texture; không trộn SDL_Renderer vào OpenGL window. Chữ ASCII 8×8 có thể thay ký tự UTF-8 ngoài ASCII bằng dấu hỏi; full path/log UTF-8 còn trong terminal.

Canvas của website là minh họa TypeScript/Canvas 2D, không chạy WebGL hay compiler GLSL. Editor web chỉ diễn giải SPEED của mẫu đã biết và ghi rõ giới hạn; mọi kết luận compile/link thật đến từ chương trình C++.

## Tài liệu API

- [SDL và CMake](https://wiki.libsdl.org/SDL3/README-cmake)
- [SDL_CreateSoftwareRenderer](https://wiki.libsdl.org/SDL3/SDL_CreateSoftwareRenderer)
- [glCompileShader](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCompileShader.xhtml)
- [glGetShaderInfoLog](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetShaderInfoLog.xhtml)
- [glLinkProgram](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glLinkProgram.xhtml)
- [glGetActiveUniform](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetActiveUniform.xhtml)
