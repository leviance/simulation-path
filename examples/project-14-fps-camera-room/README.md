# Project 14 — Đi trong căn phòng wireframe bằng camera FPS

Ứng dụng C++20/SDL3 tự viết view transform và movement. Room 12×22×4 có sàn, tường, trần và hai hộp mốc; world geometry bất biến. Camera đứng trong scene, đi bộ/bay và nhìn quanh bằng relative mouse mode. Không dùng OpenGL, SDL line primitives, GLM hoặc physics engine.

## Thử thách trước khi học

Dựng phòng rồi đi từ cửa vào tới cuối phòng bằng WASD, quay nhìn lại, bay lên/xuống bằng Q/E. Cần basis trực chuẩn, movement theo dt không tăng tốc khi đi chéo, clipping từng đoạn an toàn và chế độ sạch vẫn giữ cảnh 3D.

Hai hộp chỉ là mốc: có thể đi xuyên chúng. Chỉ sáu biên ngoài bị chặn bằng AABB clamp; đây không phải collision solver tổng quát. Canvas trên website hỗ trợ công thức, không thay executable native và không thay kiểm tra SDL relative mode.

## Chín checkpoint

1. Dựng world room một lần; clip/project từ mắt cố định.
2. Trừ camera position để đổi gốc tọa độ.
3. Inverse yaw/pitch: camera nhìn +Z, yaw+ quay phải, pitch+ nhìn lên.
4. Suy forward/right/up; so view với dot(relative,basis).
5. Walk bằng keyboard state × dt, giữ Y=1.6, normalize direction.
6. Fly dùng forward 3D, Q/E theo world Y; M đổi mode.
7. Relative mouse mode SDL và lifecycle input.
8. Bounds, pause/step/demo và debug/showcase.
9. Oracle độc lập, invariant và nghiệm thu sản phẩm.

Học từ starter/, đối chiếu checkpoints/01..09/. Mỗi snapshot và final/ có đầy đủ header/src, không phải tập snippet cần đoán chỗ ghép.

## Build và chạy

Cần CMake ≥3.24, C++20; Windows dùng Visual Studio 2022 Desktop development with C++. FetchContent tải SDL **3.4.8** ở lần configure đầu, link `SDL3::SDL3`.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
./build/Release/project_14_final.exe
```

Target mặc định final và tests. Option thêm starter, checkpoint_1..9. Với Ninja/Makefiles, chọn CMAKE_BUILD_TYPE và tìm executable trực tiếp trong build/.

## Điều khiển final

| Input | Hành vi |
| --- | --- |
| WASD | Đi theo yaw trong Walk, theo forward/right trong Fly |
| M | Đổi Walk/Fly; về Walk trả Y=1.6 |
| Q/E | Xuống/lên theo world Y khi Fly |
| I/K, J/L | Pitch, yaw theo nấc 3° |
| Click trong viewport | Bật relative mouse look, cursor không bị chặn ở mép |
| Esc | Nhả look và pause; Esc lần nữa khi đã nhả để thoát native |
| Space, N | Pause/tiếp tục; bước W 0.1s khi paused |
| T, F | Đi thử tự động; debug/showcase |
| [ / ], − / + | Speed 1–7 world/s; sensitivity 0.001–0.02 rad/input unit |
| R, F1..F5 | Reset; cửa vào, nhìn lại, yaw90, nhìn lên/Fly, sát tường |

Reset/pause/mode/preset/blur/hidden/minimize/resize nhả relative mode và hủy input. Sau reset/focus change, thả movement keys trước phiên mới. Focus trở lại không tự khóa cursor. Resize/HiDPI letterbox bảng logic 1100×800; relative xrel/yrel không nhân dt/DPR hoặc tỉ lệ framebuffer.

Walk giữ độ cao mắt và không phụ thuộc pitch. Fly dùng forward 3D cộng world-Y lift, rồi normalize tổng hướng; forward và world up không luôn vuông góc. Camera up được dùng cho view/basis, không thay world up của Q/E.

## Source và kiểm chứng

- frame/projection/rotation: `include/framebuffer.hpp`, `projection.hpp`, `rotation.hpp`.
- Camera math: `include/lab.hpp`.
- World/state: `include/room.hpp`, `scene.hpp`.
- Clip/raster: `include/view.hpp`.
- SDL/input/presentation: `include/presentation.hpp`, `src/main.cpp`.
- CTest: `tests/tests.cpp`, không cần window và vẫn hoạt động trong Release.

Tests khóa translation, yaw/pitch90, view-vs-dot, inverse, basis, pixel oracle, dt30/60/144, Walk/Fly/diagonal speed, bounds, clipping và pixel cảnh khi debug tắt. `--smoke` chạy 12 frame ẩn kiểm resource/resize/upload; không chứng minh relative mouse/input/HiDPI trên desktop. Cần tự thử các đường đó sau CTest.
