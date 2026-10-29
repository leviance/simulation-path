# Project 36 — Căn phòng ray-marched không mesh

Ứng dụng C++20/SDL3/OpenGL tạo một căn phòng có sphere, box và torus bằng SDF. Một fullscreen triangle tạo fragment; mỗi fragment dựng camera ray, tìm bề mặt, lấy normal rồi tính ánh sáng và bóng. Không có mesh/VBO/EBO cho ba vật thể.

Mục tiêu học là đi từ một shader đang chạy tới một renderer bề mặt có thể kiểm chứng: camera ray → SDF → sphere tracing → normal → scene/material → shadow → camera input → oracle → GPU verification. Đây không phải volume rendering hoặc general-purpose path tracer.

## Chuẩn bị và cách học

Cần compiler C++20 (Visual Studio 2022 với Desktop development with C++, GCC hoặc Clang), CMake >=3.24 và driver tạo được OpenGL **3.3 Core**. SDL được khóa **3.4.8** bằng FetchContent + SHA-256, link qua `SDL3::SDL3`. Không cần Node.js để build ZIP C++.

Kiến thức đầu vào: camera/basis ở Project 14, OpenGL ở 33 và shader lifecycle ở 35. Application shell được cung cấp lại trong gói này; không phải ghép các ZIP trước. Trước khi đọc lời giải, thử tự thiết kế scene/controls và ghi Definition of Done. Mỗi bài nên chạy mốc trước, sửa một phần, dự đoán ảnh/số đo rồi kiểm lại.

Thời gian tham khảo 26–35 giờ: đọc 6–8, tự viết 14–19, kiểm chứng 6–8 giờ; không tính setup/build lần đầu.

## Build và chạy — Windows / Visual Studio 2022

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
./build/Debug/project_36_final.exe
```

`BUILD_CHECKPOINTS` mặc định OFF: khi không cần học từng mốc, chỉ final/tests được build. Để chạy một mốc:

```powershell
cmake --build build --config Debug --target project_36_checkpoint_4 --parallel 2
./build/Debug/project_36_checkpoint_4.exe
```

## Ninja / Linux / macOS

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_CHECKPOINTS=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --timeout 20
./build/project_36_final
```

Ninja phải có compiler trong environment. Trên Windows có thể dùng Developer PowerShell; executable có đuôi `.exe`. SDL cần các development dependency của hệ điều hành khi build từ source. OpenGL 3.3 Core là yêu cầu runtime riêng; hướng dẫn đa nền tảng không chứng nhận mọi máy/driver đã được thử.

Nếu lỗi context/function loader, xem log driver và cập nhật/cấu hình driver thích hợp; không đổi sang demo CPU rồi coi là đã chạy GPU. Dùng thư mục build riêng cho generator/configuration khác nhau.

## Source và 11 checkpoint

`source-template/` là nguồn authored của website. `starter`, `checkpoints/01..11`, `final` và CMake được sinh khi đóng gói; trong ZIP người học sửa trực tiếp snapshot mình chạy.

1. Application shell, fullscreen triangle và lưới 32 framebuffer pixel.
2. Camera basis/FOV, một ray đơn vị cho mỗi fragment.
3. Sphere SDF trên lát cắt phẳng.
4. Marcher với epsilon band, inside policy và stop reason hữu hạn.
5. Central-difference normal, Lambert và shading.
6. Box, torus nghiêng và inverse coordinates.
7. Năm slab hữu hạn, material winner và checker floor.
8. Shadow có bias/budget, đèn và clock pause/step.
9. Camera move/look và radius controls.
10. Oracle ray–sphere, hai epsilon, distance controls và debug views.
11. GPU readback, compile/link/interface failure/recovery và resource checks.

Các module nhỏ trong `include/`: `vector`, `camera`, `sdf`, `tracing`, `raymarch_oracle` là toán CPU; `room_frame` giữ state; `room_controls` xử lý SDL; `gl_api`/`shader_program` cung cấp OpenGL; `room_uniforms` khóa interface; `raymarch_renderer` vẽ; `room_overlay` hiển thị controls/error; `room_verify` kiểm GPU; `room_application` sở hữu window/context/vòng lặp. `src/main.cpp` gọi application, `tests/core_checks.hpp` chứa fixture CPU, `tests/tests.cpp` là CTest entry point.

## Controls bản final

| Thao tác | Tác dụng |
| --- | --- |
| Tab | Hiện/ẩn controls và thông số; lỗi vẫn hiện ở Showcase |
| Giữ chuột phải / mũi tên | Nhìn bằng relative mouse / nhìn từng bước bằng keyboard |
| WASD, Q/E | Bay theo forward/right, xuống/lên theo camera up |
| Wheel | Đổi vertical FOV; không thay vị trí camera |
| J/K, U/I | Đổi sphere radius, torus minor radius |
| Space, N | Pause/resume đèn, tiến đèn 0.1 giây rồi pause |
| `[`, `]` | Step budget 1–256, mỗi lần 16 |
| `-`, `=` | Nhân hit epsilon với 0.5 / 2 |
| `,`, `.` | Nhân normal epsilon với 0.5 / 2 |
| Z/X | Giảm/tăng max distance trong 0.1–80m |
| V | Beauty → Steps → Hit → Normal |
| F5 | Reload đúng shader directory in trong terminal |
| R | Nhả mouse; reset camera, scene, time, settings và view về mặc định |
| Escape | Nhả relative mouse nếu đang nhìn; nếu không thì thoát |

Camera luôn dùng được khi đèn pause. Mất focus nhả relative mouse và ngừng nhận keyboard movement. App không có camera collision; đi xuyên vật/tường để kiểm inside policy là hành vi chủ ý. Pitch/position/FOV và parameters có clamp hữu hạn.

## Giới hạn và cách diễn giải

Mặc định primary ray có 128 samples, max distance 30m, hit epsilon 0.0015m; hard cap 256 samples. Epsilon hợp lệ `[1e-5,0.02]m`, normal epsilon mặc định 0.001m. Shadow có 64 samples; normal cần sáu scene queries riêng. Steps heatmap chỉ đếm primary queries, không phải tổng GPU work.

Hit khi `abs(distance)<=hitEpsilon`: origin trong sphere tìm mặt thoát, origin trong epsilon band có thể được nhận ở t=0. Near-miss toán học cũng có thể thuộc epsilon band. Tại tiếp tuyến sphere, sai số dọc tia dùng bound `sqrt(2*r*epsilon+epsilon²)`, không dùng `epsilon` trực tiếp. Normal error đo bằng góc radian so với normal sphere giải tích; không hứa giảm đơn điệu với float32.

Shadow mềm dùng heuristic, không tích phân area light; clamp bước shadow là xấp xỉ của scene mẫu, không bảo đảm cho mọi vật cản mỏng tùy ý. Hết shadow budget trả tối bảo thủ và không được hiểu là đã chứng minh có vật cản. Beauty không bị nhân tối theo số bước primary march.

## Verification hữu hạn

```powershell
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Release/project_36_final.exe --verify
./build/Release/project_36_final.exe --smoke
./build/Release/project_36_final.exe --capture room.bmp
```

CTest chỉ dùng CPU, không mở window; checks vẫn hoạt động khi NDEBUG. `--verify` dùng context ẩn, FBO RGBA32F và chính các hàm GLSL của sản phẩm; đo t/status/material/steps, normal error, failure/recovery và cleanup. `--smoke`/`--capture` kết thúc sau ba frame, deadline nội bộ 5 giây. Automation phải thêm watchdog/process-tree cleanup theo ARCHITECTURE.md; không gọi app tương tác không timeout trong CTest.

Shader từ snapshot được ưu tiên cho F5. Mỗi target còn có fallback riêng cạnh executable tại `shaders/<target-name>`; dùng `--shader-dir <path>` để chọn rõ một bản runtime. Các checkpoint không được ghi đè GLSL của nhau khi build song song.

Kiểm thủ công riêng: camera/look/focus, pause/reset, đổi view/parameter, resize/high-DPI, F5 lỗi rồi sửa và overlay ở window nhỏ. Build/CTest/GPU checks không thay kiểm tương tác. Bộ kiểm không phải benchmark GPU: readback không được báo như kernel time và không hứa FPS chung.

## Tài liệu gốc

- [Sphere tracing — John C. Hart](https://graphics.stanford.edu/courses/cs348b-20-spring-content/uploads/hart.pdf)
- [SDL relative mouse mode](https://wiki.libsdl.org/SDL3/SDL_SetWindowRelativeMouseMode)
- [OpenGL glReadPixels](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glReadPixels.xhtml)
- [OpenGL gl_VertexID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml)
