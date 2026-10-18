# Project 04 — Bộ công cụ vẽ 2D

Tự viết DDA, Bresenham, rectangle và midpoint circle, rồi dùng chúng trong một ứng dụng SDL3 tương tác. SDL chỉ lo window/input/timing và hiển thị texture; mọi primitive đi qua framebuffer CPU.

Có cả viền/tô đặc cho rectangle và circle, kéo tay nắm, inspector 9 × 9 đọc màu ảnh thật, bảng hình mẫu và benchmark có thể hủy.

## Yêu cầu và build

C++20, CMake 3.24+, compiler tương ứng (Windows: Visual Studio 2022 với workload Desktop development with C++). Lần configure đầu cần mạng để FetchContent lấy đúng SDL **3.4.8**; ứng dụng link qua SDL3::SDL3.

```powershell
cmake -S . -B build
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_4_final.exe
```

Ninja/Makefiles dùng -DCMAKE_BUILD_TYPE=Release khi configure, executable nằm trực tiếp trong build/. Debug/Release dùng các thư mục riêng với generator một cấu hình.

## Học theo từng bước

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
.\build\Debug\project_4_starter.exe
.\build\Debug\project_4_checkpoint_1.exe
```

| Snapshot | Phần mới |
|---|---|
| starter | Nền trống, framebuffer 960 × 540, texture và presentation |
| 01 | DDA, drawLine, đường cố định |
| 02 | Bresenham, chọn D/B, cùng dữ liệu để vẽ và quan sát |
| 03 | Kéo hai đầu, tám hướng, input logic, pixel inspector |
| 04 | Rectangle viền/đặc, hai góc inclusive |
| 05 | Circle viền/đặc, tâm và bán kính |
| 06 / final | Bảng hình mẫu, benchmark hữu hạn và toàn bộ kiểm chứng |

Mỗi snapshot có source riêng, không cần Node.js sau khi tải ZIP. Trong repository website chỉ sửa source-template/; các thư mục snapshot và CMake được sinh, không đưa vào Git.

## Điều khiển

- **1/2/3/4**: Line / Rectangle / Circle / bảng hình mẫu (chỉ xuất hiện khi đã học tới checkpoint tương ứng).
- **D/B**: DDA / Bresenham cho line; **O**: tám hướng cố định.
- **F**: viền/đặc cho rectangle/circle; **[ và ]**: bán kính 0–256.
- Chuột trái chọn tay nắm gần nhất và kéo; circle dùng A làm tâm, tay nắm bên phải đổi bán kính.
- **I/J/K/L** dịch tay nắm B từng pixel; giữ **Shift** để chọn A.
- **Z**: inspector; **Left/Right/Home/End**: chọn bản ghi.
- **T**: chạy/hủy benchmark; **Escape** hoặc đóng window: thoát.

Mất focus, minimize, resize hoặc rời window kết thúc kéo. Vị trí ở mouse-up vẫn được nhận nếu chưa có motion tương ứng; event đi qua SDL_ConvertEventToRenderCoordinates đúng một lần. Letterbox giữ tỉ lệ; không ép điểm ngoài ảnh vào mép.

Số pixel trong title là số pixel hình học sinh ra trước kiểm biên. Inspector đọc ảnh trước khi vẽ tay nắm, chụp vùng nguồn trước khi vẽ overlay để không tự đọc chính nó.

## Quy ước và giới hạn

- Tọa độ nguyên trong ±4.096; đầu vào ngoài hợp đồng bị từ chối trước phép trừ/abs.
- Rectangle lấy cả hai biên; (1,1) → (4,3) có viền 10 và hình đặc 12 pixel. Hình đặc giới hạn 1.024 pixel mỗi cạnh.
- Circle có bán kính 0–256; bán kính âm bị từ chối. decision < 0 giữ X, bằng 0 chọn giảm X.
- fillCircle tô tới chính viền midpoint. r = 2 có viền 12, hình đặc 21 pixel, khác brush kiểm tâm trong đĩa ở Project 03 (13 pixel).
- Pixel ngoài framebuffer bị bỏ bởi putPixel; đây không phải thuật toán clipping tổng quát.
- Ở trường hợp hòa, hai chiều hoặc DDA/Bresenham không bắt buộc tạo cùng tập pixel.

## Benchmark và kiểm chứng

```powershell
.\build\Release\project_4_final.exe --benchmark
.\build\Debug\project_4_final.exe --smoke
```

Benchmark: seed cố định, 20.000 đoạn cho cả hai thuật toán, warm-up 500 đoạn, bảy lượt đổi thứ tự chạy trước. Hash mọi tọa độ, không chỉ vector.size(). Median là số giữa của bảy tổng thời gian theo lượt; gồm tạo vector trace/rasterization/hash, loại SDL, sinh đầu vào và thời gian giữa các đợt. Đây không phải FPS hoặc phép đo riêng phép cộng. Checksum giữa hai thuật toán không bắt buộc bằng nhau.

Trong app, mỗi frame xử lý tối đa 128 đoạn/thuật toán, rồi trả quyền cho event loop. T hủy; quá 30 giây cũng dừng và không báo median chưa hoàn thành. Chạy Release, ghi cấu hình máy và nhiều lần đo; không suy kết luận phổ quát từ một kết quả.

CTest không mở window: 2.401 trường hợp line (hai thuật toán/hai chiều), 544 kích thước rectangle, 129 bán kính circle; đáp án hình học, tính liên thông, đối xứng, fill, ảnh CPU, input, inspector và benchmark. Tests vẫn chạy khi NDEBUG được định nghĩa.

Smoke dùng window ẩn, 12 frame, đổi công cụ/kiểu tô/resize/upload/present rồi thoát. Tự động hóa phải có timeout ngoài 15 giây; CTest có timeout ngoài 30 giây; build dùng tối đa hai compiler. Không chạy các lượt build song song.

**Cần kiểm riêng trên desktop**: kéo hai tay nắm, các phím, mất focus, rời vùng vẽ, resize/HiDPI, hủy benchmark. CPU tests và smoke không chứng minh chuột vật lý hoặc bố cục đã được kiểm thủ công.

## Tổ chức source

- include/framebuffer.hpp: ảnh và ghi pixel.
- include/lab.hpp: hình học thuần và dữ liệu từng bước.
- include/drawing.hpp: năm API vẽ/tô lên ảnh.
- include/scene.hpp: trạng thái và thao tác thuần có thể test.
- include/view.hpp: cảnh, inspector và bảng hình mẫu.
- include/presentation.hpp: texture/upload/present.
- include/benchmark.hpp: dữ liệu, checksum, scheduler, median.
- src/main.cpp: SDL và điều phối.
- tests/tests.cpp: đáp án độc lập, không sao chép thuật toán để tự kiểm chính nó.

Tài liệu SDL: [logical presentation](https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation), [đổi tọa độ event](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates), [mouse capture](https://wiki.libsdl.org/SDL3/SDL_CaptureMouse).
