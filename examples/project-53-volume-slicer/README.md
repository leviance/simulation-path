# Project 53 — Volume Slice Workbench

Xây một công cụ C++20/SDL3 để khảo sát khối vật liệu 3D có lõi xoắn và ống rỗng. Người xem xoay khối, bỏ một góc và dời ba lát để lần theo chi tiết bên trong. Từ một lát XY tính trực tiếp, ta thêm mảng voxel thật, ba mặt cắt XY/XZ/YZ, window/level, trilinear, điểm chung và bộ kiểm độc lập.

Sản phẩm cuối mở **128³ = 2.097.152 mẫu double (16 MiB)**, không phải stack ảnh 2D giả lập volume. Có tùy chọn 64³ = 262.144 mẫu (2 MiB), năm dataset và các điều khiển ngay trong cửa sổ. Đây là dữ liệu tổng hợp [0,1], **không phải HU, ảnh CT đo được, phép tái tạo CT hay công cụ y khoa**.

## Trước khi xem lời giải

Hãy tự thử tạo một khối dữ liệu có vùng sáng bên trong, rồi làm cho người xem kéo được ba mặt phẳng và đọc scalar của một điểm. Đầu vào phải là một mảng 3D chung; ba ảnh không được tự tính từ ba bộ dữ liệu không liên quan.

Kết quả cần có khối cắt mở lớn và ba lát liên kết; camera độc lập với điểm đo. Thêm Sphere/Gaussian/Layers, nearest/trilinear, ba slider độc lập, voxel inspector và cách kiểm xem ảnh đang đọc đúng dữ liệu. Dành 90–120 phút tự thử, sau đó đi theo checkpoint nếu còn mắc ở một phần.

Kiến thức trước: SDL window/renderer/streaming texture/input từ Project 01–05, hệ tọa độ/vector và nội suy. Không cần OpenGL, DICOM, VTK, GPU compute hoặc dataset bên ngoài.

## Học theo từng bước

| Checkpoint | Phần tự xây | Kết quả quan sát |
| --- | --- | --- |
| starter | Shell SDL, layout, cleanup có sẵn | Chưa có ảnh lấy mẫu |
| 01 | Phantom → scalar image → RGBA → texture | Lát XY tại z=0 |
| 02 | Storage, tâm voxel, index, nearest | Khối 64³ thật; đổi N lên 128³ |
| 03 | Bảng trục, ba slider, physical aspect | XY/XZ/YZ, khối cắt mở và camera |
| 04 | Window/level, palette, histogram | Ảnh đổi, scalar gốc giữ nguyên |
| 05 | Tám mẫu và bảy lerp | Dời lát lẻ, so nearest/trilinear |
| 06 | Shared world point, capture, scan | Kéo crosshair và đồng bộ ba view |
| 07/final | Known fixtures, affine audit, scale | Mặc định 128³, kiểm hữu hạn |

Dự kiến 10–14 giờ: đọc khoảng 3 giờ, viết/chạy 5–7 giờ, kiểm và bài tập 2–4 giờ. Số bài theo công việc của sản phẩm, không phải khuôn cố định sáu bài.

## Build và chạy

CMake >=3.24, compiler C++20. Windows dùng Visual Studio 2022 Desktop development with C++. CMake mặc định lấy SDL **3.4.8** bằng FetchContent, khóa URL/SHA-256 và link SDL3::SDL3. ZIP chạy độc lập, không cần Node.js.

Từ thư mục có CMakeLists.txt:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Visual Studio: build/Release/project_53_final.exe. Target riêng: project_53_starter, project_53_checkpoint_1..7, project_53_final, project_53_tests. Chỉ muốn sản phẩm: không bật BUILD_CHECKPOINTS (mặc định OFF), build target project_53_final.

Linux/macOS single-config: configure với -DCMAKE_BUILD_TYPE=Debug hoặc Release vào hai build directory riêng; executable trong build directory đó. Không khai báo đã kiểm native trên một hệ điều hành chỉ vì CMake có hỗ trợ nó.

App nhận --frames=1..600 để smoke test hữu hạn và --capture=frame.bmp để xuất framebuffer đầu tiên. Có thể thêm --preset=0..4, --whole hoặc --dark để kiểm các góc trình bày. Checkpoint 07/final có --self-test: 17 frame sự kiện SDL tổng hợp qua event loop, tự thoát với mã lỗi nếu có kiểm thất bại. Chạy --self-test riêng, không kèm override preset/whole/dark. Không có tùy chọn thì chạy tương tác bình thường. Tùy chọn sai bị từ chối; không có vòng benchmark nền vô hạn.

```bash
build/Release/project_53_final.exe --self-test
build/Release/project_53_final.exe --frames=2 --capture=volume-slicer.bmp
```

## Điều khiển

- Năm nút dataset hoặc P: Material (Phantom trong enum), Sphere, Gaussian, Layers, Axis ramp.
- Từ checkpoint 03: kéo trên khối để orbit; wheel hoặc +/− để zoom; Ctrl+mũi tên/Q/E xoay camera; F về camera ban đầu. O/nút Whole/Cut đổi nguyên khối/cắt mở. Những thao tác này không dời điểm đo.
- N/nút N: đổi 64³/128³, giữ cùng vùng world và dataset.
- Ba slider dưới ảnh: XY đổi z, XZ đổi y, YZ đổi x. Có từ checkpoint 03; checkpoint 02 chỉ XY.
- 1/2/3: chọn active plane. PageUp/Down: dời cut 1 voxel; từ checkpoint 05 dời 0.1 voxel.
- Từ checkpoint 06: click/drag ảnh đổi hai tọa độ trong plane; mũi tên làm tương tự bằng bàn phím.
- W/S: tăng/giảm Level. A/D: giảm/tăng Width. C: xám/màu. H mở/đóng histogram. T đổi giao diện sáng/tối. Chuột kéo thanh tương ứng.
- L/nút sampler: nearest/trilinear, giữ cùng vị trí world.
- Space/nút Scan/Pause: quét 4 voxel/s rồi dừng ở tâm cuối. Đổi điều khiển khác dừng quét.
- R/Reset view: cursor về (0,0,0), camera ban đầu, cắt mở, XY active, Level=.5/Width=1, paused. Màu bật từ checkpoint 04, trilinear bật từ checkpoint 05. **Giữ dataset và resolution**; theme/histogram không bị đổi.
- V/Check: duyệt range dữ liệu và kiểm 16 điểm affine riêng, hiển thị PASS/FAIL. Không thay CTest.
- Esc: thoát. Mất focus/minimize/reset kết thúc capture, dừng quét, không tự resume.

UI C++ dùng ASCII qua SDL_RenderDebugText (bitmap font, không hỗ trợ chữ Việt có dấu); bài học và Canvas dùng tiếng Việt. Đây là lựa chọn tránh thêm font/library vào phần học scalar, không phải khuyến nghị dùng debug font cho sản phẩm thương mại.

## Quy ước dữ liệu và hình ảnh

Khối có extent **(3.2,3.84,4.8)** world units, tâm tại gốc. Không mặc định mm hoặc đơn vị density vật lý. Grid N³ có spacing=extent/N: voxel không lập phương trong world. Mẫu ở tâm:

- lower = -count * spacing / 2
- world(i) = lower + (i + 0.5) * spacing
- grid(world) = (world - lower) / spacing - 0.5
- index = x + nx * (y + ny * z), x nhanh nhất.

Material/Phantom: khối bo góc có lõi sáng chạy xoắn quanh z, ống rỗng lệch tâm và một marker nhỏ. Đây là công thức tạo dữ liệu thử, không mô phỏng phép đo vật liệu. Sphere: bán kính 1, giá trị 0/1. Gaussian: exp(-sum((p/r)^2)), r=.85, **r không phải sigma**. Layers: z<-0.8 → .15; z<.8 → .5; còn lại .85. Ramp: (x+2y+4z)/(nx-1+2(ny-1)+4(nz-1)), singleton bằng 0.

XY: x phải/y lên, giữ z. XZ: x phải/z lên, giữ y. YZ: y phải/z lên, giữ x. Không phải radiological/patient orientation. Fit ảnh dùng count*spacing; letterbox không chọn được.

Khối cắt mở bỏ vùng x>cursor.x, y<cursor.y, z>cursor.z. Ba mặt lộ ra dùng lại raw scalar và RGBA của ba ảnh, có depth test với vỏ. Vỏ xám là mesh tham chiếu từ isovalue .18/stride 3, không phải toàn bộ scalar field. Bộ dựng mesh thêm zero padding tại physical box để đóng bề mặt của cả Layers/Ramp; **không sửa Volume**. Ảnh 256² vẫn lấy mẫu mảng N³ đầy đủ. Không dùng mesh để đo; không có tích phân alpha, MIP hoặc volume ray marching.

Nearest floor(g+.5), tie chọn index cao. Trilinear dùng low/high/fraction từng trục, bảy lerp từ tám mẫu. Ngoài physical box trả miss; trong nửa voxel ngoài cùng replicate mẫu biên. Không dùng clamp để biến điểm ngoài thành hit. Singleton hợp lệ; count 1..128, spacing dương hữu hạn. Giao diện chỉ cho cursor nằm giữa tâm đầu/cuối.

Sampling trước window/level trước palette trước RGBA. SDL_PIXELFORMAT_RGBA32 được ghi từng byte, memcpy mỗi row theo pitch thật. C++ và Canvas cùng dùng 256²/view; không nhầm resolution ảnh với N³ của dữ liệu. Histogram 64 bin dữ liệu gốc, trục count log1p. Cache raw slice và RGBA riêng; chỉ đổi dataset/resolution mới fillVolume, dựng mesh và đếm toàn khối. Scene cũng chỉ dựng lại khi input liên quan đổi. Canvas giảm bitmap phối cảnh lúc drag, không giảm độ phân giải dữ liệu.

## Cấu trúc source

- include/model.hpp: Grid, tọa độ, bảng trục, field tổng hợp.
- volume.hpp / sampling.hpp: storage, bounds, nearest/trilinear.
- display.hpp: mặt cắt scalar và display mapping.
- statistics.hpp / diagnostics.hpp: histogram và oracle audit.
- state.hpp / input.hpp: state, reset, phím, slider, drag.
- layout.hpp / controls.hpp: geometry dùng chung cho vẽ/hit-test.
- geometry.hpp / camera.hpp: vector và camera z-up của phần trình bày.
- surface.hpp / cutaway-clip.hpp / cutaway-render.hpp: vỏ tham chiếu, bỏ góc và rasterizer CPU được cung cấp để tập trung vào phần học volume/slice.
- ui.hpp / view.hpp: UI, texture/cache và dashboard.
- app-check.hpp: chuỗi sự kiện tự kiểm có giới hạn; không giả lập driver input hệ điều hành.
- src/main.cpp: sở hữu SDL resource và event/render loop.
- tests/tests.cpp: toán/storage/layout, không mở window.

Trong repository khóa học, source-template là nguồn chuẩn; starter/checkpoints/final/CMake/source JSON/ZIP được sinh và nằm ngoài Git. Trong ZIP, tất cả snapshot đã sẵn để build; không cần script generator. Code block lấy đúng marker của đúng checkpoint, không lấy API tương lai chèn vào bài trước.

## Kiểm chứng và checklist

CTest dùng check giữ hiệu lực khi NDEBUG bật, không dùng assert. Có fixture 3×2×4 (giá trị 100z+10y+x, địa chỉ cuối23, scalar312, trung điểm55.5), centre/biên/outside, affine/hằng/singleton, index/spacing, physical aspect/picking, RGBA/window không sửa scalar, scale64³/128³, histogram và đối xứng Sphere.

Audit V chỉ kiểm range hữu hạn dataset hiện tại + fixture affine 4×3×5 riêng/16 điểm; buffer sai shape/count không thể PASS. Tolerance scalar1e-12 cho fixture double nhỏ. CTest còn kiểm mesh không sửa scalar, normal hữu hạn và diện tích clipping có đáp án tính tay. Không diễn giải thành sai số y khoa hoặc chứng nhận mọi hình ảnh đúng.

Kiểm bằng thao tác thật:

1. Mở final thấy 128³,2.097.152 mẫu,16MiB; khối cắt mở lớn, đủ ba ảnh và inspector.
2. Nguyên khối/cắt mở khác nhau rõ, orbit/zoom không dời cursor; dời XY thấy lõi xoắn chạy quanh ống rỗng. Màu mặt cắt khớp vùng tương ứng trên ảnh 2D.
2. Sphere lát giữa tròn, thu nhỏ khi ra xa tâm; Layers XY đồng mức, XZ/YZ thành dải; Gaussian tâm sáng nhất.
3. Kéo ba slider xác nhận đổi z/y/x. Dời probe trên mỗi view; đối chiếu world/grid/index và hình định hướng.
4. So nearest/trilinear tại cùng point, đổi contrast/palette nhưng scalar và histogram giữ nguyên.
5. Kéo ra ngoài ảnh rồi thả: không stuck drag. Resize và letterbox không làm pick lệch.
6. Scan/pause/reset/blur; reset giữ dataset/resolution, cuối scan không tiếp tục chạy.
7. Keyboard tương đương với controls; V có kết quả hữu hạn.

Unit test không kiểm OS mouse capture hoặc chất lượng hình ảnh. --self-test kiểm đường đi của sự kiện SDL tổng hợp, không xác nhận phím/chuột vật lý. Web Canvas kiểm riêng, không thay native executable. Linux/macOS cần nghiệm thu trên hệ đó trước khi tuyên bố hỗ trợ đã kiểm.

## Bài tiếp theo

Project 54 tích lũy nhiều scalar dọc tia bằng volume ray marching. Project 53 chỉ lấy mẫu tại một mặt phẳng. Không thêm ray marching/DICOM/MIP để che thiếu sót của slice viewer và không gọi lát cắt là CT reconstruction.
