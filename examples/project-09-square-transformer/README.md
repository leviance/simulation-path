# Project 09 — Trình biến đổi hình vuông

Tự xây một editor 2D bằng C++20/SDL 3.4.8: hình vuông, basis và lưới local đi qua cùng ma trận. Panel có bảy slider tự vẽ trên framebuffer, không dùng UI engine hay thư viện ma trận.

## Học theo đường nào?

1. Vẽ bốn đỉnh local và hai basis, chưa dùng ma trận.
2. Scale: kích thước theo từng trục, số âm và 0.
3. Rotation: suy công thức từ sin/cos của hai basis.
4. Shear đồng thời; viết Mat2, transformVector và matrix multiplication.
5. Viết Mat3, phân biệt điểm [x,y,1] với hướng [x,y,0].
6. Ghép S→H→R→T hoặc R→H→S→T; biến đổi cả lưới.
7. Tự làm slider, hit-test, capture và input HiDPI trong SDL3.
8. Kiểm tọa độ độc lập, determinant, diện tích và suy biến.

Trước khi xem lời giải, hãy tự thử xây editor có bảy tham số, đổi order mà giữ nguyên tham số và kiểm identity. Nên biết framebuffer/line (P04), world/screen (P05), vector (P06), sin/cos/radian (P07).

## Build và chạy

Cần CMake >=3.24, compiler hỗ trợ C++20 (Windows: Visual Studio 2022 với Desktop development with C++). CMake FetchContent lấy đúng SDL **3.4.8**, link qua SDL3::SDL3. Lần configure đầu cần mạng. Không chép SDL vào repository.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Windows: chạy `build/Debug/project_9_final.exe`. Với generator một cấu hình (Ninja/Make), thêm `-DCMAKE_BUILD_TYPE=Debug` khi configure, bỏ thư mục Debug khi chạy và dùng build tree riêng cho Release.

Mặc định build final và tests. `BUILD_CHECKPOINTS=ON` thêm starter và tám target `project_9_checkpoint_1`…`project_9_checkpoint_8`. Ví dụ build riêng starter: `cmake --build build --config Debug --target project_9_starter --parallel 2`. Không chỉ build target final trước CTest vì còn test executable.

## Điều khiển bản final

- Bảy slider bên phải: scaleX/Y, angle, shearX/Y, translationX/Y.
- Up/Down chọn slider màu vàng; Left/Right chỉnh theo step.
- A/D scaleX, S/W scaleY, Q/E góc, J/L shearX, K/I shearY.
- Kéo trong viewport để dịch chuyển tương đối, giữ nguyên điểm nắm.
- O đổi order; R/F1 identity; F2 scale âm; F3 scale 0; F4 shear suy biến; F5 ghép không giao hoán.
- Space chạy/pause (0.45 rad/s); N tiến 0.1 s khi pause; Escape thoát.
- Mất focus/resize/reset/preset/order/pause hủy capture; resize giữ world state và pause.
- `--smoke` mở hidden window, chạy 12 frame, đổi preset/slider/resize rồi thoát. Dùng timeout ngoài khi tự động hóa; đây không phải kiểm thử thao tác desktop.

Checkpoint 01–06 dùng bàn phím/preset; slider và kéo chỉ được nối ở checkpoint 07. Canvas trên website có slider HTML từ các bài toán tương ứng để thử kiến thức trước khi làm UI SDL3.

## Quy ước cần giữ

- Row-major storage, column vector; `T*R*H*S*p` áp scale trước.
- Mat3 chỉ affine, hàng cuối [0,0,1]; translation ở cột cuối.
- Directions không nhận translation. Basis không normalize: độ dài/xiên là thông tin cần quan sát.
- Local square có nửa cạnh 1 world; origin screen (450,400), 50 pixel logic/world; Y đổi dấu đúng một lần.
- SDL letterbox bảng 1280×800; input convert bằng SDL_ConvertEventToRenderCoordinates một lần. Không nhân DPI nữa.
- Scale ±2, shear ±1, translation ±2 world; góc ±π. Đây là miền editor hữu hạn, không hứa bảo vệ mọi double tùy ý.
- Shear đồng thời H=[[1,hx],[hy,1]] có det=1−hx*hy; khác hai shear một trục nối tiếp.
- Luôn tính lại từ local point gốc; không sửa dồn kết quả.
- Xám: world grid/hình gốc; xanh lá: hình/lưới sau biến đổi; đỏ/lam: ex/ey; vàng: local origin/slider được chọn.
- UI ghi suy biến/gần suy biến nếu |det|≤1e−10; không gọi det=0 là giữ chiều.

## Cấu trúc source và kiểm chứng

`include/lab.hpp`: math; `scene.hpp`: state/composition; `controls.hpp`: slider; `framebuffer.hpp/view.hpp`: CPU rasterizer; `presentation.hpp`: SDL texture và chữ ASCII; `src/main.cpp`: lifecycle/input. Mọi snapshot chạy độc lập.

CTest dùng check/EXIT_FAILURE, hoạt động dưới NDEBUG. Có số biết trước cho Mat2/Mat3, 41 bộ tham số × hai order, oracle hệ số khai triển không gọi compose/multiply, signed/absolute area, reflection/singular, slider clamp/NaN, world/screen và pixel thật. Tỉ lệ diện tích đúng không thay thế kiểm tọa độ vì đổi order vẫn có thể giữ determinant.

Trước khi xem là hoàn thành, kiểm trực tiếp slider/keyboard/capture/thả ngoài, mất focus, resize và DPI. Các test toán, source contract và hidden smoke không chứng minh thao tác thực tế trên hệ điều hành.

Trong repository giáo trình, sửa `source-template/` rồi chạy generator; starter/checkpoints/final và ZIP được sinh, không đưa compiler output vào Git.
