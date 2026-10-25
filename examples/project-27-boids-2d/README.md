# Project 27 — Đàn Boids 2D

Tự xây một mô phỏng trong đó từng cá thể chỉ quan sát hàng xóm gần nó. Ba quy tắc separation, alignment và cohesion tạo ra chuyển động của toàn đàn. Đây là bản CPU brute force để kiểm chứng trước khi học Spatial Grid ở Project 28.

## Bạn sẽ làm gì?

Starter đã có window/event loop, framebuffer, input và clock từ những project trước. Nó chứa một Boid nhưng chưa vẽ hay cập nhật vị trí: hai hàm của Bài 01 còn là stub. Bạn lần lượt thêm hình có hướng, chuyển động, đàn theo seed, neighbor query và từng quy tắc steering. Không có thuật toán flocking được giấu sẵn trong Starter.

| Mốc | Phần mới |
| --- | --- |
| 01 | Vẽ một tam giác theo velocity, cập nhật position theo giây |
| 02 | Seed, ID, 256/512/1.024 cá thể, hai snapshot đọc/ghi |
| 03 | Brute-force neighbors và khoảng cách qua biên |
| 04 | Separation, desired velocity, giới hạn steering và ca trùng vị trí |
| 05 | Alignment |
| 06 | Cohesion trong miền tuần hoàn |
| 07 | Trọng số, giới hạn tốc độ/gia tốc và fixed timestep |
| 08 | Controls, chọn/drag, vector debug và benchmark có thể hủy |
| 09 | Fixture, oracle độc lập, kiểm dt và nghiệm thu toàn ứng dụng |

## Build và chạy

Cần compiler C++20, CMake ≥3.24 và mạng ở lần configure đầu. CMake tải SDL **3.4.8** bằng URL/SHA-256, link qua `SDL3::SDL3`. Không cần Node.js khi dùng ZIP.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_27_starter
```

Trên Windows/Visual Studio:

```powershell
.\build\Debug\project_27_starter.exe
```

Trên Linux/macOS hoặc generator single-config:

```bash
./build/project_27_starter
```

Bạn sửa `starter/include` và `starter/src` trong ZIP, rồi tiếp tục build target starter. Bản tham khảo sau Bài 04 là `project_27_checkpoint_4`; final là `project_27_final`. Nếu làm trong repository website, sửa nguồn authored ở `source-template`, không sửa snapshot được sinh.

```bash
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Với Ninja/Makefiles, chọn `-DCMAKE_BUILD_TYPE=Debug` hoặc `Release` khi configure. Build mặc định không bật starter/checkpoint trừ khi đã đặt `BUILD_CHECKPOINTS=ON`.

## Điều khiển bản final

- Space: chạy/pause; N: pause rồi tiến đúng một bước 1/60 s.
- R: pause và tạo lại cùng seed/cấu hình; P: seed kế tiếp rồi pause.
- 1/2/3: 256/512/1.024 cá thể.
- Click: chọn cá thể; khi pause, kéo nó trong viewport. ←/→ chọn bằng bàn phím.
- Q/A: tăng/giảm separation; W/S: alignment; E/D: cohesion.
- T/G: bán kính; Y/H: speed cap; U/J: acceleration cap.
- F: chế độ sạch/debug. Vector đỏ là separation, xanh dương alignment, xanh lá cohesion, vàng gia tốc tổng.
- B: đo ba N; Escape hủy job đang chạy, nếu không có job thì thoát.
- Mất focus hoặc resize: pause, hủy job và nhả mouse capture. Pause không khóa thao tác quan sát.

Mặc định 256 cá thể ở trạng thái pause để quan sát; Space bắt đầu chạy. Chọn 3 rồi Space để chạy preset nghiệm thu 1.024; mọi cá thể đều được cập nhật và vẽ. Nhiều cá thể có thể trùng pixel nhưng không bị lấy mẫu bỏ bớt. SDL chỉ trình bày ảnh CPU và nhãn; không có GPU compute hay SDL primitive thay thuật toán.

## Mô hình và công thức

World là `[0,960) × [0,600)`, +X sang phải, +Y xuống dưới; đơn vị world/giây. Miền tuần hoàn không có tường. Query nhận `distance² <= radius²`, bỏ self theo ID. Radius nhỏ hơn nửa cạnh ngắn nhất; controls giới hạn trong [0,240].

Separation cộng `-offset/distance²`: cá thể gần có ảnh hưởng lớn hơn. Trùng vị trí dùng hướng đối nhau xác định từ cặp ID, không gọi random mỗi bước. Alignment lấy hướng của tổng velocity; cohesion lấy hướng của tổng displacement qua biên. Chuẩn hóa hướng làm tổng và trung bình cho cùng hướng nếu số hàng xóm khác 0.

Mỗi quy tắc đổi hướng thành `desiredVelocity` có độ lớn `maxSpeed`. Gia tốc đề xuất là `(desiredVelocity - velocity) / responseTime`, với responseTime = 1 giây, rồi giới hạn `maxAcceleration`. Tổng ba quy tắc có trọng số được giới hạn lần nữa. Khi không có hướng hợp lệ, quy tắc trả vector 0; không tự phanh cá thể chỉ vì không có hàng xóm.

```text
velocityNew = limit(velocity + acceleration * dt, maxSpeed)
positionNew = wrap(position + velocityNew * dt)
```

Đây là semi-implicit Euler. Clock dùng dt = 1/60 s, tối đa ba bước mỗi frame. Thời gian thực bỏ khi quá tải được ghi ở `droppedSeconds`; đồng hồ `time` chỉ đếm thời gian mô phỏng đã thực hiện. Không hứa FPS cố định trên mọi máy.

Mô hình dùng vùng nhìn tròn 360°, một loại cá thể và quy tắc steering; không có collision solver, chướng ngại hay bảo toàn năng lượng. Nó là biến thể học tập dựa trên [Boids của Craig Reynolds](https://www.red3d.com/cwr/boids/), không phải mô hình sinh học đã hiệu chỉnh.

## Kiểm chứng và benchmark

Tests chạy không cần SDL window, không dùng `assert` bị tắt ở Release. Chúng kiểm fixture tính tay, inclusive radius, self, overlap, seed, chín ảnh tuần hoàn độc lập, đổi thứ tự lưu theo ID, giới hạn vận tốc, dt và convergence của ca gia tốc có nghiệm.

- So vector/state một bước: absolute tolerance 1e-9 world units (ca nhiều bước ballistic: 1e-8).
- Zero direction: norm ≤1e-9; đây là chính sách suy biến của mô hình, không dùng để nới neighbor radius.
- Không yêu cầu quỹ đạo dài giống bit giữa compiler/JavaScript vì thứ tự cộng và sin/cos có thể sai khác.

Benchmark dùng cùng prefix của dataset 1.024 cá thể và cùng params. Mỗi N có 2 warm-up + 7 samples từ cùng snapshot, không cho simulation trôi giữa các samples. Job kết thúc sau 27 tick; mỗi tick chỉ làm một full step, nên UI có thể hủy trước tick kế tiếp.

`comparisons` phải bằng 65.280 / 261.632 / 1.047.552 mỗi bước. Query, steering/update và toàn kernel bước được đo riêng; total gồm validation và chuẩn bị bộ đệm bên trong `stepBoids`, không gồm tạo dataset, chuẩn bị bản sao benchmark, render, chờ frame hoặc checksum. Báo median/min/max; không ép runtime tăng đúng bốn lần. Checksum là tổng lũy kế của output đã lượng tử hóa, không phải phép chứng minh equality.

Có thể đo bản Release không mở window:

```powershell
.\build\Release\project_27_final.exe --benchmark
```

Ghi CPU, OS, compiler/flags, cấu hình build và bảng kết quả khi so. `--smoke` chỉ chạy sáu frame ẩn có cập nhật, không thay checklist desktop.

## Checklist desktop

1. Chọn 1/2/3, đổi seed và reset: ID/state tái lập, không chỉ count giống nhau.
2. Chạy 1.024 cá thể; thay từng trọng số và quan sát tác động. Kiểm cả trọng số 0.
3. Pause, chọn bằng chuột/←/→, kéo sát hai mép và xem đúng hàng xóm/vector qua biên.
4. Resize, đổi DPI hoặc chuyển focus khi đang kéo: capture được nhả, state vẫn hợp lệ.
5. Chạy B tới đủ ba dòng; hủy giữa chừng bằng Escape, đổi tham số rồi đo lại.
6. Kiểm source/CTest Debug và Release; ghi riêng kết quả desktop, không suy ra tương tác đúng chỉ từ CTest.

Project 28 sẽ giữ nguyên mô hình và thay neighbor loop bằng Spatial Grid. Chưa cần học N-body, GPU hay thread pool để hoàn thành project này.
