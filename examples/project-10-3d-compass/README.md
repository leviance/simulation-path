# Project 10 — La bàn 3D và pháp tuyến tam giác

Một ứng dụng C++20/SDL3 nhìn qua camera **perspective thật**, không dùng phép chiếu axonometric thay thế. Viewport có sàn lưới XZ, ba trục X/Y/Z, hai vector cạnh A/B, tam giác, raw cross và unit normal. Renderer CPU wireframe, không có hidden-surface removal/culling/lighting.

## Lộ trình học

1. Vec3, camera basis, depth và ba mũi tên trục.
2. P0/P1/P2, hai vector A=P1−P0, B=P2−P0 và sửa tọa độ.
3. Cross ba thành phần, raw normal và kiểm dot.
4. Unit normal, diện tích 3D và scale vẽ.
5. Winding, front/back/edge-on theo eye thật.
6. Mouse orbit, near/far clipping, capture và HiDPI.
7. Suy biến/gần thẳng hàng, oracle độc lập và bản hoàn chỉnh.

Trước khi đọc lời giải, thử tự dựng một cảnh có các lớp trên, cho phép đổi camera và hình học. Kiến thức trước đó: framebuffer/line (P04), vector/normalize (P06), dot (P08), local/world (P09). Camera helper được giải thích ngay bài đầu; P11 sẽ đào sâu perspective của một điểm.

## Build

Cần CMake >=3.24 và compiler C++20. Windows dùng Visual Studio 2022 với Desktop development with C++. FetchContent lấy đúng **SDL 3.4.8**, link SDL3::SDL3. Lần configure đầu cần mạng.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Windows chạy build/Debug/project_10_final.exe. Ninja/Make: thêm -DCMAKE_BUILD_TYPE=Debug khi configure, chạy executable ngay trong build và dùng build tree riêng cho Release. Mặc định chỉ final/tests; BUILD_CHECKPOINTS=ON thêm project_10_starter và project_10_checkpoint_1…7. Build mọi target trước CTest, không chỉ target final.

## Điều khiển

- A/D yaw, W/S pitch, +/- radius. Camera nhìn world origin; yaw wrap, pitch [-1.2,1.2] rad, radius [7,12].
- 1/2/3 chọn P0/P1/P2; mũi tên đổi XY, PageUp/Down đổi Z; bước 0.1, mỗi tọa độ clamp [-2,2].
- F đảo P1/P2 từ checkpoint 05.
- Từ checkpoint 06: kéo trái trong viewport để orbit; một owner, giữ mẫu trước, nhận mẫu thả cuối.
- Space chạy/pause orbit 0.35 rad/s, N tiến 0.1 s khi pause.
- R/F1 reset; F2 tam giác 3–4; F3 thẳng hàng; F4 trùng đỉnh; F5 gần thẳng hàng; Esc thoát.
- Blur/hidden/resize/reset/preset/winding/pause hủy capture. Resize giữ state rồi pause.
- --smoke: hidden window, 12 frame, đổi preset/camera/resize và thoát. Cần timeout ngoài; không thay QA desktop.

Canvas có slider chọn đỉnh và camera, từ bài 6 hỗ trợ pointer orbit; Tab tới slider để dùng keyboard mặc định. Reduced motion không tự chạy, vẫn cho manual step.

## Quy ước

World Y-up, right-handed cross X×Y=Z. Camera-space +Z là depth vào cảnh. World→camera→near/far clip [0.2,30]→perspective→screen. Screen center (550,410), focal=420 pixel logic. Bảng 1100×800 letterbox/HiDPI; SDL_ConvertEventToRenderCoordinates đúng một lần, không nhân DPI nữa.

Hai vector A/B luôn từ P0 tới P1/P2. Raw N=A×B, unit N=N/|N|, area=|N|/2. Vàng raw arrow dài min(0.2×|N|,2.2) world; tím unit arrow dài 1.4 world từ centroid. Scale vẽ không đổi số đo. Perspective không giữ góc; hai nét trông không vuông vẫn có thể vuông trong 3D.

Normal không tin cậy nếu |N|≤1e−10 world² hoặc |N|/(|A||B|)≤1e−6; cạnh zero dừng trước phép chia. Near-collinear giữ measured area nhỏ khác 0 nhưng không vẽ normal/facing giả. Facing=dot(unitNormal,normalize(eye−centroid)); dương front, âm back, |facing|≤1e−6 edge-on. Edge-on không phải degenerate.

## Source và kiểm chứng

lab.hpp math; camera.hpp camera/projection/clipping; scene.hpp state; framebuffer.hpp/view.hpp CPU arrows/lines; presentation.hpp SDL texture/chữ ASCII; main.cpp lifecycle/input.

Tests dùng check/EXIT_FAILURE cả Debug/Release: basis và numeric cross, 61 tam giác đối chiếu Heron, orthogonality, winding, suy biến, perspective numeric oracle, near/far intersection, input bounds, pixel thực và không có unit arrow giả. CTest không mở window.

Nghiệm thu desktop riêng: sửa mọi đỉnh, PageUp/Down, orbit keyboard/mouse, winding, các preset, thả ngoài, blur, resize, DPI, pause/reset. Các test thuần và hidden smoke không chứng minh tương tác thật trên hệ điều hành.

Trong repository giáo trình sửa source-template, sinh starter/checkpoints/final/ZIP bằng generator; không đưa output biên dịch hay snapshot được sinh vào Git.
