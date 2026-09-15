# Project 14 — FPS Camera Room

Chương trình SDL3/C++20 dựng một căn phòng wireframe trên framebuffer CPU. Room geometry luôn đứng yên trong world space; camera có position, yaw và pitch, di chuyển bằng WASD theo hướng nhìn và dùng relative mouse mode để nhìn quanh.

Project có bảy checkpoint vì nội dung gồm bảy bước độc lập: room geometry, view translation, inverse yaw/pitch, camera basis, movement theo `dt`, relative mouse mode và bounds/validation. Số lượng này xuất phát từ luồng kiến thức, không phải một khuôn cố định.

## Cấu trúc

- `starter/`: cửa sổ, framebuffer, Bresenham và crosshair để bạn bắt đầu.
- `checkpoints/01` … `checkpoints/07`: mã chạy độc lập ở cuối từng bài.
- `final/`: trùng với checkpoint 07, là chương trình hoàn chỉnh.
- `tests/`: kiểm tra room geometry, view transform, camera basis, movement, mouse look và bounds mà không mở window.

## Configure và build

```bash
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_14_final
```

CMake sẽ tải đúng SDL 3.4.8 ở lần configure đầu tiên. Nếu CI đã cài package SDL tương ứng, thêm `-DCOURSE_USE_INSTALLED_SDL3=ON`.

## Chạy

Với Visual Studio generator:

```bash
./build/Debug/project_14_final.exe
```

Điều khiển bản final:

- `W/A/S/D`: đi tới/lùi/strafe theo yaw của camera.
- Click trái: bật relative mouse mode và bắt đầu mouse look.
- `Escape`: nhả chuột; khi chuột đã nhả, nhấn lần nữa để thoát.
- `I/J/K/L`: điều chỉnh pitch/yaw bằng bàn phím để dễ debug.
- `Space`: pause/resume movement.
- `R`: reset camera.

## Chạy tests

```bash
ctest --test-dir build -C Debug --output-on-failure
ctest --test-dir build -C Release --output-on-failure
```
