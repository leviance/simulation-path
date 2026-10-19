# Project 08 — Tháp pháo ngắm theo chuột

Tự xây mô phỏng 2D để hiểu vì sao tháp pháo chọn một chiều quay và cần quay bao nhiêu. Bản C++20/SDL3 hoàn chỉnh có thân/nòng, forward, target direction, dot, góc sai lệch, projection/rejection và vùng nhìn. Nòng quay có giới hạn rad/s, không snap theo mouse.

## Tự thử trước khi đọc

Từ framebuffer chạy được, dựng tháp pháo có hướng và target đi theo chuột. Tự viết dot, góc, projection và steering; không dùng thư viện vector/engine làm thay. Forward, hình nòng và số đọc phải cùng suy từ một angle.

Mốc nghiệm thu: normalized dot 1/0/−1 ở cùng/vuông/ngược hướng; projection + rejection khôi phục target; nòng không vượt turnSpeed×dt hoặc overshoot. Target trùng tâm không được coi là “đã ngắm đúng”. Bản cuối phải thấy hai hướng và hình chiếu đồng thời, không chỉ bảng số.

## Bảy bài và checkpoint độc lập

1. Chạy starter, vẽ thân/nòng rồi đưa mouse vào world space.
2. Raw dot và normalized dot: phân biệt độ lớn với hướng.
3. Acos, clamp và góc không dấu; zero không có góc đo.
4. Scalar/vector projection, phần chiếu âm và rejection.
5. Cross, signed angle, đường ngắn qua 0/2π và tốc độ tối đa.
6. Vùng nhìn đối xứng, hai biên và phép kiểm chỉ xét góc.
7. Bản hoàn chỉnh, oracle độc lập, CPU pixel tests và desktop checklist.

Starter có helper toán/arrow từ Project 06 và grid/trục, chưa có thân/nòng hoặc target. Mỗi checkpoint chạy riêng, không có nhánh LAB_CHECKPOINT trong snapshot. Final không cần ghép code từ các bài.

## Build

Cần compiler C++20, CMake 3.24+ và mạng ở lần configure đầu để tải SDL **3.4.8** khóa checksum. Link SDL3::SDL3 qua FetchContent.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_8_final.exe
```

Target: project_8_starter, project_8_checkpoint_1…7, project_8_final, project_8_tests. Bỏ BUILD_CHECKPOINTS nếu chỉ cần final/tests. Generator một cấu hình trên Linux/macOS dùng CMAKE_BUILD_TYPE=Debug và chạy executable trực tiếp trong build.

```bash
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Giữ --parallel 2 để không chiếm toàn bộ CPU khi học.

## Điều khiển

- Mouse hover đặt target; F bật/tắt follow. Click/kéo trái vẫn đặt target khi follow đang tắt.
- Arrow keys dời target 0.25 world và tắt follow; A/D đổi góc nòng 5° và pause.
- Space pause/resume steering; S tiến 0,1 giây khi dừng.
- Q/E đổi turnSpeed trong 0…2π rad/s; [/] đổi half-angle trong 5°…90°.
- F1–F7: cùng hướng gần, xa, vuông trái, vuông phải, ngược, trùng tâm, đúng biên.
- R reset dữ liệu, pause và tắt follow; Escape thoát.

Pause dừng nòng quay nhưng vẫn cho sửa target. Preset/reset tắt follow để mousemove không ghi đè kết quả đang đọc. Blur/hidden pause; resize giữ scene nhưng hủy capture. Một mouse owner quản lý mỗi lần kéo; mouse-up áp dụng mẫu cuối trước khi thả capture.

Canvas có checkbox/slider và keyboard tương đương; Tab không bị giữ. Reduced-motion không tự quay, vẫn có nút tiến từng bước.

## Đơn vị và chính sách biên

World X phải, Y lên. Bảng logic 1100×760, gốc (550,410), 40 logical px/world unit. Letterbox giữ tỉ lệ khi resize/HiDPI. SDL_ConvertEventToRenderCoordinates đưa input về bảng; không nhân DPI lần nữa hoặc cấp lại framebuffer chỉ vì resize presentation.

Target giới hạn theo bán kính 6.5 world để cả projection ở trong bảng. Đây là miền thao tác, không phải range. Forward vẽ dài 3.0 world, target direction dài 3.5 world để vẫn phân biệt khi cùng hướng; dữ liệu của cả hai hướng vẫn có độ dài một. Canvas đặt nhãn hai phía để không che nhau.

Normalize scale thành phần trước, xử lý số hữu hạn rất nhỏ/lớn. Cosine dot hai vector đã normalize, không chia cho tích độ dài có thể overflow. Fallback 0 của góc không phải phép đo của zero.

UI coi vùng tâm dưới 8 logical px là chưa có hướng để ngắm: giữ heading và không khóa. Projection/rejection vẫn có thể hiển thị như phép tách số học. Đối nhau chính xác (kể cả cross=-0), signed angle chọn +π; gần đối nhau thì dấu thực tế chọn đường ngắn.

Cone dùng dung sai cosine 1e-12 ở biên, chỉ kiểm góc, không xét occlusion hay range. Half-angle UI 5°–90°, toàn độ mở gấp đôi. Projection dùng số hữu hạn trong miền world; không hứa mọi phép chiếu với vector cực lớn đều biểu diễn được bằng double.

Vòng ứng dụng chặn deltaTime 0,1 s; advanceScene chỉ nhận (0,0.1]. Đây là thời gian mô phỏng đã nhận, không bù breakpoint/tab ẩn. So FPS chỉ áp dụng target cố định, cùng điều kiện đầu và cùng tổng bước hợp lệ.

## Cấu trúc

- include/lab.hpp: phép toán và steering thuần, không SDL.
- include/scene.hpp: state, transforms, preset, domain và update.
- include/framebuffer.hpp: ảnh CPU và rasterizer.
- include/view.hpp: thân/nòng, vector, projection và cone.
- include/presentation.hpp: texture và nhãn SDL ASCII.
- src/main.cpp: window, input/capture, timing và cleanup.
- tests/tests.cpp: fixtures, independent oracle và CPU pixels, không mở window.

## Kiểm chứng

CTest dùng check + EXIT_FAILURE thay assert. Có fixtures dot/góc, normalize/cosine subnormal/gần DBL_MAX, projection bằng axis chưa normalize, steering oracle bằng remainder, giới hạn bước/overshoot, chuỗi dt 10/120 Hz/không đều, cone hai biên, miền target, coordinate round trip và pixel thật.

Mỗi executable có --smoke: window ẩn, 12 frame, preset/resize rồi thoát. Runner phải đặt hard timeout ngoài 15 giây. Đây không phải test chuột/DPI thật.

Checklist desktop riêng: hover/giữ target; preset không bị ghi đè; kéo/thả ngoài; capture owner; Alt+Tab; resize; DPI 100%/200%; keyboard, pause/reset/step; zero target; hai biên cone; mọi lớp hình hiện cùng lúc.
