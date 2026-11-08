# Project 39 — Khám phá thành phố 3D với một triệu vật thể

Một ứng dụng C++20/SDL3/OpenGL 4.3 có thể đi ở tầm đường phố hoặc bay trên các khu nhà. Scene được tạo lại từ seed; preset nghiệm thu có **1.000.003 object records thật**, không phải một triệu tam giác hoặc pixel.

## Bạn sẽ tự xây những gì?

Hãy bắt đầu bằng thử thách ở trang tổng quan trước khi đọc hướng dẫn. Đích đến là đường dữ liệu hoàn chỉnh:

`object bounds → visibility mask → sum/min/max reduction → hierarchical exclusive scan → compact IDs → GPU indirect commands → instanced renderer`

Từ một khu phố chạy được, 12 bài lần lượt nối từng pass vào chính renderer đó. Camera, GL loader, mesh atlas và font bitmap là scaffold được cung cấp và giải thích; việc lọc, reduction, scan, compaction và sinh command do bạn tự viết. Không cần ghép thủ công source từ các ZIP trước. Kiến thức nền cần có: camera/mesh/OpenGL từ Project 34 và SSBO/compute từ Project 37; Project 38 không phải điều kiện bắt buộc.

`starter/`, `checkpoints/01` … `checkpoints/12` và `final/` chạy độc lập. Các bài đầu dùng danh sách identity tạo một lần trên CPU để đã có cảnh làm mốc. Từ checkpoint 09, main viewport chỉ dùng IDs và commands do GPU sinh mỗi frame. Danh sách identity còn được dùng riêng trong camera phụ để nhìn cả những vật thể bị camera chính loại; nó không thay đường culling của main viewport.

## Build và chạy

Cần CMake 3.24+, compiler C++20 (Windows: Visual Studio 2022, Desktop development with C++) và driver hỗ trợ OpenGL 4.3. SDL **3.4.8** được khóa URL/SHA-256 qua FetchContent; mọi target link `SDL3::SDL3`.

```bash
cmake -S . -B build
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Chạy `build/Release/project_39_final.exe` trên Windows. Với generator single-config, đặt `-DCMAKE_BUILD_TYPE=Release`, executable nằm trực tiếp trong `build/`. Khi làm theo bài, configure thêm `-DBUILD_CHECKPOINTS=ON`, rồi build target `project_39_checkpoint_1` … `project_39_checkpoint_12`. Đường mặc định chỉ build final và CPU tests.

CI có thể truyền `-DCOURSE_USE_INSTALLED_SDL3=ON -DSDL3_DIR=<SDL 3.4.8 config directory>` để dùng đúng package đã build, không nâng phiên bản. Shader được tìm trong snapshot trước; khi chuyển executable, giữ thư mục `shaders/<target-name>` cạnh nó.

## Điều khiển

- `WASD`: tiến/lùi/sang ngang; `Q/E`: hạ/nâng; giữ `Shift` để đi nhanh.
- Kéo chuột phải hoặc phím mũi tên: đổi hướng nhìn. Camera không thay đổi object data.
- `G`: xuống tầm phố; `H`: góc cao ban đầu; `[`/`]` hoặc wheel: đổi FOV 30–100°.
- `C`: culling on/off trên cùng scene/camera; `Tab`: màu accepted/rejected và camera phụ nhìn frustum.
- Click trái hoặc `Enter` ở tâm ảnh: chọn bounding sphere gần nhất; công việc picking chia lô, có thể hủy. Đây không phải phép giao ray với từng tam giác mesh.
- `1/2/3`: 257 / 65.537 / 1.000.003 records; `N`: seed kế; `R`: cùng seed/count và camera ban đầu.
- `P`: chuyến bay tự động; `Space`: dừng/tiếp tục **chuyến bay**, không khóa camera hay tắt compute. Thành phố là scene tĩnh, không phải mô phỏng chuyển động các tòa nhà.
- `V`: 12 batch kiểm GPU nhỏ, sáu camera × culling on/off. `B`: benchmark sáu camera × hai chế độ, hai warm-up và chín sample mỗi chế độ.
- `X`: hủy generation, picking, validation hoặc benchmark; `Esc`: thoát.

## Đọc số liệu đúng nghĩa

- **Resident**: số record của scene đã commit. **Tested**: số bounds thật sự được cull shader xét; tại preset nghiệm thu phải bằng 1.000.003.
- **Accepted**: sphere không nằm hoàn toàn ngoài một trong sáu plane (hoặc toàn bộ N khi culling off). Đây không phải số vật thể có pixel cuối cùng: tòa nhà trong frustum vẫn có thể bị tòa khác che.
- **Submitted**: tổng `instanceCount` trong ba commands. Culling là **frustum culling**, không phải occlusion culling; không có LOD/streaming ẩn.
- IDs trong danh sách compact là **record indices** để truy cập SSBO; `Object.id` vẫn là định danh ổn định, có thể rời rạc. Thứ tự là mesh-major, rồi record index tăng dần. Không atomic append.
- Empty set: counts = 0, minDistance = +infinity, maxDistance = -infinity, minID = UINT_MAX, maxID = 0; UI phải hiểu là tập rỗng, không có khoảng cách hữu hạn giả.
- GPU timing dùng query có kết quả sẵn, tách cull, reduction, scan, compaction, commands và draw. CPU submit-frame time gồm event/job/UI và submit trước present/vsync. `medianWholeFrameMs` là CPU frame gồm present-return, còn `medianFrameToGpuReadyMs` đo wall time từ đầu frame tới lúc query hoàn tất, gồm các lượt polling chờ GPU. Không đổi nhãn enqueue thành GPU execution time. Build/generation/upload/readback không nằm trong kernel timing.

## Kiểm chứng độc lập và giới hạn an toàn

`ctest` không mở window. CPU fixtures kiểm sáu plane, normalized camera, sparse IDs, empty set, integer scan/overflow, commands, seed/bounds và chunk generation. `--verify` mới mở context ẩn để kiểm GPU thật: primitive N=0/1/7/257/513/262145; all-visible→mixed→empty; sentinel ở cuối buffers; sau đó đối chiếu mask/prefix/ID trên **toàn scene** 1.000.003 records và so framebuffer culling on/off ở sáu camera. Bản final còn đẩy event vào cùng SDL queue để kiểm toggle/FOV/preset/tour/pause/inset picking/V/B/Cancel/R/N và giữ scene hợp lệ khi candidate lỗi; đây là integration test, không thay việc đánh giá cảm giác chuột hay bố cục bằng mắt. Full readback chỉ có trong đường nghiệm thu, không có trong frame loop. N nhỏ chỉ báo `CORRECTNESS PASS`, không được gọi là đạt mốc một triệu.

```bash
build/Release/project_39_final.exe --verify
build/Release/project_39_final.exe --benchmark
build/Release/project_39_final.exe --benchmark --count 257
```

Integer counts/offsets exact trong miền không overflow. Khoảng cách có tolerance `0.002 world units + 2e-5 * abs(reference)`; NaN không được chấp nhận. Sum/min/max độc lập dùng dữ liệu uint tùy ý, không chỉ đếm các bit 0/1.

Ứng dụng kiểm shared memory, workgroup/SSBO limits, size và allocation trước khi commit. Giới hạn là 2.000.003 records, 256 MiB GPU-buffer cho mỗi candidate và 512 MiB ngân sách ước lượng scene/transaction. Một scene cũ và candidate có thể cùng tồn tại lúc đổi dữ liệu. Generation/picking tối đa 8.192 records mỗi tick. Validation runtime tối đa 10 giây, fence mỗi batch tối đa 5 giây; benchmark tối đa 25 giây và hủy giữa sample. Đổi N/seed thất bại phải giữ scene cũ. Giới hạn tài nguyên không phải cam kết FPS; máy không đủ capability không được nhận là đã đạt preset lớn.

Benchmark giữ seed, scene, camera snapshots và build; báo renderer/driver/N, hai warm-up, chín sample, median/MAD và từng stage. Dùng Release. Giữ cả preset nhỏ để thấy overhead compute; không kết luận GPU/culling luôn nhanh hơn.

Khi chạy tự động, vẫn bọc executable bằng watchdog tiến trình bên ngoài; deadline trong app không ngắt được driver bị kẹt. Không chạy benchmark vô hạn hoặc đưa window vào CTest. Canvas chỉ là mô hình CPU nhỏ để học, không thay bằng chứng GPU một triệu object.
