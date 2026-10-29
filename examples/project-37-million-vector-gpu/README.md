# Project 37 — Máy tính vector GPU

Ứng dụng C++20/SDL3/OpenGL 4.3 so CPU và GPU với Add, AXPY (`s*A+B`) và Difference. Preset cuối có **1.000.003 Vec4 thật**; dashboard kiểm toàn bộ output rồi cho đọc từng phần tử, không đánh giá correctness bằng vài cột trông hợp lý.

## Bạn sẽ xây gì?

Một compute workbench gồm bảng CPU/kernel/end-to-end theo N, min/median/max, số warm-up/sample, báo cáo sai số và inspector A/B/CPU/GPU đủ x/y/z/w. UI dùng SDL software surface; hidden OpenGL context chạy riêng trên worker, không dùng draw calls để thay compute. Worker nhận bản sao cấu hình, không bị UI sửa giữa chừng.

11 checkpoint đi từ CPU preview 256 phần tử → capability → SSBO → một workgroup → N lẻ lớn → synchronization/readback → validation → timing → benchmark theo N → inspector → kiểm GPU thật. Bản nhỏ chỉ là bước học, không phải sản phẩm cuối.

## Build và chạy

Cần CMake 3.24+, compiler C++20 và GPU/driver OpenGL 4.3. SDL 3.4.8 được FetchContent tải theo checksum và link qua `SDL3::SDL3`.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_37_final.exe --verify
.\build\Release\project_37_final.exe
```

Với Ninja/single-config, configure bằng `-DCMAKE_BUILD_TYPE=Release`; executable nằm trực tiếp trong build. Final được build mặc định; `BUILD_CHECKPOINTS` bật starter và checkpoint 01–11. Shader fallback riêng từng target tránh các bản GLSL chép đè nhau. Source path của đúng snapshot được ưu tiên.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| Space | Chạy một lần với cấu hình SELECTED |
| B | Benchmark ba N: 256, 65.537, 1.000.003 |
| 1/2/3 | Chọn Add/AXPY/Difference khi idle |
| [ / ] | Đổi N khi idle |
| - / = | Scalar tăng/giảm 0,25 trong [-4,4] |
| Left/Right | Inspector đi một phần tử |
| Page Up/Down | Inspector đi 1.024 phần tử |
| Home/End | Phần tử đầu/cuối |
| R | Reset cấu hình và chạy lại |
| Escape | Hủy job đang chạy; nếu idle thì thoát |

Thay SELECTED chưa làm thay đổi MEASURED; nhấn Space để chạy cấu hình mới. Khi busy, cấu hình bị khóa, inspector vẫn chỉ đọc kết quả đã công bố. `--smoke` tự đóng sau ít nhất 30 frame và chờ job hoàn tất; `--snapshot file.bmp` chạy benchmark rồi lưu dashboard và thoát (từ checkpoint 8, trước đó lưu lượt tính đơn). Các chế độ này có thể dùng trong kiểm tự động có process watchdog bên ngoài.

## Đọc số đo

- CPU: loop ghi output đã preallocate, không gồm generation/allocation/checksum/validation.
- Kernel: `GL_TIME_ELAPSED` chỉ bao quanh `glDispatchCompute`, không lấy FPS hay thời gian gọi dispatch trên CPU.
- End-to-end: wall clock từ upload A/B và reset output đến dispatch, fence wait và readback N+256 phần tử. Không gồm chuẩn bị host/allocation, CPU reference, kiểm kết quả, chờ query availability hoặc UI. Poll/scheduler granularity vẫn ảnh hưởng E2E và không được trừ giấu đi.

Mỗi N có hai warm-up và chín sample riêng. Bảng giữ min/median/max và raw samples trong `BenchmarkRow`; bars cùng thang trong từng hàng, không dùng độ dài bar để so các hàng N khác nhau. Dùng Release khi bàn về tốc độ. GPU không được hứa luôn nhanh hơn, nhất là khi phải truyền dữ liệu qua lại.

## Correctness và an toàn

`Vec4` có size/alignment/stride 16 byte. Local size 256; N=1.000.003 cần 3.907 workgroup và 189 lane dư. Guard chạy trước mọi lần đọc/ghi. Output hợp lệ bắt đầu bằng NaN sentinel, 256 phần tử canary sau N phát hiện tail writes. Canary không tự chứng minh không có read ngoài biên; guard/source inspection vẫn cần thiết.

Tolerance được công bố là `absTol=relTol=2e-6`. Validator kiểm cả bốn thành phần, finite values, size, first mismatch/component và maximum absolute error; tolerance NaN/âm không hợp lệ. CTest kiểm toán thuần trong Debug/Release. `--verify` chạy compute thật tại N=1/255/256/257/65.537/1.000.003 cho ba operation; có đáp án độc lập chứa 0/số âm, kiểm input preservation, cố ý phá guard để kiểm canary và thử interface sai để giữ last-good.

`--verify` còn chạy worker benchmark thật với hai warm-up/chín sample cho từng N, kiểm cấu hình bất biến, spread, output đủ một triệu phần tử và hủy một generation mới trước khi công bố. Đây không phải phép kiểm bấm phím Windows; kiểm tương tác cửa sổ là một bước riêng.

Preflight kiểm N trước allocation, local size, group count, số SSBO binding/block và dung lượng có padding. Budget ứng dụng là 2.000.003 phần tử, không phải giới hạn phổ quát của GPU. Job có deadline 15 giây; chờ fence/query tối đa 3 giây. Đây không phải khả năng cưỡng bức ngắt driver bị treo trong API; test tự động vẫn phải có watchdog process. Không chạy window loop trong CTest.

## Cấu trúc

`vector_compute_math.hpp` giữ toán thuần; `compute_benchmark.hpp` giữ cấu hình/thống kê; `vector_compute_engine.hpp` sở hữu SSBO/query/fence; `compute_program.hpp` đọc/compile/reflect shader; `compute_worker.hpp` điều phối job; `compute_application.hpp` giữ SDL/input/lifetime; `compute_dashboard.hpp` và `dashboard_surface.hpp` trình bày số liệu; `compute_verify.hpp` kiểm GPU. `src/main.cpp` parse chế độ chạy và giữ scope cleanup.

Nguồn authored là `source-template`, README và tests. `starter`, `checkpoints`, `final`, CMake và ZIP được sinh tự động, không commit. Source đầy đủ của từng checkpoint có trong gói tải về; không cần viết lại từ ảnh hoặc đoạn trích.
