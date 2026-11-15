# Project 49 — Buồng khói tương tác / Stable Fluids 2D

Sản phẩm chính là ứng dụng C++20/SDL 3.4.8: hai luồng khói trắng đi lên, cuộn và đổi hướng khi khuấy. Mặc định **128×128 ô thật** để tương tác; tùy chọn **256×256** giữ thêm dải khói mảnh nhưng tốn thời gian hơn. Canvas trên website là bản minh họa cùng công thức, không thay thế ứng dụng này.

Bạn tự viết bộ lấy mẫu MAC, advection midpoint RK2, pressure projection, Jacobi, CG và multigrid-preconditioned CG. Các bài cuối thêm MacCormack có limiter và vorticity confinement. Đây không phải một ảnh động noise phủ lên hình khói.

## Build và chạy

ZIP đã chứa CMake, starter, **15 checkpoint**, final và tests. Không cần Node.js để build ZIP. Trong repository website, sửa `source-template/` rồi sinh snapshot bằng `node scripts/generate-checkpoints.mjs --project=49`; không sửa output sinh trực tiếp.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows/Visual Studio 2022: chạy `build/Release/project_49_final.exe`. Dùng Release để đo hiệu năng, không lấy Debug làm chuẩn. Linux/macOS: chọn `-DCMAKE_BUILD_TYPE=Debug` hoặc `Release`, dùng hai build directory; executable nằm trực tiếp dưới build directory. CMake ≥3.24 khóa SDL 3.4.8 bằng FetchContent, luôn link `SDL3::SDL3`. Có thể dùng SDL cài sẵn **đúng 3.4.8** qua `COURSE_USE_INSTALLED_SDL3`/`SDL3_DIR`; không chép thư viện vào source.

Không bật BUILD_CHECKPOINTS nếu chỉ muốn build bản cuối. Nếu học từ starter, target là `project_49_starter`; sau bài k là `project_49_checkpoint_k`. Mỗi thư mục starter/checkpoint/final là một chương trình hoàn chỉnh, không cần lấy header từ thư mục khác.

## Lộ trình học

| Mốc | Phần tự viết / kết quả |
| --- | --- |
| Starter | Khung window/renderer, texture presentation và panel; hộp trống, chưa có solver |
| 01 | Scalar ở tâm ô và hai vệt khói ban đầu 32×32 |
| 02 | Brush, đổi tọa độ và nội suy stroke |
| 03 | Bilinear, backtrace midpoint, scalar advection với gió (0.18,0) |
| 04 | Velocity MAC, tường kín/free-slip, divergence |
| 05 | Poisson và weighted Jacobi trên ca 8×8; chưa sửa velocity |
| 06 | Projection và quan hệ div/residual |
| 07 | Self-advection u/v từ cùng state cũ |
| 08 | Nguồn liên tục, màu tracer, buoyancy, click/drag và impulse |
| 09 | Viscosity implicit với RHS cố định |
| 10 | Fixed dt, full pipeline và giới hạn work |
| 11 | CG, residual thật, lưới 128² |
| 12 | MacCormack hai lượt có limiter/fallback |
| 13 | Vorticity confinement từ curl thật |
| 14 | V-cycle đối xứng, PCG, tùy chọn 256² |
| 15 / final | Kiểm độc lập, ứng dụng hoàn chỉnh và bàn giao |

Mục tiêu không phải thuộc tên solver. Sau bài, bạn phải giải thích được nơi scalar được lấy mẫu, pressure sửa cạnh nào, vì sao khói nhòe và tại sao ít vòng lặp chưa chắc nhanh hơn hoặc chính xác hơn.

## Điều khiển bản cuối

- Click: thêm một vệt khói. **Drag chỉ khuấy**, không vẽ một chuỗi đĩa. Chuột phải chỉ khuấy. M chọn Stir/Paint/Erase/Probe; Paint/Erase là brush riêng, Probe không sửa dữ liệu.
- Mũi tên chọn ô, Enter đặt/xóa khói; WASD tạo impulse 0.05 world tại ô chọn. `[ ]` đổi radius 1–16 ô. 1/2/3 chọn xanh/cam/trắng; F2 bật/tắt tracer màu (mặc định trắng).
- Space chạy/dừng, N pause và tiến một tick, R reset **giữ cảnh, lưới và tham số**; P đổi TwinJets/Vortex/Compression/Empty. Đổi preset đặt lại nguồn/lực nổi phù hợp.
- L chọn Smoke/Velocity/Pressure/Divergence; F1 xem sạch/debug, O bật glyph. Pressure ±0.08, divergence ±1: âm xanh/dương cam; velocity 0..0.6. Màu bão hòa không clamp số liệu.
- E nguồn; B buoyancy 0/0.8/1.6; Q viscosity 0/0.0001/0.0005/0.003; F3 MacCormack; F4 confinement 0/4/8/12/16/20 (mặc định 8).
- G chọn 16/32/64/128/256 và dựng lại cảnh; lưới nhỏ chỉ phục vụ học. C đổi Jacobi/CG/PCG, T đổi budget. Đổi tham số quan trọng sẽ pause để so; reset trước khi muốn so cùng state đầu.
- H mở ca Jacobi 8², J một vòng trên RHS cố định, Z chuẩn bị lại RHS/xóa pressure. J/Z không sửa velocity/scalar/tick; P rời ca để về lưới thường. R giữ nguyên ca hiện tại.
- V chạy ca chuẩn trên Grid riêng; Esc thoát. Blur pause, xóa accumulator và hủy capture. Các controls vẫn tìm được trong chế độ xem sạch.

## Source layout

`src/main.cpp` sở hữu SDL/vòng lặp. `include/app/` chỉ giữ trạng thái giao diện, presentation, input, CLI và giới hạn wall-clock. `include/fluid/` tách model, field, scenes, brush, transport, Poisson, CG, multigrid, projection, sources, viscosity, detail, vorticity, scheduler và reference. `tests/tests.cpp` là kiểm thuần CPU, không mở cửa sổ. Không có thư viện solver ngoài hoặc ma trận đặc.

## Mô hình và giới hạn

Miền [0,1]², y lên, h=1/N. Scalar/pressure N² ở tâm; u=(N+1)N, v=N(N+1). Normal wall=0, tiếp tuyến free-slip. Ngoài lattice, sampler dùng constant extension. Density trong source là concentration khói; density chất lưu trong pressure được chuẩn hóa bằng 1.

A=−DG, b=−div/dt; mean RHS được loại do sai số làm tròn, pressure mean 0. Jacobi ω=0.75 tối đa 160 vòng. CG/PCG tối đa 384 vòng, target RMS(Ap−b)=max(1e−6,1e−4 RMS(b)), luôn đo lại residual thật. Report giữ thông số của lần solve, không đổi theo lựa chọn solver mới. Impulse hủy report/RHS cũ.

Pipeline: nguồn → lực → confinement → viscosity → project → advect velocity → project → advect scalar. ν≤0.003, 48 vòng implicit. MacCormack scalar hai lượt có limiter donor/fallback; velocity vẫn semi-Lagrangian. Confinement thêm năng lượng để bù mất xoáy, không chứng minh độ chính xác vật lý. Màu là passive tracer; tone mapping không phải tán xạ ánh sáng 3D.

Dt=1/60, tối đa bốn tick/frame. Nhận tối đa 0.25s elapsed; sau tick vượt ngân sách UI12ms thì trả quyền, báo dropped. Không chạy bù vô hạn hoặc chỉ cập nhật một phần dữ liệu. 128² có 16.384 scalar/33.024 cạnh; 256² có 65.536 scalar/131.584 cạnh. Không hứa 60 FPS; đo trên máy bạn. Semi-Lagrangian không bảo toàn tích phân scalar chính xác; chưa có nhiệt, combustion, obstacle, moving wall, fade hoặc scalar diffusion để che lỗi.

## Kiểm chứng có thời hạn

CTest dùng require/exception, không assert bị tắt trong Release. Có affine sampler, dịch giải tích, scalar hằng/limiter, state cũ u/v, flux/tường, streamfunction, Jacobi tính tay, eigenmode pressure độc lập, CG/PCG, viscosity equation/energy, confinement, input và clock 15/30/120 FPS.

Ca Jacobi8²: RHS±64 tại (3,3)/(4,3); vòng đầu pressure±0.1875, residual √14; vòng hai p(3,3)=0.19921875. Ca N=16/160Jacobi giảm div dưới 8%; ca hai impulse N=128 PCG đạt target, div dưới 0.1%, khớp dt*residual trong1e−9. PASS fixture không thay số đo cảnh đang xem.

```sh
build/Release/project_49_final.exe --verify
build/Release/project_49_final.exe --hidden --resolution=128 --seconds=30 --ticks=120 --capture=smoke.bmp
```

CLI yêu cầu --seconds (0.05..60) cho hidden/ticks/capture; ticks1..360. Nếu không hoàn thành đủ tick trước deadline, trả lỗi. --verify chạy riêng, không SDL/window. Không để ứng dụng kiểm thử chờ vô hạn. Kiểm thao tác native và Canvas riêng; kiểm build không chứng nhận hình ảnh hoặc input.
