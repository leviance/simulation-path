# Project 06 — Hai vector cùng gốc

Mô phỏng 2D C++20/SDL3: kéo endpoint A/B, nhìn đồng thời tổng/hiệu, dựng hình bình hành, so scalar/distance, vector đơn vị và lerp. Hình được tự rasterize trên CPU; SDL chỉ xử lý window/input/texture và chữ debug ASCII.

## Tám bài, mỗi bài có bản chạy độc lập

1. Starter có grid/trục; thêm Vec2 và hai đoạn cùng gốc.
2. Độ lớn, normalize an toàn và đầu mũi tên screen-space.
3. Hit-test, grab offset, mouse ownership và keyboard.
4. Cộng bằng hình bình hành.
5. Hiệu là độ dời B→A.
6. Scalar và khoảng cách hai endpoint.
7. Vector đơn vị, đường tròn bán kính một và zero không có hướng.
8. Lerp, kiểm chứng và ghép bản hoàn chỉnh.

Source gồm starter, checkpoints/01–08 và final. Snapshot không có nhánh LAB_CHECKPOINT ẩn. Bản final có toàn bộ chức năng; không cần ghép code từ các bài.

## Build

Cần compiler C++20, CMake 3.24+, mạng lần configure đầu để tải SDL **3.4.8** đã khóa checksum. Link qua SDL3::SDL3.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_6_final.exe
```

Bỏ BUILD_CHECKPOINTS nếu chỉ cần final/tests. Target học tập: project_6_starter, project_6_checkpoint_1…8. Build thêm Release và chạy CTest với -C Release. Trên Linux/macOS với generator một cấu hình, dùng CMAKE_BUILD_TYPE và executable trực tiếp trong build. Giữ --parallel 2 để không chiếm toàn bộ CPU khi build.

## Điều khiển

- Trái: kéo endpoint. Hit radius 14 pixel của bảng logic; giữ grab offset. Trùng hai điểm thì ưu tiên endpoint đang chọn.
- Tab: chọn A/B; mũi tên: dời endpoint đang chọn 0.1 world unit.
- F1–F5: cơ bản, vuông góc, đối hướng, A=0, cả hai=0.
- 1: cộng/trừ; 2: thêm scalar/distance; Q/E: giảm/tăng scalar.
- 3: thêm normalize/vòng tròn đơn vị; 4: thêm lerp; [/]: giảm/tăng t; 0: thêm tất cả.
- Space: pause/resume; R: reset toàn scene khi không pause; Escape: thoát.

A/B, tổng và hiệu luôn có mặt trong final; view mode chỉ thêm lớp. Checkpoint 6/7 mở ngay lớp scalar/unit tương ứng. Canvas dùng danh sách HTML để chọn A/B, không giữ Tab trong vùng vẽ; reset button dùng được khi pause.

## Đơn vị và giới hạn

Bảng logic 1100×760, gốc (550,420), 45 logical px/world unit. World Y hướng lên, screen Y xuống. Letterbox giữ tỉ lệ khi resize/HiDPI; SDL_ConvertEventToRenderCoordinates đổi input về đúng bảng trước hit-test. Không tự nhân DPI lần nữa.

Endpoint X ∈ [−4,4], Y ∈ [−3,3], scalar ∈ [−2,2]: cả A+B, A−B và scalar*A nằm trong vùng nhìn. Đây là miền thao tác, không phải giới hạn toán học. UI t ∈ [0,1]; hàm lerp cho phép ngoại suy.

Normalize scale trước bằng thành phần lớn nhất, nên không bình phương số cực lớn/nhỏ. Với vector hữu hạn khác zero, kết quả dài một; zero/NaN/infinity trả vector 0. Fallback này không phải một hướng đơn vị của zero.

## Cấu trúc

- include/lab.hpp: Vec2, phép toán, length/normalize/distance/lerp và arrowHead.
- include/camera.hpp: world/screen và miền endpoint.
- include/scene.hpp: selected, dragged, grabOffset, preset, scalar/t/view mode.
- include/framebuffer.hpp: ảnh CPU và primitive.
- include/view.hpp: hình vẽ từ scene.
- include/presentation.hpp: texture và nhãn SDL.
- src/main.cpp: vòng event, mouse ID, capture và cleanup.
- tests/tests.cpp: kiểm thử CPU, không mở window.

## Kiểm chứng

CTest dùng check và EXIT_FAILURE, không mất kiểm tra trong Release. Có fixtures độc lập, 3-4-5, normalization subnormal/DBL_MAX, hình bình hành, hiệu B→A, lerp theo trọng số, hit boundary/overlap/offset/cancel/clamp, visibility bounds và pixel thật của các lớp. Điểm lerp tại t=0/1 được kiểm tra để không bị endpoint che.

Final/checkpoint 8 có --smoke: 12 frame window ẩn, đổi scene/lớp/resize rồi thoát. Nên đặt timeout bên ngoài 15 giây. Smoke không giả lập mouse thật hoặc thay desktop QA.

Checklist thủ công: kéo từ mép chấm; chọn B khi A/B trùng; thả ngoài window; Alt+Tab khi kéo; resize/pause/reset/preset; thử DPI 100%/200%; điều khiển mọi lớp; thoát không giữ capture.
