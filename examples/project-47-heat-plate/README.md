# Project 47 — Tấm kim loại nóng

Tô một vùng nóng, thả cho nhiệt lan rồi giữ nóng một điểm để xem nguồn thay đổi cả tấm thế nào. Đây là solver heat equation 2D tự viết bằng C++20/SDL 3.4.8, không phải blur ảnh hoặc animation có sẵn.

Final dùng **192×192 = 36.864 ô thật**, slider D/dt, hai kiểu biên, heater, sáu cảnh mẫu, probe/đồ thị và view sạch. 32×32 chỉ dùng để học ở checkpoint 1–6; mốc nghiệm thu tối thiểu của đặc tả là 128×128. Không cần OpenGL/GPU compute hoặc source từ Project 46.

## Bắt đầu học

Bạn cần biết window/renderer/event loop, vòng lặp, hàm và `std::vector`. Sai phân, double buffer và điều kiện ổn định được xây từ những ví dụ ô lưới. Hãy chạy starter trước, tự dự đoán một phép cập nhật rồi mới mở checkpoint để đối chiếu.

| Mốc | Thay đổi chính |
| --- | --- |
| Starter | Khung SDL/RAII, Field bằng 0, logical presentation 1200×860, panel và vòng event; chưa tạo vùng nóng/vẽ nhiệt |
| 01 | Lưu theta, tạo Gaussian 32² và vẽ từng ô SDL_FRect |
| 02 | Tọa độ chuột, brush/stroke, keyboard và reset/clear |
| 03 | Sai phân ngang, current/next, nút N; các hàng độc lập |
| 04 | Thêm chiều y: stencil năm điểm |
| 05 | Cách nhiệt/vành lạnh, heater/unpin và source ledger |
| 06 | Slider D/dt, điều kiện ổn định, thí nghiệm phân kỳ, clock có budget |
| 07 | Streaming texture, 192² thật, N=128/192/256 và view sạch |
| 08 | Sáu preset, probe và history theo thời gian mô hình |
| 09 / final | Reference, refinement, fixture hữu hạn, benchmark và tests |

Thời lượng 14–19 giờ là tổng đọc/tự viết/thử, không gồm cài compiler hoặc lỗi setup; không dùng thời lượng để đánh giá người học nhanh/chậm. Website có đề bài tự thử trước lời giải và toàn bộ source sau từng bài.

## Build/run

Yêu cầu CMake ≥3.24, compiler C++20; Windows dùng Visual Studio 2022/x64. CMake tải đúng SDL 3.4.8 bằng FetchContent với URL/SHA-256 cố định, link `SDL3::SDL3`. ZIP đã có CMake và snapshots, không cần Node.js.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_47_final.exe
```

Mặc định build final/tests; `BUILD_CHECKPOINTS=ON` thêm `project_47_starter` và `project_47_checkpoint_1` … `_9`. Muốn học từ bộ khung, sửa `starter/`, build/chạy đúng target starter; muốn xem đáp án bài 4, dùng checkpoint 4. Đóng executable trước khi rebuild trên Windows.

Với generator một cấu hình (Ninja/Make), thêm `-DCMAKE_BUILD_TYPE=Release` lúc configure; executable nằm ngay `build/`, không có thư mục `Release`. Hướng dẫn CMake đa nền tảng không phải lời khẳng định đã kiểm mọi hệ điều hành.

## Điều khiển final

- Chuột trái đặt nhiệt độ chọn bằng 1/2 (nóng=1/lạnh=0), chuột phải đặt 0; `[`/`]` đổi radius 0–24 ô. Mũi tên chọn ô, Shift+mũi tên đi 16 ô, Enter tô.
- H đổi bút thường/heater; E bỏ heater mà không xóa nhiệt đã có. 1/2 trong mode heater tạo thermostat nóng/lạnh. Bút thường đi qua sẽ bỏ pin ở ô đó.
- Space chạy/dừng, N pause rồi tiến một bước. Pause vẫn cho sửa/soi field. R tạo lại đúng preset/settings, time/tick về 0; C xóa field nhưng không đổi preset cho R.
- D/dt có slider native thật. A/Shift+A tăng/giảm D; T/Shift+T đổi dt mẫu. Đổi tham số pause và xóa nợ thời gian, không sửa CFL hộ người dùng.
- B cách nhiệt/vành lạnh. P đổi Gaussian → uniform → checker → cosine → hai heater → trống. G đổi 128→192→256→128, reset cùng preset, giữ D/dt và đổi h=96/N.
- U bật/tắt thí nghiệm bất ổn; bắt đầu ở pause, nên thử N với bàn cờ/dt=0,05. Giới hạn theo field không bị xóa chỉ bằng tắt/bật U; R tạo lần thử mới.
- L hoặc Shift+click đặt probe; đổi cursor không chuyển probe. F1 ẩn/hiện panel và cursor; F2 dấu pin. Các phím vẫn dùng được khi xem sạch.
- V chạy fixture nhỏ trên dữ liệu riêng, không sửa scene hiện tại; không thay nghiệm thu quy mô/UI. Esc thoát. Mất focus tự pause; resize không đổi số ô.

## Mô hình và đại lượng

`theta=(T-T_nền)/(T_nóng-T_nền)` không có đơn vị; không tự đọc thành Celsius/Joule. D có đơn vị độ dài²/giây mô hình, dx/dy là độ dài, dt là giây mô hình. Final mặc định D=1,5, h=0,5, dt=1/30, rx=ry=0,2. Các lưới lớn cùng miền cách nhiệt 96×96; lưới học 32²/h=0,5 có miền 16×16, không dùng bước nâng sản phẩm ấy như một phép refinement.

Explicit Euler + stencil năm điểm: `next=center+rx*(left-2*center+right)+ry*(up-2*center+down)`, `rx=D*dt/dx²`, `ry=D*dt/dy²`. Đọc current, ghi toàn bộ next rồi swap. Điều kiện không âm trọng số: rx+ry≤0,5, tương đương D*dt/h²≤0,25 khi hai khoảng cách bằng nhau. Stable không có nghĩa sai số PDE bằng 0.

Biên cách nhiệt dùng cell-centered zero-flux ghost bằng chính ô sát mặt ngoài. Vành lạnh giữ tâm cả vành ô ngoài ở 0, kể cả sau input; đây là hình học khác, không đánh đồng khi so convergence. Chuyển sang vành lạnh xóa nhiệt/pin ở mép; chuyển ngược lại không phục hồi chúng.

Bút thường chỉ đặt theta tại sample, đứng yên không liên tục bơm năng lượng. Heater ép theta về 0/1 sau mỗi bước, không phải nguồn công suất cố định. `sourceChange` ghi phần thay đổi I* do ép nguồn. Chỉ kỳ vọng `I*=sum(theta)*dx*dy` bảo toàn khi cách nhiệt, không heater/input/reset. Cần thêm bề dày/mật độ/nhiệt dung để gọi một đại lượng là Joule.

Palette thường cố định [0,1]; experiment dùng [-1,2] tâm 0,5. Chỉ clamp màu hiển thị, **không clamp nghiệm**. Mode thường chặn bước sai CFL. Experiment cho phép sai CFL nhưng từ chối candidate NaN/Inf hoặc |theta|>16 trước swap/tick/time; tối đa 400 bước được chấp nhận. Current giữ nghiệm finite cuối dù next có thể chứa candidate bị từ chối.

Nhận tối đa 0,25 s wall time/frame, tối đa 8 tick/frame. Speed 0,25–4 chỉ đổi tốc độ đồng hồ, không đổi dt. `dropped` là giây mô hình bỏ qua đã tính speed, không tích nợ trong pause. Khi quá tải, ứng dụng có thể chậm hơn thời gian thật.

## Kiểm chứng và đo hiệu năng

```powershell
.\build\Release\project_47_final.exe --verify
.\build\Release\project_47_final.exe --benchmark --size 192 --steps 120 --repeats 7
.\build\Release\project_47_final.exe --hidden --run --seconds 4 --capture plate.bmp
.\build\Release\project_47_final.exe --hidden --run --seconds 2 --preset 2 --dt 0.05 --experiment
```

Hidden/capture bắt buộc có `--seconds` trong 0,05–60; mọi flag lạ hoặc tổ hợp bị bỏ qua đều bị từ chối. `--verify` là fixture CPU cố định riêng. `--benchmark` không kết hợp viewer/capture/experiment, tối đa 100 triệu timed cell visits, deadline 20 s kiểm giữa các bước. Mỗi benchmark reset cùng input ngoài thời gian đo, warm-up 32 bước, công bố raw trung bình ms/tick của mỗi batch, median/p95 các batch, CPU/compiler/build, N/preset/boundary/D/dt/dx/dy. Vùng đo gồm diffuse và loop kiểm deadline, không gồm reset/measure/render/upload. Dùng Release cho số đo, không hứa FPS chung.

Tests có check/exit code thật trong Debug và Release, gồm oracle thông lượng qua cạnh độc lập với solver, xung 1 bước, constant, biên/pin/brush, ledger, guard/NaN/overflow, giới hạn experiment, clock, commands/CLI và RGBA/padding. Ca Gaussian 192²/120 tick đòi đủ visits, I* error≤1e-9+|I*0|×1e-12, symmetry≤1e-12 theta; min/max dùng 1e-14 theta. Chỉ áp điều kiện bảo toàn cho tấm kín không nguồn.

Cosine reference phân biệt G^n của scheme với exp(-Dk²t) của PDE. Scheme test 17×13/40 bước dùng max error≤2e-13 theta. Refinement dùng miền 16², mode(1,1), D=0,5, t=0,4, N=16/32/64, dt giảm theo h²; sai số PDE kỳ vọng giảm hơn ba lần/mức trong fixture, không hứa mọi scene giảm đơn điệu. NaN/Inf luôn fail.

Panel `updateMs` chỉ đo bước update, `uploadMs` đo CPU encode/lock/write, `submitMs` đo CPU gửi lệnh vẽ tấm, không phải GPU time hay toàn frame. Final192² có current/next mỗi mảng 36.864 doubles và mask 36.864 bytes; texture capacity256² nhưng chỉ encode/draw N² ô. Dung lượng pixel logic không phải phép đo VRAM của driver.

Kiểm UI riêng: brush/phím, chuột phải, slider kéo ra ngoài track, pause/step, preset/biên/nguồn/reset/clear, đổi N, F1/F2, probe, resize/mất focus và thoát. Browser Canvas là TypeScript/Canvas 2D, không phải C++ chạy trong web; timing và UI browser không thay kiểm executable.

## Dành cho người đóng góp website

Chỉ sửa `source-template/`, tests và README; starter/checkpoints/final/ZIP/build là output ngoài Git. Sau khi sửa source/metadata, ở repository website:

```sh
node scripts/generate-checkpoints.mjs --project=47
node scripts/sync-marked-snippets.mjs --project=47
node scripts/sync-marked-snippets.mjs --project=47 --check
```

Marker `// [snippet id]` / `// [/snippet id]` sống trong source chuẩn và đi qua materializer. Comment MDX giữ file/marker; script lấy đoạn của đúng checkpoint, không lấy thuật toán tương lai từ template. Hợp đồng token liên tiếp vẫn kiểm thêm literal/toán tử; không bỏ test để hợp thức hóa snippet lệch source.

## Nguồn tham khảo

- [SDL_LockTexture](https://wiki.libsdl.org/SDL3/SDL_LockTexture): write-only, pitch và vùng lock.
- [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake): FetchContent và target SDL3::SDL3.
- [Oxford — Computation / heat equation](https://www.robots.ox.ac.uk/~ian/Teaching/Computation/lab6.pdf): explicit diffusion/stability. Code solver, oracle, UI và Canvas trong project tự viết; không chép source từ tài liệu.
