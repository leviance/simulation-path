# Project 26 — Double Pendulum Chaos

Hai double pendulum dùng cùng mass, length, gravity và RK4 fixed timestep. Pendulum thứ hai chỉ lệch `theta2` một epsilon nhỏ; ứng dụng vẽ hai trail, phase-space separation, second-bob distance, finite-time exponent, energy drift và numerical shadow error từ một run `dt/2`.

## Điều khiển

- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một fixed step rồi pause.
- `R`: dựng lại cùng initial state.
- `P`: chuyển Calm → Chaotic → Near upright.
- `Up` / `Down`: tăng hoặc giảm perturbation 10 lần.
- `[` / `]`: chia đôi hoặc nhân đôi fixed dt rồi reset.
- `Enter`: chạy nhanh 30 giây simulated time với số step hữu hạn.
- Kéo chuột: đặt lại góc ban đầu của thanh thứ hai; pointer capture giữ thao tác ngoài cửa sổ.

## Build final và tests

```bash
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

SDL được khóa ở release 3.4.8. Lần configure đầu tiên cần mạng nếu không truyền `COURSE_USE_INSTALLED_SDL3=ON` cùng một package SDL đã cài.

## Build starter và checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
```

Các target gồm `project_26_starter`, `project_26_checkpoint_1` đến `project_26_checkpoint_7`, `project_26_final` và `project_26_tests`. Mỗi snapshot là một chương trình độc lập, không cần chép code từ website để chạy.
