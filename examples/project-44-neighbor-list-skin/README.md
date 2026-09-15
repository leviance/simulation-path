# Project 44 — Neighbor list có vùng đệm

Giữ mô hình Molecular Dynamics tuần hoàn của Project 43, nhưng lưu lại các cặp có thể tương tác để không tìm lại mọi cặp ở mỗi bước. Hai vòng quanh hạt A giúp phân biệt force cutoff và bán kính dựng danh sách `cutoff + skin`.

## Học theo thứ tự nào?

Nên hoàn thành Project 43 (minimum image, unwrapped, force-shifted LJ, Velocity Verlet) và Project 28 (cell grid). Hai header `periodic.hpp` và `dynamics.hpp` được giữ từ bản hoàn chỉnh của Project 43 để gói này không phụ thuộc thư mục của project khác. Bản mọi cặp vẫn là đối chứng, không bị thay bằng neighbor list.

1. Vẽ hệ hạt đứng yên và vòng cutoff bằng SDL3.
2. Dựng danh sách `i<j` trong `cutoff+skin` bằng mọi cặp.
3. Tính lực từ danh sách, vẫn lọc force cutoff mỗi lần.
4. Đo độ dời từ mốc unwrapped; dựng lại khi chạm nửa skin hoặc đổi cấu hình.
5. Dựng bằng cell grid tuần hoàn; loại cellId lặp ở hộp hai ô mỗi trục.
6. Kiểm danh sách trước cả hai lần tính lực trong Velocity Verlet; rollback cả hệ và cache.
7. Cố ý giữ list cũ khi kéo hai hạt để phát hiện cặp bị bỏ sót.
8. So sánh build checks + force checks cho bốn giá trị skin trên cùng dữ liệu.
9. Kiểm chứng, build và chạy toàn bộ dự án.

Hướng dẫn đầy đủ nằm tại `/projects/neighbor-list-skin` trên website học chạy local. Mỗi checkpoint là một chương trình độc lập; không cần copy code từ thư mục checkpoint trước.

## Cấu trúc

- `starter/`: cửa sổ SDL và ô gốc; chưa tạo hạt, chưa chạy solver. Mã nền đã học ở Project 43 có sẵn nhưng không tự chạy.
- `checkpoints/01` đến `09`: kết quả chạy được sau từng bài.
- `final/`: bản đầy đủ, có chú thích. `neighbor_list.hpp` lo tập cặp và hiệu lực; `neighbor_dynamics.hpp` lo tích phân/chẩn đoán; `neighbor_view.hpp` chỉ vẽ.
- `tests/tests.cpp`: kiểm code thuần của final, không mở window, không phụ thuộc assert.
- `CMakeLists.txt`: C++20, CMake >=3.24, SDL 3.4.8 khóa checksum. Chỉ link qua `SDL3::SDL3`.
- Không cần ảnh, font hay asset ngoài; các hình được vẽ bằng code.

`source-template/` nếu có trong repository là nguồn biên soạn để sinh các snapshot. Người học không cần sửa các macro checkpoint trong template để làm bài.

## Build trên Windows / Visual Studio 2022

Cài workload Desktop development with C++ và CMake. Mở terminal ngay trong thư mục này:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
.\build\Debug\project_44_final.exe
```

Final là target mặc định. SDL được lấy bằng FetchContent trong lần configure đầu, cần mạng; không tự nâng phiên bản. Khi dùng SDL shared trên Windows, CMake chép SDL3.dll cạnh executable.

```powershell
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_44_starter project_44_checkpoint_1 --parallel 2
```

Đổi số cuối tên target để build bài khác; `project_44_checkpoint_9` có cùng chức năng với final. Khi đã bật BUILD_CHECKPOINTS, bỏ `--target` để build tất cả snapshot. `--parallel 2` hạn chế tải CPU; `--timeout 20` áp dụng cho từng test, không phải cho configure/download. Nếu tải dependency bị đứng, dừng để xem log thay vì mở nhiều bản build cùng lúc.

## Linux / macOS

Cài compiler C++20, CMake và các dependency hệ thống của SDL theo Getting Started. Với generator một cấu hình:

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --timeout 20
./build/project_44_final
```

Không tái dùng cùng thư mục build giữa các generator/toolchain. Linux/macOS được cung cấp hướng dẫn; việc xác nhận biên dịch của học phần này tập trung vào Windows/Visual Studio 2022.

## Điều khiển bản final

| Phím / thao tác | Chức năng |
| --- | --- |
| `1`, `2`, `3` | 64, 144, 1.000 hạt; seed cố định 44 |
| `P` | Hai hạt A=(3,6), B=(6.2,6) trong hộp 12×12 |
| Mũi tên / kéo A | Dịch A (mũi tên: 0.05), pause và đặt vận tốc A về zero |
| `Space`, `N` | Chạy/dừng, tiến một bước dt=0.002 |
| `R` | Đặt lại hệ 64 hạt, skin=0.4 và các bộ đếm |
| `S`, `B`, `G` | Đổi skin 0.4/0.8/1.2; dựng lại; bật/tắt grid |
| `F`, `A` | Giữ list cũ chỉ để thử bằng tay; đối chiếu với mọi cặp |
| `T`, `V` | So công việc 4 skin; kiểm chứng chuẩn 36 hạt × 200 bước |
| `Esc` | Thoát |

Kết quả A/T/V được in ra terminal. Các điều khiển chỉ xuất hiện từ checkpoint có chức năng tương ứng. Khi frozen, Space/N bị khóa; B dựng lại và rời frozen. Mỗi frame tối đa 8 bước, riêng 1.000 hạt tối đa 1; phần thời gian bỏ qua được báo, không cộng thành dt lớn.

## Tự tái hiện một danh sách sai

Nhấn R, P, F. Danh sách rỗng vì khoảng cách 3.2 lớn hơn listRadius=2.9. Nhấn phải 16 lần để đưa A thêm 0.8: khoảng cách còn 2.4, trong cutoff. Nhấn A: thiếu một cặp và sai force/U dù kết quả số vẫn hữu hạn. Nhấn B rồi A: danh sách mới cho kết quả khớp. Không tích phân với danh sách cố ý giữ sai.

## Phạm vi và kiểm chứng

- Lab yêu cầu skin>0 và listRadius nhỏ hơn nửa cạnh ngắn nhất; đây là giới hạn đơn giản hóa, không phải luật chung của mọi implementation.
- Cache dùng mốc unwrapped, cấu hình và generation. Nếu bổ sung thao tác đảo thứ tự hạt, tăng generation trước khi dùng list.
- Grid so với naive cả ở 2×2 cell, hộp chữ nhật và qua góc. Từng cặp chỉ xuất hiện một lần.
- Test stale list, ngưỡng nửa skin, nhiều vòng qua biên, invalidation và rollback sau drift.
- Ca chuẩn 36 hạt × 200 bước dt=0.002: F/U, unwrapped và v khớp all-pairs trong 1e-8; sai số năng lượng chuẩn hóa lớn nhất <1%, sai số động lượng cuối <1e-9.
- Ca công việc 64 hạt × 200 bước: đo số kiểm tra cặp, không đo mili giây. Bản all-pairs có 806.400 lượt; tính cả lần dựng đầu và các cặp bị loại ở force cutoff.
- Copy candidate, sort, drawing và audit không nằm trong buildChecks/forceChecks. Không dùng bảng này để khẳng định speedup thời gian thực.

Nguồn tham khảo: [LAMMPS — Neighbor lists](https://docs.lammps.org/Developer_par_neigh.html), [Neighbor rebuild settings](https://docs.lammps.org/neigh_modify.html), [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake).
