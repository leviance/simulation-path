# Project 15 — Máy soi pipeline 3D

Tự viết Mat4 và theo dõi cùng một vertex qua LOCAL/model space → WORLD → VIEW → CLIP → NDC → SCREEN. Ứng dụng C++20/SDL3 có cảnh wireframe trên lưới sàn, tám vertex chọn được, bảng sáu dòng cập nhật ngay trong cửa sổ, điều khiển transform/FOV/near/far và chế độ xem sạch.

Mục đích không chỉ là vẽ một cube: bạn phải tìm được dữ liệu bắt đầu sai ở bước nào. Canvas trên website hỗ trợ công thức, không thay ứng dụng C++.

## Thử tự làm trước

Dựng một inspector có đủ sáu stage của cùng vertex. Tự viết M, V, P, phép nhân Mat4 và perspective divide; chọn point, đổi transform/lens và giữ các stage phía trước không bị ảnh hưởng. Đừng thay dữ liệu chưa tính được bằng (0,0).

Convention: column vector, row-major storage, +Y lên, view nhìn +Z, yaw+ quay về +X, pitch+ nhìn lên, NDC Z trong [0,1]. Không dùng GLM, OpenGL, SDL_RenderGeometry hoặc engine để thay phần toán/rendering.

## Bảy checkpoint

1. Từ Starter CPU có lưới sàn, thêm mesh, chọn vertex và dòng LOCAL.
2. Mat4, identity, hai phép nhân; point w=1 khác direction w=0.
3. M=T×Ry×S, nối vào cả renderer và dòng WORLD.
4. V=Rx(pitch)×Ry(-yaw)×T(-position), đối chiếu P14.
5. P từ FOV/aspect/near/far; clip.w giữ view.z.
6. Guard/optional, divide, clip classification và viewport; thay projection tham chiếu P11.
7. MVP, ví dụ tính tay, pause/step/clean và validation.

Giải nén ZIP vào thư mục học riêng. Tự viết tiếp trong starter/include và starter/src, build target project_15_starter. Các checkpoint/final là source tham khảo độc lập, không tự nhận thay đổi ở Starter. Mọi snapshot có đủ header/src, không phải các snippet cần tự đoán chỗ ghép.

Trước checkpoint 6, ảnh dùng công thức P11 đã học để đối chiếu các stage đang xây. Final dùng các Mat4 mới và perspective divide cho cả inspector lẫn renderer.

## Build/run

Cần C++20, CMake≥3.24, Windows Visual Studio 2022 Desktop development with C++. FetchContent tải SDL **3.4.8** theo checksum, link SDL3::SDL3. Configure đầu tiên cần mạng.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
./build/Release/project_15_final.exe
```

Target mặc định final và tests. BUILD_CHECKPOINTS thêm Starter và checkpoint_1..7. Ninja/Makefiles dùng CMAKE_BUILD_TYPE; executable nằm trực tiếp trong build/.

CTest mặc định include final/include. Khi hoàn thiện Starter và muốn test mã mình viết, đổi target_include_directories(project_15_tests PRIVATE final/include) thành target_include_directories(project_15_tests PRIVATE starter/include) trong CMakeLists của bản ZIP đang học, configure lại rồi build project_15_tests.

## Điều khiển final

| Input | Hành vi |
| --- | --- |
| V / click gần vertex | Chọn một trong tám vertex |
| Mũi tên, PageUp/PageDown | Sửa local X/Y, local Z của vertex đang chọn |
| A/D, W/S, Q/E, U/O | Model X, Z, yaw, scale X |
| J/L, I/K, Z/X | Camera yaw, pitch, Z |
| [ / ] | Vertical FOV, nấc 5°, giới hạn 25–110° |
| − / =, 9 / 0 | Near −/+0.1, far −/+1; luôn near<far |
| 1–6 | Chọn dòng cần chú ý, không giấu năm dòng khác |
| F1–F7 | Mặc định, tính tay, near, behind, far, outside XY, w=0 |
| Space / N | Pause/tiếp tục, bước 1/30s khi pause |
| F / R / Esc | Debug/clean, reset, thoát |

Đây là các bước chỉnh rời để đọc số, không phải bộ WASD đi liên tục của P14. Sửa tham số/preset, mất focus, hidden/minimize hoặc resize sẽ pause tự quay. Reset cũng pause. Không có mouse lock; native click để chọn, Canvas dùng drag/pointer capture và có slider/keyboard thay thế.

Canvas tách riêng hai chế độ kéo: **Xoay mô hình** đổi model yaw bằng kéo ngang, không đổi camera; **Đổi góc nhìn** đổi camera yaw/pitch bằng kéo ngang/dọc, không đổi LOCAL/WORLD của vertex. Lưới world chỉ đổi hình ảnh khi camera thay đổi, không xoay theo mô hình. Đổi chế độ sẽ kết thúc phiên kéo và dừng tự quay; reset/preset trở về Xoay mô hình. Chế độ camera được mở từ bài 4.

Debug dùng viewport 1100×560; clean dùng 1100×800, giữ grid/mesh/vertex và bỏ bảng/HUD. Resize/HiDPI letterbox bảng logic, không nhân framebuffer theo kích thước window. SCREEN là logical pixel, không phải CSS/device pixel.

## Ví dụ tính tay — F2

Local(1,1,0), scale(2,1,1), yaw90°, position(1,0,6) → world(1,1,4).
Camera(1,0,0), yaw=pitch=0 → view(0,1,4).
FOV90°, near1, far9 → clip(0,1,27/8,4).
Chia w4 → NDC(0,1/4,27/32).
Viewport1100×560 → screen(550,210).

Tính tay khóa convention; separate-vs-MVP chỉ kiểm đường ghép. Không dùng một phép so thay cho phép kia.

## Tọa độ bị clip và tọa độ chưa tồn tại

- Point w=1 nhận translation; direction w=0 không nhận translation trong M/V affine.
- P tạo clip.w=view.z. Nó chưa chia phối cảnh.
- w≤10⁻⁹: không divide, NDC/SCREEN là optional rỗng và UI hiện —.
- w dương: giữ NDC/screen hữu hạn kể cả điểm outside để soi. Chỉ vertex trong vùng nhìn được vẽ marker.
- Cạnh được clip trong view/depth trước divide, screen trước int/Bresenham. Một vertex outside không đủ kết luận cả cạnh invisible.

Chưa có tô triangle, Z-buffer hay triangle clipper. Đây là inspector và renderer wireframe CPU.

## Source và validation

- lab.hpp: Vec4/Mat4, M/V/P, trace, agreement.
- scene.hpp: dữ liệu mô hình, state, presets, tham số, inspector/update.
- framebuffer.hpp: pixel và Bresenham.
- view.hpp: clip/project/raster, marker/picking.
- presentation.hpp: SDL texture và bảng sáu dòng.
- src/main.cpp: lifecycle, key bindings, timing, upload/present.
- tests/tests.cpp: không cần window; check/EXIT_FAILURE hoạt động cả Release.

Tests khóa point/direction, row-major/column-vector, T×S/S×T, oracle tính tay qua sáu stage, model/view reference, MVP, near/far mapping, invalid input/w, lens bounds, dt và renderer sạch. --smoke chạy 12 frame ẩn, đi qua key handler, resize/upload/present; không thay kiểm thử chuột/HiDPI trực tiếp.

Sau CTest, hãy thử toàn bộ bảng phím, bảy preset, click chọn vertex, mất focus khi đang quay, resize/scaling và debug/clean. Source build được không tự chứng minh mọi đường input trên desktop đã được thử.
