# Project 35 — Shader Hot Reload Lab

Project này giữ indexed cube và OpenGL 3.3 Core pipeline của Project 34, nhưng chuyển GLSL ra file có thể sửa khi chương trình đang chạy. Mỗi lần file ổn định sau một khoảng debounce, ứng dụng compile/link một candidate program. Candidate chỉ thay program hiện tại khi toàn bộ quá trình thành công; lỗi compile hoặc link không làm cửa sổ đen.

## Sản phẩm hoàn chỉnh

- `final/shaders/lab.vert` và `final/shaders/lab.frag` là source đang được target final theo dõi;
- F5 yêu cầu reload thủ công, file watcher tự reload sau 140 ms ổn định;
- terminal in stage, driver info log và đường dẫn shader đang đọc;
- title bar hiển thị generation, số lần thử và trạng thái last-good program;
- `uMvp`, `uTime`, `uResolution` và `uMouse` được kiểm sau link rồi cập nhật mỗi frame;
- cube tiếp tục dùng VAO/VBO/EBO, depth test và face culling đã xây ở Project 34.

## Cấu trúc source

```text
source-template/
  include/pipeline.hpp         mesh, Mat4, file reader, reload/watch state và validation
  include/gl_api.hpp           OpenGL function loader
  include/shader_renderer.hpp  compile, link, candidate program, swap và draw
  shaders/lab.vert             vertex shader thay đổi theo checkpoint
  shaders/lab.frag             fragment shader thay đổi theo checkpoint
  src/main.cpp                 SDL/OpenGL lifecycle, input, watcher và render loop
tests/tests.cpp                CTest thuần CPU, không mở window
```

`starter`, `checkpoints/01..08` và `final` được sinh từ `source-template`. Mỗi target nhận đường dẫn tuyệt đối tới thư mục shader của chính snapshot, đồng thời CMake chép một bản cạnh executable để chương trình vẫn có fallback khi mang binary sang nơi khác.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_35_final
./build/Debug/project_35_final
```

Trên generator một cấu hình như Ninja, executable thường nằm trực tiếp trong `build/`. SDL được khóa ở 3.4.8; đường mặc định dùng `FetchContent` và link qua `SDL3::SDL3`.

Khi final đang chạy, mở `final/shaders/lab.frag`, đổi một con số rồi lưu. Không cần build lại. Nếu đang chạy checkpoint 04, hãy sửa `checkpoints/04/shaders/lab.frag` vì mỗi checkpoint là một chương trình độc lập.

## Điều khiển

| Phím/thao tác | Tác dụng |
|---|---|
| F5 | Đọc lại hai file, compile/link candidate và thử commit |
| Space | Chạy hoặc tạm dừng `uTime` cùng góc xoay |
| N | Tiến 0,1 giây và một bước xoay khi đang pause |
| R | Reset scene và time; không thay shader program |
| Kéo chuột trái | Xoay cube và cập nhật `uMouse` theo framebuffer pixels |
| Escape | Thoát |

## Tám checkpoint

1. Đưa vertex/fragment shader ra file và đọc đúng thư mục runtime.
2. Giữ compile status cùng shader info log có tên stage.
3. Link candidate program và kiểm interface/uniform bắt buộc.
4. Chỉ swap khi candidate hợp lệ; lỗi giữ last-good program.
5. Theo dõi timestamp, gom nhiều lần ghi bằng debounce rồi reload một lần.
6. Cập nhật `uTime`, `uResolution` và `uMouse` theo pixel thật.
7. Viết fragment effect procedural có rings, time và mouse glow.
8. Khóa validation, controls, diagnostics và cleanup hoàn chỉnh.

## Nghiệm thu

```bash
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

CTest kiểm mesh layout, shader interface contract, last-good generation, successful commit và watcher debounce bằng code CPU thuần. Việc compile GLSL thật vẫn cần một OpenGL context nên được quan sát trong ứng dụng qua F5 và thí nghiệm lỗi của từng bài.

## Tài liệu API chính thức

- [glCompileShader](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCompileShader.xhtml)
- [glGetShaderInfoLog](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetShaderInfoLog.xhtml)
- [glLinkProgram](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glLinkProgram.xhtml)
- [glGetUniformLocation](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetUniformLocation.xhtml)
- [SDL_GetBasePath](https://wiki.libsdl.org/SDL3/SDL_GetBasePath)
