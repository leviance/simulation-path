# Project 17 — Khối lập phương đặc với 6 mặt màu và Z-buffer

Từ rasterizer của Project 16, dựng cube tám vertex/mười hai triangle rồi tự giải quyết che khuất ở từng pixel. Bản cuối là ứng dụng C++20/SDL3 tương tác, có depth buffer CPU, back-face culling độc lập, camera tịnh tiến, lưới sàn và clean mode.

## Thử tự làm trước

Dành 300–390 phút: dựng đủ mesh và sáu màu; cho xoay khối; đảo draw order để nhìn lỗi; tạo depth buffer cùng row-major index; clear=1.0; nội suy NDC depth bằng barycentric và chỉ ghi color khi newDepth<storedDepth. Sau đó thêm culling theo winding gốc và chế độ tắt overlay vẫn còn cảnh.

Không dùng SDL_RenderGeometry, OpenGL, GLM, sort mặt thay Z-buffer hay GPU depth. Culling không thay depth test. Với cube lồi, culling có thể giấu lỗi khi tắt depth; tắt culling trước khi so draw order.

## Chạy và học trong Starter

Cần compiler C++20 (Windows: Visual Studio 2022 Desktop C++), CMake≥3.24 và Git. FetchContent khóa SDL **3.4.8** theo SHA-256, link SDL3::SDL3; configure lần đầu cần mạng.

Giải nén ZIP vào thư mục riêng, chạy từ nơi có CMakeLists.txt:

~~~powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_17_starter --parallel 2
.\build\Debug\project_17_starter.exe
~~~

Viết trong starter/include và starter/src. Bộ khung có kiểu dữ liệu, SDL/framebuffer, phép quay/chiếu và rasterizer top-left. DepthBuffer ban đầu là stub, chưa cấp phát hay thử depth. Mỗi bài ghi rõ phần có sẵn, hàm thêm và đoạn phải thay.

checkpoints/01..09 là các bản tham khảo độc lập; chạy chúng không kiểm mã vừa sửa trong Starter. final là bản hoàn chỉnh. CMake mặc định build final và tests; BUILD_CHECKPOINTS bật Starter cùng chín target project_17_checkpoint_1..9. Với Ninja/Makefiles, dùng CMAKE_BUILD_TYPE; executable nằm trực tiếp trong build/.

## Chín bài đi tới sản phẩm

1. Dựng đủ mesh, cache tám screen vertex, fill cube và nối drag/keyboard.
2. Đảo draw order mà không đổi geometry.
3. Thay stub bằng DepthBuffer, kiểm kích thước/index và clear đầu frame.
4. Nội suy NDC depth theo weights của triangle đã normalize.
5. Compare trước color write; từ chối NaN/out-of-bounds; tắt depth không ghi depth.
6. Animation bằng dt, pause/step và vòng đời buffer theo frame.
7. So toàn color/depth buffer, grayscale và pixel trace.
8. Culling từ winding gốc trước normalize; cross/dot kiểm mọi mặt hướng ra ngoài.
9. Camera, lưới world, clean mode và kiểm mã hoàn chỉnh của người học.

## Điều khiển bản native

- Kéo chuột/mũi tên xoay mô hình; click chọn pixel inspector.
- 1/2/3 chọn góc mẫu, R đặt lại, Esc thoát.
- O đảo draw order (bài 2); D depth (bài 5).
- Space pause/resume, N bước góc khi paused (bài 6).
- V depth view (bài 7); C back-face culling (bài 8).
- F clean/debug; J/L camera X, I/K camera Z (bài 9).
- Resize/blur/hidden/minimize dừng animation và hủy capture. Mouse-up dùng mẫu cuối; reset hay đổi state không để drag cũ ghi đè.

Board logic 1100×800 không tăng theo window/DPR; SDL dùng letterbox. Debug vẽ cube trong vùng 1100×600, clean dùng 1100×800. Floor/cube không thuộc overlay nên vẫn có khi tắt HUD.

Canvas dùng độ phân giải thấp để học từng pixel, có slider/input dùng bàn phím, pointer capture, reset và reduced motion. Nó không thay executable C++. Tự chạy npm run dev để xem web; không cần website khi chạy ứng dụng native.

## Kiểm chứng

~~~powershell
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_17_final.exe
~~~

CTest mặc định include final/include. Khi tự viết xong chín bài, đổi target_include_directories(project_17_tests PRIVATE final/include) thành target_include_directories(project_17_tests PRIVATE starter/include) trong CMakeLists.txt của ZIP. Configure lại và build cả project_17_starter lẫn project_17_tests ở Debug/Release trước khi chạy CTest. Không dùng kết quả của final để kết luận Starter đúng.

Tests dùng check/EXIT_FAILURE, không dùng assert bị NDEBUG tắt. Có oracle near/far tính tay, ray/AABB độc lập cho depth ở mọi pixel, full-buffer comparison nhiều góc và draw order, winding hướng ra ngoài, culling, invalid resize/NaN, dt và ảnh CPU clean có cube/grid.

--smoke mở cửa sổ ẩn, render hữu hạn, thử resize/clean rồi tự thoát. Vẫn cần mở app để thử chuột, bàn phím và HiDPI; tests callback không phải kiểm tra browser thực tế.

## Tổ chức source và giới hạn

geometry.hpp giữ mesh/transform/projection; raster.hpp là coverage Project 16; depth.hpp giữ buffer và compare/write; render.hpp ghép vòng mesh với fragment. scene.hpp quản lý state/drag; view.hpp tạo ảnh CPU; presentation.hpp upload/HUD; controls.hpp nhận phím; main.cpp quản lý lifecycle. lab.hpp là include chung không có SDL cho tests.

Camera nhìn +Z, chỉ dịch X/Z trong phạm vi giữ nó ở ngoài cube. Triangle có đỉnh ngoài near=1/far=10 bị bỏ nguyên hình; chưa clipping đa giác, lighting hoặc texture. Depth là NDC [0,1], không phải camera Z; clear=1 và phép < loại cả tie tại far plane.

Trong repository giáo trình, chỉ sửa source-template, metadata, MDX, tests và README. Starter/checkpoints/final/CMake/ZIP được sinh và không đưa vào Git.
