# Project 12 — Tam giác 3D xoay bằng chuột

Ứng dụng C++/SDL3 độc lập: tam giác wireframe xoay quanh centroid bằng công thức sin/cos, normal quay theo hình. Kéo chuột đổi yaw/pitch, Q/E đổi roll; đổi XYZ/ZYX để xem rotation không giao hoán.

Viewport perspective là phần chính của cửa sổ. Lưới sàn và các khung world ở depth 4/8/12 cho mốc xa gần. Debug hiển thị đỉnh, pivot, ghost, trục world, normal và số đo. Tắt debug vẫn giữ tam giác và cảnh nền.

## Thử tự xây trước khi đọc

Dành 180–240 phút để dựng tam giác từ ba Vec3, chọn centroid làm pivot, đưa các vertex về local rồi tự viết rotateX/Y/Z. Mỗi frame quay local gốc và cộng model position ở cuối. Không dùng matrix, quaternion, OpenGL projection, GLM hoặc Eigen.

Sản phẩm phải có input chuột và Q/E thật, không chỉ auto-rotate. Normal phải suy từ cross của các cạnh đã quay. Cạnh cắt near/far cần được clip trước chia; không xóa cả hình chỉ vì một vertex không visible.

## Prerequisites và build

C++20 compiler, CMake tối thiểu 3.24 và Git. Windows dùng Visual Studio 2022; Linux/macOS dùng GCC/Clang. CMake FetchContent khóa SDL **3.4.8**, link SDL3::SDL3. Lần configure đầu cần mạng; các gói hệ thống SDL trên Linux xem Getting Started của giáo trình.

Chạy tại thư mục có CMakeLists.txt:

~~~powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_12_final.exe
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_12_final.exe
~~~

Ninja hoặc generator single-config:

~~~bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_CHECKPOINTS=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --timeout 30
./build/project_12_final
~~~

Mặc định build final và tests; BUILD_CHECKPOINTS thêm starter và tám checkpoint chạy độc lập.

## Hành trình tám bài

1. Dựng ba vertex, đọc projection status, nối AB/BC/CA và giữ phần cạnh còn nhìn thấy sau clipping.
2. Centroid/pivot, local triangle và model position.
3. Quay X như phép quay 2D trên mặt phẳng YZ.
4. Quay Y/Z và ghép XYZ/ZYX theo các trục world cố định.
5. Normal từ cross của các cạnh world; mũi tên 3D từ centroid.
6. Mouse delta, capture owner, cuối thao tác và Q/E roll.
7. Angular velocity×dt, pause/step và clean/debug mode.
8. Oracle số, inverse, invariant và toàn bộ source.

## Điều khiển

- Mũi tên: dịch model XY; PageUp/Down: tăng/giảm Z, nấc 0.1 world.
- W/S: pitch quanh X (bài 3+).
- A/D: yaw quanh Y; Q/E: roll quanh Z, nấc 5° (bài 4+).
- O: đổi XYZ/ZYX và pause. Order nghĩa là thứ tự áp dụng theo trục WORLD cố định.
- Kéo trái trong viewport: yaw/pitch (bài 6+). Nhấn không đổi góc; sensitivity mặc định 0.008 rad/logical pixel.
- [ / ]: sensitivity trong [0.002,0.02].
- Space: chạy/dừng; N: tiến 0.1 s khi paused; F: ẩn/hiện debug (bài 7+).
- F1 mặc định, F2 hai góc 90°, F3 góc tổng quát, F4 cắt near, F5 lệch ngoài frustum.
- R reset, Esc thoát.

Đây là xoay object, không phải FPS camera: pitch đi qua 90° và được wrap về [-π,π], không khóa ±89°. Euler vẫn có cấu hình mà hai trục điều khiển trùng hướng; project chưa dùng quaternion/arcball để thay cách tương tác.

Chỉnh tay/order/preset dừng auto. Reset/preset/keyboard/blur/hidden/resize hủy capture; up nhận vị trí cuối từ đúng mouse owner. Resize/HiDPI letterbox bảng logic 1100×800, mouse được SDL_ConvertEventToRenderCoordinates đổi đúng một lần. Không nhân DPR thêm.

## Kiểm chứng

- X90/Y90/Z90 của (1,2,3) lần lượt là (1,-3,2), (3,2,-1), (-2,1,3).
- Với X=Y=90°, Z=0, XYZ cho (2,-3,-1), ZYX cho (3,1,2).
- 0 và 2π gần identity; ba edge lengths không đổi.
- Local centroid gần zero; world centroid trùng model position.
- Raw normal mặc định=(-1.71,0.51,6.45); normal từ cạnh đã quay khớp normal local quay cùng order.
- Inverse đảo thứ tự và dấu; error<1e-9. Round-trip bổ sung chứ không thay oracle tính tay.
- Cùng tổng simulation dt hợp lệ cho cùng orientation; nonfinite/negative dt bị bỏ, stall cap 0.1 s.
- Pixel tests giữ triangle/grid trong clean mode, ẩn normal debug và giữ cạnh còn nhìn thấy khi một vertex bị near loại.
- CTest không mở window, explicit check vẫn hoạt động ở Release.

Chạy executable với --smoke để tạo hidden window, vẽ vài frame, thử resize/clean và tự thoát. Smoke không thay kiểm thử chuột/keyboard/HiDPI trực tiếp. Các lệnh kiểm tra tự động của giáo trình có timeout và giới hạn số compiler.

## Source

- projection.hpp: camera, lens, projection và clipping từ P11.
- lab.hpp: triangle, centroid, rotation trực tiếp, normal, inverse và error.
- scene.hpp: state, preset, local→world và angular velocity.
- framebuffer.hpp: pixel và raster 2D từ các project trước.
- view.hpp: cảnh world, cạnh, marker và normal arrow.
- presentation.hpp: SDL texture và HUD/clean mode.
- src/main.cpp: init/input/lifecycle/present/cleanup.
- tests/tests.cpp: oracle/invariant/pixel tests không cần SDL.

Trong repository giáo trình chỉ sửa source-template; starter/checkpoints/final được sinh. Không commit output biên dịch hoặc ZIP.

Giới hạn: camera cố định nhìn +Z, tam giác wireframe chưa có che khuất, không có mesh filling hoặc matrix/quaternion. Đây là rotation nền tảng trước các project renderer tiếp theo.
