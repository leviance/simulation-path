# Project 16 — Tô kín tam giác bằng pixel

Từ ba vertex liên tục, tự quyết định pixel nào thuộc bề mặt và tô RGB bằng barycentric coordinates. SDL3 chỉ nhận input và trình bày CPU framebuffer; không SDL_RenderGeometry, OpenGL, GLM hoặc thư viện rasterizer.

Bản cuối có hai nơi thực hành: cảnh 3D thật với tam giác RGB trên lưới sàn, và bàn 2D để soi bounding box, sample, winding, cạnh chung và các trường hợp suy biến. Tắt debug vẫn thấy bề mặt và perspective, không chỉ một cửa sổ trống.

## Thử tự làm trước

Dành 300–390 phút để viết edge function, bounds đã clamp, sample tâm pixel, vòng fill và nội suy. Chốt Y-down và winding; tự tính triangle (0,0),(4,0),(0,4) có double area=16. Test cả hai winding, thẳng hàng, ngoài viewport và hai triangle ghép quad.

Sau đó nối ba world vertex qua camera/projection của P11 vào cùng rasterizer. Cho phép kéo vertex, thay depth/camera/FOV và xem sạch. Không dùng đổi size một hình 2D để giả depth.

## Học trong Starter, đối chiếu bằng checkpoint

Giải nén ZIP, mở thư mục có CMakeLists.txt. Viết trong starter/include và starter/src. Các kiểu dữ liệu, SDL/framebuffer, projector P11 và một số helper nền đã có; mỗi bài ghi rõ phần thêm và phần thay, không dán trùng struct/hàm.

~~~powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_16_starter --parallel 2
.\build\Debug\project_16_starter.exe
~~~

checkpoints/01..08 là các bản tham khảo chạy độc lập, không tự nhận thay đổi từ Starter. final là bản hoàn chỉnh. Mặc định CMake build final cùng tests; BUILD_CHECKPOINTS thêm Starter và tám target project_16_checkpoint_1..8.

Cần C++20, CMake≥3.24, Git và compiler (Windows: Visual Studio 2022 Desktop C++). FetchContent khóa SDL **3.4.8** theo SHA-256, link SDL3::SDL3; configure đầu cần mạng. Ninja/Makefiles dùng CMAKE_BUILD_TYPE và executable nằm trực tiếp trong build/.

## Tám bài đi tới sản phẩm

1. Dựng outline, handle, keyboard và drag có owner/offset trước khi tô.
2. Tạo bounding box bảo thủ; reject invalid/ngoài trước clamp và cast.
3. Edge function, signed area, winding và số đo thật trong HUD.
4. Sample ở (x+0.5,y+0.5), ba half-plane, guard và weights theo input gốc.
5. Vòng raster row-major, callback, count, pause/step.
6. Top-left và một budget cho cả quad; kiểm toàn coverage buffer.
7. RGB từ barycentric; đổi lại weights B/C sau normalize, không tráo thuộc tính.
8. World XYZ → camera → screen → cùng rasterizer; clean mode, kéo giữ depth và kiểm bản hoàn chỉnh.

## Điều khiển native

- 1 mặc định (3D ở final); 2 đảo geometry và màu B/C; 3 suy biến.
- 4 triangle cắt viewport và 5 quad chung cạnh chuyển sang bàn 2D.
- B đổi 2D/3D; F clean/debug (bài 8).
- Tab chọn vertex; mũi tên đổi XY; PageUp/Down đổi world Z.
- J/L camera X, U/O camera Z, +/− vertical FOV (bài 8).
- Kéo handle: giữ chỗ nắm, trong 3D giữ camera depth; đổi state nhả capture.
- T inclusive/top-left (bài 6), C solid/barycentric RGB (bài 7).
- Space quét/dừng; N một candidate khi paused (bài 5+); R reset mặc định; Esc thoát.
- Resize/HiDPI letterbox board 1100×800, không reset hình/cấp phát theo window. Blur, hidden, minimize, resize dừng quét và hủy drag.

Canvas ở bài 1–7 phóng đại các ô để học coverage; bài 8 là cảnh 3D với cùng công thức và slider/keyboard. Tab trong browser dành cho focus, chọn vertex bằng select. Reduced motion tắt tự quét nhưng vẫn cho chỉnh tay/step. Không coi Canvas là thay thế executable C++.

## Kiểm chứng bản mẫu và mã của bạn

~~~powershell
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_16_final.exe
~~~

CTest mặc định include final/include. Sau khi viết đủ tám bài trong Starter, đổi target_include_directories(project_16_tests PRIVATE final/include) thành target_include_directories(project_16_tests PRIVATE starter/include) trong CMakeLists.txt của ZIP. Configure lại, build cả project_16_starter và project_16_tests rồi chạy CTest hai cấu hình. Không dùng kết quả của final để khẳng định Starter đúng.

Tests không tạo window và không dùng assert bị NDEBUG tắt. Chúng kiểm oracle area, bounds, callback/limit, weights tại từng vertex của input negative, quad không crack/overlap cho hai đường chéo và subpixel, RGB cụ thể, phép chiếu tính tay, inverse drag và ảnh CPU sạch có fill/grid.

--smoke mở cửa sổ ẩn, vẽ một số frame hữu hạn, thử resize/clean rồi tự thoát. Sau đó vẫn cần mở ứng dụng để thử chuột, bàn phím và HiDPI trên desktop. Với Canvas, tự chạy npm run dev rồi kiểm tra các thao tác tương ứng trong trình duyệt.

## Nguồn và giới hạn

lab.hpp chỉ giữ raster math; space.hpp là projector/inverse P11; scene.hpp giữ state/preset/drag; framebuffer.hpp giữ pixel/Bresenham; view.hpp ghép scene với rasterizer; controls.hpp sửa state; presentation.hpp hiện ảnh/HUD; main.cpp quản lý lifecycle.

Trong repository giáo trình, source-template là nguồn authored; Starter/checkpoints/final/CMake/ZIP là generated outputs, không commit. Trong ZIP tải về, Starter là bản người học sửa.

Camera chưa xoay, chưa có Z-buffer, chưa perspective-correct interpolation. Khi bất kỳ vertex nào ngoài near=0.5/far=20, reject nguyên triangle trước chia; clipping đa giác được học ở P18. XY ngoài viewport được cắt bằng raster bounds, không đẩy vertex giả vào cạnh màn hình. RGB biểu diễn barycentric screen-space, không được gọi là thuộc tính world đã hiệu chỉnh phối cảnh.
