# Project 22 — Bãi bắn đạn và sai số tích phân

Từ một khẩu pháo đứng yên, ta xây mô phỏng đạn đạo 2D bằng C++20 và SDL 3.4.8. Bạn kéo chuột để chọn vận tốc đầu, quan sát đạn chịu trọng lực và đặt quỹ đạo Explicit Euler cạnh nghiệm giải tích. Mục đích là hiểu cách một mô phỏng số chạy, đo sai số của nó và tự kiểm chứng kết quả.

Chỉ dùng trọng lực đều, không có lực cản, gió hay vật cản phức tạp. Viên đạn số không dùng nghiệm giải tích để di chuyển; công thức chính xác chỉ phục vụ đối chứng. C++ là ứng dụng hoàn chỉnh, chạy độc lập với website.

## Kiến thức cần có

Project 02: thời gian theo giây và event loop; Project 05: world/screen; Project 08: vector, sin/cos và atan2. Phần mềm raster 2D, SDL window, renderer và streaming texture được cung cấp trong starter; không cần học OpenGL.

## Bảy chặng thực hành

1. Chạy starter có pháo và mặt đất; đổi tọa độ và nhận thao tác kéo.
2. Tách vận tốc thành vx/vy, vẽ hai thành phần.
3. Tính nghiệm giải tích, đổi trọng lực, lấy mẫu đường dự đoán.
4. Tạo state, chạy Explicit Euler và ghi trail; chụp tham số cho từng shot.
5. Tách render khỏi physics bằng accumulator và fixed dt.
6. Tìm thời gian chạm đất giải tích, nội suy bước số cuối cùng.
7. Đo current/max/mean error, kiểm hội tụ và đối chứng độc lập.

## Build và chạy

Cần compiler C++20, CMake >=3.24 và kết nối mạng cho lần FetchContent SDL đầu tiên. SDL được khóa ở 3.4.8 và link qua `SDL3::SDL3`.

```powershell
cmake -S . -B build
cmake --build build --config Debug --parallel 2
./build/Debug/project_22_final.exe
```

Windows dùng Visual Studio 2022. Với Ninja/Make trên Linux/macOS, thêm `-DCMAKE_BUILD_TYPE=Debug` khi configure và chạy `./build/project_22_final` (không có thư mục Debug).

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug --parallel 2
ctest --test-dir build-all -C Debug --output-on-failure --timeout 30
cmake --build build-all --config Release --parallel 2
ctest --test-dir build-all -C Release --output-on-failure --timeout 30
./build-all/Debug/project_22_starter.exe
./build-all/Debug/project_22_checkpoint_1.exe
```

Starter, bảy checkpoint và final đều là executable riêng. Chạy `--smoke` để mở cửa sổ ẩn, trình bày tám frame rồi thoát; CTest chỉ kiểm code thuần và không mở window. Trong source repository, chạy `npm run generate:course` và `npm run package:projects` để sinh snapshot/CMake/ZIP; trong ZIP tải về chúng đã có sẵn.

## Điều khiển

| Thao tác             | Tác dụng                                              |
| -------------------- | ----------------------------------------------------- |
| Kéo nút trái         | Chọn góc 5°–85°, tốc độ 4–32 m/s                      |
| Trái/phải, lên/xuống | Sửa tốc độ, góc bằng bàn phím                         |
| G / H                | Giảm/tăng độ lớn trọng lực, 2,5–25 m/s²               |
| [ / ]                | Tăng/giảm dt, giới hạn 1/15–1/240 giây                |
| Enter                | Bắn với cấu hình `NEXT`                               |
| Space                | Pause/resume shot hiện tại                            |
| N                    | Một bước của shot rồi pause; tự tạo shot nếu chưa bắn |
| 1 / 2 / 3            | Chuẩn bị preset bắn thấp / bắn cao / trọng lực yếu    |
| F                    | Bật/tắt lưới và vector thành phần                     |
| R                    | Khôi phục mặc định, xóa shot/lịch sử, pause           |
| Esc                  | Thoát                                                 |

Các chức năng xuất hiện dần theo checkpoint; final có đủ tất cả. Preset và tham số chỉ sửa **lần bắn tiếp theo**. Shot đang bay giữ nguyên launch và dt, kể cả khi kéo ngắm hoặc đổi g. Enter lưu shot cũ (kể cả đang dở) vào lịch sử tối đa bốn lần. Resize/mất focus nhả capture và pause; không tự chạy bù thời gian đã pause.

Vùng logic 1000×650 được letterbox khi resize/HiDPI. Framebuffer CPU 1000×560 không cấp phát theo kích thước cửa sổ. Vùng nhìn tự co để chứa các quỹ đạo; không thay đổi mét, giây hoặc vận tốc vật lý.

## Đọc số đo và màu sắc

- Vàng: nghiệm giải tích của shot đang xem; trước khi bắn là dự đoán cấu hình NEXT.
- Xanh lá: trail và đạn Explicit Euler; hồng: nghiệm giải tích tại cùng thời điểm và đoạn sai số.
- Xám: tối đa bốn trail trước. Dấu X hồng: vị trí thô của bước cuối trước khi nội suy.
- `NEXT` là cấu hình đang chỉnh; `SHOT` là dữ liệu thực đã chụp của phát đang xem.
- Max/mean lấy trên các sample vật lý, gồm t=0 và sample impact. Mean là trung bình số học theo sample, không phải theo render hoặc trung bình có trọng số thời gian.
- Nghiệm số thường chạm đất muộn; tại thời điểm đó công thức tham chiếu có thể cho Y âm. Phép so vẫn dùng cùng t; không ép nghiệm tham chiếu lên ground để làm nhỏ error.

## Kiểm chứng

Tests không dùng assert, nên Release vẫn kiểm thật. Ngoài round-trip/input, công thức, thứ tự Euler, accumulator và impact, tests kiểm tham số shot bất biến, history/reset và các g/dt biên. Đối chứng độc lập dùng tổng cấp số cộng:

`p_n = p0 + n*h*v0 + a*h*h*n*(n-1)/2`.

Ở thời điểm chung T=1 s, error bằng `g*T*h/2`; giảm h bốn lần làm error giảm bốn lần. Mỗi sample được đối chiếu, rồi cộng lại max/mean độc lập, kể cả bước impact rút ngắn. Log giới hạn 8.192 sample và dừng có cảnh báo nếu đầy, không âm thầm cắt trail để che sai số.

## Cấu trúc mã

`lab.hpp`: vector và toán projectile theo checkpoint; `simulation.hpp`: Settings/Shot/logger/accumulator/history; `framebuffer.hpp`: pixel/line/circle; `scene.hpp`: vùng nhìn, quỹ đạo và HUD; `controls.hpp`: phím; `src/main.cpp`: tài nguyên SDL, event và đồng hồ. Không có physics engine hoặc thư viện tích phân.
