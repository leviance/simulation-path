# Project 23 — Integrator Race

Project này cho Explicit Euler, Velocity Verlet và classical RK4 giải cùng một harmonic oscillator. Exact solution làm đối chứng; UI hiển thị position, phase-space error, relative energy drift và số lần tính acceleration.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target chính là `project_23_final`. Starter và bảy checkpoint chỉ được thêm khi bật `BUILD_CHECKPOINTS`.

## Điều khiển final

- Kéo chuột: chọn initial displacement rồi reset cuộc đua.
- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một fixed step.
- `[` / `]`: tăng hoặc giảm fixed timestep.
- `Up` / `Down`: đổi spring stiffness và reset.
- `G`: đổi giữa position graph và relative-energy-drift graph.
- `Enter`: chạy nhanh thêm 600 fixed step.
- `R`: trả toàn bộ thí nghiệm về mặc định.

Exact ghost màu trắng không tham gia sửa state của integrator. Ba lane luôn dùng cùng initial state, parameters, fixed dt và step count.
