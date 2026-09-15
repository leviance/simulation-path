# Project 28 — Spatial Grid Neighbor Query

Project này giữ nguyên particle cloud và circle query của Project 27, sau đó thay phép quét toàn bộ bằng Spatial Grid. Mục tiêu không chỉ là “chạy nhanh hơn”, mà là chứng minh grid trả đúng cùng tập hàng xóm với brute-force oracle và giải thích tốc độ bằng số candidate thực tế.

## Bạn sẽ xây gì?

Ứng dụng SDL3 hiển thị 100.000 particles trong world `[0,1]²`, lưới cell đều, candidate cells quanh con trỏ, exact hits và nearest hit. Title của cửa sổ báo grid dimensions, cells visited, candidates, brute scans, checksum và benchmark time/query.

## Điều khiển final

- Kéo chuột trái: di chuyển circle query và giữ pointer capture khi ra ngoài cửa sổ.
- `↑` / `↓`: tăng hoặc giảm query radius.
- `1`, `2`, `3`: chọn coarse, balanced hoặc fine grid.
- `Space`: chạy hoặc tạm dừng auto probe.
- `N`: tiến auto probe một bước.
- `B`: benchmark Spatial Grid và brute force trên cùng query set.
- `S`: chạy cell-size study với `0.025`, `0.05`, `0.1`, `0.2`.
- `R`: reset deterministic state.
- `Esc`: thoát.

## Cấu trúc ZIP

- `starter/`: baseline brute force từ Project 27, đã có SDL3 window, framebuffer, particle cloud và circle query.
- `checkpoints/01` … `checkpoints/08`: từng trạng thái chạy độc lập tương ứng với tám bài học.
- `final/`: mã hoàn chỉnh; đây là target mặc định.
- `tests/tests.cpp`: validation thuần C++ cho address, insertion, candidate range, exact hit set, checksum, benchmark work và cell-size study.
- `CMakeLists.txt`: khóa SDL 3.4.8 và có option build toàn bộ checkpoints.

## Build final

```bash
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --config Debug
```

Target ứng dụng là `project_28_final`.

## Build toàn bộ checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
```

Các target được tạo:

- `project_28_starter`
- `project_28_checkpoint_1` … `project_28_checkpoint_8`
- `project_28_final`
- `project_28_tests`

## Chạy validation

```bash
ctest --test-dir build -C Debug --output-on-failure
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

CTest không mở SDL window. Timing chỉ được kiểm là hữu hạn; correctness dựa vào exact hit set, nearest tie-break, checksum và operation counts nên không phụ thuộc tốc độ máy.

## Contract quan trọng

- Điểm đúng maximum bound phải vào cell cuối, không tạo index vượt mảng.
- Mỗi particle index xuất hiện trong đúng một bucket.
- Candidate cell có thể chứa false positive; exact circle test vẫn bắt buộc.
- Hit order của grid không phải API contract. Chỉ validation mới copy và sort để so set.
- Rebuild time và query time là hai phép đo khác nhau.
- Preset mặc định phải cho grid checksum bằng brute checksum và kiểm ít candidates hơn `N × queryCount`.
