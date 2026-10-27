# Project 31 — Thiên hà hạt 3D: từ direct N-body đến Barnes–Hut

Xây một mô phỏng hấp dẫn có state và lực thật, không phát lại quỹ đạo đặt sẵn. Bản final mặc định có **4.096 body được cập nhật đầy đủ** bằng Barnes–Hut/Octree. Direct summation là reference độc lập về traversal, giữ cùng force model và integrator.

## Bạn sẽ học được gì?

Đi từ cửa sổ đang vẽ đĩa sao tới một bước gravity có thể kiểm bằng tay; sau đó thêm mass/center of mass cho cây, opening criterion và phép kiểm self-force. Cuối cùng đo sai số tại cùng snapshot, runtime trên cùng workload và energy/momentum theo thời gian. Mười bài có sản phẩm trung gian chạy độc lập; không phải mười helper phải tự đoán cách ghép.

Prerequisites: state/integrator/fixed timestep ở Project 23; baseline và work counters ở Project 28; Octree/camera/jobs ở Project 30. Bài 01 cung cấp renderer CPU và SDL scaffold để tập trung vào phần mới; mọi source của scaffold vẫn có trong gói.

## Mô hình và đơn vị

- XYZ 3D; đĩa gần mặt phẳng XY, có chiều dày Z. Không gọi đây là thế giới thiên văn có đơn vị SI.
- Reduced units: G=0.001; central mass=120; mass đĩa xấp xỉ 120, không tăng tuyến tính với số mẫu N. Các sao có mass dương khác nhau.
- a = G m_source (source-target) / (r²+epsilon²)^(3/2); default epsilon=0.02 length unit.
- Potential dùng cùng Plummer softening: U=-Σ(i<j) G mi mj / sqrt(r²+epsilon²).
- Symplectic Euler: cập nhật velocity trước position. Chọn dt=1/60, 1/120 hoặc 1/240 time unit; default 1/240. Đây là integrator bậc một, không bảo toàn energy chính xác.
- Cùng bulk velocity được trừ khỏi mọi body ở preset đĩa, không đá riêng central body để bù momentum. Velocity đầu chỉ là điều kiện đầu, không bị áp đặt lại khi chạy.
- Dữ liệu/preset là mô hình học thuật, không phải nghiệm cân bằng thiên hà đã hiệu chỉnh hoặc mô phỏng dữ liệu quan trắc.
- Preset đĩa gieo một lõi ellipsoid lớn (khoảng 1/3 số sao), halo thể tích thưa và hai nhánh xoắn có độ dày ngay trong điều kiện đầu. Không ép toàn bộ sao vào một mặt phẳng; các nhánh không bị cưỡng ép giữ hình khi chạy. Preset hai thiên hà có hai central mass 60, hai hệ sao mass xấp xỉ 60 và hai mặt phẳng nghiêng khác nhau.

## Build và chạy

Cần compiler C++20, CMake >=3.24; Windows dùng Visual Studio 2022 Desktop development with C++. Không cần Node.js để dùng gói C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 25
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 25
./build/Release/project_31_final.exe
```

Với Ninja/macOS/Linux, có thể thêm -DCMAKE_BUILD_TYPE=Release khi configure và chạy ./build/project_31_final. Mặc định CMake dùng FetchContent tải **SDL 3.4.8** có SHA-256 và link SDL3::SDL3. Lần đầu cần mạng. Option COURSE_USE_INSTALLED_SDL3 chỉ dành cho môi trường đã có đúng SDL 3.4.8, không bắt người học cài SDL riêng.

Final là target mặc định. BUILD_CHECKPOINTS=ON mở starter và project_31_checkpoint_1..10. CTest mặc định dùng final/include; muốn thử lời giải của bạn, đổi target include sang starter/include sau khi đã cài đủ API cần thiết. Tests của bản final không tự chứng minh một bài làm đang dở đã đúng.

## Cấu trúc

- source-template/include/lab.hpp: Body, preset, pair/direct gravity và integrator.
- tree.hpp: Octree, aggregate, traversal và inspector; chỉ phụ thuộc lab.hpp.
- analysis.hpp: phép đo offline/fixture; simulation.hpp: state và physics theo target.
- experiments.hpp, benchmark.hpp: snapshot jobs, full energy, theta/runtime/dt studies.
- star-render.hpp: tích lũy ánh sáng và tone mapping CPU từ các body thật; render.hpp: phép chiếu và debug primitives; presentation.hpp, application.hpp: scene, HUD và event loop.
- src/main.cpp: SDL resource setup, run và cleanup.
- starter/, checkpoints/01..10/, final/: snapshot độc lập được sinh từ nguồn chuẩn.
- tests/tests.cpp và tests/extended.hpp: fixture không mở window.

Không sửa trực tiếp snapshots nếu đóng góp vào repository giáo trình; sửa source-template rồi sinh lại. Người học có thể viết trong starter hoặc bản sao riêng.

## Điều khiển final

- Kéo trái: orbit; click gần body: chọn target. Kéo phải: pan. Wheel hoặc W/S (Z/Q cũng được): tiến/lùi camera, có thể đi xuyên qua tâm; Home: camera ban đầu.
- Mũi tên: orbit. Dấu phẩy/chấm: target trước/sau. Camera không làm đổi physics snapshot.
- Space: chạy/dừng physics; khi có phép đo thì pause/resume phép đo. N: đúng một fixed step.
- R: reset preset đang chọn, cùng seed, giữ cấu hình theta/epsilon/dt. 1: đĩa 4.096; 2: hai cụm tiến gần; 3: hai vật quay tròn; 4: reference 256; 5: reference ba vật.
- M: Direct/BH ở N<=256. Hệ lớn vẫn có direct reference trên sampled targets, không bị giảm N âm thầm.
- [ / ]: theta; - / =: epsilon; D: đổi dt; F: debug.
- V: inspector; T: theta sweep; B: runtime study; E: full-system energy sample; I: dt study.
- Escape: rollback gesture đang kéo; nếu không kéo thì hủy phép đo đang chạy, hoặc thoát khi không có phép đo.

Các checkpoint sớm chưa mở mọi lệnh final. Bài 01 chỉ state/render; 02 pair force; 03 direct; 04 physics; 05 aggregate; 06 BH; 07 inspector; 08 sweep; 09 runtime; 10 energy/dt studies.

## Đọc hình và số liệu

Vàng gần lõi → xanh ở ngoài biểu thị khoảng cách tới central body gần nhất trong khoảng 0..0.75 length unit, không biểu thị tuổi/nhiệt độ sao. Kích thước đốm sáng phụ thuộc log(1+mass) và độ sâu camera; tốc độ chỉ điều chỉnh độ sáng có giới hạn. Mỗi body thật góp một điểm sáng nhỏ và một splat mờ hữu hạn; phần chồng sáng cho thấy mật độ của lõi/nhánh, được tone-map để giữ chi tiết. Đây không phải khí/bụi mô phỏng bằng solver khác. Không có ảnh thiên hà, lớp sao nền giả hoặc animation độc lập với gravity. Vòng vàng đánh dấu target, không đổi màu của ngôi sao.

Body trong viewport được vẽ đầy đủ, không lấy mẫu để giả vờ nhanh. Trails chỉ theo dõi 24 ID trải đều toàn hệ × 64 snapshots; đây là giảm lớp minh họa, không giảm N physics. Camera, halo và tone mapping không thay đổi mass, lực, energy hay checksum. Khi Pause, toàn bộ hình giữ nguyên cho tới khi bạn đổi camera hoặc điều khiển.

Debug xanh là node **opened**, vàng là node **accepted** trong chính traversal của target; chỉ vẽ tối đa 512 hộp mỗi loại. Node chứa target luôn phải mở. Leaf bỏ self theo index, không bỏ mọi source có cùng position.

Direct và BH dùng cùng dt/integrator/epsilon khi so. Để so quỹ đạo, Reset cùng preset trước mỗi run; để đo force approximation, dùng sweep trên cùng snapshot chứ không so hai state đã trôi khác nhau.

Absolute RMS = sqrt(Σ|aBH-aD|²/K), có đơn vị gia tốc.
Normalized RMS = sqrt(Σ|aBH-aD|²/max(Σ|aD|²,K*1e-24)).
Mean/max relative dùng |aBH-aD|/max(|aD|,1e-12) cho từng target. Lực reference gần 0 có thể tạo relative error lớn; không giấu absolute error. Không yêu cầu error/runtime đơn điệu ở mọi theta.

## Công việc hữu hạn và phép đo

Một physics step tính acceleration của mọi target trên snapshot bất biến rồi commit cả hệ. Mỗi lượt làm việc khoảng 6 ms; không bù lag vô hạn. Simulated time có thể chậm hơn thời gian thực, không có cam kết FPS.

Sweep: bốn theta 0.25/0.5/0.8/1.1, tối đa 32 target; direct đọc đủ N-1 sources. Camera vẫn hoạt động. Đổi dữ liệu/cấu hình hủy report cũ.

Runtime C++: full force pass ở N=256/1024/4096; cùng seed, theta, epsilon; 1 warm-up + 5 mẫu, median/min/max, build riêng và checksum observable. Thời gian đợi UI và render không nằm trong kernel. Deadline 30 giây; quá hạn phải ghi chưa hoàn tất. Canvas dùng N=256/512/1024 và đồng hồ JavaScript, không đại diện C++.

```bash
./build/Release/project_31_final.exe --benchmark
```

Energy job đọc **toàn N và mọi cặp i<j**, không dùng prefix 512. C++ lưu theo từng 32 physics steps hoặc phím E; Canvas chủ động pause rồi lấy mẫu E để so nhiều thời điểm. History tối đa 64 mẫu, mỗi mẫu mang N/t. Phím N và thao tác hủy chỉ bỏ công việc chưa xong, giữ các mẫu đã hoàn tất; reset hoặc đổi cấu hình thí nghiệm mới xóa lịch sử. Thay epsilon đổi potential nên không đọc ΔE qua hai model khác nhau như một lỗi bảo toàn.

HUD C++ ghi thêm ΔE/max(|Eref|, 1e-12 energy unit) và |P−Pref| so với mẫu đầu đang được giữ. `ref t` cho biết thời điểm của mẫu đối chiếu; khi lịch sử bỏ mẫu cũ để giữ giới hạn 64, mốc này cũng dịch theo. Đây là phép đo drift, không phải lời hứa Barnes–Hut bảo toàn energy hoặc momentum chính xác.

I giữ theta=0.5, epsilon=0.02 và T=1 cho hệ hai vật quay tròn; chạy dt=1/60,1/120,1/240 và so nghiệm tròn mềm độc lập. Không dùng quỹ đạo hỗn loạn dài hạn làm oracle. BH không bảo đảm momentum/energy chính xác như một phép tính pair-symmetric; đọc cả force error lẫn integration error.

## Kiểm chứng

Các fixture gồm N=1/2/3/256, mass khác nhau, điểm trùng, lỗi leaf mass, accepted node chứa target và theta gần 0. Có kiểm commit đủ 4.096 body, full energy, RMS/sweep và dt convergence. Tolerance ghi ở tests, không tắt bằng NDEBUG.

```bash
./build/Debug/project_31_final.exe --smoke
./build/Release/project_31_final.exe --smoke-workflow
```

Smoke hữu hạn không thay desktop QA về chuột/bàn phím/HiDPI. Build/CTest, smoke, Canvas desktop và native desktop phải được ghi riêng trong báo cáo nghiệm thu. Benchmark chính dùng Release và ghi cấu hình máy; không assert solver nào luôn nhanh hơn.

Giới hạn: CPU-only, N tối đa 8.192; depth mặc định 16, tối đa 20; node budget 262.145. Không có collisions, stellar evolution, GPU hay lực tương đối tính. Dùng một mô hình đơn giản có thể kiểm chứng để học đánh đổi độ chính xác/chi phí.

## Đọc thêm

[Barnes–Hut assignment, Princeton](https://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html) giải thích việc gộp nguồn xa.
[Barnes: Gravitational softening as a smoothing operation](https://arxiv.org/abs/1205.2729) bàn ý nghĩa mô hình của softening.
[SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake) là hướng dẫn tích hợp SDL chính thức.
