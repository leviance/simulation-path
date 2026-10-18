# Project 03 — Ứng dụng Paint tí hon

Tự xây Mini Paint từ framebuffer: nhận chuột, tô đầu bút tròn, quan sát nét đứt rồi nội suy giữa các mẫu. SDL chỉ quản lý window/input/texture presentation; brush rasterization và stroke interpolation được viết bằng C++ thuần.

## Tự thử trước khi đọc lời giải

- Click trái tạo dấu, giữ để vẽ nhiều nét độc lập; up giữ vị trí cuối.
- Bút tròn tự tô bằng dx² + dy² ≤ r², nội suy đủ dày khi kéo nhanh.
- Có màu, brush size và clear; các nét cũ giữ nguyên sau khi đổi công cụ.
- Resize không mất tranh hoặc lệch con trỏ; ra ngoài vùng ảnh/mất focus kết thúc nét.
- Test hình học, pixel, begin/move/end và công cụ bằng cùng hàm app dùng.

## Chuẩn bị và build

C++20, CMake 3.24+, Visual Studio 2022 với Desktop development with C++ trên Windows. Lần configure đầu cần mạng để FetchContent tải SDL **3.4.8**, xác minh SHA-256 và link SDL3::SDL3.

Từ thư mục chứa CMakeLists.txt trong ZIP:

```bash
cmake -S . -B build
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

```powershell
.\build\Debug\project_3_final.exe
```

Ninja/Makefiles: thêm -DCMAKE_BUILD_TYPE=Debug khi configure; executable thường là ./build/project_3_final. Dùng hai thư mục build cho Debug/Release nếu generator đơn cấu hình.

## Điều khiển

| Thao tác | Kết quả |
| --- | --- |
| Click/kéo trái | Mở nét, đặt dấu ngay, tiếp tục và xử lý endpoint khi thả |
| 1–4 | Final: xanh ngọc / xanh dương / cam / trắng nhạt |
| [ / ] | Final: giảm/tăng radius 2 pixel, trong khoảng 2–64 |
| C | Final: xóa framebuffer thật, bộ đếm và đóng nét |
| S | Chỉ checkpoint 3–4: giữ 1/1, 1/2, 1/4, 1/8 motion để thử lỗi |
| D | Checkpoint 3+: XÓA ẢNH hiện tại rồi vẽ lại cùng bộ mẫu thử; không có undo |
| Escape / Close | Thoát sạch |

Đổi công cụ/clear đóng nét; nếu vẫn giữ chuột thì thả/nhấn lại để vẽ tiếp. Rời vùng ảnh, mất focus, minimize hoặc resize cũng kết thúc nét, không nối ngầm khi trở lại. Click trong letterbox bị bỏ qua, không clamp vào cạnh.

## Các chặng học

1. Starter có ảnh nền và texture; checkpoint 1 thêm một pixel cho mỗi mẫu chuột, quản lý down/move/up và conversion tọa độ.
2. Thay điểm bằng brush tròn; giữ nguyên xử lý nét.
3. Đo input gap, lấy thưa bằng S, dùng D làm đối chứng lặp lại được.
4. Lerp, ceil số khoảng, giữ endpoint và nối các mẫu.
5. Thêm bốn màu, size, clear; bỏ S khỏi giao diện final.
6. Kiểm dữ liệu, pixel, vòng đời nét và native smoke hữu hạn.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

BUILD_CHECKPOINTS bật project_3_starter và project_3_checkpoint_1 … project_3_checkpoint_6. Mặc định có final và tests. Trong repository website, CMakeLists/starter/checkpoints/final được sinh từ source-template, không sửa snapshot bằng tay. ZIP đã có chúng; không cần Node.js để build C++.

## Các file của final

- include/framebuffer.hpp: ảnh logic cố định 960×540, màu, clear và putPixel có bounds check.
- include/lab.hpp: Point, insideCanvas, distance, lerp và sampleStroke có giới hạn.
- include/brush.hpp: chọn pixel chứa tâm bằng floor, tự rasterize đầu bút.
- include/paint.hpp: begin/move/end/cancel, trạng thái, bộ đếm, demo và công cụ.
- include/presentation.hpp: texture RGBA8888, BLENDMODE_NONE, pitch byte, upload và present.
- src/main.cpp: SDL setup, đổi tọa độ event, capture, phím, dirty upload và cleanup.
- tests/tests.cpp: test không link SDL; check/exit code hoạt động ở cả Release.

## Quy ước và giới hạn

Tranh là dữ liệu CPU được giữ qua các frame. Chỉ upload khi dirty; render target được clear trước copy texture, không phải framebuffer. Resize chỉ đổi tỉ lệ ảnh 960×540; LETTERBOX giữ tỉ lệ. SDL_ConvertEventToRenderCoordinates được gọi đúng một lần trên event chuột trước khi dùng tọa độ, bao gồm button-up.

Chỉ tâm trong ảnh mới được nhận. Phần brush vượt cạnh được putPixel cắt an toàn. Tọa độ không hữu hạn bị từ chối trước khi chuyển sang int. Capture có thể không được hỗ trợ; ứng dụng báo lỗi nhưng vẫn vẽ trong vùng ảnh, cancel khi mouse leave hoặc mất nút/focus. Không giữ capture cả phiên ứng dụng.

Spacing là 0,8 × radius. sampleStroke giữ hai đầu trực tiếp, nội suy các điểm giữa, xử lý đoạn bằng 0. Spacing không hợp lệ dùng sàn 0,5 pixel; endpoint không hữu hạn hoặc đoạn dài hơn 2.048 pixel trả vector rỗng. Tối đa 4.097 điểm/đoạn, không tăng spacing âm thầm. Các endpoint hợp lệ trong ảnh luôn tạo đoạn ngắn hơn ngưỡng này.

Nội suy nối đoạn thẳng, không khôi phục đường cong đã mất hoặc tăng sampling rate phần cứng. Khoảng tâm được tính trước floor; tests raster riêng kiểm các fixture ở tám hướng. Mẫu chung giữa hai đoạn có thể đóng dấu hai lần; brush đục nên không bị đậm thêm. Chưa có antialiasing, alpha blend, undo hoặc lưu file.

Title: radius, số mẫu được giữ, số dấu và input gap của nét gần nhất. Input gap có thể lớn dù nét đã liền; không nhầm với spacing giữa tâm nội suy. SDL_Delay(10) chỉ nhường CPU, không là FPS limiter hoặc Hz chuột.

## Kiểm chứng

CTest kiểm endpoint/spacing, đoạn 0/invalid/overlong, 13 pixel r=2 và 6 pixel ở góc, symmetry, bounds, hover/down/up/cancel/reentry, nét rời, endpoint khi lấy thưa, các hướng raster và công cụ.

```powershell
.\build\Debug\project_3_final.exe --smoke
.\build\Release\project_3_final.exe --smoke
```

Smoke mở window ẩn, chạy 12 frame có brush/interpolation/palette/resize/upload/present rồi thoát. Đặt deadline ngoài 15 giây khi tự động hóa; không dùng smoke thay chuột vật lý, focus, DPI hoặc thử kéo nhanh.

Kiểm desktop riêng: click không kéo; nhiều nét; up ở vị trí mới; giữ và ra ngoài/quay lại; resize/maximize/minimize/restore; focus loss; bốn màu; radius; C khi kéo; Escape và Close. D xóa tranh trước thử nên không bấm trên hình muốn giữ.

## Tài liệu SDL

- https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates
- https://wiki.libsdl.org/SDL3/SDL_CaptureMouse
- https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent
