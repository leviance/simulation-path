# Project 51 — Bể nước SPH 3D trên GPU

Project 50 giúp bạn hiểu vì sao các hạt có thể tạo thành nước trên mặt phẳng. Project 51 đưa mô hình ấy vào thể tích thật và chuyển phần nặng sang GPU. Sản phẩm là một bể nước tương tác: khối nước đổ xuống, lan trong bể và chảy quanh quả cầu có thể kéo. Mặt nước được dựng từ chính dữ liệu SPH, không phải animation được chuẩn bị sẵn.

Bản C++ là sản phẩm chính. Canvas trên website là bản CPU nhỏ để học công thức và quan sát; không dùng nó để chứng nhận workload GPU hoặc FPS của executable.

## Bạn sẽ học gì?

13 bài nối tiếp nhau: dựng bể/camera; đơn vị và kernel 3D; SSBO/init; density/pressure; force/integration; GPU CSR/scan; timestep/reduction; depth/thickness; surface/ánh sáng; vật cản; queue/vòng đời; quy mô/profiler; kiểm chứng/đóng gói.

Mỗi checkpoint là một chương trình độc lập ở cuối bài, không phải một đoạn mã cần tự ghép với các ZIP khác. Starter chỉ mở cửa sổ. Những tiện ích GL/renderer trong bộ khung được cung cấp đầy đủ; các pass SPH xuất hiện dần ở checkpoint tương ứng. Bài 01–04 chưa tiến physics; Bài 05 có solver all-pairs nhỏ; Bài 06 chuyển sang grid; Bài 08 bật surface view.

## Công cụ và build

C++20, CMake 3.24+, SDL **3.4.8**, OpenGL 4.3 core/GLSL 430. CMake khóa URL và SHA256 SDL, link qua SDL3::SDL3. Không cần GLM, engine hay thư viện SPH. macOS OpenGL tích hợp không hỗ trợ mức compute này.

Trên Windows/Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_51_final.exe
```

Nếu chỉ cần bản hoàn chỉnh, bỏ BUILD_CHECKPOINTS. Linux dùng executable trong build; chọn CMAKE_BUILD_TYPE=Release khi dùng generator một cấu hình. CTest chỉ tính toán CPU, không mở window hoặc yêu cầu driver.

## Điều khiển

- Space: chạy/dừng. Enter: một tick. R: đặt lại cảnh đang dùng.
- Chọn Preset và Requested N rồi bấm Apply (phím A). Không tự tăng N.
- Kéo bằng công cụ Orbit để nhìn quanh; wheel hoặc +/− để zoom; arrows điều khiển camera.
- Công cụ Move obstacle (T) chỉ có tác dụng ở cảnh Obstacle. Kéo trên mặt phẳng y = 0,22 m; arrows đổi target, Ctrl+arrows vẫn xoay camera. O quay lại Orbit.
- Quả cầu tiến tới target khi physics chạy, không teleport khi paused. Tốc độ tối đa 1 m/s; đây là kinematic body, chưa coupling phản lực hai chiều.
- M đổi Water/Particles/Density/Speed. B bắt đầu benchmark khi GPU idle. Esc hủy benchmark; Esc khi không benchmark đóng ứng dụng.
- Mất focus kết thúc drag và pause. Reset giữa lúc pending được hoãn tới khi batch hoàn tất.

## Mô hình và giới hạn

Bể 1,65 × 0,825 × 1,10 m, y hướng lên. Khối cạnh 0,55 m có mass 166,375 kg ở mọi độ phân giải đầy đủ. rho0=1000 kg/m³; spacing=0,55/side; h=1,3 spacing; mass=rho0 spacing³. Cubic spline chuẩn hóa 1/(πh³), support 2h.

EOS: max(0,c²(rho−rho0)). c=10–40 m/s, alpha=0–1 là Monaghan artificial viscosity, gravity=0–20 m/s². Không nhân velocity với một damping tùy ý sau mỗi frame. Volume samples bù support ngoài sáu thành và trong quả cầu; mặt thoáng vẫn thiếu support và có density thấp. Collision giải tích là lớp chống xuyên sau semi-implicit integration.

dt=min(0,00075; 0,25h/(c+vmax+1); 0,25√(h/amax)). Extrema thuộc chính tick đang tính. NaN/Inf hoặc dt<1e−7 dừng submit; không ép dt lên một mức nguy hiểm để giữ FPS.

Đây là WCSPH giảng dạy, không phải solver không nén được đã chứng minh hội tụ. Density/pressure trong báo cáo thuộc đầu tick cuối, còn position đã ở cuối tick. Quang học screen-space/bilateral là xấp xỉ hiển thị, không thay lực. Không có caustics chính xác, surface tension hoặc phản lực rigid body hai chiều.

## Quy mô và tài nguyên

Mặc định final 48³ = **110.592 hạt thật**. 512 và 32.768 là các mức nhỏ; 80³ = 512.000 và 100³ = 1.000.000 là mục tiêu nâng cao theo phần cứng. Chọn trong UI không có nghĩa là mức đó đã được kiểm trên máy của bạn. Không cam kết realtime hoặc một mức FPS; model time tách khỏi thời gian thực.

Các pass: clear/count → scan nhiều tầng → cursors/scatter → density → force → extrema → integrate/finish. CSR không có fixed cell capacity. Nếu một hạt phải duyệt quá 1024 ứng viên, transaction bị từ chối thay vì cắt danh sách. Reset cùng độ phân giải tái sử dụng bank rảnh; chỉ đổi N mới phải cấp phát bộ buffer mới và kiểm peak old + new.

Ba bank giữ committed scene khi một batch 1–4 tick đang pending. Poll fence timeout 0, deadline 5 s; timestamp cũng phải báo available trước khi đọc. Không glFinish hoặc busy wait. Budget 192 MiB áp dụng cho ước lượng simulation buffers và peak old+new lúc reset; không phải đo VRAM toàn tiến trình. Render targets giới hạn 1024 × 768, nhưng vẫn gửi toàn N instance.

Deadline không thể thu hồi lệnh đã gửi hoặc bảo đảm driver không bị treo. Chạy từng ca GPU riêng, không mở nhiều benchmark nặng cùng lúc; không dùng shader vô hạn để thử watchdog.

Nếu fence/timestamp vượt deadline, ứng dụng kết thúc ngay với mã lỗi 2, không gửi thêm GL work hoặc chạy cleanup GL có nguy cơ chờ driver. Hệ điều hành thu hồi tài nguyên tiến trình; đây không phải khả năng hủy công việc đã nằm trong driver.

## Kiểm chứng và báo cáo

```powershell
.\build\Release\project_51_final.exe --verify --hidden
.\build\Release\project_51_final.exe --time 0.30 --seconds 120 --report scale.json --capture water.bmp
.\build\Release\project_51_final.exe --benchmark --seconds 60
```

--verify dùng sáu fixture N=2/64/257/512: tail, nén có pressure khác 0, velocity tương đối, obstacle và sparse grid đủ lớn cho scan nhiều tầng. GPU CSR so với GPU all-pairs và CPU double độc lập. Kiểm density, pressure, acceleration, adaptive dt, CSR permutation và một bước integration. Reference không dùng indices GPU.

Tolerance: density abs 0,05 kg/m³, pressure abs 25 Pa, force |GPU−CPU|/(1+|CPU|)≤0,003, dt abs 1e−7 s, position abs 2e−5 m, velocity abs 0,002 m/s. Không nới tolerance khi chưa hiểu lỗi.

Benchmark hữu hạn: 30 warm-up tick, 8 compute sample một tick/sample rồi 8 frame state đóng băng; deadline 50 s, Esc hủy. Báo median/min/max GPU compute/render, từng pass, CPU enqueue và completion riêng. Thời gian GPU render không gồm bảng UI. Ghi GPU/driver, N, build/config, scene và viewport khi so sánh.

--side chọn độ phân giải (bội bốn, 4–100). --preset nhận dam/pool/obstacle. --ticks hoặc --time đặt đích hữu hạn; --seconds đặt deadline, --capture xuất BMP, --report xuất JSON. Early checkpoint dưới 06 giới hạn side≤8 và chưa phải mốc nghiệm thu quy mô.

## Checklist tương tác và hình ảnh

- Dam có thể tích thật, đổ xuống và lan ra; nhìn từ trên, bên hông, phía sau vẫn đúng.
- Water surface liền và đọc được chiều sâu; debug cho thấy cùng position thật. Không lấy một ảnh lattice đứng yên thay nghiệm thu cảnh động.
- Orbit không đổi physics; Move obstacle không đổi camera; capture/release hoạt động khi thả chuột ngoài cửa sổ.
- Pause/Step/Reset, Apply N/preset, sliders, blur và benchmark/cancel không khóa input.
- Allocated/alive/updated/drawn bằng N ở cảnh đã integration. Init có updated=0 là bình thường.
- Ghi model time, density extrema, leakage/invalid riêng với profiler. PASS nhỏ không thay scale run; PASS scale không chứng minh hội tụ vật lý.
- Kiểm lại trên máy của bạn trước khi ghi nhận 500k/1M. Các mốc này không tự được chứng nhận bởi dự toán bộ nhớ.

## Thư mục

source-template là nguồn chuẩn ở repository. starter, checkpoints/01…13 và final được sinh từ nguồn ấy; không sửa một bản sinh riêng rồi để tài liệu lệch mã tải về.

- include/fluid: toán, model/units, kernel, CPU reference và thống kê thuần.
- include/gpu: GL entry points, buffers/programs, storage, passes, queue và timestamp.
- include/render: render targets, surface renderer và timer.
- include/app: camera/input/UI, options, benchmark, verifier, capture và report.
- shaders/shared, shaders/sph, shaders/water: các phần GLSL tương ứng.
- tests: CTest không cần window/GPU.

ZIP độc lập có CMake, README, starter/checkpoints/final/tests và shaders. Không cần copy thư viện hoặc binary từ repository; SDL được FetchContent khi configure. Không đưa build, _deps, node_modules, ZIP hoặc output validation vào Git.

Tham khảo: [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake), [PySPH kernels](https://pysph.readthedocs.io/en/main/reference/kernels.html), [OpenGL memory model](https://wikis.khronos.org/opengl/Memory_Model), [Screen Space Fluid Rendering](https://wstahw.win.tue.nl/edu/2IV06/andrei/particle_rendering/provided/p91-van_der_laan.pdf).
