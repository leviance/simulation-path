# Project 23 — Cuộc đua integrator

Ba làn lò xo giải cùng một phương trình `x'' = -(k/m)x`. Mặc định là Explicit Euler, Velocity Verlet và RK4; khung trắng cho biết nghiệm chính xác tại cùng thời điểm. Bạn có thể đổi solver từng làn, dt và điều kiện đầu, xem vị trí/sai số/năng lượng rồi đo runtime bằng C++ thật.

Mục đích không phải chọn một thuật toán “tốt nhất”. Project giúp bạn giải thích tại sao Euler tăng năng lượng, Verlet giữ năng lượng bị chặn trong vùng ổn định, RK4 chính xác hơn trên một khoảng thời gian hữu hạn và vì sao số lần tính lực không thay thế được benchmark.

## Trước khi bắt đầu

Cần kiến thức C++ từ các project trước, đặc biệt Project 22: state, Explicit Euler, fixed timestep, accumulator và so với nghiệm giải tích. Project 07 cung cấp sin/cos, radian và tần số góc.

Source dùng C++20, CMake 3.24+ và khóa SDL **3.4.8**. CMake mặc định tải SDL bằng FetchContent, link qua `SDL3::SDL3`; lần configure đầu cần mạng. Không dùng physics engine, thư viện ODE, OpenGL hay GLM.

## Build và chạy trên Windows

Cài Visual Studio 2022 với Desktop development with C++. Mở terminal tại thư mục có CMakeLists.txt:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_23_final.exe
```

Để đo runtime, build **Release**:

```powershell
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_23_final.exe
```

Với Ninja trên Windows, chạy từ Developer Command Prompt; trên Linux/macOS dùng compiler C++20 và các dependency SDL theo hệ điều hành. Generator single-config đặt executable ngay trong build directory:

```bash
cmake -S . -B build-ninja -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON
cmake --build build-ninja --parallel 2
ctest --test-dir build-ninja --output-on-failure --timeout 30
./build-ninja/project_23_final
```

Target mặc định là final. Starter và các checkpoint chỉ có khi `BUILD_CHECKPOINTS=ON`.

## Cách học tám bài

1. Đọc khung vẽ ba làn, tự viết gia tốc, năng lượng và nghiệm chính xác; khung trắng bắt đầu chuyển động.
2. Viết Euler bằng state cũ; chỉ làn đỏ có solver, kiểm ví dụ một bước.
3. Viết Velocity Verlet theo a₀ → x₁ → a₁ → v₁; thêm làn xanh.
4. Viết RK4 với bốn đạo hàm có tên, không nhầm stage thử với bước thời gian thật.
5. Gom lockstep thành hàm thuần, đổi solver từng làn và reset toàn thí nghiệm khi đổi cấu hình.
6. Ghi history sau từng bước physics; vẽ vị trí, sai số trạng thái và relative energy drift.
7. Kiểm expected độc lập, bậc hội tụ và năng lượng dài hạn trước khi đo tốc độ.
8. Đo runtime có warmup/median/checksum, chạy từng batch có thể hủy; hoàn thiện chế độ sạch và kiểm chính code Starter.

Viết trong `starter/include/` và `starter/src/`, rồi build `project_23_starter`. Target `project_23_checkpoint_4` chạy bản tham khảo ở cuối bài 4; nó **không** nhận thay đổi bạn viết trong Starter.

Cuối bài 8, đổi `target_include_directories(project_23_tests PRIVATE final/include)` thành `target_include_directories(project_23_tests PRIVATE starter/include)` trong bản ZIP của bạn. Configure lại, build `project_23_starter` và `project_23_tests`, rồi chạy CTest ở Debug và Release. Nếu giữ final/include, bạn chỉ đang kiểm bản mẫu. Starter ở các bài đầu chưa có đủ hàm cho bộ tests cuối.

## Điều khiển SDL3

- Space: chạy/pause; nếu có job thì dừng job, không tự bắt đầu physics.
- N: pause rồi tiến một fixed step.
- Kéo đúng khối: đặt x₀, giữ chỗ nắm. Mũi tên trái/phải cũng đổi x₀.
- Mũi tên lên/xuống: đổi độ cứng k; U/O: đổi vận tốc đầu v₀; M: đổi mass.
- `[` / `]`: chọn dt từ 0.25, 0.1, 1/15, 1/30, 1/60, 1/120, 1/240 s.
- 1/2/3: đổi integrator của từng làn (từ bài 5). Màu đi theo làn; tên phương pháp hiện ngay trên làn.
- G: position → state error → energy graph (từ bài 6).
- Enter: yêu cầu tua thêm 20 giây mô phỏng; mỗi frame nhiều nhất 128 bước.
- B: đo benchmark riêng (bài 8); F: ẩn/hiện debug, vẫn giữ lò xo và đồ thị.
- F1/R: mặc định; F2: ví dụ một bước x₀=1, h=0.1; F3: stress k=16, h=0.25; Esc: thoát.

Đổi điều kiện đầu, parameters, dt hoặc solver luôn reset cả ba làn và hủy số đo cũ. Blur, resize, minimize và reset nhả capture, pause và hủy job. Cửa sổ dùng bảng logic 1100×820 với letterbox, hỗ trợ HiDPI; tọa độ chuột được đổi sang logical coordinates đúng một lần.

## Đọc số đo cho đúng

`phaseSpaceError = hypot(dx, dv/omega)` có đơn vị mét, **không phải sai số góc pha**. Nó không xác định khi omega=0. `(E-E0)/E0` là tỉ số có dấu, không phải phần trăm, và không xác định nếu E0=0.

History có t=0 và từng bước physics, cả bước cuối khi tua nhanh. Bộ đệm chỉ giữ 1.201 mẫu gần nhất. Renderer không ghi history. Các đường cùng dùng một thang dọc; đọc nhãn scale vì Euler có thể làm các đường còn lại bị thu nhỏ gần 0.

Không clamp state để che phân kỳ. Vật ra ngoài khung có chỉ báo; nếu |x| hoặc |v| vượt 10⁶, cuộc đua dừng và báo rõ. Giảm dt hoặc reset để làm thí nghiệm khác.

## Benchmark không khóa UI

Mỗi batch gồm 16 trajectory độc lập từ cùng initial state, N=floor(2/dt) bước mỗi trajectory. Ba trajectory warmup không được đo; lấy median 5 batch. Chỉ workload nằm trong khoảng `steady_clock`, không có SDL, render hay history. Một lần đọc đầu vào volatile mỗi trajectory chống hoist phép tính khỏi vòng lặp; reset, guard, checksum accumulation và loop overhead thuộc workload đo được. Checksum được giữ và dùng sau khoảng đo.

Mỗi frame đo một batch; job có deadline 5 giây, số bước/vòng lặp cũng có giới hạn riêng. Bảng hiển thị µs/step, sai số tại T=N×dt, steps/batch và force evaluations/batch. Không assert thứ hạng runtime phụ thuộc máy, không lấy error chia evaluations để xếp hạng.

Canvas đo **JavaScript** bằng performance.now, không phải C++. Không so hai con số đó như cùng một implementation. Một số đo gần độ phân giải clock không có nghĩa solver không tốn thời gian.

## Kiểm chứng

CTest chạy không cần window: nghiệm ở một phần tư chu kỳ, ví dụ một bước, invalid/overflow, lockstep nguyên khối, frame partitions, history theo physics, runtime solver reset, bậc hội tụ 1/2/4, recurrence năng lượng Euler, render CPU và workload benchmark lặp lại được.

`project_23_final --smoke` mở window ẩn, chạy hữu hạn 40 frame, thử render/resize/benchmark rồi thoát. Nó không thay thế kiểm GUI bằng mắt. Khi tự kiểm: thử kéo/thả ngoài, đổi solver/dt khi chạy, pause/step, ba loại đồ thị, benchmark/hủy và F để xem chế độ sạch.

Trong repository khóa học, chỉ sửa source-template, lesson, metadata, tests và README. Starter/checkpoints/final, CMake và ZIP được sinh, không đưa vào Git.
