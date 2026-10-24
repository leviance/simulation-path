# Project 27 — 100.000 hạt và chiếc kính lúp

Ứng dụng C++20/SDL3 hiển thị đầy đủ 100.000 hạt đứng yên và tìm mọi hạt trong vòng tròn quanh con trỏ bằng brute force. Đây là baseline để so với Spatial Grid ở Project 28, không dùng index không gian.

## Cách học

Bắt đầu bằng thử thách trên trang tổng quan, thử tự làm rồi mở từng bài khi cần. Bảy bài đi từ dữ liệu → tọa độ chuột → full scan → squared distance và workspace → benchmark → scaling → nghiệm thu. Mỗi checkpoint là bản chạy độc lập. Sửa bài làm trong `starter/`, không cần ghép file từ project trước. Cuối mỗi bài có full source; cuối project có bản final và toàn bộ tests.

## Build và chạy

Cần CMake 3.24+, compiler C++20 (Windows: Visual Studio 2022). CMake dùng FetchContent khóa SDL **3.4.8** và SHA-256; lần configure đầu cần Internet để lấy source SDL. Mọi app link qua SDL3::SDL3.

```sh
cmake -S . -B build
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
# Windows / Visual Studio
.\build\Release\project_27_final.exe
# Linux/macOS (single config; configure thêm -DCMAKE_BUILD_TYPE=Release)
./build/project_27_final
```

Bật các bản học bằng `cmake -S . -B build -DBUILD_CHECKPOINTS=ON`. Target: project_27_starter, project_27_checkpoint_1…7, project_27_final. Debug/Release đều chạy tests (không dùng assert). Tests mặc định kiểm `final/include`; đổi include directory của target tests sang `starter/include` nếu muốn kiểm bài làm sau khi hoàn thành đủ API.

## Điều khiển

| Thao tác | Kết quả |
| --- | --- |
| Rê chuột trong viewport | Đặt tâm query (từ bài 2) |
| Giữ nút trái và kéo | Capture; được kéo ra ngoài, clamp ở mép |
| 1 / 2 / 3 | N=1.000 / 10.000 / 100.000 (từ bài 1) |
| P | Đổi seed; sinh lại cloud và xóa số đo |
| Up / Down | Tăng/giảm R trong [0; 0,35] |
| W / A / D / S | Đổi tâm từ bài 2–5 |
| W / A / D / J | Đổi tâm từ bài 6; S dành cho scaling |
| Left / Right | Giảm/tăng prefix 10% ở riêng bài 3 |
| B | Benchmark N hiện tại (từ bài 5) |
| S | Study ba N chuẩn (từ bài 6) |
| Space / N | Auto probe chạy/dừng hoặc tiến một bước (bài 7) |
| F | Chế độ sạch/debug |
| Esc | Dừng chuyển động/job, nhả capture; không thoát ứng dụng |
| R | Reset mặc định, giữ lựa chọn debug |
| Đóng cửa sổ | Thoát và giải phóng SDL |

Resize hoặc mất focus dừng job/auto và nhả capture. Event được đổi window → logical board đúng một lần; world center giữ nguyên khi resize. Capture chỉ commit sau khi thành công; thiết bị khác không cướp drag. Button up áp dụng vị trí cuối trước khi nhả.

## Cách đọc kết quả

Xám là mọi hạt, vàng là mọi hit, xanh là query, đỏ là nearest trong toàn prefix (có thể nằm ngoài R). Mọi hạt đều được vẽ; nhiều hạt có thể trùng pixel. Hạt đứng yên, chỉ query di chuyển.

Boundary inclusive: distance <= R, hoặc distanceSquared <= radiusSquared. Nearest tie giữ index đầu. UI dùng world [0,1]²; phép bình phương chỉ được diễn giải trong miền hữu hạn này. Reference và squared có thể làm tròn khác nhau sát biên; không thêm epsilon để thay đổi bán kính.

Bảng SDL có query time, scans/hits và study. Benchmark dùng 24 probes cùng seed, warm-up một lượt rồi đo 48 query. Study dùng cùng probes trên prefix 1k/10k/100k: exact scans=48.000 / 480.000 / 4.800.000. Thời gian bao quanh **query**, không gồm generation/reserve/render/chờ frame/checksum. Timer call overhead vẫn có; lặp nhiều run và ghi cấu hình build khi báo cáo. Không ép timing tăng chính xác 10 lần.

UI làm tối đa một query benchmark/tick; có thể hủy giữa query, không có worker thread hay khả năng ngắt giữa một query. Một benchmark cần 72 tick, study 216 tick. Đổi N/R/seed dừng job và xóa số đo cũ. Checksum dùng toàn bộ index nhưng không thay equality test.

## Cấu trúc và kiểm chứng

- include/lab.hpp: dữ liệu, query reference/optimized, harness đồng bộ.
- include/scene.hpp: cấu hình, query hiện tại, benchmark job hữu hạn.
- include/framebuffer.hpp, view.hpp: raster CPU và biến đổi tọa độ.
- include/presentation.hpp: nhãn/bảng SDL, không nằm trong vùng đo.
- src/main.cpp: vòng lặp, input, upload/present, cleanup.
- tests/tests.cpp và extra-cases.hpp: ca biên, tái lập mọi vị trí, 24 query 100k đối chiếu oracle độc lập, capacity, exact work/checksum, job/hủy, tọa độ và pixel của toàn cloud.

`--smoke` là chế độ kiểm thử 240 frame hữu hạn với cửa sổ ẩn; bản từ bài 5 tự chạy một job rồi thoát. Nó kiểm đường SDL chạy được, không thay QA chuột và hình ảnh thật. CTest không cần SDL/window. Không commit thư mục build, dependencies hay binary.
