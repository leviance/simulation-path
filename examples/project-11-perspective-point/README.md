# Project 11 — Perspective Point

Project này tự dựng một perspective projection pipeline trên CPU: `world point → camera point → perspective divide → NDC → pixel`. Chương trình vẽ một điểm sáng vào framebuffer SDL3, cho phép di chuyển point và camera, thay đổi FOV/near plane, chạy quỹ đạo tự động và báo rõ bốn trạng thái `visible`, `behind`, `before-near`, `outside`.

## Điều khiển bản final

- `←`, `→`: thay đổi X của world point.
- `↓`, `↑`: thay đổi Y của world point.
- `Q`, `E`: thay đổi Z của world point.
- `W`, `A`, `S`, `D`: di chuyển camera theo X/Z.
- `Z`, `X`: di chuyển camera theo Y.
- `[`, `]`: giảm hoặc tăng vertical FOV.
- `N`, `M`: giảm hoặc tăng near plane.
- `P`: lần lượt chọn point mặc định, trước near plane, sau camera và ngoài frustum.
- Kéo chuột trong viewport để đặt lại X/Y của point tại depth hiện tại.
- `Space`: pause/resume quỹ đạo; `.`: tiến một bước khi pause.
- `R`: trở về trạng thái ban đầu; `Escape`: thoát.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target mặc định là `project_11_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_11_starter` và `project_11_checkpoint_1` đến `project_11_checkpoint_6`.
