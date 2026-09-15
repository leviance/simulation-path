# Project 25 — Spring Chain

Project mô phỏng một chuỗi 18 khối lượng nối bằng lò xo. Đầu trên được neo cố định; người dùng kéo một khối sang bên rồi thả để quan sát biến dạng và dao động truyền qua cả dây. Mô hình dùng Hooke force, axial damping, gravity, semi-implicit Euler và fixed timestep; không dùng physics engine.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target chính là `project_25_final`. Starter và tám checkpoint được thêm khi bật `BUILD_CHECKPOINTS`.

## Điều khiển final

- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một fixed step.
- `R`: dựng lại chuỗi mặc định.
- `[` / `]`: giảm hoặc tăng fixed timestep rồi reset.
- `-` / `=`: giảm hoặc tăng stiffness rồi reset.
- `D`: đổi damping giữa ba preset.
- `G`: bật hoặc tắt gravity.
- Kéo một khối bằng chuột rồi thả: truyền vận tốc release vào chuỗi.

Mặc định: 18 particles, 17 springs, `mass = 0.25 kg`, `restLength = 0.42 m`, `stiffness = 120 N/m`, `damping = 1.6 N·s/m`, `dt = 1/240 s`.
