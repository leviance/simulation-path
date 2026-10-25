# Project 29 — Biên tập bản đồ 2D lớn bằng Quadtree

Xây một Map Editor dùng C++20/SDL3: nhà, cây và công viên có diện tích thật, camera pan/zoom, chọn vùng, thêm/xóa và di chuyển cả nhóm. Quadtree phục vụ selection lẫn viewport culling trên cùng dữ liệu.

## Học để làm gì?

Bạn đã thấy Spatial Grid giúp Boids tìm hàng xóm ở Project 28. Bài này đặt cấu trúc không gian vào một công cụ khác: tìm và sửa đối tượng trên bản đồ lớn. Điều quan trọng không chỉ là query nhanh, mà là giữ index đúng sau mỗi lần chỉnh sửa.

Trước khi đọc lời giải, thử dựng editor có 100.000 đối tượng; cho brute force trả kết quả đúng rồi mới thay đường query. Dành khoảng 23–30 giờ cho 11 bài, chưa tính thử thách.

## Yêu cầu môi trường

- CMake 3.24+, compiler C++20; Windows dùng Visual Studio 2022 Desktop development with C++.
- SDL 3.4.8 được FetchContent tải bằng URL và SHA-256 cố định, link qua SDL3::SDL3.
- Lần configure đầu cần mạng; không cần repository website hoặc source project khác.
- Không có assets bên ngoài phải tải thêm; dataset được sinh từ seed lúc chạy.

## Build và chạy

Từ thư mục có CMakeLists.txt, PowerShell:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
.\build\Debug\project_29_final.exe
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Final và tests là mặc định. BUILD_CHECKPOINTS mở thêm project_29_starter và project_29_checkpoint_1 đến project_29_checkpoint_11. Thư mục checkpoint dùng 01…11, tên target dùng 1…11.

macOS/Linux với generator single-config:

```bash
cmake -S . -B build-release -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON
cmake --build build-release --parallel 2
ctest --test-dir build-release --output-on-failure --timeout 30
./build-release/project_29_final
```

Để tự viết từ starter, build target project_29_starter. Nếu muốn tests kiểm bản của bạn, đổi include directory của project_29_tests từ final/include sang starter/include trong CMakeLists.txt của ZIP. Khi chưa hoàn thiện các bài sau, test toàn tính năng chưa thể pass.

## Các mốc học

| Mốc | Phần tự xây |
| --- | --- |
| Starter | Khung SDL, framebuffer/clipping, kiểu dữ liệu, camera cơ bản, root bucket và brute query; bản đồ trống |
| 01 | Sinh/vẽ 100.000 Object có ID, kind và AABB |
| 02 | Camera pan và cursor-anchored zoom |
| 03 | Click topmost / range selection theo giao AABB |
| 04 | Chia Quadtree và redistribute, giữ hình cắt split ở cha |
| 05 | Query/pruning cho selection |
| 06 | Dùng cùng index cho viewport culling |
| 07 | Insert/remove/update theo ID, rollback cả nhóm |
| 08 | Kéo nhóm bằng preview, pointer ownership/cancel/final-up |
| 09 | Kiểm topology và so query với brute trên state hiện tại |
| 10 | Benchmark hữu hạn, tách query/update/culling/build |
| 11 | Ghép ứng dụng, tests và nghiệm thu; giữ thuật toán mốc 10 |

## Điều khiển bản SDL

Click window trước khi dùng phím. HUD dùng chữ ASCII do SDL_RenderDebugText, bài học trên web giải thích bằng tiếng Việt.

- 1: Select; click chọn ID lớn nhất trong vùng chồng, kéo chọn các AABB giao vùng; Shift-click bật/tắt ID, Shift-drag thêm hit.
- 2: Pan. Wheel hoặc +/- zoom; wheel giữ world point dưới con trỏ. Home về vùng có dữ liệu.
- 3: Move group; kéo một thành viên đang chọn để dời cả nhóm, kéo hình chưa chọn để dời hình đó.
- 4: Add tại vị trí thả; A thêm ở tâm camera, T đổi loại House/Tree/Park.
- Shift+mũi tên: dời selection 8 world unit; mũi tên thường: pan 64 pixel logic.
- Delete/Backspace: xóa selection; C: chọn toàn viewport.
- M: Tree/Brute, giữ camera/world/selection. F: node debug; [ và ]: capacity 4…64 rồi rebuild.
- R: reset; P: seed tiếp theo; L: Districts/Clustered/Large; F2: preset 10.000/100.000.
- V: kiểm reference/topology; B: benchmark; Escape: hủy gesture/job đang chạy, nếu không có công việc thì thoát.

Các phím được mở dần theo checkpoint. Resize/mất focus hủy gesture/job và nhả capture. Mouse capture chỉ được giữ trong lúc kéo, không khóa chuột cả phiên.

## Mô hình và ranh giới

Root cố định [-16384,16384]², +X sang phải, +Y xuống dưới. Object phải có kích thước dương, hữu hạn và nằm trọn root. Query điểm được rộng/cao 0. Giao AABB nhận cả chạm cạnh, kể cả root maximum và split.

Mỗi ID uint32 lưu đúng một lần. Hình nằm gọn trong con mới xuống con; hình cắt split ở cha. location trỏ tới bucket giữ ID. Không merge node sau xóa; rebuild chủ động để làm gọn/đổi capacity. Giới hạn: 150.000 object, depth 12, minimum child size 4, tối đa 262.145 node. ID đã xóa không được tái sử dụng.

Group move kiểm mọi proposal trước khi ghi; vượt root từ chối toàn nhóm. Preview không sửa dữ liệu/index; inverse viewport query nhận cả hình được kéo từ ngoài vào. Hình vẽ nằm trong đúng AABB; selection không phải pixel-perfect picking. Đường phố là nền không có ID.

Districts có 400 cột với spacing 64; Clustered gom bốn vùng dày; Large có nhiều hình cắt quadrant. N là số object thật trong world. Renderer vẽ đủ mọi ID visible, không dùng mẫu nhỏ; chỉ bỏ chi tiết mái/cửa khi quá nhỏ. Debug tối đa 4.096 hộp node không làm giảm query/dataset.

## Kiểm chứng và đo

```powershell
.\build\Debug\project_29_final.exe --smoke
.\build\Release\project_29_final.exe --smoke-workflow
.\build\Release\project_29_final.exe --benchmark
```

--smoke chạy 6 frame, kiểm drawn=visible rồi thoát; có guard 2.000 ticks/10 giây. --smoke-workflow (mốc 08+) chạy chọn → move → thêm → xóa trên N=100000, đối chiếu query sau các bước rồi vẽ vùng đã sửa. --benchmark (mốc 10+) không tạo window, có guard 20.000 ticks/30 giây. Lỗi trả EXIT_FAILURE.

CTest dùng check/exit code, không dùng assert phụ thuộc NDEBUG. Oracle interval-gap độc lập kiểm split/root edge, chồng hình, outside, object lớn, group rollback, node budget, ID/location, camera, gesture và full workflow 100.000.

V/B chia việc qua từng tick khoảng 6 ms giữa các query; một query riêng vẫn có thể vượt ngân sách ấy. Escape hủy được. Sửa data/index làm revision cũ hết hiệu lực. Benchmark giữ cùng 16 boxes, 2 warm-up + 5 samples/method, báo median/min/max ms/batch, candidates và checksum. Không gộp sort/render/present vào thời gian query; build, update và viewport culling có số riêng. Checksum không thay thế so tập ID. Khu quá dày hoặc nhiều hình lớn có thể làm Tree không thắng Brute.

CTest/smoke không thay cho desktop QA: tự kiểm tool, pan/zoom, Shift selection, drag/cancel, blur, resize và Tree/Brute trên cùng camera.

## Tổ chức source

- model/: hình học, camera, dataset có seed.
- spatial/: Quadtree, brute reference, location và revision.
- editor/: document/selection, gesture, validation và benchmark jobs.
- graphics/: framebuffer, clipping và hình bản đồ.
- app/: SDL lifecycle, event routing, controls và HUD.
- tests/: code thuần, không cần window.

ZIP có đủ starter, checkpoint, final và tests. Không đưa build/, thư viện SDL tải về hoặc binary vào Git.

Tham khảo: [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake), [đổi tọa độ input](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates), [mouse capture](https://wiki.libsdl.org/SDL3/SDL_CaptureMouse).

