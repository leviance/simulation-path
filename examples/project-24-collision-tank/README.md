# Project 24 — Collision Tank

Project mô phỏng 144 circle body va vào bốn tường và vào nhau bằng fixed timestep, brute-force pair detection, normal impulse, restitution và positional correction. Không dùng physics engine hoặc spatial acceleration structure.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target chính là `project_24_final`. Starter và tám checkpoint được thêm khi bật `BUILD_CHECKPOINTS`.

## Điều khiển final

- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một fixed step.
- `R`: tạo lại scene mặc định bằng cùng seed.
- `[` / `]`: tăng hoặc giảm fixed timestep rồi reset.
- `-` / `=`: giảm hoặc tăng restitution rồi reset metrics.
- `I`: đổi số solver iterations.
- Kéo chuột từ một bóng: truyền velocity kick theo vector kéo.

Scene mặc định dùng 16 cột × 9 hàng. Mỗi solver iteration kiểm đúng `N*(N-1)/2` unordered pair bằng vòng lặp `i < j`; Spatial Grid được để dành cho project sau về cấu trúc không gian.
