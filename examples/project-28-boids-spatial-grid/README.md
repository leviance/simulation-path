# Project 28 — Đàn Boids lớn với Spatial Grid

Nâng cấp đàn Boids của Project 27, không thay mô hình chuyển động. Mỗi bước dựng một uniform grid từ snapshot cũ, tìm hàng xóm, tính ba steering rồi công bố toàn bộ state mới. Preset cuối có 10.000 cá thể thật được cập nhật và vẽ đầy đủ.

## Tự thử trước khi đọc hướng dẫn

Giữ nguyên separation/alignment/cohesion, minimum image, semi-implicit Euler và dt=1/60 s. Tự viết bucket storage/query, đối chiếu với brute force ở đàn nhỏ và đo cả rebuild. Không cắt hàng xóm, lấy mẫu đàn hoặc đổi radius chỉ để tạo speedup. Khi một bước kéo dài, chia CPU giữa hai cá thể và chỉ commit khi đủ N.

Bạn cần hoàn thành Project 27 trước khi làm phần này. `include/boids/` được cung cấp đầy đủ trong mọi snapshot, nên ZIP không cần đặt cạnh source Project 27. Chỉ budget số cá thể được nâng lên 10.000; luật chuyển động giữ nguyên.

## Cấu trúc và thứ tự học

```text
starter/                  khung SDL, mô hình Boids và neighbor loop brute force
checkpoints/01 ... 10/     mỗi mốc chạy độc lập, để đối chiếu với bài làm
final/                    ứng dụng hoàn chỉnh
  include/boids/          mô hình và framebuffer được cung cấp
  include/grid/           geometry, storage, query, jobs, validation, benchmark
  include/app/            scene, input, view, SDL resources/event loop
  src/main.cpp            điểm vào chương trình
tests/                    test thuần dùng header của final
```

| Mốc | Thay đổi chính | Quy mô UI |
| --- | --- | --- |
| 01 | Geometry và địa chỉ selected cell | 256 / 1.024, brute |
| 02 | Dựng buckets từ snapshot, cache debug | 256 / 1.024, brute |
| 03 | Khoảng query qua mép và cell cuối ngắn | 256 / 1.024, brute |
| 04 | Lọc candidate thành neighbor chính xác | 256 / 1.024, brute toàn đàn |
| 05 | Chuyển Brute/Grid trên cùng state | 256 / 1.024 |
| 06 | Validator toàn đàn nhỏ | 256 / 1.024 |
| 07 | Uniform, clustered, dense và occupancy | 256 / 1.024 |
| 08 | Batch CPU, hủy và commit nguyên bước | thêm 10.000, chỉ Grid |
| 09 | Benchmark hữu hạn theo N và cell size | như mốc 08 |
| 10 | Bản hoàn chỉnh và nghiệm thu | như mốc 08 |

Các kiểu dữ liệu, khung scene, renderer và controls nền đã có trong starter. Các hàm Grid mới xuất hiện theo bài. Khi làm bài, thêm/thay các hàm được chỉ rõ trong `starter`; không cần viết lại window/event loop. Không sửa `source-template` trong bản ZIP để mong CMake tự sinh checkpoint: generator thuộc repository website, còn ZIP đã chứa source materialized đầy đủ.

## Build và chạy

C++20, CMake tối thiểu 3.24. Trên Windows dùng Visual Studio 2022 với Desktop development with C++ và Windows SDK. SDL được khóa ở 3.4.8 bằng URL + SHA-256 trong CMake; mặc định FetchContent cần Internet ở lần configure đầu. Luôn link qua `SDL3::SDL3`, không tự ghép tên file `.lib`/`.dll`.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
./build/Debug/project_28_final.exe
./build/Debug/project_28_starter.exe
./build/Debug/project_28_checkpoint_5.exe
```

Không bật BUILD_CHECKPOINTS thì CMake chỉ build final và tests. Với Ninja/Make single-config, configure thêm `-DCMAKE_BUILD_TYPE=Release` và chạy executable trực tiếp trong `build/` thay vì `build/Release/`. SDL có thể cần các development package của hệ điều hành để build video backend; xem hướng dẫn nền tảng trong source SDL nếu configure báo thiếu.

## Điều khiển bản cuối

- Space: chạy/dừng; N: tính một bước đầy đủ rồi giữ pause; R: reset cấu hình hiện tại.
- 1 / 2 / 3: 256 / 1.024 / 10.000 cá thể; P: tăng seed và tạo lại đàn.
- M: Brute/Grid trên cùng state khi N≤1.024. Ở 10.000, không tự giảm N để mở Brute.
- [ / ]: giảm/tăng cell size từ 16 đến 240; L: Uniform → Clustered → Dense.
- Q/A, W/S, E/D: tăng/giảm ba trọng số. T/G: radius; Y/H: speed cap; U/J: acceleration cap.
- Click hoặc ←/→: chọn cá thể; kéo khi pause. Focus lost/resize hủy thao tác và job dở.
- F: clean/debug; F3: cell boundaries; F4: occupancy.
- V: đối chiếu toàn đàn nhỏ với brute; B: scale benchmark; K: cell-size study của layout hiện tại.
- F5/F6: trang trước/sau của bảng kết quả (ba dòng/trang).
- Escape: hủy step/validation/benchmark trước; khi không có job thì thoát ứng dụng.

Thay tham số, reset hoặc kéo cá thể hủy output dở và các kết quả không còn phù hợp. Chỉ xem/chọn không đổi mô hình. Tắt debug không tắt Grid hoặc giảm số cá thể.

## Mô hình và kiểm chứng

World tuần hoàn `[0,960)×[0,600)`, +X sang phải, +Y xuống dưới. R nhỏ hơn nửa cạnh ngắn nhất. Cell cuối có thể ngắn hơn S; query tách khoảng qua mép trên từng trục, không dùng một stencil modulo giả định mọi cell bằng nhau.

Query bỏ self theo ID, nhận biên `distanceSquared <= radiusSquared`. Hai cá thể khác ID trùng vị trí vẫn là hàng xóm. Các vector dùng cùng minimum-image displacement của Project 27. Tolerance tuyệt đối cho steering/state một bước là 1e−9; tập neighbor ID phải khớp chính xác. Không đòi hai quỹ đạo dài trùng bit.

```sh
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Mặc định tests include `final/include`: đây là kiểm bản tham khảo. Khi starter đã hoàn thành cả mười bài, đổi include của target tests trong CMake thành `starter/include`, configure/build lại và chạy CTest để kiểm bài làm của bạn. Tests không dùng assert bị tắt dưới NDEBUG.

Có oracle độc lập chín ảnh tuần hoàn, ca R<S/R=S/R>S, biên cell/domain, trùng vị trí, insertion một lần, ba layout, state/steering equivalence, snapshot bất biến, batch partitions và cancellation. Test 10.000 dùng Grid toàn đàn, không chạy brute 10.000 trong vòng stress vô hạn.

## Smoke và benchmark hữu hạn

```sh
./build/Release/project_28_final.exe --smoke
./build/Release/project_28_final.exe --smoke-large
./build/Release/project_28_final.exe --benchmark
./build/Release/project_28_final.exe --benchmark-cells-dense
```

Smoke thường chạy sáu bước; smoke lớn phải cập nhật ít nhất một bước và vẽ đủ 10.000. Hai chế độ có giới hạn nội bộ 2.000 frame/10 giây. CLI benchmark có giới hạn 30 giây và số lượt hữu hạn. Khi tự động hóa, vẫn đặt watchdog ngoài tiến trình; không dựa vào vòng lặp nội bộ nếu SDL/driver bị kẹt.

Mỗi dòng dùng hai warm-up và năm mẫu, mọi lượt đọc lại cùng input/seed. Scale plan có Brute/Grid ở 256 và 1.024, chỉ Grid ở 10.000. Cell study dùng N=1.024 với baseline Brute và S=16,32,64,100,128,240. Trong UI, chạy K cho từng layout; CLI dense study giúp tái hiện ca bất lợi.

CPU total gồm validation, copy snapshot, cấp output, build và các batch query/update. Wall latency còn gồm thời gian nhường CPU/chờ frame. Không gồm render hoặc checksum trong kernel. Build/query/update có median riêng, không nhất thiết cộng thành median total. Checksum tiêu thụ toàn bộ output nhưng không thay validator.

Dense có thể làm mọi cá thể nhìn thấy mọi cá thể khác: Grid không giảm được N(N−1) tương tác và có thể chậm hơn. Báo median/min/max cùng CPU, compiler, cấu hình build, N/seed/R/S/layout. Không coi timing trên một máy là cam kết FPS hoặc speedup cho mọi máy.

## Tài liệu học

Xem module **Đàn Boids lớn với Spatial Grid** trên website local, bắt đầu bằng thử thách ở trang tổng quan. Canvas dùng cùng tên biến/công thức nhưng không thay chương trình C++ trong ZIP. Build/test tự động, smoke SDL và kiểm thao tác desktop là ba phạm vi kiểm tra khác nhau.
