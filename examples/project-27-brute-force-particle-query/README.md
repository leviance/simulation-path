# Project 27 — Brute-force Particle Query

Ứng dụng tạo một cloud deterministic tối đa 100.000 particles rồi tìm mọi particle nằm trong chiếc kính lúp quanh con trỏ. Final dùng squared distance, một query workspace được tái sử dụng, benchmark có warm-up/checksum và scaling study để chỉ ra brute force luôn scan `N` phần tử dù query radius nhỏ hay lớn.

## Điều khiển

- Di chuyển chuột hoặc kéo: đặt tâm query circle; pointer capture giữ thao tác khi ra ngoài cửa sổ.
- `Space`: chạy hoặc tạm dừng auto probe.
- `N`: tiến auto probe đúng một bước rồi pause.
- `R`: tạo lại cùng particle cloud và query ban đầu.
- `1`, `2`, `3`: dùng lần lượt 1.000, 10.000 hoặc 100.000 particles.
- `Up` / `Down`: tăng hoặc giảm query radius.
- `B`: benchmark một tập query cố định sau warm-up.
- `S`: chạy scaling study cho 1.000, 10.000 và 100.000 particles.

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

Các target gồm `project_27_starter`, `project_27_checkpoint_1` đến `project_27_checkpoint_7`, `project_27_final` và `project_27_tests`. Mỗi snapshot chạy độc lập và chỉ chứa code đã xuất hiện tới bài tương ứng.
