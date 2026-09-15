# Project 22 — Projectile cannon

Project này biến thao tác kéo chuột thành initial velocity, vẽ nghiệm giải tích của projectile motion rồi chạy cùng chuyển động bằng Explicit Euler trên fixed timestep. Final đặt analytic reference cạnh numerical trail, nội suy ground impact và đo position error theo mét.

## Build final

```powershell
cmake -S . -B build
cmake --build build --config Debug
./build/Debug/project_22_final.exe
```

## Build starter, checkpoint và tests

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug
ctest --test-dir build-all -C Debug --output-on-failure
```

Controls của final: kéo chuột để ngắm; `Enter` bắn; `Space` pause/resume; `N` tiến một physics step; phím mũi tên đổi speed/angle; `[` và `]` đổi fixed dt; `R` reset.

SDL3 được khóa ở release 3.4.8. `starter`, bảy checkpoint và `final` chạy độc lập; CTest chỉ include code thuần trong `final/include` nên không mở window.
