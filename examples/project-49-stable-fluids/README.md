# Project 49 — Stable Fluids 2D

Mô phỏng khói C++20/SDL 3.4.8 trên lưới MAC, với backtrace, pressure projection, viscosity implicit và mouse impulse. Miền [0,1]², y hướng lên; mặc định 24×24, dt=1/60, 160 vòng pressure. Ứng dụng mở ở trạng thái dừng.

## Build và chạy

ZIP đã có CMake, starter, 11 checkpoint, final và tests. Trong repository website, chạy `npm run generate:course` để sinh các bản source trước.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows/Visual Studio: `build/Debug/project_49_final.exe`. Với Linux/macOS và generator một cấu hình, chọn `-DCMAKE_BUILD_TYPE=Debug`, executable ở trực tiếp `build/`; tạo build directory khác cho Release. CMake mặc định build final và tests; BUILD_CHECKPOINTS thêm starter và `project_49_checkpoint_1` tới `project_49_checkpoint_11`. FetchContent khóa SDL 3.4.8 và link `SDL3::SDL3`.

## Lộ trình

| Mốc | Nội dung mới |
| --- | --- |
| Starter | SDL window, renderer, logical presentation, event loop |
| 01 | Scalar concentration và vẽ khói |
| 02 | Brush, nội suy nét, input và inspector |
| 03 | Scalar semi-Lagrangian với gió cho trước (0.2,0) |
| 04 | Velocity MAC, normal wall 0, divergence |
| 05 | Pressure Poisson và weighted Jacobi, chưa sửa velocity |
| 06 | Projection và quan hệ divergence/residual |
| 07 | Advect velocity từ state cũ, project lại |
| 08 | Viscosity implicit với nguồn cố định |
| 09 | Impulse chuột/bàn phím và buoyancy |
| 10 | Full pipeline, fixed dt và work budget |
| 11 | Validator độc lập và tests thuần |

Trong repo sửa `source-template/`; starter/checkpoints/final là output sinh tự động, không đưa vào Git. Trong ZIP có thể viết tiếp trong starter để học.

## Điều khiển final

- Chuột/Enter: đặt brush; 1 khói, 2 xóa; `[`/`]` đổi radius 1–6 ô.
- P: Plume/Compressing/Vortex/Empty; R: reset scene, N=24 và settings mặc định.
- Phím mũi tên chọn ô, I đọc số ra console; L đổi Smoke/Pressure/Divergence; O bật/tắt vector.
- N: pause và tiến một tick; Space chạy/dừng; G đổi 24/32 và dựng lại scene.
- T: pressure budget 40/80/160; Q: viscosity 0/0.0005/0.003; B: buoyancy 0/0.8/1.6.
- H mở ca Jacobi 8×8; J chạy một vòng và in RHS/hàng xóm/candidate/gauge/kết quả; Z bắt đầu lại pressure. J/Z không đổi velocity, scalar hoặc tick. G không đổi resolution trong ca 8×8; chọn P hoặc R để quay lại cảnh thường.
- K bật/tắt khuấy khi kéo; WASD tạo impulse 0.05 tại ô chọn.
- V: chạy ca chuẩn trên grid riêng; Esc thoát.

Đổi settings chỉ pause, đổi resolution/preset dựng lại dữ liệu. Mất focus pause, hủy capture và accumulator. Giữ chuột đứng yên không phát khói/lực liên tục. Brush đặt concentration, không cộng source theo giây.

## Mô hình

Scalar/pressure N² ở tâm ô; u ở cạnh dọc (N+1)N; v ở cạnh ngang N(N+1), h=1/N. Hộp free-slip: normal velocity 0, tiếp tuyến được trượt. Sampler lặp giá trị sát mép khi backtrace ra ngoài vùng mẫu.

Density trong source là concentration của khói; density chất lưu được đặt bằng 1 trong phương trình pressure. D=(uR−uL+vT−vB)/h. A=−D*G, b=−div/dt, project trừ dt*Gp. Weighted Jacobi dùng trọng số 0.75, pressure mean 0 và loại mean RHS do làm tròn. Residual RMS đo Ap−b; divergence sau gần dt*residual, không nhất thiết 0 vì budget hữu hạn.

Pipeline: buoyancy → viscosity → project → advect velocity → project → advect density. Viscosity có ν≤0.003 và 12 vòng lặp. Scheduler nhận tối đa 0.25s, làm tối đa bốn tick/frame và báo thời gian bỏ qua.

Semi-Lagrangian có diffusion số, không bảo toàn tổng scalar chính xác. Project không clamp dữ liệu để che lỗi; chỉ màu bão hòa theo thang cố định (khói 0..1, pressure ±4, div ±2). Chưa có scalar diffusion, fade, nhiệt/combustion, obstacle, moving wall hoặc solver 3D.

## Kiểm chứng

Tests không mở window và không dùng assert tắt trong Release. Các ca kiểm sampler affine theo từng offset, scalar backtrace/hằng, flux telescoping, streamfunction, pressure residual, projection, viscosity, buffer cũ, impulse và lịch 15/30/120 FPS. Validator V dùng grid N=16/160 vòng để kiểm projection, N=8 scalar hằng và N=16 viscosity. PASS ca chuẩn không thay thế số đo của scene/Settings hiện tại.

Ca Jacobi 8×8 có RHS +64/−64 ở (3,3)/(4,3). Vòng đầu cho pressure +0.1875/−0.1875 và residual RMS sqrt(14); vòng hai ô (3,3) cho 0.19921875. CTest đối chiếu các số này, degree 2/3/4 tại góc/mép/giữa và kiểm việc chạy Jacobi không tiến một tick.
