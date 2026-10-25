# Project 30 — Khảo sát point cloud 3D bằng Octree

Tự xây công cụ đọc và khảo sát dữ liệu phòng/nhà xưởng: mở CSV, di chuyển camera trong không gian 3D, chọn vùng hộp/cầu, lọc theo chiều cao rồi xuất tập điểm cần dùng. Octree hỗ trợ query và frustum culling; tắt debug vẫn dùng công cụ bình thường.

## Học để làm gì?

Ở Project 29, Quadtree phục vụ chỉnh sửa những hình có diện tích trên bản đồ. Bài này chuyển sang khảo sát dữ liệu point cloud: mỗi point có vị trí X/Y/Z và ID, người dùng cần lấy dữ liệu chính xác thay vì chỉ nhìn hộp cây. Bạn tự viết Octree, phép thử hình học, thống kê và CPU presentation; không dùng point-cloud library hay GPU.

Đọc trước yêu cầu sản phẩm rồi dành 5–8 giờ tự thử. 11 bài cần khoảng 26–34 giờ cho đọc, viết và kiểm chứng, không tính setup/build. Các phần framebuffer, clipping, camera cơ bản từ Project 04/11/14 được cung cấp làm khung; các bài nói rõ phần đang thêm.

## Môi trường và build

C++20, CMake 3.24+, Windows dùng Visual Studio 2022 Desktop development with C++. CMake FetchContent khóa SDL 3.4.8 bằng URL/SHA-256 và link SDL3::SDL3. Configure lần đầu cần mạng; bản ZIP không cần Node.js hoặc website.

Từ thư mục giải nén có CMakeLists.txt:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_30_final.exe
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

macOS/Linux với generator single-config:

```bash
cmake -S . -B build-release -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON
cmake --build build-release --parallel 2
ctest --test-dir build-release --output-on-failure --timeout 30
./build-release/project_30_final
```

Final/tests là mặc định. BUILD_CHECKPOINTS mở thêm project_30_starter và project_30_checkpoint_1…11. Tên thư mục checkpoints/01…11 có số 0 đầu, tên target dùng 1…11. Khi tự làm trong starter, build target project_30_starter; muốn tests kiểm lời giải của bạn, đổi include directory của project_30_tests trong CMake ZIP từ final/include sang starter/include.

## Dataset và schema

CSV v1 là plain UTF-8/ASCII với header **id,x,y,z**. Mỗi hàng đúng bốn cột; ID uint32 duy nhất, không tự đánh lại theo thứ tự hàng. Tọa độ double hữu hạn trong ±10.000 mét. +Y hướng lên, X/Z nằm trên sàn. Dấu chấm thập phân, không thêm khoảng trắng/quote/BOM/comment; LF hoặc CRLF được nhận. Empty cloud hợp lệ: file chỉ có header. ID khác nhau được phép có cùng vị trí.

Giới hạn: 16 MiB/file, 200.000 điểm, 511 byte/hàng trước newline. Header/schema/token lỗi, ID trùng và NaN/Inf bị từ chối có số dòng. Parser nhận dữ liệu vào vector tạm, không trả nửa file đã đọc.

assets/room-fixture.csv có 14 điểm ở sàn/tường/góc phòng và hai ID trùng vị trí để kiểm độc lập. Không dùng fixture nhỏ làm dataset nghiệm thu. Recipe makeRoom sinh **100.000 điểm** từ seed 30 trên sàn, tường, các tầng kệ và cột tròn; mặt sàn Y=0 có đúng 20.000 điểm. Đây là dữ liệu tổng hợp do dự án tạo, không chứa dữ liệu quét cá nhân hoặc asset bên thứ ba. Có preset đều trong thể tích để so phân bố.

Mặc định lần chạy bình thường tạo .runtime/room-100000.csv nếu chưa có, rồi mở bằng cùng parser. Không ghi đè file đã có. Có thể tạo dataset riêng và chỉ định input:

```powershell
.\build\Release\project_30_final.exe --generate-room room.csv
.\build\Release\project_30_final.exe --input room.csv
.\build\Release\project_30_final.exe --input assets/room-fixture.csv
```

Chạy từ thư mục gói ZIP có assets hoặc truyền đường dẫn đúng. --generate-room từ chối output đã tồn tại. .runtime chứa dữ liệu/export sinh khi chạy; giữ thư mục này và build ngoài Git. CSV lớn được tạo từ recipe, không cần commit hàng trăm nghìn dòng dữ liệu sinh.

## Mốc học

| Mốc | Phần thêm vào khung |
| --- | --- |
| Starter | Window/event loop, framebuffer/depth buffer, camera và kiểu dữ liệu; chưa nạp điểm |
| 01 | Parser CSV, dataset phòng 100.000 điểm và đường vẽ |
| 02 | Điều khiển camera orbit/free-fly/pan/zoom |
| 03 | Vùng box/sphere trong world, brute reference |
| 04 | Node storage, split tám child và giới hạn cây |
| 05 | Indexed box/sphere query và counters |
| 06 | Frustum culling bằng cùng Octree |
| 07 | Lọc Y và count/bounds/centroid |
| 08 | Xuất CSV, precision và đọc lại |
| 09 | Reference/topology job và fixture độc lập |
| 10 | Benchmark hữu hạn, thời gian/memory riêng |
| 11 | Ghép, build độc lập và nghiệm thu toàn quy trình |

## Điều khiển bản SDL

Click vào window trước khi dùng phím. HUD ASCII liệt kê controls; tính năng mở dần theo checkpoint.

- Kéo trái: orbit hoặc nhìn quanh ở free-fly; kéo phải: pan. Wheel: đổi distance ở orbit hoặc đi tiến/lùi ở free-fly.
- F: đổi orbit/free-fly, giữ eye/hướng nhìn. WASD/QE: dịch camera; free-fly giữ phím để đi (5 m/s, dt chặn 0,05 s). Home: camera nhìn toàn dataset.
- 1/2: chọn hộp/cầu. J/L đổi tâm X; I/K đổi Y; U/O đổi Z. [ ] giảm/tăng nửa cạnh hộp và bán kính cầu. Các giá trị dùng mét.
- Delete/Backspace: xóa selection, không xóa dataset.
- H: bật khoảng Y [0,3] hoặc bỏ lọc. PageUp/PageDown đổi Y lớn nhất 0,25 m; giữ Shift đổi Y nhỏ nhất. Filter không reset camera.
- M: Tree/Brute cho selection trên cùng scene. C: bật/tắt frustum pruning. T: node debug.
- X: xuất selection vào .runtime/selection-N.csv (tên mới). Mở lại bằng --input để khảo sát kết quả.
- V: reference/topology hiện tại; B: benchmark; Space: pause/resume job.
- R: mở lại input/preset; N: đổi phòng/đều. Escape: hủy gesture/job, nếu không có thao tác thì thoát.

Capture chỉ giữ trong gesture và nhận đúng owner/button; áp dụng sample button-up cuối. Escape rollback camera về lúc down; focus lost/resize nhả capture, hủy job. Canvas có điều khiển tương đương bằng form/phím, DPR, pointer capture, Pause/Reset và reduced-motion; không dùng ray picking trong bản chuẩn.

## Quy tắc hình học và index

Root cube được suy từ bounds dataset, pad 1e-6 m; không ép world về [0,1]. Equality ở split đi positive half; bit X=1, Y=2, Z=4. Mỗi point index lưu một lần trong leaf, internal nodes rỗng. Không giữ reference qua vector reallocation.

Capacity chuẩn 32 (test 4–128), depth tối đa 14, minimum child half 0,0001 m, tối đa 262.145 node. Nếu guard chặn split, leaf có thể vượt capacity nhưng vẫn giữ đủ dữ liệu. Dataset/index bất biến giữa các lần mở/reset nên không cần dynamic insert/remove.

Box/sphere/height filter nhận cả boundary. AABB–sphere dùng closest point. Frustum dùng sáu plane hướng vào trong và positive vertex để prune bảo thủ; point boundary dùng tolerance 1e-9 nhân hệ số plane. Filter áp dụng cả selection lẫn viewport.

Selection trả pointIndex rồi mới lấy ID khi export. Centroid/bounds lấy từ điểm hit thật, không lấy bounds node/vùng. Empty selection có count 0 và không có thống kê để hiển thị; không chia cho 0. So centroid với oracle dùng absolute tolerance 1e-9 m; fixture nhỏ có đáp án tính tay.

Renderer CPU vẽ mọi visible point qua perspective/depth buffer, màu theo Y và depth cue; point selected lớn hơn và màu vàng. Tie depth dùng ID nhỏ hơn để thứ tự traversal không đổi ảnh. Native framebuffer cố định 1100×570 với logical presentation/letterbox; resize không cấp phát vô hạn. Wireframe query được clip theo frustum, debug giới hạn 2.048 hộp. Culling không lấy mẫu dữ liệu. Canvas raster giới hạn 2 triệu pixel rồi phóng theo DPR; giới hạn độ phân giải không giảm số điểm xử lý.

## Export và kiểm chứng

C++ ghi CSV double bằng max_digits10/classic locale; đọc lại giữ nguyên ID và số double. JavaScript dùng định dạng round-trip của Number; trao đổi giữa runtime so tọa độ với absolute tolerance 1e-12 m, không yêu cầu chuỗi CSV giống byte. Empty export chỉ có header và đọc lại được.

```powershell
.\build\Debug\project_30_final.exe --smoke
.\build\Release\project_30_final.exe --smoke-workflow
.\build\Release\project_30_final.exe --benchmark
```

--smoke chạy bốn frame rồi thoát, có guard 10 giây sau init; runner bên ngoài vẫn phải có timeout cho toàn tiến trình. --smoke-workflow (mốc 08+) chạy N=100000 qua đọc CSV → chọn/lọc sàn → thống kê → serialize/export → đọc lại → render; kiểm ID/tọa độ và drawn=visible. --benchmark (mốc 10+) không mở window, tối đa 10.000 ticks/15 giây.

CTest không dùng assert phụ thuộc NDEBUG. Có parser lỗi, fixture ID không liên tiếp, point boundary/coincident/negative/split/empty, sphere/box/height oracle độc lập, centroid tính tay, camera-mode transition, frustum near/far/four sides và so **hai framebuffer CPU thật** tại cùng camera. Full workflow và preset đều chạy đủ 100.000 điểm. CTest, build, smoke và desktop QA là các loại bằng chứng riêng.

## Đọc số đo đúng cách

Benchmark giữ cùng 16 vùng, hai warm-up và năm mẫu mỗi phương pháp, median/min/max ms/batch. Checksum không phụ thuộc hit order chỉ giúp kiểm workload, không thay so tập ID. Build, query selection, viewport culling và CPU point render có số riêng. CPU render không gồm texture upload/present.

C++ memory là capacity(points/nodes/indices) nhân sizeof, chỉ ước tính backing storage; không phải RSS, chưa cộng allocator, temporary query/job, SDL và framebuffer. Mỗi native raster dùng khoảng 1100×570×16 byte cho RGBA/depth/owner, bên cạnh dataset/index. Không gọi số object JS tương đương byte C++. Ghi máy, compiler/build configuration, N/seed, viewport và workload khi công bố benchmark.

Validation/benchmark chia việc qua tick khoảng 6 ms giữa query; một query riêng vẫn có thể vượt mức ấy. Thay workload hủy job cũ; Pause không khóa camera. Không hứa FPS/speedup chung: vùng gần toàn root hoặc dữ liệu tập trung có thể làm traversal không có lợi.

## Cấu trúc source

- model/: point, geometry, region và dataset recipe.
- io/: CSV schema, validation, mở file và export.
- spatial/: Octree storage/build/query, brute và counters.
- survey/: selection/statistics, scene và jobs hữu hạn.
- view/: camera/frustum, framebuffer/depth và hình khảo sát.
- app/: SDL lifecycle, input, controls và HUD.
- tests/: kiểm code thuần, không mở window.
- assets/: fixture nhỏ độc lập, không nhân bản vào mỗi checkpoint.

ZIP có đủ starter/checkpoint/final/tests/assets. Không chép node_modules, SDL vendor hoặc binary build vào Git.
