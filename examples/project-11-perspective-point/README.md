# Project 11 — Điểm sáng bay trong không gian

Tự chiếu một point 3D xuống framebuffer bằng perspective. Đây là ứng dụng C++/SDL3 độc lập, không cần website hoặc Canvas để chạy.

Bạn sẽ thấy một điểm sáng giữa lưới mặt phẳng và bốn khung world có cùng kích thước ở depth 2/4/8/12. Point di chuyển trên cả ba trục, có thể bay theo thời gian, dừng để đo, kéo ở depth cố định và xem ở chế độ sạch không có debug.

## Trước khi đọc hướng dẫn

Thử tự làm trong 180–240 phút: dựng window/framebuffer, lưu Vec3, nối WASD/QE với delta time, rồi tự suy x/z và y/z. Camera nhìn +Z, Y lên trên, vị trí camera tách khỏi world point. Thêm vertical FOV, aspect, near/far và từ chối point không nhìn thấy. Không dùng OpenGL projection, GLM hoặc Eigen.

Giữ X/Y, tăng camera Z gấp đôi phải giảm displacement khỏi tâm một nửa. Thay đổi size đĩa mà không thay vị trí theo x/z,y/z chưa phải perspective.

## Cần chuẩn bị

C++20 compiler; Visual Studio 2022 trên Windows, GCC hoặc Clang trên Linux/macOS. CMake tối thiểu 3.24 và Git. CMake FetchContent lấy SDL **3.4.8**, link qua SDL3::SDL3. Lần configure đầu cần mạng. Các gói hệ thống của SDL trên Linux được giải thích ở Getting Started của giáo trình.

## Build và chạy

Chạy trong thư mục có CMakeLists.txt:

~~~powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_11_final.exe
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
~~~

Với generator single-config như Ninja:

~~~bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_CHECKPOINTS=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --timeout 30
./build/project_11_final
~~~

Mặc định chỉ build final và tests. BUILD_CHECKPOINTS=ON thêm starter và tám checkpoint độc lập. Target project_11_checkpoint_1 … project_11_checkpoint_8 cho phép chạy sản phẩm sau mỗi bài.

## Hành trình tám bài

1. Vẽ marker trên framebuffer, lưu Vec3 và bắt WASD/QE theo dt. Preview XY chưa perspective.
2. Đổi world sang camera bằng phép trừ; camera chưa xoay.
3. Suy perspective divide bằng tam giác đồng dạng, chiếu cả point lẫn nền world. Focal scale tạm bằng 1; helper guard/clipping có sẵn trong checkpoint để chia an toàn.
4. Thay hệ số tạm bằng 1/tan(vFOV/2), thêm NDC, viewport origin và aspect.
5. Đọc đầy đủ các guard; phân biệt invalid/behind/before-near/beyond-far/outside/visible.
6. Quỹ đạo từ elapsed time; pause/step/reset, input tay dừng auto.
7. Inverse tại depth đã biết; kéo giữ offset và mouse owner.
8. Clean/debug mode, oracle tính tay, round-trip và bản source đầy đủ.

## Điều khiển

- WASD: X/Y; Q/E: giảm/tăng Z. Giữ phím đi 2 world/s, hướng chéo được normalize.
- J/L: camera X; I/K: camera Y; U/O: camera Z (bài 2+).
- +/−: giảm/tăng vertical FOV, giới hạn 25°–110°. V: viewport 16:9, 4:3, 1:1 (bài 4+).
- [ / ]: near 0.1–2; ; / dấu nháy đơn: far 8–24 (bài 5+).
- Space: chạy/dừng quỹ đạo; N: tiến 0.1s khi paused (bài 6+).
- Kéo gần marker visible: giữ camera depth và offset chỗ nắm (bài 7+).
- F: ẩn/hiện HUD, axes, crosshair; vẫn giữ lưới và khung 3D (bài 8).
- F1 mặc định; F2 xa gấp đôi; F3 trước near; F4 sau camera; F5 vượt far; F6 ngoài góc nhìn.
- R reset, Esc thoát.

Chạy quỹ đạo đặt point theo flightPoint(elapsed), không tiếp tục hướng input tay. Bật chạy sau khi chỉnh tay có thể chuyển point đến vị trí quỹ đạo tương ứng. Pause giữ elapsed; reset/preset đưa elapsed=0. Focus lost, hidden và resize pause và hủy drag. Khi chỉnh camera/lens/aspect, thao tác drag hiện tại cũng bị hủy.

Resize/HiDPI letterbox bảng logic 1100×800, không âm thầm đổi góc nhìn. V đổi kích thước viewport thật; dùng nó để thử aspect. Mouse event được đổi qua SDL_ConvertEventToRenderCoordinates đúng một lần.

## Kiểm chứng

- Oracle: FOV90°, viewport (10,20,800,600), P=(1,0.5,4) → screen (485,282.5). Đổi Z=8 → (447.5,301.25).
- Guard từ chối nonfinite/lens/viewport sai trước chia; near/far chính xác vẫn hợp lệ.
- NDC/screen là optional; behind không báo ảnh giả tại (0,0), round-trip không xác định không báo 0.
- Round-trip ở nhiều FOV/aspect/depth, error<1e-9 world.
- Near/far segment intersection kiểm bằng số tính tay; screen clip trước int/Bresenham.
- CPU pixel tests: clean mode giữ grid/marker, behind không vẽ marker, cạnh phải NDC không ghi sang panel.
- Các phân hoạch dt cùng tổng hợp lệ cho cùng point. NaN/negative dt bị bỏ, stall cap 0.1s.
- Explicit check hoạt động trong cả Debug và Release; CTest không khởi tạo SDL.

Chạy executable với --smoke để mở hidden window, render vài frame, thử resize/clean mode và tự thoát. Đây là smoke test, không xác nhận tương tác chuột, bàn phím hay HiDPI thật. QA desktop vẫn cần thực hiện riêng.

## Cấu trúc source

- include/lab.hpp: vector, camera, lens, projection/guard/clipping, quỹ đạo và inverse.
- include/scene.hpp: point/camera/lens/state, viewport, preset, cập nhật.
- include/framebuffer.hpp: pixel và raster 2D từ các project trước.
- include/view.hpp: hình học nền 3D, marker, clip/raster.
- include/presentation.hpp: SDL texture, HUD và clean mode.
- src/main.cpp: init/input/lifecycle/present/cleanup.
- tests/tests.cpp: correctness không cần window.

Trong repository giáo trình, source-template là nguồn chuẩn. starter/checkpoints/final được sinh; không sửa output rồi chép ngược.

Camera chưa xoay, marker là ký hiệu đĩa của một point, scene wireframe chưa có che khuất. Những phần này được mở rộng ở các project sau.

Tham khảo API: [Keyboard state](https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState), [Render coordinates](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates), [Mouse capture](https://wiki.libsdl.org/SDL3/SDL_CaptureMouse).
