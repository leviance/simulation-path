# Project 42 — CPU Molecular Dynamics Lab

Project này mở rộng hai nguyên tử của Project 41 thành một hộp khí 2D gồm tối đa 1.000 hạt Lennard–Jones. Vòng lặp CPU `i < j` xét 499.500 cặp trong một lần tính lực. Mỗi bước Verlet hiện tính lực hai lần, tổng cộng 999.000 lượt xét; số đo tái sử dụng kết quả lần thứ hai. Project 43 sẽ thêm periodic boundary, còn Project 44 giảm số cặp cần xét bằng neighbor list.

## Bạn sẽ học gì?

- Chọn kích thước hộp từ number density và xếp hạt trên lattice có jitter deterministic.
- Gán vận tốc, bỏ chuyển động của center of mass và rescale để đạt nhiệt độ mục tiêu.
- Làm thế năng và lực Lennard–Jones cùng về zero tại cutoff bằng force shifting.
- Cộng lực cho nhiều hạt mà không tính self-pair hoặc cộng một cặp hai lần.
- Ghép force array vào Velocity Verlet dạng kick–drift–kick.
- Mirror phần overshoot và đảo vận tốc pháp tuyến khi hạt chạm tường.
- Đọc nhiệt độ, động lượng, K/U/E, energy drift và chi phí O(N²).

## Cấu trúc gói source

- `starter/`: cửa sổ SDL3, framebuffer và một hộp hạt tĩnh để bắt đầu.
- `checkpoints/01` … `checkpoints/08`: mã nguồn sau từng bài học.
- `final/`: CPU Molecular Dynamics Lab hoàn chỉnh, có comment và đầy đủ điều khiển.
- `tests/tests.cpp`: CTest thuần CPU, không mở cửa sổ và không chạy vô hạn.
- `source-template/`: nguồn chuẩn dùng để sinh starter, checkpoint và final.
- `include/molecular_dynamics.hpp`: mô hình, công thức, integrator và validation độc lập renderer.
- `include/molecular_dynamics_ui.hpp`: world-to-screen, đồ thị và phần trình bày chẩn đoán.
- `include/molecular_dynamics_diagnostics.hpp`: bảng số liệu SDL dùng chữ ASCII của `SDL_RenderDebugText`, xuất hiện từ checkpoint 6.

## Build bản hoàn chỉnh

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Muốn build cả starter lẫn từng checkpoint:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
```

Nếu CI đã cung cấp đúng SDL `3.4.8`:

```bash
cmake -S . -B build -DCOURSE_USE_INSTALLED_SDL3=ON
```

## Điều khiển trong bản hoàn chỉnh

- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một physics step khi đang tạm dừng.
- `1`, `2`, `3`, `4`: đổi giữa 64, 144, 256 và 1.000 hạt.
- `T`: đổi nhiệt độ ban đầu; hệ được tạo lại để phép so sánh rõ ràng.
- `D`: đổi mật độ ban đầu; tạo lại hộp và hạt.
- `S`: đổi seed khởi tạo.
- `[` / `]`: giảm hoặc tăng fixed dt rồi chạy lại cùng cấu hình.
- `B`: bật/tắt biểu đồ so sánh số cặp theo N.
- `V`: chạy chín phép kiểm mô hình trên cấu hình chuẩn, in sai số lớn nhất và số lần chạm tường ra terminal. Đây không phải chứng nhận độ chính xác của cấu hình đang chọn.
- `R`: đưa toàn bộ cấu hình về mặc định.
- Click một hạt: chọn hạt để đọc vị trí, vận tốc và tốc độ trên bảng số liệu.
- `Esc`: thoát.

## Đọc kết quả đúng cách

`evaluatedPairs` luôn bằng `N(N-1)/2`, còn `activePairs` chỉ đếm các cặp nằm trong cutoff. Cutoff làm giảm số cặp thực sự đóng góp lực nhưng chưa làm vòng lặp nhanh hơn, vì Project 42 vẫn phải đo khoảng cách của mọi cặp.

Màu hạt chỉ biểu diễn tốc độ tương đối. Mỗi lần đo, dùng vận tốc tâm khối lượng `vCOM=P/Σm` để tính `K_thermal=Σm|v-vCOM|²/2` rồi `T=2K_thermal/(2N-2)`. Không sửa vận tốc thật để loại chuyển động khối sau va chạm tường. Năng lượng `E=K+U` vẫn dùng động năng toàn phần. Đây là reduced units, không phải kelvin.

Bảng số liệu hiện thời gian bước (tích phân + số đo, không gồm vẽ), số bước đã chạy, thời gian bị bỏ, sai số năng lượng lớn nhất đã gặp và trạng thái hạt được chọn. Đồng hồ tích lũy nhận 0,05 đơn vị mô phỏng mỗi giây thực; preset 1.000 giới hạn một bước mỗi frame. Vì vậy thời gian hiển thị không đồng nhất với đồng hồ thực. Nếu bước lỗi, chương trình tạm dừng, giữ trạng thái trước bước và báo lỗi.

Phép kiểm chuẩn chạy 36 hạt trong 400 bước `dt=0.001`, cộng một ca hai hạt cố ý va tường trong 200 bước `dt=0.0005`. Cả hai kiểm tra sai số lớn nhất trên toàn quỹ đạo, không chỉ điểm cuối. Muốn đánh giá cấu hình khác, so `dt`, `dt/2` trên cùng trạng thái đầu và cùng thời lượng; không suy ra kết quả chỉ từ chữ PASS của bộ chuẩn.
