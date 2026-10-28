# Project 34 — Một model viewer, hai renderer CPU và GPU

Nâng cấp viewer Project 21 để xem cùng OBJ bằng CPU hoặc OpenGL trong một cửa sổ. F1/F2 chỉ đổi cách vẽ; camera, model, ánh sáng và các tùy chọn giữ nguyên.

## Sản phẩm và mục tiêu học

- Rocket 32 tam giác và sphere 2.976 tam giác từ Project 21; cube 12 tam giác chỉ là fixture debug.
- Cùng indexed mesh, camera và math cho hai backend, không có hai application/camera state riêng.
- CPU tự transform, clip sáu mặt, rasterize và depth-test. OpenGL presenter chỉ upload ảnh CPU.
- GPU dùng VBO/EBO/VAO, GLSL, uniforms, depth test và culling.
- Orbit/pan/zoom, model rotation, Lambert shading, wireframe, normal vectors và world grid.
- HUD ở vùng riêng phía dưới: CPU preparation/geometry/upload/submission, GPU geometry khi query có kết quả, presentation.

Trước khi đọc hướng dẫn, thử tự xây từ viewer CPU đã biết. Phải giữ hai mesh thật và chứng minh switch/resize không reset scene. Dự kiến 28–38 giờ, tùy mức quen với clipping/OpenGL.

## Bước học và source

| Bước | Nội dung thêm vào |
| --- | --- |
| Starter | SDL/OpenGL 3.3 Core context, loader và clear/swap loop |
| 01 | ViewerScene/ViewerState dùng chung; input và title bar, chưa có geometry |
| 02 | Loader/dataset Project 21, normalization, position+normal indexed mesh |
| 03 | CPU transform/clipping/raster/depth, texture presenter; 1/2/3 chọn model |
| 04 | GPU mesh/program, EBO và F1/F2 |
| 05 | Camera orbit/pan/zoom, reset camera; dùng chung MVP |
| 06 | Depth/culling/order controls và visibility fixtures |
| 07 | Lighting/wireframe/normals/grid controls |
| 08 | Animation pause/step và vòng tương tác hoàn chỉnh |
| 09 / Final | HUD/timer queries, hardware verification và benchmark hữu hạn |

Clipping và visibility đúng đã có trong lõi CPU từ bước 03; bước 06 giải thích, thêm controls và phép kiểm có chủ đích. Không cố tình bỏ correctness ở checkpoint trung gian.

```text
assets/                          dataset và LICENSE CC0 dùng chung
source-template/include/obj21/   loader/geometry/normalization độc lập từ Project 21
source-template/include/
  pipeline.hpp                   math column-major và CPU framebuffer
  viewer-mesh.hpp                mesh position/normal/index dùng chung
  viewer-scene.hpp                object/camera/lighting state và matrices
  viewer-cpu.hpp                  software pipeline có clipping sáu mặt
  viewer-gpu.hpp                  GPU mesh, program và debug lines
  gpu_renderer.hpp               shader helpers và CPU texture presenter
  gl_api.hpp                     function loader sau current context
  viewer-backends.hpp            tài nguyên và nhánh render dùng chung
  viewer-bootstrap.hpp           starter / checkpoint 01–02
  viewer-application.hpp         lifecycle, CLI, input/update/present
  viewer-timing.hpp               CPU stages / asynchronous GPU timer
  viewer-hud.hpp                  bảng thống kê không che model
  viewer-fixtures.hpp            trước/sau và near/eye crossing
  viewer-comparison.hpp          coverage/color/depth tolerance
  viewer-validation.hpp          kiểm OpenGL thật, resource lifetime
  viewer-benchmark.hpp           frozen-scene benchmark
source-template/src/main.cpp     entry point
tests/tests.cpp                  tests thuần CPU, không tạo window
starter/ checkpoints/ final/     snapshot được sinh; mỗi bước build độc lập
```

Bốn header obj21 giữ ngữ nghĩa parser Project 21; namespace riêng tránh trùng kiểu math. Assets không nhân bản theo checkpoint. ZIP tự chứa toàn bộ dữ liệu, không phụ thuộc checkout project khác.

## Build và chạy

C++20, CMake >=3.24, compiler phù hợp và driver OpenGL 3.3 Core. Lần configure đầu cần mạng để FetchContent tải SDL **3.4.8**; luôn link qua SDL3::SDL3.

Visual Studio 2022 / Windows:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
.\build\Debug\project_34_final.exe
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Single-config (Ninja/Makefiles): configure với -DCMAKE_BUILD_TYPE=Debug hoặc Release, executable nằm ngay trong build directory. Dùng hai build directory riêng nếu muốn giữ cả hai cấu hình. macOS cần chọn driver/context phù hợp; không xem build thành công trên Windows là bằng chứng đã kiểm desktop trên mọi nền tảng.

Final là target mặc định; BUILD_CHECKPOINTS bật starter và project_34_checkpoint_1 … project_34_checkpoint_9. Assets và SDL runtime được CMake chuẩn bị một lần mỗi configuration. Không chạy từ thư mục source và đoán đường dẫn assets theo working directory.

## Điều khiển

- F1 CPU / F2 GPU; 1 rocket, 2 sphere, 3 cube.
- Kéo trái xoay model; V đổi sang orbit camera. Kéo phải pan, wheel zoom.
- Mũi tên xoay theo chế độ đã chọn. Home chỉ đặt lại camera/target.
- Space chạy/pause, N tiến 10°. R reset pose/options, giữ model và backend.
- D depth, C culling, O đảo thứ tự tam giác (không đảo winding từng tam giác).
- L Lambert, W wireframe, H normals, G grid.
- Escape khi kéo hủy gesture; ngoài gesture thì thoát. Mất focus nhả capture và pause.

## Quy ước chung

Right-handed; camera mặc định ở +Z nhìn -Z. Model xoay Y rồi X, M=Rx*Ry. Mat4 lưu column-major, shader nhận GL_FALSE và nhân P*V*M*position. Clip bounds -w..w cho x/y/z; NDC depth -1..1; window depth 0..1.

CPU framebuffer dùng top-left; OpenGL viewport/readback dùng bottom-left. Presenter/verification xử lý khác biệt origin, không sửa winding của một backend. Source faces CCW; CPU screen đảo Y nên area âm là front-facing. Depth clear 1, compare LESS; depth test tắt không ghi depth.

MeshVertex là position xyz + normal xyz. Flat normals được tách tại cạnh cứng. Model chỉ rotation sau uniform normalization; thêm non-uniform scale đòi hỏi inverse-transpose normal matrix ở cả hai backend.

Lambert dùng world normal/light, ambient 0,22 và diffuse 0,78. Grid ở Y=-1,1. Rasterization line debug có thể khác phần cứng; không dùng nó thay phép kiểm solid.

## Kiểm chứng và thời gian hữu hạn

CTest chỉ CPU: real datasets, bounds/index/normal, camera, clipping, raster/depth, winding và comparison validator. Không đưa GUI vào CTest.

```powershell
.\build\Release\project_34_final.exe --verify
.\build\Release\project_34_final.exe --mesh 2 --benchmark
.\build\Release\project_34_final.exe --smoke
.\build\Release\project_34_final.exe --mesh 2 --capture sphere.bmp
.\build\Release\project_34_final.exe --cpu --mesh 1 --capture rocket-cpu.bmp
```

--smoke/--capture: bốn frame, deadline nội bộ 10 giây. --verify/--benchmark: deadline 15 giây. Chạy tự động phải có process supervisor/watchdog ngoài tiến trình với hard timeout 30 giây để chặn cả lời gọi driver bị treo; deadline trong vòng lặp không ngắt được một API đồng bộ đang mắc kẹt.

--verify dùng cùng nhánh render của app:
- Transform feedback đọc gl_Position thật; clip/NDC tolerance 2e-5, screen 0,01 pixel, depth 1e-5.
- Solid image: cùng viewport, tắt grid/wire/normals. Ngoài dải cạnh 1,5 pixel: coverage giống, RGB <=3/255, depth <=2e-5, không NaN. Pixel nền cũng được kiểm.
- Trong dải cạnh, số pixel khác không quá max(8; 0,5% số pixel ảnh). Mask lập từ các cạnh triangle sau clip, không tự nới theo kết quả.
- Fixture riêng cho CCW/CW, near/eye crossing; real meshes xem mặt sau, depth tắt, thứ tự đảo.
- Switch 24 lần, sau lần 20 resize và đổi cả ba cached models. Scene và resource IDs phải giữ; sau destroy kiểm glIsBuffer/VAO/Program/Texture khi context còn current.

HUD đo CPU stages bằng steady_clock. GPU query là GL_TIME_ELAPSED cho geometry/debug draws, không bao gồm clear/HUD/swap. Query tagged frame ID, kết quả đến trễ; thiếu support hoặc chưa có mẫu ghi unavailable/pending, không ghi một số GPU suy từ CPU timer.

--benchmark chạy frozen scene ở viewport 640×480, VSync được xác nhận 0, 3 warm-up và 12 mẫu mỗi backend. glFinish trước swap là đồng bộ có chủ đích, CPU sync wait ghi riêng. Upload/init mesh không nằm trong mẫu. GPU mode không có CPU geometry/upload; CPU mode không có GPU geometry sample. Không chia hai cột khác công việc thành một speedup.

Ghi riêng build/CTest, hardware verification, desktop và benchmark cùng GPU/driver/config. Canvas trên web chỉ minh họa công thức và state, không thực hiện hay đo OpenGL.

## Tài liệu API

- [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake)
- [Framebuffer pixel size](https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels)
- [glDrawElements](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawElements.xhtml)
- [Query objects](https://wikis.khronos.org/opengl/Query_Object)
- [Transform feedback](https://wikis.khronos.org/opengl/Shader_Feedback_Setup)
