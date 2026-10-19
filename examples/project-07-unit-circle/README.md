# Project 07 — Chiếc kim quay trên đường tròn

Mục tiêu là hiểu một góc tạo ra hình học và chuyển động như thế nào. Bản hoàn chỉnh C++20/SDL3 hiển thị đồng thời đường tròn đơn vị, kim quay, hình chiếu X/Y và hai đồ thị sin/cos lấy từ cùng angle. Bạn có thể đổi vận tốc, kéo đầu kim, tạm dừng và xem từng bước.

## Tự thử trước khi đọc

Tự xây một mô phỏng 2D có các phần trên, không dùng thư viện toán/biểu đồ thay phần cốt lõi. Yêu cầu quan trọng: một góc radian duy nhất; hình chiếu đúng dấu; kim quay theo thời gian chứ không theo frame; graph từ lịch sử thật; kéo endpoint qua cả bốn góc phần tư; input đúng khi resize/HiDPI.

Mốc nghiệm thu: 2π là một vòng, sin²+cos²≈1, cùng tổng thời gian ở các FPS khác nhau cho cùng góc và cùng các mẫu 60 Hz. Đừng coi một đường tròn có animation trang trí là sản phẩm cuối.

## Bảy bài, bảy checkpoint độc lập

1. Chạy starter có đường tròn/trục; thêm radian, đổi đơn vị và normalize.
2. Đặt đầu kim bằng sin/cos, đổi world sang screen đúng một lần.
3. Cập nhật góc theo delta time, thay đổi tốc độ/chiều và đọc chu kỳ.
4. Vẽ hình chiếu X/Y, phân biệt đoạn thành phần với đường dóng.
5. Tạo lịch sử 60 Hz và tự vẽ plotter theo timestamp.
6. Kéo đầu kim bằng atan2, grab offset, vùng tâm và capture owner.
7. Ghép bản đầy đủ và kiểm toán/hình/nhịp lấy mẫu bằng dữ kiện độc lập.

Bắt đầu từ starter, không cần tự chắp lại SDL boilerplate. Mỗi checkpoint là source chạy riêng, không có nhánh LAB_CHECKPOINT bị giấu. final chứa đủ tính năng, không cần ghép code từ các bài.

## Build và chạy

Cần compiler C++20, CMake 3.24+ và mạng ở lần configure đầu để tải SDL **3.4.8** đã khóa checksum. CMake dùng FetchContent và link SDL3::SDL3.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_7_final.exe
```

Các target: project_7_starter, project_7_checkpoint_1…7, project_7_final, project_7_tests. Bỏ BUILD_CHECKPOINTS nếu chỉ cần final/tests. Trên Linux/macOS với generator một cấu hình, đặt CMAKE_BUILD_TYPE=Debug và chạy executable trực tiếp trong build.

```bash
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Giữ --parallel 2 để không chiếm toàn bộ CPU khi học.

## Điều khiển

- Space: pause/resume; S: tiến 0,1 giây khi dừng.
- ↑/↓: tăng/giảm vận tốc 0,25 rad/s, giới hạn [−2π,2π].
- ←/→: thêm/bớt 5°; thao tác này tạm dừng.
- F1–F4: 0°,90°,180°,270°; F5: 1 radian.
- Chuột trái: nắm chấm vàng trong bán kính 18 pixel logic và kéo.
- R: reset góc 35°, tốc độ π/2 rồi giữ dừng; Escape: thoát.

Đổi tốc độ giữ lịch sử; đổi góc bằng tay đặt lại thời gian/lịch sử. Kéo kim làm pause và không tự resume sau khi thả. Nắm lệch chấm giữ angularGrabOffset. Trong vùng tâm 8 pixel, không suy hướng mới. Focus lost/hidden pause; resize hủy kéo nhưng không xóa scene. Capture có một mouse owner, áp dụng mẫu cuối lúc thả.

Canvas có preset/slider HTML và keyboard tương đương; Tab không bị giữ trong canvas. Reduced-motion chặn tự chạy; nút Tiến 0,1 s vẫn hoạt động.

## Đơn vị và thời gian

World Y lên, screen Y xuống. Bảng logic 1100×760, tâm (275,390), bán kính 185 pixel ứng với một world unit. Letterbox giữ tỉ lệ; SDL_ConvertEventToRenderCoordinates đổi input về bảng logic. Không nhân DPI lần nữa và không cấp lại framebuffer khi chỉ resize presentation.

Góc normalize trong [0,2π), nonfinite fallback 0, −0 đưa về +0. angleFromDirection(0,0) trả 0 theo quy ước toán của ứng dụng; UI không dùng fallback đó khi kéo gần tâm.

Vòng ứng dụng chặn deltaTime ở 0,1 giây. advanceScene chỉ chấp nhận bước (0,0.1]. Thời gian trên graph là thời gian mô phỏng đã nhận, không bù toàn bộ thời gian debugger/tab ẩn.

Lịch sử lấy mẫu tại n/60 giây; một frame 0,1 giây tạo đủ sáu mẫu tại góc riêng của từng timestamp. Giữ tối đa 361 mẫu, gồm hai đầu của 6 giây. Graph dùng X theo time, không theo index. Không nội suy tuyến tính hai góc đã normalize qua ranh 0/2π. Mẫu cuối có thể cũ hơn điểm hiện tại chưa tới 1/60 giây.

## File nào giữ phần nào?

- include/lab.hpp: Vec2, radian, unit-circle mapping, projection và mẫu/plot mapping.
- include/scene.hpp: angle/speed, lịch sử, advanceScene, hit-test/drag thuần.
- include/framebuffer.hpp: putPixel, Bresenham, midpoint circle, disc.
- include/view.hpp: bảng, cung, kim, hình chiếu và hai đường graph.
- include/presentation.hpp: texture và nhãn ASCII bằng SDL.
- src/main.cpp: window, timing, event/capture, cleanup.
- tests/tests.cpp: kiểm toán, lịch sử, tương tác thuần và ảnh CPU, không mở window.

## Kiểm chứng và giới hạn

CTest dùng check + EXIT_FAILURE thay assert để Release vẫn kiểm tra. Fixtures gồm các góc chính, góc âm/subnormal/rất lớn, atan2 round trip qua seam, sin²+cos², world/screen, lịch sử 10/120 Hz/không đều, nghiệm giải tích tại timestamp, giới hạn 361 mẫu sau 100 giây và pixel thật ở cả vòng tròn lẫn graph.

Mọi executable nhận --smoke: window ẩn, 12 frame, thử resize rồi thoát. Đặt hard timeout 15 giây ở runner. Đây không phải phép thử chuột/DPI thật.

Checklist desktop cần làm riêng: kéo mép chấm và qua tâm; kéo qua 0/2π; thả ngoài window; Alt+Tab; resize khi kéo; DPI 100%/200%; tốc độ 0/âm; pause/reset/step; nhìn đủ kim, hai hình chiếu và cả hai graph cùng lúc.
