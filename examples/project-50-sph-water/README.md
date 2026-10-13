# Project 50 — Bể nước bằng hạt: SPH 2D có thể đổ và va vào thành

Tự xây một bể nước 2D bằng C++20/SDL3, từ các chấm tròn đứng yên đến WCSPH với gravity, density, pressure, artificial viscosity và vòi nước. Bài học bắt đầu bằng hình chạy được, rồi giải thích từng phần của solver trước khi chạy liên tục.

## Trước khi đọc lời giải

Thử dựng cột hạt trong bể 1×0.8 m, cho đổ xuống và lan ngang, thêm vòi điều khiển bằng chuột. Đọc challenge trên trang tổng quan, ghi lại những chỗ bạn chưa biết cách làm. Dự kiến 15–19 giờ cho toàn học phần; dành 120–180 phút tự thử trước.

Nên biết SDL3 input/renderer và đổi tọa độ (01–05), quỹ đạo/tích phân/va chạm (22–24), all-pairs/grid (27–28), gradient và chất lưu trên lưới (48–49). Kernel/density/force SPH được giải thích từ đầu; không cần biết SPH trước.

## Mười bài và source tương ứng

1. Vẽ hạt/bể trong world space, chưa có chuyển động.
2. Gravity, semi-implicit Euler và collision; chưa có tương tác chất lỏng.
3. Cubic spline 2D, gradient và vòng support.
4. Summation density, self và ba lớp wall samples.
5. EOS tuyến tính/clamp, force pressure đối xứng.
6. Artificial viscosity Monaghan beta=0 cho cặp tiến lại gần.
7. Spatial grid có all-pairs oracle.
8. Vòi nước, overlap/capacity và input chuột/keyboard.
9. Acoustic/force timestep, accumulator và work cap.
10. Ca chuẩn độc lập, CTest và mã hoàn chỉnh.

`source-template/` là nguồn biên soạn trong repository. `starter/`, `checkpoints/01`…`10` và `final/` là source độc lập được sinh sẵn trong ZIP. Không cần chép code qua từng bài để chạy checkpoint. Tests include core ở final, không mở window.

## Build và chạy

Cần compiler C++20, CMake 3.24 trở lên. Windows dùng Visual Studio 2022 với workload Desktop development with C++. CMake FetchContent tải SDL **3.4.8** có SHA-256 khóa cố định và link `SDL3::SDL3`; lần configure đầu cần mạng. Không tự đổi phiên bản SDL khi chỉ muốn chạy bài.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Chạy `build/Debug/project_50_final.exe` trên Windows/Visual Studio. Target mặc định là final; target starter là `project_50_starter`, từng bài là `project_50_checkpoint_1`…`project_50_checkpoint_10`. Với Ninja/Make single-config, dùng hai thư mục riêng có `-DCMAKE_BUILD_TYPE=Debug` hoặc `Release`; executable không nằm trong subdirectory Debug.

## Điều khiển

- R reset, P đổi preset Dam/Pool/Pair/Empty, I in inspector ra terminal.
- N tiến một bước; từ Bài 09, Space chạy/dừng và E bật/tắt đổ liên tục.
- Click chọn hạt từ Bài 03; từ Bài 08 click/rê đặt vòi và thử phát một hạt lúc bắt đầu. Motion chỉ đổi vị trí, không phát theo mỗi event.
- Trước Bài 08, trái/phải chọn hạt. Từ Bài 08, arrows dịch vòi, Enter đổ một hạt.
- W bật mẫu tường, L màu theo density; C đổi c=8/12/20; Q alpha=0/0.15/0.3; G grid/all-pairs.
- Từ Bài 05, F bật/tắt cặp độc lập; 1/2 đổi density A/B (900/1100/1200), I in gradient/lực/tổng lực. Từ Bài 06, D đổi tiến lại gần/tách ra. C/Q dùng chung c/alpha; R đặt lại tham số. Mũi tên xanh là pressure, cam là viscosity.
- V chạy ca chuẩn trên state riêng từ Bài 10; PASS/FAIL và giá trị được in ra terminal.
- Mouse up/ra khỏi bể/blur/minimize hủy vòi; blur/minimize dừng solver. Resize chỉ đổi logical presentation.

Window title hiện count/mass/simulated time/maximum compression và dropped time. Inspector đọc density/pressure tại vị trí đang hiển thị; màu không thay dữ liệu solver.

Cặp độc lập là phép đo tĩnh với density cho trước, không chạy summation density, gravity, wall hoặc tích phân. Ca 1100/1200, c=12 cho pressure 14400/28800 và Fx pressure ±211.561054. Khi tiến lại gần với alpha=0.15, Pi≈0.000907030, công suất viscosity≈−3.609163. Khi tách ra, viscosity bằng 0 nhưng pressure vẫn còn. Preset Pair **trong bể** vẫn tính density từ kernel; không dùng nó thay phép đo lực này.

## Mô hình và giới hạn

spacing=0.045 m, h=1.3*spacing, support=2h, rho0=1000 **kg/m²**, mass=rho0*spacing²=2.025 kg, tối đa384 hạt. Cubic spline dùng hệ số 2D 10/(7πh²). Mỗi tick: neighbors → density → pressure → acceleration → chọn dt → integrate/collision; emitter sau tick.

Pressure p=max(0,c²*(rho−rho0)); wall dùng rho0/p_i/velocity0. Alpha là tiêu tán số, **không phải** độ nhớt thật của nước. Clamp pressure và boundary đơn giản không bảo đảm density sát rho0 ở mọi cảnh. Không có surface tension, moving wall, hydrostatic wall correction hoặc surface reconstruction. Hạt không có hard-sphere collision với nhau.

Ba lớp mẫu tĩnh nằm ngoài đáy/hai bên; trên cùng không có SPH wall. Collision ở y=0.8−spacing/2 là **trần an toàn** để demo không mất hạt, không phải bể mở cho nước tràn ra. Wall samples không tính vào mass nước.

Dt=min(0.001,0.25h/(c+vmax),0.25sqrt(h/amax)). Đây là bound thực hành cho mô hình này, không phải chứng minh ổn định tổng quát. Dt dưới1e−6 hoặc dữ liệu không hữu hạn làm demo dừng/báo lỗi. Mỗi frame nhận tối đa0.05s, chạy tối đa64 tick; thời gian bỏ qua được báo, không chạy bù vô hạn.

Timestep tests tách hai ca: velocity=0/c=20 làm acoustic bound nhỏ hơn maxDt; acceleration=1e6/c=12 làm force bound chi phối. Có ca dt dưới1e−6, NaN/Infinity và vector acceleration thiếu phần tử, nên trả maxDt cố định hoặc bỏ qua dữ liệu lỗi không thể vượt qua bộ kiểm này.

## Kiểm chứng

Kernel có tích phân theo diện tích gần1 và gradient khớp finite difference. Density được so tổng trực tiếp và ca self/wall. Cặp tự do kiểm force đối xứng/công suất viscosity. Grid so all-pairs ở cell âm/cutoff và quỹ đạo150 bước. Dam300 bước kiểm finite và báo compression, không chứng nhận độ chính xác vật lý. Emitter kiểm mass/overlap/capacity. Lịch30/60/120 FPS so cùng ca cặp không gravity/wall, không discarded time. CTest không dùng assert nên vẫn kiểm trong Release.

Tài liệu đối chiếu: [PySPH kernels](https://pysph.readthedocs.io/en/main/reference/kernels.html), [PySPH equations](https://pysph.readthedocs.io/en/main/reference/equations.html), [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake). Tiếp theo là Project51 — SPH3D/GPU: kernel thể tích, CSR3D, reduction và CPU oracle để kiểm shader.
