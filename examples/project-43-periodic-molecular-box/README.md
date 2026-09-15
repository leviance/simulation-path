# Project 43 — Hộp phân tử tuần hoàn

Từ hộp có tường của Project 42, ta chuyển sang một ô mô phỏng được lặp lại trên mặt phẳng. Hạt đi ra một phía xuất hiện ở phía đối diện, giữ nguyên vận tốc; hai hạt ở hai mép vẫn tương tác qua khoảng cách gần nhất. Source dùng C++20 và SDL 3.4.8, không cần dữ liệu hay shader bên ngoài.

## Thử tự xây trước

Tạo hộp 12×12 với A=(0.6,6), B=(11.4,6). Vẽ hộp và hai hạt tĩnh trước khi viết điều kiện biên. Sau đó cho hạt đi qua biên, đo khoảng cách tuần hoàn 1.2 thay vì khoảng cách thường 10.8, dùng vector ấy tính lực Lennard–Jones và chạy Velocity Verlet. Bản sao xám chỉ để vẽ; unwrapped lưu hành trình thật qua nhiều vòng. Cuối cùng thử hệ 64, 144 và 1.000 hạt, đo năng lượng/động lượng và từ chối bước không hợp lệ.

## Tám bước học

1. Vẽ hộp và hai marker bằng SDL_RenderFillRect. Chưa có chuyển động.
2. Cộng velocity*dt rồi wrap; không bật lại như va tường.
3. Minimum image trên từng trục; vẽ và so hai cách đo khoảng cách.
4. Force-shifted cutoff, lực qua biên và điều kiện rc < min(Lx,Ly)/2.
5. Ghép Verlet, tạo lattice nhiều hạt và giới hạn công việc mỗi frame.
6. Vẽ các ảnh tuần hoàn mà không tăng số hạt vật lý.
7. Cộng displacement vào unwrapped và vẽ lịch sử tối đa 240 mẫu.
8. Kiểm tra hình học, lực, bảo toàn và bước bị từ chối.

`starter/` chỉ có cửa sổ cùng khung hộp. `checkpoints/01` đến `checkpoints/08` là các bản chạy độc lập; `final/` là toàn bộ chương trình. File trong `source-template/` là nguồn sinh các snapshot, không build trực tiếp vì còn chỉ thị chia bài.

## Build và chạy

Windows với Visual Studio 2022 (Desktop development with C++):

```bash
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
.\build\Debug\project_43_final.exe
```

Final là target mặc định. Muốn bật starter và các checkpoint:

Trên Windows, CMake tự chép SDL3.dll của đúng cấu hình cạnh executable sau khi build. Không cần chép DLL vào thư mục hệ thống hay chỉnh PATH. Lệnh chạy final ở trên trỏ tới đúng executable, không phải target tests.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_43_starter project_43_checkpoint_3 --parallel 2
```

Kiểm tra cả Release:

```bash
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Linux/macOS dùng `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release`, build như trên rồi chạy `./build/project_43_final`. Cài compiler và dependency hệ thống của SDL theo Getting Started. CMake >=3.24 tải SDL qua FetchContent với version/checksum đã khóa; lần configure đầu cần mạng. CI có thể dùng `-DCOURSE_USE_INSTALLED_SDL3=ON -DSDL3_DIR=<package-directory>` nếu đã có đúng SDL 3.4.8.

## Điều khiển bản final

- Space: chạy/dừng; N: một bước; R: về cặp ban đầu và dt=0.001; Esc: thoát.
- 1: cặp ở hai mép; 2/3/4: 64/144/1.000 hạt; B: một hạt tự do.
- D: đổi dt qua 0.001, 0.002, 0.004, 0.008 và dừng để quan sát. Muốn so timestep, chọn lại cùng preset trước mỗi lần đo.
- G: bật/tắt ảnh tuần hoàn (không đổi state vật lý).
- Kéo A: đặt vị trí mới, vận tốc A về zero và tạo lại mốc unwrapped/trace.
- V: kiểm chứng một hệ riêng 36 hạt, 400 bước dt=0.001; đọc kết quả ở terminal.

Tiêu đề cửa sổ hiện N, t, số cặp, trạng thái hợp lệ, E, |P|, dt và thời gian bị bỏ qua. Trace phía dưới: xanh là wrapped x, vàng là unwrapped x. Source dùng marker vuông để chỉ vị trí, không coi cạnh marker là kích thước phân tử.

## Cấu trúc code

- `include/periodic.hpp`: vector, hình học tuần hoàn và Particle.
- `include/dynamics.hpp`: tạo hệ, all-pairs, lực, Verlet và phép đo.
- `include/view.hpp`: đổi world/screen, vẽ hộp/ảnh/trace bằng SDL renderer.
- `src/main.cpp`: SDL lifecycle, event, preset và accumulator.
- `tests/tests.cpp`: test thuần CPU, dùng header trong final; không cần window.

## Phạm vi và kiểm chứng

Đây là mô hình 2D trong reduced units, không phải mô phỏng định lượng một chất cụ thể. Giữ force-shifted Lennard–Jones và Velocity Verlet của Project 42 nhưng thay reflective boundary bằng periodic boundary. Renderer dùng trực tiếp SDL, không cần framebuffer trung gian vì bài này tập trung điều kiện biên.

Solver vẫn quét i<j, không có neighbor list. Một evaluate với 1.000 hạt xét 499.500 cặp; mỗi bước Verlet tính lực hai lần và phần số đo còn evaluate thêm lúc vẽ. Không nhầm số cặp trong một evaluate với tổng công việc của frame. Playback nhận 0.1 đơn vị mô phỏng/giây thực, tối đa 8 bước/frame hoặc 1 bước ở 1.000 hạt. Thời gian không theo kịp được đếm, không bù bằng cách tăng dt.

CTest kiểm tra số âm, đúng mép trên, nhiều vòng, hộp chữ nhật, minimum image bằng oracle chín ảnh, đạo hàm lực theo vị trí, tịnh tiến toàn hệ, cutoff, overlap qua biên, unwrapped, rollback và một cặp tương tác thực sự qua mép. Test không dùng assert nên vẫn chạy trong Release. Phép kiểm chuẩn 36×400 chỉ đánh giá cấu hình chuẩn; cần kiểm tra lại khi đổi dt hoặc điều kiện đầu.

Project 44 sẽ dùng neighbor list với skin để giảm công việc. Giữ bản all-pairs này làm đáp án đối chiếu khi tối ưu.
