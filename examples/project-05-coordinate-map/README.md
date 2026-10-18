# Project 05 — Bản đồ tọa độ kéo-thả

Tự xây một mặt phẳng tọa độ kiểu Mini GeoGebra bằng C++20/SDL3: trục X/Y, lưới thích nghi 1–2–5, tọa độ con trỏ, đặt/chọn/kéo nhiều điểm, pan và cursor-anchored zoom. SDL trình bày texture CPU và chữ debug ASCII; không tính camera, grid hoặc primitive thay bạn.

## Học theo bảy bước

1. Chạy starter, vẽ hai trục và điểm (2,1).
2. Đưa phép đổi world → screen vào Camera2D.
3. Đọc screen → world từ mouse input.
4. Sinh lưới động và kéo camera.
5. Zoom quanh con trỏ bằng bù camera.
6. Đặt, chọn, kéo và xóa điểm.
7. Kiểm chứng rồi chạy toàn bộ ứng dụng.

Starter, checkpoints/01–07 và final đều độc lập. Source đầy đủ mỗi bài có trên website; tests dùng bản final. Đọc bài trước khi mở final nếu bạn muốn tự xây.

## Build

Cần compiler C++20, CMake 3.24+ và mạng lần configure đầu để tải SDL **3.4.8** đã khóa checksum. Luôn link SDL3::SDL3.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_5_final.exe
```

Bỏ BUILD_CHECKPOINTS nếu chỉ cần final và tests. Chọn target project_5_starter hoặc project_5_checkpoint_1…7 để chạy từng bước. Visual Studio dùng --config Debug/Release; Ninja/Unix Makefiles dùng CMAKE_BUILD_TYPE và executable trực tiếp trong build. Giữ --parallel 2 để giới hạn compiler.

## Điều khiển final

- Chuột trái vùng trống: thêm điểm; gần điểm: chọn/kéo. Giữ grab offset, không nhảy điểm.
- Chuột phải: pan; wheel: zoom quanh con trỏ; +/-: zoom quanh vị trí chuột gần nhất.
- Tab: chọn điểm tiếp; mũi tên: dời điểm đã chọn một screen pixel; Delete: xóa.
- R: chỉ reset camera, không xóa điểm; Space: pause/resume; Escape: thoát.
- Tối đa 256 điểm; chọn theo thứ tự vẽ (điểm trên cùng), bán kính 10 screen pixel.

World dùng X sang phải, Y lên trên. Screen là pixel logic của window, Y xuống dưới. Camera scale 5–800 px/unit. Framebuffer theo window logic, tối đa 4096 × 4096; renderer xử lý HiDPI. Resize đổi viewport, không đổi world points. Focus loss, hidden, resize, pause, reset và zoom hủy drag/capture.

## Cấu trúc

- include/lab.hpp: Vec2, Camera2D, gridSpacing.
- include/scene.hpp: world points, hit-test, grab offset, xóa/cancel.
- include/framebuffer.hpp: mảng pixel và primitive CPU.
- include/view.hpp: lưới, trục và điểm.
- include/presentation.hpp: SDL texture, resize theo giao dịch, HUD/nhãn.
- src/main.cpp: SDL lifecycle và input ownership.
- tests/tests.cpp: CPU correctness, không mở window.

## Kiểm chứng

CTest kiểm tra fixture độc lập, round trip, pan, zoom anchor kể cả clamp, invalid input, bước lưới, hit radius qua nhiều scale, overlap, grab offset, cancel/delete/cap, resize invariants và raster pixel. Checks không bị NDEBUG tắt ở Release.

Final/checkpoint 7 nhận --smoke: 12 frame ẩn có sửa scene, pan/zoom/resize; giới hạn bên ngoài nên đặt 15 giây. Smoke không giả lập chuột thật và không thay desktop QA.

Checklist thủ công: tạo năm điểm; kéo từ mép chấm; pan/zoom sát góc; giữ world coordinate khi resize; thả chuột ngoài window; Alt+Tab hoặc Space khi đang kéo; kiểm tra ở DPI 100%/200%; thoát không giữ capture. Canvas của website dùng danh sách HTML để chọn điểm thay vì giữ Tab bên trong vùng vẽ.
