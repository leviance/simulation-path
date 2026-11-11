# Project 42 — Studio biến hình một triệu hạt

Chọn nguồn và đích từ sphere, torus hoặc knot; kéo timeline để các điểm rời hình này rồi tụ thành hình kia. Đổi random/spatial trên cùng bộ mẫu để nhìn ảnh hưởng của correspondence; bật histogram và màu mật độ để phát hiện cách lấy mẫu thiên lệch.

Đây là chuyển động đồ họa theo ánh xạ và nội suy, không phải mô phỏng lực, collision hay một triệu nguyên tử. Phần cốt lõi tự viết gồm triangle area/CDF, barycentric sampler, ID/permutation, spatial order, timeline, compute update và render từ SSBO.

## Học từ bản nhỏ tới sản phẩm đầy đủ

| Mốc | Phần được thêm |
| --- | --- |
| Starter | Cửa sổ SDL3/OpenGL, camera, lưới sàn; chưa có bộ điểm. |
| 01 | Hai bộ mẫu nhỏ, nội suy CPU và vẽ điểm; sampler còn cố ý thiên lệch. |
| 02 | Chọn tam giác theo diện tích và barycentric đúng. |
| 03 | Seed/ID tái lập, histogram và màu mật độ nguồn. |
| 04 | Random permutation và stable spatial correspondence. |
| 05 | Model time, smoothstep, đường cung, scrub/reverse/loop. |
| 06 | Capability/budget, candidate SSBO và vertex shader đọc SSBO; CURRENT vẫn tính ở CPU. |
| 07 | Compute cập nhật CURRENT, tail guard và barrier. |
| 08 | Preparation/upload theo batch, generation và last-good. |
| 09 | Subset đường đi cùng timings đọc muộn, không lấy frame idle làm update performance. |
| 10 / final | Mặc định N=1.000.003, kiểm toàn GPU state và gói sản phẩm độc lập. |

Khung window/GL loader/camera và font panel được cấp, phát triển từ scaffold của các project trước trong repository. `morph_mesh.hpp` tạo ba mesh mẫu bằng công thức, không tải model hoàn chỉnh. Các mesh có seam trùng vị trí; đây không phải công cụ chứng nhận manifold hay nhập mesh tùy ý. Không cần source hoặc asset từ Project 41 để build ZIP.

## Build và chạy

Cần CMake 3.24+, compiler C++20 và driver OpenGL 4.3 Core. Trên Windows dùng Visual Studio 2022 với Desktop development with C++. CMake tải đúng SDL **3.4.8** bằng FetchContent/checksum và link `SDL3::SDL3`. Không cần Node.js để build gói ZIP.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_42_final.exe --seconds 120
```

Final là target mặc định. `BUILD_CHECKPOINTS=ON` thêm starter và checkpoint 1–10; ví dụ target `project_42_checkpoint_4` chạy từ `build\Release\project_42_checkpoint_4.exe`. Thêm `--config Debug` để build Debug. Với generator một cấu hình, đặt `-DCMAKE_BUILD_TYPE=Release` khi configure và chạy executable ngay trong `build`.

Nếu làm trong repository, chạy `npm run generate:course` trước để sinh CMake và snapshots. Shader dùng source directory của đúng snapshot; fallback cạnh executable nằm trong `shaders/<target-name>/`. Các target không chép đè shader của nhau.

macOS OpenGL 4.1 không đủ cho compute 4.3. Chương trình phải báo không hỗ trợ; không tự chuyển sang CPU rồi nhận là GPU scale. Context được kiểm block size, số SSBO/binding, local size/invocations và group count.

## Điều khiển

| Thao tác | Kết quả |
| --- | --- |
| Chuột trái / phải hoặc giữa / wheel | Orbit / pan / zoom camera |
| I J K L / Page Up, Page Down | Orbit và zoom bằng bàn phím |
| Space / R / Home, End | Play–Pause / về nguồn và Pause / tới đúng hai đầu |
| B / O | Reverse / bật tắt loop |
| M / E / C | A/B random–spatial / linear–smoothstep / straight–arc–Flow |
| H / P / G / F | Mật độ nguồn / tối đa 32 đường đi / lưới sàn / ẩn hiện panel |
| 1–3 / Shift + 1–3 | Chọn target / source ở STAGED |
| Tab, Shift+Tab / Left, Right | Chọn hàng / sửa giá trị; hàng cuối scrub timeline |
| Enter / X | Áp dụng STAGED / hủy preparation hoặc upload chưa công bố |
| Esc hoặc Q | Đóng ứng dụng |

STAGED chưa phải ACTIVE. Đổi source/target/N/seed/sampling cần Apply; dữ liệu và nhãn chỉ thay khi candidate đã hoàn chỉnh. Đổi matching/easing/path không rải lại mẫu. Reset thời gian dùng đúng bộ mẫu và seed của ACTIVE, không lấy cấu hình STAGED chưa áp dụng.

Mất focus sẽ Pause và nhả capture. Khi hệ điều hành không cấp mouse capture, timeline vẫn click/scrub được và camera có phím thay thế; chương trình báo rõ thay vì giữ một trạng thái kéo không thể kết thúc.

## Sampling và correspondence

Diện tích tam giác là `0.5*|cross(B-A,C-A)|`. CDF cộng bằng double, bỏ mặt có diện tích không quá `1e-12`. Ba biến ngẫu nhiên độc lập lần lượt chọn mặt và tạo barycentric. Với `r=sqrt(u)`, các trọng số là `1-r, r(1-v), rv`. Chế độ triangle-biased chọn đều các mặt hợp lệ, **không** được gọi là uniform surface.

Nguồn, đích và shuffle có RNG riêng từ seed uint32. ID là slot mảng; hai ID có thể trùng vị trí do sampling/làm tròn, nhưng không được mất hoặc lặp ID trong mapping. Random dùng Fisher–Yates; spatial dùng stable counting sort trên 32³ Morton cells trong hộp [-3.5,3.5] mỗi trục, rồi ghép cùng hạng. ID tăng phá hòa trong một ô. Spatial không phải optimal transport, không bảo đảm topology và có thể tạo các mảng đứt khi morph.

Histogram gom cả tam giác theo độ cao tâm mặt, không cắt chính xác bề mặt thành lát liên tục. Expected tính từ diện tích nhóm; observed từ số mẫu. `path.w` giữ observed/expected của nhóm nguồn, không phải mật độ liên tục mới ở target.

## Thời gian, dữ liệu và bộ nhớ

`t=time/duration`, duration mặc định 5 giây. Pause giữ model time; scrub Pause trước khi đổi t. Smoothstep là `t²(3-2t)`; đường cung cộng `sin(pi*s)*offset` vào lerp. Offset là hàm liên tục của vị trí nguồn, không phải một lực ngẫu nhiên. Hai nhánh t=0/1 chép record chính xác.

Từ checkpoint 5, **Flow** là đường mặc định: nhịp `t_i=t+0.48*q_i*sin(pi*t)/pi` thay đổi theo ID nhưng cùng thời lượng; độ tản riêng xoay quanh Y và được nhân `sin²(pi*s)`. Các hạt rời/tụ riêng thay vì các mảng Morton cùng đi một nhịp. Integer hash cố định theo ID, không lấy random mới mỗi frame; scrub/reverse vẫn tái lập. Đây là hiệu ứng đồ họa, không phải mô phỏng chất lỏng. C chuyển Thẳng → Vòng cung → Flow; CLI `--path straight|arc|flow` dùng để đối chiếu. Chọn Thẳng để xem giới hạn của mapping, không gọi Flow là sửa topology hoặc optimal transport.

| Buffer | Record | Payload |
| --- | --- | --- |
| source, target, path | vec4, 16 byte | Mỗi buffer 16N byte |
| current | vec4, 16 byte | 16(N+1) byte, gồm canary |
| mapping | uvec2, 8 byte | 8N byte |

Tổng payload là **72N+16 byte**, N=1.000.003 tương ứng 72.000.232 byte. Peak GPU kể cả ACTIVE/candidate và 32 MiB dự phòng; peak CPU kể Prepared đang giữ, candidate, sort và 8 MiB dự phòng. Mỗi phía có budget ứng dụng 768 MiB; không phải số VRAM/RAM còn trống. Allocation vẫn có thể thất bại và phải giữ last-good.

Final nhận N từ 1 tới 5.000.000 nhưng chỉ mốc tối thiểu một triệu là bắt buộc; năm triệu là mở rộng phụ thuộc context/budget. Không hạ N ngầm. Các checkpoint nhỏ có giới hạn riêng, được ghi trong `morph_settings.hpp`.

Preparation xử lý tối đa 32.768 phần tử mỗi lượt, deadline 30 giây. Upload mỗi chunk tối đa 4 MiB; chỉ đổi ACTIVE sau chunk cuối. Camera vẫn được xử lý giữa các batch. Không có lời hứa một API driver phải trả về trong thời gian cố định; chạy tự động cần watchdog bên ngoài.

## Kiểm có giới hạn

```powershell
.\build\Release\project_42_final.exe --hidden --verify --count 1000003
.\build\Release\project_42_final.exe --hidden --verify --count 127
.\build\Release\project_42_final.exe --hidden --exercise-events --frames 8 --count 65537
.\build\Release\project_42_final.exe --hidden --frames 8 --phase 0.65 --matching spatial --capture morph.bmp
```

Capture cần đường dẫn mới và `--frames` hữu hạn; frame chỉ bắt đầu đếm khi ACTIVE đã có. Chạy hidden cần context OpenGL dù không mở cửa sổ. `--seconds 1..180` giới hạn wall time; hidden còn có deadline tổng 60 giây.

CTest kiểm fixture diện tích 1:4 qua tám seed, centroid/barycentric, mặt suy biến, ID/permutation, stable order, nhiều chuỗi dt, endpoints, cancel/invalid và peak memory. `--verify` so từng GPU record ở 48 tổ hợp matching/easing/path/time, tolerance trung gian `8e-5`, endpoints chính xác và canary nguyên. Fence có deadline 3 giây; toàn-state job 30 giây, readback mỗi batch tối đa 16.384 record. Readback toàn mảng không nằm trong frame bình thường.

`--exercise-events` kiểm handler SDL bằng sự kiện có kịch bản: scrub, camera không rebuild, đổi A/B, cancel, invalid/last-good, focus cleanup. Kết quả này không được ghi thành “đã dùng chuột thật”. Khi tự kiểm cửa sổ, thử cả kéo ra ngoài rồi buông và đổi focus lúc đang giữ; rê chuột sau đó không được làm timeline tiếp tục chạy theo.

## Đọc timings đúng phạm vi

Panel `CPU SET/S/M` lần lượt là setup mesh/CDF và cấp bộ nhớ, sampling, rồi histogram ratio/shuffle/spatial matching. Log thêm `preparationWallMs` vì job trải qua nhiều frame. `uploadSubmitMs` là thời gian CPU trong allocation/upload API, không phải GPU transfer timer độc lập.

Query GPU đọc muộn sau availability. `LAST UP` giữ số đo lần cập nhật thực gần nhất; khi Pause có thể UPDATE=0 nhưng DRAW=N. Frame wall gồm xử lý frame/swap phía app, không phải tổng độ trễ end-to-end của GPU. Không cộng các cột bất đồng bộ để suy FPS hoặc hứa mọi máy đạt cùng tốc độ.

## Tài liệu tham khảo

- [PBRT — Sampling a Triangle](https://pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations#UniformSampleTriangle): cách suy ra trọng số barycentric theo diện tích.
- [Khronos — glMemoryBarrier](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml): chọn barrier theo consumer.
- [SDL — CMake](https://wiki.libsdl.org/SDL3/README-cmake): tích hợp target `SDL3::SDL3`.
