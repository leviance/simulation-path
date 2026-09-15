# Project 15 — 3D Pipeline Inspector

Chương trình theo dõi một vertex qua sáu trạng thái `Local → World → Camera → Clip → NDC → Screen`. Toàn bộ Model, View, Projection và framebuffer được tính trên CPU; SDL3 chỉ tạo cửa sổ, nhận input và present texture.

## Yêu cầu

- CMake 3.24 trở lên.
- Compiler hỗ trợ C++20.
- Kết nối mạng ở lần configure đầu tiên để CMake tải đúng SDL 3.4.8.

## Build bản hoàn chỉnh

```bash
cmake -S . -B build
cmake --build build --config Release
```

Executable nằm trong `build/Release/project_15_final.exe` với generator Visual Studio, hoặc `build/project_15_final` với generator một cấu hình.

## Build starter và checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Các target:

- `project_15_starter`
- `project_15_checkpoint_1` tới `project_15_checkpoint_7`
- `project_15_final`

Mỗi thư mục checkpoint là một project chạy độc lập. Không cần chép file từ bài trước khi muốn xem lại một stage.

## Điều khiển bản final

- `Left/Right`: chọn stage cần đọc trên title bar.
- `Q/E`: xoay model quanh trục Y.
- `A/D`, `W/S`: đổi camera position theo X/Z.
- `I/J/K/L`: đổi camera pitch/yaw để kiểm tra view matrix.
- `[` và `]`: giảm/tăng vertical FOV.
- `1`: preset visible.
- `2`: point nằm trước near plane.
- `3`: point nằm sau camera.
- `4`: point vượt far plane.
- `5`: point nằm ngoài frustum.
- `Space`: pause/continue model rotation.
- `N`: tiến animation đúng một bước 1/30 giây.
- `R`: đặt lại toàn bộ model, camera, lens, preset và stage.
- `Escape`: thoát.

## Chạy validation

```bash
ctest --test-dir build -C Debug --output-on-failure
ctest --test-dir build -C Release --output-on-failure
```

Tests không mở cửa sổ. Chúng kiểm tra `Vec4/Mat4`, point và direction, thứ tự model transform, view matrix, clip `w`, ánh xạ near/far, mọi trạng thái visibility và sai số giữa pipeline chạy rời với MVP ghép.
