# Project 01 — Hello Pixels

Tự tạo một ảnh bằng mảng pixel trên CPU, rồi dùng SDL3 đưa ảnh đó lên cửa sổ. Bản hoàn chỉnh có bốn chế độ **solid, gradient, checkerboard, noise**, phủ toàn vùng hiển thị và tạo lại framebuffer/texture theo kích thước đầu ra thật khi resize.

SDL_Renderer chỉ copy texture ra cửa sổ. Không dùng SDL_RenderPoint, SDL_RenderLine, SDL_RenderFillRect hay OpenGL để tạo các hình trong ảnh.

## Trước khi đọc hướng dẫn

Thử tự xây ứng dụng đáp ứng các yêu cầu:

- Tạo window, event loop và thoát bằng Escape hoặc nút Close.
- Sở hữu đúng width × height số nguyên 32 bit; giải thích index = y × width + x.
- Tự đóng gói 0xRRGGBBAA và bỏ qua mọi lần ghi pixel ngoài biên.
- Phím 1–4 chuyển giữa bốn chế độ; noise lặp lại được với seed cố định.
- Resize không để framebuffer và texture lệch kích thước hoặc dùng tài nguyên đã hủy.
- Kiểm phần tính toán bằng CTest ở Debug và Release; thử resize/input trực tiếp riêng.

## Chuẩn bị và build

C++20, CMake 3.24+, compiler có hỗ trợ C++20. Windows: Visual Studio 2022 với workload Desktop development with C++. Lần configure đầu cần mạng để FetchContent tải **SDL 3.4.8**, kiểm SHA-256 và link qua SDL3::SDL3.

Từ thư mục chứa CMakeLists.txt:

~~~bash
cmake -S . -B build
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
~~~

Chạy trên Windows:

~~~powershell
.\build\Debug\project_1_final.exe
~~~

Với Ninja/Makefiles, đặt -DCMAKE_BUILD_TYPE=Debug lúc configure; executable thường là ./build/project_1_final. Tham số --config dùng cho generator đa cấu hình như Visual Studio.

## Điều khiển

| Phím | Kết quả |
| --- | --- |
| 1 | Solid: tô toàn bộ ảnh một màu |
| 2 | Gradient: đỏ theo x, xanh lá theo y |
| 3 | Checkerboard; -/= giảm/tăng cell trong khoảng 1–128 |
| 4 | Noise từ seed hiện tại, ban đầu là 17 |
| N | Tăng seed; quay lại seed cũ sẽ tạo lại đúng ảnh noise cũ |
| Escape / Close | Thoát và giải phóng tài nguyên |

Ảnh chỉ được tính và upload lại khi tham số hoặc kích thước thay đổi. Noise không tự đổi mỗi frame. SDL_Delay(10) nhường CPU, không phải cam kết 60 FPS; Project 02 mới xây cơ chế timing.

## Sáu chặng thực hành

1. Window, renderer, event loop và cleanup.
2. Framebuffer row-major, cấp phát có kiểm tra và index.
3. RGBA, putPixel, streaming texture và pitch: nhìn thấy dấu cộng do CPU tạo.
4. Tạo đủ bốn scene và nhận phím chọn scene/cell/seed.
5. Resize/high-DPI, tạm ngưng khi minimize và thay cặp tài nguyên an toàn.
6. Kiểm chứng, source hoàn chỉnh và smoke hữu hạn.

Mỗi chặng có source độc lập. Giữ nguyên URL/ID bài học để tiến độ học hiện có không bị xóa.

~~~bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
~~~

Target mặc định là project_1_final; bật BUILD_CHECKPOINTS mới có starter và project_1_checkpoint_1 … project_1_checkpoint_6. Starter chỉ xác nhận toolchain, chưa mở window.

## Các file cần đọc

- final/include/lab.hpp: framebuffer, kiểm tra biên, màu và các công thức tạo ảnh; không phụ thuộc SDL.
- final/include/presentation.hpp: tạo texture RGBA8888, upload bằng pitch byte, copy/present và thay tài nguyên.
- final/src/main.cpp: init, input, dirty flag, resize và cleanup.
- final/include/smoke.hpp: công cụ kiểm SDL hữu hạn, không nằm trong đường chạy tương tác mặc định.
- tests/tests.cpp: fixture độc lập cho bốn scene, biên, màu, kích thước hẹp và resize thất bại.

starter/, checkpoints/, final/ và CMakeLists.txt được sinh từ source-template/ khi làm việc trong repository của website; không chỉnh các snapshot bằng tay. ZIP đã chứa chúng nên người học không cần chạy generator website.

## Quy ước và giới hạn

Pixel là giá trị số 0xRRGGBBAA, khớp SDL_PIXELFORMAT_RGBA8888. Trên little-endian, bốn byte trong RAM là AA BB GG RR; không nhầm với SDL_PIXELFORMAT_RGBA32 là quy ước theo byte array. Texture dùng SDL_BLENDMODE_NONE: alpha được lưu nhưng không pha với nền.

Framebuffer giới hạn 16.777.216 pixel (64 MiB). Phép resize cấp phát buffer mới trước, nên tạm thời có cả buffer cũ lẫn mới, ngoài bộ nhớ texture. Đầu vào 0/âm/quá lớn bị từ chối trước khi đổi state; không âm thầm clamp thành ảnh khác kích thước. Khi SDL không tạo được tài nguyên, chương trình báo lỗi và thoát sạch thay vì tiếp tục dùng cặp lệch nhau. Giới hạn texture còn phụ thuộc renderer.

Khi minimize, không tạo buffer 0×0 hoặc render lên output rỗng. Khi phục hồi, đọc lại kích thước output, không suy đoán từ window coordinates. Bài 03–04 chỉ là bước trung gian: texture có thể bị co giãn khi resize; từ bài 05 mới tạo lại đúng số pixel.

## Kiểm chứng tự động và trực tiếp

~~~powershell
.\build\Debug\project_1_final.exe --smoke
.\build\Release\project_1_final.exe --smoke
~~~

Smoke mở cửa sổ ẩn, chạy 12 lần resize và upload/present đủ bốn scene rồi tự kết thúc. Khi chạy trong CI, đặt thêm deadline bên ngoài (ví dụ 15 giây); đây không thay thế kiểm tra trực tiếp kéo resize, minimize/restore, bàn phím và đóng cửa sổ trên desktop.

CTest kiểm dữ liệu thuần, không mở window. Danh sách tự kiểm:

- Bốn scene phủ kín cửa sổ; gradient có đủ hai đầu 0/255.
- Cùng seed và kích thước cho cùng noise; đổi scene không làm noise tự nhảy.
- Kéo resize liên tục ít nhất 10 lần; thu nhỏ rồi phục hồi; đổi DPI nếu có màn hình phù hợp.
- Không có màu bị đảo kênh hoặc hàng bị xô do pitch sai.
- Escape và Close đều thoát sạch; thông báo lỗi không bị một lời gọi cleanup che mất.

## Tài liệu SDL chính thức

- https://wiki.libsdl.org/SDL3/README-cmake
- https://wiki.libsdl.org/SDL3/SDL_UpdateTexture
- https://wiki.libsdl.org/SDL3/SDL_GetRenderOutputSize
- https://wiki.libsdl.org/SDL3/SDL_PixelFormat
- https://wiki.libsdl.org/SDL3/SDL_SetTextureBlendMode
