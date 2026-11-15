# Project 50 — Bể nước bằng hạt SPH 2D

Từ khung SDL3, bạn tự xây một bể nước có **5.000 hạt SPH thật**: dam-break, hồ nước, vòi đổ và vật cản kéo được. Mặt nước được dựng từ vị trí các hạt, không phải ảnh động hoặc những quả bóng chỉ va chạm với nhau. Density, pressure, artificial viscosity và uniform grid đều được tự viết.

## Học phần này để làm gì?

Project 49 biểu diễn chất lưu trên lưới; project này mang dữ liệu đi theo hạt. Bạn sẽ hiểu cách dùng kernel có đơn vị, suy lực từ density, kiểm search bằng oracle và cân đối chi phí với timestep. Project 51 mới mở rộng sang **3D/GPU**; chương trình này không giả không gian 3D bằng cách chiếu bể 2D.

Trước khi đọc, dành 120–180 phút tự thử dựng cột nước đổ xuống và vòi điều khiển được. Đề bài trên website tách hành vi cần đạt khỏi gợi ý thuật toán. Toàn học phần khoảng 23 giờ: 6 giờ đọc, 13 giờ tự viết, 4 giờ kiểm/thử; setup/build không tính vào thời lượng học thuần.

Cần biết SDL3/input/đổi tọa độ (01–05), vector, hàm và `std::vector`. Tích phân từ 23 và grid từ 28 giúp ôn lại, nhưng trong bài vẫn giải thích phần cần dùng. Không bắt học pressure projection của 49 trước SPH.

## 12 bài và source

1. Khung SDL3, bể và 1.000 hạt đứng yên.
2. Gravity, semi-implicit Euler, collision với bốn thành.
3. Cubic spline/gradient chuẩn hóa theo 2D.
4. Summation density, self và mẫu tường.
5. EOS tuyến tính và pressure force đối xứng.
6. Artificial viscosity và công suất tiêu tán của cặp.
7. Uniform grid count/prefix/scatter, đối chiếu all-pairs.
8. Dt thích nghi, accumulator và ngân sách frame.
9. Bản chuẩn 5.000 hạt, splat và mặt nước liên tục.
10. Vòi có overlap/capacity và mass accounting.
11. Vật cản kinematic và boundary samples chuyển động.
12. Oracle, equilibrium, dam/pool, benchmark và mã hoàn chỉnh.

`source-template/` là nguồn authored của repository. ZIP có `starter/`, `checkpoints/01..12/`, `final/`, `tests/` và CMake. Mỗi checkpoint tự chứa các file cần chạy. `include/sph/` giữ toán/solver; `include/app/` giữ SDL/input/UI; `src/main.cpp` nối các phần. Không có assets ngoài cần tải thêm. Code trong bài được đồng bộ bằng snippet markers với đúng checkpoint.

## Build/run

C++20, CMake ≥3.24. Windows: Visual Studio 2022, workload Desktop development with C++. SDL **3.4.8** được FetchContent tải theo URL/SHA-256 cố định, link `SDL3::SDL3`; configure lần đầu cần mạng. Không cần Node.js để build C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_50_final.exe
```

Target mặc định là `project_50_final`; dùng `project_50_starter` hoặc `project_50_checkpoint_1`…`12` để chạy từng bài. Với Ninja/Make single-config, tạo build directory riêng kèm `-DCMAKE_BUILD_TYPE=Debug` hoặc `Release`; executable không nằm trong thư mục con cấu hình. Dùng một worker nếu máy ít RAM. Các bước kiểm dài cần supervisor/deadline như `ARCHITECTURE.md`; không để test chạy bù vô hạn.

## Điều khiển và checklist desktop

- Space chạy/pause từ Bài 08; N pause rồi tiến **một substep**; R reset giữ cảnh/N/tham số; Escape thoát.
- P đổi Dam/Pool/Obstacle/Empty; G đổi 1.000/5.000/10.000 từ Bài 09. Bản cuối mặc định 5.000; 10.000 là mở rộng cần đo trên máy đang dùng.
- L đổi Surface/Particles/Density/Pressure/Speed, F1 bật/tắt số đo. Kiểm hình và số hạt cập nhật/vẽ khớp nhau.
- C/Q/B thay c/alpha/gravity bằng bàn phím; ba slider trong panel cho điều chỉnh liên tục bằng chuột. Thay tham số sẽ pause.
- M đổi tool Pour/Paddle/Inspect. Pour: click đặt vòi và thử phát bảy hạt; drag chỉ đổi vòi. Enter phát một đợt, E bật vòi liên tục khi physics chạy. Mũi tên dịch nozzle/target.
- O bật/tắt vật cản. Với tool Paddle, kéo chỉ đổi target; khi paused vật cản không teleport, khi chạy tốc độ không quá 3 m/s. Nước phải nằm ngoài hình đĩa sau bước.
- Inspect: click chọn hạt, xem vòng support và density/pressure tại tọa độ hiện tại.
- V chạy ca chuẩn trên state riêng, không đổi scene/tick/model time. Console không thay UI: kết quả cũng hiện trong panel.
- Mouse-up/blur/minimize release capture; blur/minimize pause và tắt vòi. Resize không đổi world hoặc nhầm vị trí con trỏ.

Ở Bài 02–04, N tiến 0,01 s để thấy rơi tự do. Từ pressure ở Bài 05–07, bước cố định là 0,00025 s. Bài 08 trở đi dùng dt thích nghi ≤0,001 s. Đừng hiểu một substep nhỏ là một frame 1/60 s.

## Mô hình và đơn vị

Miền kín `[0,12.6]×[0,7.56]` m, y lên; spacing=0,07 m, h=0,091 m, support=0,182 m. ρ₀=1.000 **kg/m²**, mass mỗi hạt=4,9 kg. Pressure có **N/m**, không phải Pa. Cubic spline dùng `10/(7πh²)`. Density giữ self và mẫu rắn.

`p=max(0,c²(ρ−ρ₀))`; c∈[12,40] m/s. Force dùng cả `p_i/ρ_i²+p_j/ρ_j²`. Artificial viscosity Monaghan beta=0, alpha∈[0,1], epsilon²=0,01h², chỉ cho cặp tiến lại gần. Alpha không phải độ nhớt vật lý và không có global damping theo frame.

Bể có bốn biên thật kể cả trần; ba lớp mẫu rắn nằm ngoài miền. Mẫu rắn có rho0/p_i/velocity của biên; collision giải tích giữ tâm ở cách biên spacing/2. Vật cản được điều khiển một chiều, chưa có rigid-body phản lực; lực dùng sample đầu bước, contact dùng vị trí mới. Không khẳng định cân bằng thủy tĩnh chính xác, không có surface tension hoặc mô phỏng 3D.

Dt=min(0,001; 0,25h/(c+vmax+3); 0,25sqrt(h/amax)); +3 dự phòng tốc độ paddle. Dt<1e−7 hoặc nonfinite thì pause/báo lỗi. Mỗi frame nhận tối đa 0,05 s, tối đa 24 substep và khoảng 12 ms native/10 ms Canvas; hoàn tất bước hiện tại rồi trả quyền UI. Model time là tổng dt đã chạy, dropped time báo riêng. **Không hứa thời gian thực hoặc FPS trên mọi máy.**

Capacity 12.000; vòi thử bảy hạt mỗi 0,025 s model time, từ chối overlap dưới 0,9 spacing. Không thay hạt cũ. Grid cell=2h, stencil 3×3, lọc support thật; all-pairs chỉ dùng ≤1.000 hạt cho oracle. Mặt nước 720×432 đọc mọi hạt bằng blob radius 1,65 spacing; coverage/edge shading chỉ phục vụ vẽ, không đổi density/force.

## Kiểm chứng

CTest giữ kiểm tra ở Debug/Release: radial integral, finite difference gradient, nonzero pair force/viscosity power, grid/all-pairs neighbor IDs/density/pressure/acceleration/trajectory, walls/cutoff, count/mass/emission, contact và invalid data. Ca zero-gravity lattice drift <1e−4 m sau 50 bước; **không dùng nó để chứng nhận hydrostatics có gravity**. Có smoke 5.000 hạt trong tests; dam-break dài và hồ được đo thêm ở executable hữu hạn.

```bash
.\build\Release\project_50_final.exe --verify
.\build\Release\project_50_tests.exe --benchmark
.\build\Release\project_50_final.exe --hidden --ticks=2200 --seconds=60 --capture=dam.bmp
```

Ticks có giới hạn 6.000; seconds tối đa 60; phải đạt target ticks mới gọi scale check thành công. Log allocated/alive/updated/drawn, density min/median/max, p95 compression, dt, leakage và mass. Chạy hồ bằng `--preset=pool`, vật cản bằng `--preset=obstacle`. Capture là bằng chứng hình, không thay kiểm mouse/keyboard.

Đo hiệu năng bằng Release với cùng state/N, warm-up và repetitions đã công bố; ghi máy, median và độ phân tán, tách search/density/force/integrate/render/full step. Compression lớn, particle detachment và lỗi boundary phải được báo, không dùng mặt nước mượt để che đi. Xem báo cáo nghiệm thu trong repository để biết cấu hình và phần nào đã được kiểm thực tế.

`tests/benchmark.hpp` thực hiện warm-up 30 tick và tám lần đo từ các bản clone của cùng state, riêng cho N=1.000/5.000. Copy state không nằm trong khoảng đo. Full step có validation/finite/allocation của solver; thời gian render CPU không gồm SDL upload/present. Không gọi tổng các median toán tử là median của full frame. Benchmark là một lượt hữu hạn; không chạy vòng benchmark không có deadline trên máy học tập.

Tham khảo: [PySPH kernels](https://pysph.readthedocs.io/en/main/reference/kernels.html), [PySPH equations](https://pysph.readthedocs.io/en/main/reference/equations.html), [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake).
