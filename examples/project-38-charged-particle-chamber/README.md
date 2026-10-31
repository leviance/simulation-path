# Project 38 — Buồng hạt tích điện 3D

Xây một buồng quan sát 3D trong đó hai nhóm hạt mang điện trái dấu chuyển động trong điện trường và từ trường cho trước. Bạn có thể xoay camera, theo dõi một hạt, đổi hướng trường rồi kiểm xem quỹ đạo thay đổi có đúng với mô hình hay không.

Đây là bài học về **mô phỏng có state lâu dài trên GPU**: compute shader cập nhật vị trí/vận tốc; vertex shader đọc chính SSBO ấy để vẽ. Một triệu hạt là mốc bắt buộc; năm triệu là phép thử mở rộng, không phải mức mà mọi GPU đều phải chạy được. Không có particle engine, CUDA hay thư viện vật lý bên ngoài.

## Học theo thứ tự nào?

12 checkpoint đi từ một cửa sổ có camera và lưới 3D tới sản phẩm hoàn chỉnh:

1. Dựng không gian quan sát và phân biệt camera với mô phỏng.
2. Định nghĩa `Particle`, ID, seed và snapshot tái lập.
3. Giải thích lực Lorentz trên một hạt; thử Euler để nhìn thấy sai số.
4. Viết Boris pusher, công bố mốc thời gian của position/velocity.
5. Tự xây nghiệm độc lập và kiểm sai số ở cùng thời điểm.
6. Đọc capability, tính ngân sách, tạo SSBO và chuẩn bị snapshot trên GPU.
7. Chuyển đúng phép cập nhật lên compute rồi render trực tiếp từ SSBO.
8. Ghép fixed timestep, catch-up hữu hạn, Pause/Reset/single-step.
9. Chọn ID, readback probe nhỏ và giữ lịch sử vệt có giới hạn.
10. Kiểm toàn bộ state trong một job riêng có deadline và nút hủy.
11. Đo riêng update/draw/frame; mở rộng N mà không trộn cấu hình.
12. Hoàn thiện chiều sâu, ánh sáng, HDR/bloom, controls và nghiệm thu.

Starter có event loop, OpenGL loader và renderer cho khung cảnh. Các phần ấy dùng lại kiến thức camera/context từ những project trước; không chứa sẵn lực Lorentz hoặc integrator để bỏ qua việc học. Mỗi checkpoint trong ZIP chạy độc lập. Đọc diff và source đầy đủ khi một đoạn trích trong bài chưa cho thấy nơi nối vào ứng dụng.

## Build và chạy

Cần compiler C++20 (Windows: Visual Studio 2022 với Desktop development with C++), CMake 3.24+ và driver hỗ trợ OpenGL 4.3 Core. CMake tải đúng SDL **3.4.8** bằng FetchContent/checksum và link `SDL3::SDL3`. Không cần cài SDL thủ công.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_38_final.exe
```

Final là target mặc định; `BUILD_CHECKPOINTS=ON` thêm starter và checkpoint 01–12. Với Ninja hoặc Unix Makefiles, thêm `-DCMAKE_BUILD_TYPE=Release`; executable nằm trực tiếp trong `build`. Cùng source có thể build trên Linux/macOS nhưng **macOS OpenGL chỉ tới 4.1**, không đáp ứng compute 4.3 của project này; chương trình phải báo không hỗ trợ, không chuyển sang CPU rồi nhận là GPU.

Shader được tìm ở source directory của đúng snapshot trước; đường fallback cạnh executable là `shaders/<target-name>/`. Mỗi target có thư mục riêng, không chép đè shader của checkpoint khác khi build song song.

## Điều khiển bản hoàn chỉnh

| Thao tác | Kết quả |
| --- | --- |
| Kéo chuột trái / phải / wheel | Orbit / pan / zoom camera |
| I J K L; giữ Shift | Orbit bằng phím; Shift chuyển sang pan |
| Page Up / Page Down; Backspace | Zoom; trở về góc nhìn ban đầu |
| Space / N / R | Pause–resume / đúng một bước khi Pause / Reset ACTIVE |
| 1–4 | Chọn preset thẳng / tròn / xoắn / điện trường rồi áp dụng |
| Tab / Shift+Tab; Left / Right | Chọn và sửa hàng STAGED trong panel |
| Enter | Kiểm và áp dụng STAGED; tạo state mới ở t = 0 |
| [ / ]; F | Chọn ID bất kỳ / camera nhìn hạt đang chọn khi probe đã về |
| Click một trong 32 hạt được probe | Chọn hạt ấy; không giả picking toàn bộ một triệu hạt |
| P / T / M / D / H | Trải pha 0–6 s / trails / màu tốc độ / E-B guides / panel |
| V / B / Escape / Q | Validation / benchmark / hủy job hoặc reset đang chờ / thoát |

STAGED là cấu hình đang sửa, ACTIVE là snapshot đang chạy, MEASURED là cấu hình của kết quả benchmark. Sửa một con số chưa được phép làm đổi dữ liệu đang kiểm. Reset lấy lại ACTIVE; Enter áp dụng STAGED. Yêu cầu không hợp lệ phải giữ state đang hợp lệ, không tự hạ N.

## Mô hình và đơn vị

`dx/dt = v`, `dv/dt = (q/m)(E + v × B)`. Mọi giá trị dùng hệ chuẩn hóa: một đơn vị chiều dài, thời gian, khối lượng và điện tích được chọn làm chuẩn. Vì vậy hệ số `q/m` nhân trực tiếp với các trường trong phương trình; **không đọc E/B ở UI như volt/mét hoặc tesla ngoài đời**. Hai nhóm có q cơ sở ±1; hệ số điện tích ở UI nhân vào q. Khối lượng phải dương.

Miền cấu hình: N từ 1 tới 5.000.000; seed uint32; `|E|, |B| ≤ 8`, `|v0| ≤ 20`, `|chargeScale| ≤ 4`, `0,001 ≤ dt ≤ 1/30` giây; phase span 0–12 s. Đây là miền kiểm input, **không phải bảo đảm mọi dt trong miền đều đủ chính xác**. Hãy giảm dt và so quỹ đạo ở cùng T.

`Particle` gồm hai vec4, tổng 32 byte/alignment 16: positionCharge offset 0 và velocityMass offset 16. Slot chính là ID, không compact/reorder. Cả x và v trong record cùng thuộc **thời điểm t đầy đủ**. Boris cập nhật v bằng nửa xung E → quay B → nửa xung E; vị trí dùng drift đối xứng `xNext = x + (vOld + vNext)dt/2`. Không đối chiếu trực tiếp với v ở nửa bước của một implementation khác.

Timestep mặc định 1/240 s; mỗi frame nhận tối đa 0,1 s wall time và chạy tối đa 8 bước. Thời gian dư được báo là bỏ qua, không âm thầm cộng vào t. Reference dùng tick × dt. Không có tường phản xạ, lifetime hoặc respawn: hạt khuất camera vẫn tồn tại.

Ở preset chỉ B, `phaseSpan` cho ID ≥ 2 các vị trí ban đầu khác nhau trên quỹ đạo từ trường đều, bằng nghiệm độc lập đã giải thích ở checkpoint 5. Đây là chuẩn bị **x0/v0**, không phải đường xoắn do renderer tạo theo thời gian. ID 0/1 luôn có cùng x0/v0 để so hai dấu điện tích. Phase preparation bị tắt nếu có E, B quá nhỏ hoặc q scale gần 0. Sau tick 0, mọi state đều do Boris kernel cập nhật.

Các hạt độc lập trong trường ngoài: không có Coulomb giữa các hạt, không giải Maxwell/Poisson và không phải plasma tự nhất quán. Mô hình phi tương đối tính không dùng để thiết kế thiết bị thật.

## Tài nguyên và hình ảnh

Một triệu state cần 32.000.000 byte; năm triệu cần 160.000.000 byte. Preflight kiểm OpenGL, block size, storage bindings, local size/invocations, group count và tổng dự phòng trước allocation. Ngân sách ứng dụng 640 MiB dự phòng ba state (ACTIVE/candidate/job), probes, trails và 64 MiB cho render targets cũ/mới khi resize. Đây không phải truy vấn VRAM còn trống; allocation vẫn có thể thất bại và phải giữ last-good.

Toàn bộ N hạt được update và vẽ core. Chỉ halo có sampling (xấp xỉ 1/16 ở N lớn); UI công bố riêng `CORE ALL` và `HALO SAMPLED`. Lõi là sphere impostor có shading, perspective size và fragment depth; grid 3D chỉ là mốc quan sát, không phải biên vật lý. HDR/bloom chỉ xử lý hình ảnh, không ghi SSBO. Render target nội bộ tối đa 2048×1152; resize transactional và có ngân sách riêng.

Probe thường đọc 33 record = 1.056 byte (32 ID đầu + ID đang chọn), không đọc cả buffer mỗi frame. Trails tối đa 17×256 điểm, lấy theo thời gian mô phỏng. Canvas web chỉ mô phỏng tối đa 256 hạt CPU với cùng công thức; không chứng minh quy mô/timing native và không gọi 32 byte layout C++ là dung lượng heap JavaScript.

## Kiểm chứng hữu hạn

CTest chỉ kiểm toán thuần, không mở window hoặc chạy benchmark vô hạn. Nghiệm thẳng, gia tốc đều và trường E/B đều dùng closed form double độc lập, không gọi lại Boris để làm đáp án. CPU mirror kiểm implementation; analytic reference kiểm mô hình và mốc thời gian. Kiểm tốc độ không thay kiểm pha/quỹ đạo.

```powershell
.\build\Release\project_38_final.exe --verify
.\build\Release\project_38_final.exe --verify --count 5000000
.\build\Release\project_38_final.exe --hidden --seconds 3 --capture chamber.bmp
```

`--verify` mặc định kiểm N=1.000.003, chạy bốn preset nhỏ, v=0, q scale=0, dt convergence, tail canary, allocation lỗi, cancellation và GPU render thật. Readback toàn N chỉ có trong **job kiểm riêng**, chia batch 8.192 record, không nằm trong render loop bình thường. CPU mirror tolerance `absTol=relTol=3e-4`; analytic kiểm cả position/velocity với ngưỡng `0,005(1+|reference|)`. Test convergence dùng ngưỡng chặt hơn để thấy sai số giảm khi dt nhỏ đi. NaN/Inf và mass không hợp lệ không bao giờ PASS.

Init/reset có deadline 5 s; probe 2 s; validation/benchmark 30 s. Validation mặc định 32 bước (tối đa 512); benchmark 4 warm-up + 20 mẫu. Job giữ bản sao cấu hình riêng; camera/viewport đổi thì benchmark bị hủy, không trộn workload. Escape/cancel/hết hạn chỉ báo chưa hoàn tất. Các deadline được kiểm giữa lời gọi GL, không thể cứu một driver bị treo bên trong API; chạy tự động vẫn cần process watchdog bên ngoài. Chế độ capture có giới hạn 30 s hoặc 10.000 frame.

Update GPU đo compute; draw GPU đo particle core/halo, không gồm toàn bộ grid/HDR/HUD; frame CPU+present đo tới sau SwapWindow. Query chỉ đọc sau availability; không dùng `glFinish`, FPS hay CPU dispatch time để giả GPU time. Công bố máy, build, N, snapshot và min/median/max khi so hiệu năng.

## Cấu trúc source

`chamber_math.hpp` giữ layout/seed/integrator/clock/budget; `chamber_reference.hpp` giữ nghiệm độc lập; `chamber_camera.hpp` giữ phép chiếu. `chamber_gpu.hpp` sở hữu state/candidate và pipeline; `chamber_probe.hpp` giữ readback nhỏ/trails; `chamber_validation.hpp`, `chamber_timing.hpp` và `chamber_benchmark.hpp` tách job kiểm/đo. `chamber_renderer.hpp`, `chamber_post.hpp` chỉ trình bày. `chamber_controls.hpp`, `chamber_panel.hpp`, `chamber_application.hpp` nối input/UI/lifetime; `chamber_verify.hpp` kiểm GPU thật. Mỗi file có trách nhiệm riêng, không nối cả học phần vào một `main.cpp` khổng lồ.

Trong repository khóa học, chỉ sửa `source-template`, tests và README. Starter/checkpoints/final/CMake/ZIP là output generator, không commit. Trong gói ZIP, chúng có đủ để build độc lập, không phụ thuộc website.
