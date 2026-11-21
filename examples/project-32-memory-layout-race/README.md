# Project 32 — Đài phun hạt CPU: AoS và SoA

Nước rời một vòi hơi nghiêng trên mặt lưới 3D. Gần miệng vòi, các giọt đi sát nhau thành dòng; qua ngọn, chúng tách thành màn giọt rơi. Thử nhìn ngang bằng **F3**, rồi nhìn từ trên bằng **F2**: cả hai ảnh đều đến từ cùng một tập hạt. Không có bể dựng sẵn hay solver chất lỏng.

Thử thách của bạn là dựng đài phun ấy bằng C++20/SDL3, sau đó **đổi cách lưu một triệu hạt mà người xem không thấy đài phun đổi hình**. Làm được việc đó mới đến câu hỏi về tốc độ: nếu chỉ sửa vận tốc hướng lên, cách lưu nào có lợi? Câu trả lời còn đúng khi phải lo cả tuổi thọ và phát lại giọt nước không?

Bản cuối có preset **1.000.000 hạt sống được cập nhật thật ở mỗi fixed step**. Renderer CPU lấy mẫu tối đa 40.000 hạt để vẽ; số được lấy mẫu và số vẽ sau culling được ghi riêng. Không dùng OpenGL, compute shader, thread pool hoặc engine.

## Đầu vào và điều bạn sẽ học

Cần C++ cơ bản, vector, window/framebuffer SDL3 và ý nghĩa của position/velocity/dt. Bài 02 nhắc lại symplectic Euler; không cần học N-body/Barnes–Hut hoặc ghép source từ Project 31.

Bạn sẽ tự xây emission, vòng đời và kernel cập nhật; giữ đủ state khi đổi container; đặt timer đúng phạm vi và kiểm output trước khi đọc speedup. SoA không được coi là luôn nhanh hơn. Tài liệu trên web đi cùng tám checkpoint trong gói này; bài cuối cho toàn bộ source chạy được.

## Build và chạy

Cần compiler hỗ trợ C++20, CMake từ 3.24, mạng ở lần configure đầu để FetchContent tải SDL **3.4.8** theo URL/SHA-256 đã khóa. Mọi ứng dụng link SDL3::SDL3. Gói C++ độc lập, không cần Node.js hay website để build.

Windows/Visual Studio 2022, tại thư mục có CMakeLists.txt:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_32_starter --parallel 2
./build/Debug/project_32_starter.exe

cmake --build build --config Release --target project_32_final project_32_tests --parallel 2
./build/Release/project_32_final.exe
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Với Ninja trên Linux/macOS:

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON
cmake --build build --target project_32_final project_32_tests --parallel 2
./build/project_32_final
ctest --test-dir build --output-on-failure --timeout 20
```

Linux cần các development package cho backend window mà SDL sử dụng; xem Getting Started của website nếu configure báo thiếu thư viện hệ thống. Với generator single-config, dùng build directory riêng để kiểm Debug và Release. Với Visual Studio, hai cấu hình dùng chung build nhưng executable nằm trong Debug hoặc Release.

### Tự viết từ starter

Trong ZIP, nếu muốn làm theo bài thay vì chỉ chạy lời giải, dùng một thư mục build riêng:

```powershell
cmake -S . -B build-work -G "Visual Studio 17 2022" -A x64 -DCOURSE_WORKBOOK=ON
cmake --build build-work --config Debug --target project_32_work --parallel 1
./build-work/Debug/project_32_work.exe
```

CMake tạo `work/` từ starter đúng **một lần**. Mỗi bài cho biết tệp nào trong đó cần sửa và đặt phần mới vào đâu. Build lại cùng target sau mỗi bài; chạy configure lần sau không ghi đè phần bạn đã viết. Với Ninja, thêm `-DCMAKE_BUILD_TYPE=Debug` và chạy `./build-work/project_32_work`. Cuối bài 08, build target `project_32_tests` trong **build-work**, rồi chạy CTest ở đó: tests sẽ đọc header từ **work/** của bạn, không mượn bản final. Đừng dùng tests của sản phẩm hoàn thiện để chấm một starter còn thiếu chức năng.

`checkpoints/` và `final/` là các bản đối chiếu độc lập. Nếu lạc bước, hãy so sánh đúng hai checkpoint kề nhau trước khi mở final.

## Cấu trúc source và các mốc học

| Mốc | Nội dung |
| --- | --- |
| starter | Tám hạt cố định, window/framebuffer/camera có sẵn để kiểm môi trường |
| checkpoints/01 | State 44 byte, khởi tạo warm và đếm allocated/alive |
| checkpoints/02 | Phát hạt từ một vòi, thay độ xòe, cho rơi rồi tái sử dụng slot khi hết tuổi |
| checkpoints/03 | Baseline AoS có warm-up, năm mẫu, ba pass/mẫu và checksum |
| checkpoints/04 | Mười một mảng SoA, chuyển layout theo batch; chưa cập nhật vật lý bằng SoA |
| checkpoints/05 | Kernel SoA cùng mô hình/precision/thứ tự phép tính, kiểm state |
| checkpoints/06 | Mô hình địa chỉ/cache line có giả định rõ |
| checkpoints/07 | So AoS/SoA, AB/BA và scaling ở ba N × hai workload |
| checkpoints/08, final | Một triệu hạt, soi giọt theo ID qua lần sinh kế tiếp và qua hai layout |

Target checkpoint là project_32_checkpoint_1 … project_32_checkpoint_8. Final là target mặc định; starter và checkpoints chỉ có khi bật BUILD_CHECKPOINTS.

Trong mỗi snapshot:

- include/particles.hpp: state, cấu hình, seed theo ID/generation/channel, emission và kernel AoS.
- include/storage.hpp: container SoA, copy/read, kernel SoA và kiểm field.
- include/simulation.hpp: state mô phỏng, buffer nguồn/đích, cập nhật và conversion theo batch.
- include/benchmark.hpp: tác vụ đo hữu hạn, timer và kiểm output.
- include/render_geometry.hpp: camera, phép chiếu, framebuffer và depth buffer.
- include/render_surface.hpp: mặt phẳng lưới XZ tại y = 0 và nền/depth buffer được cache.
- include/render.hpp: đốm sáng mềm, nét chỉ vận tốc và sampling hiển thị tái lập.
- include/spray_light.hpp: phần sáng mờ do các giọt nhìn thấy góp vào ảnh; không thêm nước vào mô phỏng.
- include/inspection.hpp, include/showcase.hpp: chọn đúng slot đang sống và đọc trạng thái của nó trên ảnh.
- include/render_panel.hpp: bảng thông số và trợ giúp theo checkpoint.
- include/application.hpp: vòng SDL, input, controls và telemetry.
- src/main.cpp: tài nguyên SDL và chế độ CLI.
- tests/tests.cpp ở gốc: fixture thuần, không cần window.

## Điều khiển bản C++

| Thao tác | Kết quả |
| --- | --- |
| F1 / F2 / F3 | Nhìn nghiêng / từ trên / ngang. Đang pause thì cả ba góc dùng đúng một snapshot |
| , / . | Giảm/tăng độ xòe 0,5 m/s cho những giọt sinh tiếp theo; R khởi tạo lại với thông số hiện tại |
| I / Tab / bấm một giọt | Mở/đóng chế độ theo dõi, chọn slot kế tiếp hoặc chọn một giọt thấy trên ảnh; từ bài 08 |
| U rồi N | Tìm slot gần hết tuổi thọ nhất trong tối đa 4.096 slot đầu, rồi tiến một bước. Nếu thời gian còn lại không quá dt thì generation tăng, ID không đổi |
| Space | Pause/tiếp tục vật lý hoặc tác vụ đang chạy |
| N | Hủy tác vụ dở rồi tiến đúng một bước vật lý |
| R | Tạo lại preset bằng cấu hình hiện tại, đưa thời gian về 0 và pause |
| 1 / 2 / 3 | Cold 256 / warm 10.000 / warm 1.000.000 |
| L | Chuyển AoS ↔ SoA, giữ state và pause; có từ checkpoint 04 |
| X | Hủy tác vụ, giữ snapshot đã hoàn tất |
| A / D | Dịch emitter theo X cho lần sinh tiếp theo |
| W / S | Tăng/giảm vận tốc phóng cho lần sinh tiếp theo |
| G / H | Gravity âm hơn / gần 0 hơn; có hiệu lực ở bước tiếp theo |
| [ / ] | Giảm/tăng lifetime cơ sở cho lần sinh tiếp theo |
| − / = | Giảm/tăng emission rate của pool cold |
| T | Chọn workload **chỉ cho benchmark**, không thay solver của đài phun |
| B | Đo N/workload đang chọn |
| C | Đo 10.000/100.000/1.000.000 × gravity-only/full lifecycle; từ checkpoint 07 |
| Kéo trái / phải, wheel | Orbit / pan / zoom camera, không sửa state vật lý |
| Mũi tên / Home | Orbit bằng keyboard / đặt lại camera |
| F | Hiện/ẩn phần báo cáo, không giấu controls và các giới hạn |
| Escape | Hủy thao tác kéo hoặc tác vụ; thoát nếu không còn tác vụ |

Ứng dụng final chạy ngay khi mở. Nhấn Space để nhìn kỹ; R sẽ dừng ở cùng điều kiện đầu. Ảnh chụp cũng dừng ở bước 0 để so các góc công bằng. Mất focus sẽ pause và nhả mouse capture, không tự bật lại. Ở checkpoint 04, SoA chỉ đọc/vẽ; quay về AoS để chạy cho tới khi thêm kernel ở checkpoint 05.

Giọt mới có màu bạc nhạt, chuyển dần sang xanh thép theo age/lifetime; nét ngắn chỉ hướng vận tốc hiện tại, không phải quỹ đạo đã lưu. Mặt lưới XZ luôn hiện: ô 1 m, đường chính mỗi 5 m. Depth buffer che hạt dưới mặt phẳng, nhưng **chưa có va chạm sàn hay solver chất lỏng**; hạt bị che vẫn được cập nhật đầy đủ. F bật báo cáo và làm lưới rõ hơn. Không có đế hay bể dựng sẵn. Đổi emitter/lifetime không sửa ngược các hạt đã sống; R tạo lại toàn bộ bằng cấu hình mới.

## Mô hình, giới hạn và bộ nhớ

Mỗi slot có ID ổn định, generation, position/velocity XYZ, age, lifetime và hue: hai uint32 + chín float32. Source kiểm sizeof(ParticleAoS) = 44. Một triệu record có payload 44 MB thập phân cho mỗi layout; buffer dự phòng/conversion và capacity giữ lại làm tổng lớn hơn. HUD báo resident payload AoS/SoA, không giả làm số RAM toàn tiến trình.

Một fixed step là 1/120 giây mô phỏng. Gravity sửa velocity trước position. Khi hạt hết lifetime giữa bước, giữ ID, tăng generation rồi tiến hạt mới bằng phần dt còn lại. Pool cold phát thêm slot theo emissionRate × dt và giữ phần lẻ; khi đầy, chỉ tái sử dụng slot.

Cấu hình kiểm N ≤ 1.000.000, dt ≤ 1/30, lifetime cơ sở 0,5–8 s, gravity −20…0 m/s², launchSpeed 1–20 m/s, spread 0–5, emitter X/Z trong ±10 m và emission rate tối đa 2.000.000/s. Lifetime thực tế có jitter 0,75…1,25 lần cơ sở. Các giới hạn bảo đảm nhiều nhất một lần expiry trong một bước.

Mỗi lần tick xử lý các batch tối đa 4.096 target với ngân sách khoảng 6 ms rồi trả về UI. Chỉ công bố snapshot sau khi tính đủ N slot. Không có vòng bù lag vô hạn; nếu CPU tính chậm, thời gian mô phỏng tiến chậm hơn wall time, không giảm số hạt để giữ FPS.

Canvas trên website giới hạn 20.000 hạt, lấy mẫu vẽ tối đa 8.000 và dùng JavaScript float32 để giải thích. Heap object/timing JavaScript **không** đại diện layout/tốc độ C++. Mốc một triệu được kiểm ở native, không suy ra từ Canvas.

## Benchmark có thể tái lập

```powershell
cmake --build build --config Release --target project_32_final --parallel 2
./build/Release/project_32_final.exe --benchmark
```

CLI chạy hữu hạn và trả mã lỗi nếu hết deadline 30 giây hoặc kiểm state thất bại. Trong UI, pause/cancel được xử lý giữa các batch; deadline cũng tính cả lúc pause. Chỉ giữ row đã hoàn tất.

Mỗi ca dùng cùng input warm, seed, config, float32 và dt; một warm-up + năm mẫu, mỗi mẫu ba pass đủ N. Từ checkpoint 07, đổi thứ tự AoS/SoA theo AB/BA giữa các mẫu. Copy/reset/conversion, tạo input, checksum và rendering nằm ngoài timer kernel. Copy/conversion được báo riêng cho một lần reset của mẫu đầu, không phải tổng cả benchmark.

Báo cáo ghi compiler/configuration, N/alive, actualUpdated = 3 × N cho mỗi mẫu, workload, median/min/max, checksum, sai khác state và logical payload. Median là tổng ba pass; throughput là actualUpdated / (medianMs / 1000), không phải FPS.

ID/generation phải khớp chính xác; NaN/Inf bị từ chối. Mỗi field dùng ngưỡng |Δ| ≤ absTol + 10⁻⁶ × max(|a|, |b|):

| Đại lượng | absTol |
| --- | --- |
| Position | 10⁻⁵ m |
| Velocity | 10⁻⁵ m/s |
| Age/lifetime | 10⁻⁶ s |
| Hue | 10⁻⁷, không đơn vị |

Error ratio là tỉ lệ lớn nhất |Δ|/ngưỡng theo field, phải ≤ 1. Max difference thô và checksum chỉ là số chẩn đoán, không thay phép so từng field. Không cộng các sai số khác đơn vị thành một sai số vật lý.

Khi lưu kết quả, ghi CPU, OS, compiler/version, generator, configuration, các CMAKE_CXX_FLAGS và CMAKE_CXX_FLAGS_RELEASE thực tế trong build/CMakeCache.txt. Gói không thêm manual SIMD hoặc khóa vectorization thành giống nhau: compiler có thể tối ưu hai loop khác nhau; ghi flags/report nếu kết luận dựa vào vectorization. Không so Debug với Release rồi gán chênh lệch cho layout.

Giữ cả ca SoA chậm hơn. JIT của Canvas, cache CPU, batch size, đồng hồ và tải nền đều là giới hạn của phép đo. Mô hình cache line 64 B chỉ đếm địa chỉ với giả định base thẳng hàng 64 B; workload toàn field là cận trên, không phải bộ đếm hardware cache miss.

## Kiểm chứng

Một cách kiểm bằng mắt: dừng, nhấn U, ghi ID và generation; bấm N cho tới khi tuổi quay về gần 0. Giữ nguyên giọt đó, nhấn L, đợi đổi layout xong rồi đọc lại cả ba số. Nhấn F2 và F3: góc nhìn đổi nhưng giọt không già thêm. Hạt ở dưới lưới vẫn sống dù không xuất hiện trong số visible.

Muốn chụp lại ba góc cho bài học, chạy bản Release với `--capture jet.png --view oblique`, `--capture plan.png --view plan` hoặc `--capture profile.png --view profile`. Thêm `--narrow` để khởi tạo với độ xòe 0 m/s. PNG lấy từ framebuffer SDL của chính ứng dụng.

```powershell
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Release/project_32_final.exe --smoke
./build/Release/project_32_final.exe --smoke-workflow
```

CTest có fixture độc lập cho emission, gravity, expiry/respawn và kiểm layout, full lifecycle nhiều bước, batch/cancel, bounds, deadline, mẫu benchmark. Tests không phụ thuộc assert bị vô hiệu bởi NDEBUG.

--smoke chỉ mở/render hữu hạn. --smoke-workflow tiến một bước warm của preset hiện tại và kiểm **từng slot** có ID/age/generation đúng, active = updated = N và state hữu hạn; final mặc định dùng một triệu. Hai chế độ có giới hạn nội bộ 10 giây. Chúng không thay kiểm desktop camera/controls và không đo FPS cam kết.

Khi nghiệm thu, tách bốn loại bằng chứng: build từng target/configuration; CTest; smoke/workflow/benchmark hữu hạn; kiểm trực tiếp UI. Không gọi build xanh hoặc một ảnh đài phun là đã kiểm hết sản phẩm.
