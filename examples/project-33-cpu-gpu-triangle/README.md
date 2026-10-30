# Project 33 — CPU/GPU Triangle

Project này vẽ cùng một tam giác bằng hai pipeline trong cùng cửa sổ SDL3/OpenGL 3.3 Core:

- panel trái: C++ transform + CPU barycentric rasterizer → RGBA8 framebuffer → OpenGL texture;
- panel phải: cùng vertex data + GLSL vertex/fragment shader → GPU rasterizer;
- phím `P`: đọc color ở triangle centroid bằng `glReadPixels` và so với CPU expected color.

Mục tiêu không phải chứng minh GPU luôn nhanh hơn. Ta dùng triangle nhỏ để nối từng stage OpenGL với renderer CPU đã tự xây ở Project 15–16.

## Cách học và phần được cung cấp

Hãy thử tự dựng hai vùng vẽ dùng chung ba đỉnh trước khi mở lời giải. Khi di chuyển một đỉnh, cả hai hình phải đổi; khi nhấn P, bạn phải giải thích được pixel nào được đọc và màu tham chiếu được tính ở đâu. Đây là bài chuyển tiếp pipeline, không cần thêm camera 3D, ánh sáng hoặc model để làm sản phẩm lớn hơn.

Chín bài đi từ context → compile/link → VBO/VAO → renderer CPU → transform → viewport → nội suy → readback → chỉnh sửa và nghiệm thu. Mỗi checkpoint chạy độc lập; không cần ghép các ZIP trước đó. Học khoảng 21–28 giờ: đọc 4–5 giờ, tự viết 13–17 giờ, thử nghiệm 4–6 giờ, chưa tính setup.

Font bitmap trong `overlay.hpp` là scaffold để hiện nhãn và tọa độ. Phần cần tự viết là setup OpenGL, shader loader, mô tả vertex, renderer CPU, transform, viewport và phép so output. Canvas web chỉ minh họa bằng JavaScript, không thực thi OpenGL hoặc đo chênh lệch GPU thật.

## Cấu trúc

```text
starter/                 SDL window và event loop trước OpenGL
checkpoints/01..09/      source độc lập sau từng bài
final/                   ứng dụng hoàn chỉnh
source-template/         nguồn chuẩn sinh starter/checkpoint/final
tests/tests.cpp          CTest cho math/raster contract, không mở window
CMakeLists.txt           final mặc định; bật checkpoint bằng option
```

Các file học chính:

```text
include/pipeline.hpp     vertex contract, CPU transform/raster, viewport math, validation
include/gl_api.hpp       OpenGL function pointers được load qua SDL context
include/gpu_renderer.hpp shader program, VBO/VAO, CPU texture presenter, readback
src/main.cpp             SDL/OpenGL lifecycle, input, render hai panel và cleanup
include/editor.hpp       chọn/kéo vertex, high-DPI pointer mapping, inverse transform
include/overlay.hpp      nhãn CPU/GPU, A/B/C và bảng NDC trong cửa sổ
include/verification.hpp fixture OpenGL thật trong chế độ hữu hạn --verify
```

## Build final

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Trên Visual Studio hoặc generator đa cấu hình, hãy giữ `--config Debug`/`Release`. Lần configure đầu cần mạng để FetchContent tải đúng SDL 3.4.8.

## Build mọi checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Các target gồm `project_33_starter`, `project_33_checkpoint_1` … `project_33_checkpoint_9`, `project_33_final` và `project_33_tests`.

## Điều khiển final

- `Space`: chạy/tạm dừng rotation.
- `N`: tiến đúng 10°.
- `Arrow keys`: dịch triangle trong NDC.
- `Q` / `E`: giảm/tăng scale.
- `C`: đổi solid/smooth color.
- `P`: đọc GPU color ở centroid và in comparison report hữu hạn.
- Kéo A/B/C ở một trong hai panel: sửa position chung, pause trong lúc kéo.
- `1/2/3`: chọn vertex; `I/J/K/L`: dịch vertex được chọn; `V`: đổi màu và bật smooth.
- `R`: reset vertex, màu và transform rồi pause.
- `Esc`: hoàn tác thao tác kéo; thoát nếu không kéo.

App pause mặc định. `glReadPixels` chỉ chạy khi bấm `P`, không chạy mỗi frame.

Các shortcut chỉ nhận lần nhấn đầu, không nhận tổ hợp Ctrl/Alt/GUI; Alt+Space không được tự đổi pause.

Reset còn khôi phục đỉnh đang chọn và solid mode, xóa báo cáo cũ. Ảnh CPU giới hạn 4M pixel mỗi panel và tối đa 4096 pixel mỗi chiều; kích thước quá lớn giữ event loop hoạt động và báo cần thu nhỏ cửa sổ. Kích thước bằng 0 khi minimize được bỏ qua, không cấp một ảnh giả. Đường cấp phát kiểm giới hạn trước khi nhân; lỗi không bị báo thành exit code thành công.

## OpenGL contract

Project yêu cầu OpenGL 3.3 Core và không dùng GLAD/GLEW. `SDL_GL_GetProcAddress` chỉ được gọi sau khi context đã được tạo và làm current. Trên Windows, function pointers được coi là gắn với lifetime của context hiện tại.

`GpuVertex` có đúng năm `float`:

```text
positionX positionY red green blue
```

VAO đọc position ở location 0 và color ở location 1. CPU và GLSL cùng áp dụng transform theo thứ tự rotate → scale → translate.

## Validation

CTest kiểm code CPU thuần:

- `GpuVertex` stride/offset;
- transform order;
- NDC ↔ CPU top-left screen round-trip;
- NDC ↔ GPU bottom-left window round-trip;
- barycentric weights và solid/smooth color contract;
- deterministic CPU raster checksum;
- fixture 2×2 có đáp án độc lập: pixel nội thất RGB (128,64,64), pixel nền (11,16,32), kiểm cả winding đảo;
- resize 0/âm/quá budget giữ nguyên ảnh cũ; NaN/Inf không được coi là màu khớp;
- tolerance sau RGBA8 quantization.

Runtime probe so interior fragment tại centroid. Không dùng triangle edge làm pass/fail vì CPU/GPU có thể khác coverage rule quanh biên dù cả hai implementation đều hợp lệ.

Centroid không bảo đảm tâm pixel lân cận cách xa cạnh khi tam giác rất nhỏ hoặc suy biến. Không dùng trường hợp ấy để kết luận màu đúng/sai theo oracle nội thất; fixture nghiệm thu giữ hình đủ lớn và công bố dải cạnh riêng. Vì clip w luôn bằng 1, bài dùng nội suy affine; không suy rộng sang perspective có w khác nhau. Resize làm hai phía giữ cùng NDC, không áp camera/aspect correction ẩn.

Report trong dải cạnh 1,5 pixel hiển thị `EDGE - NO VERDICT`; mẫu nền ghi `BACKGROUND`. Chưa đo hoặc sau Reset, title ghi `not measured`. Không dùng infinity hoặc số đo cũ như kết quả của trạng thái hiện tại.

Phép so tính màu CPU tại tâm đúng pixel mà glReadPixels đọc, không tại điểm NDC liên tục trước khi làm tròn. Probe ngoài viewport bị từ chối; điểm ngoài tam giác nhưng còn trong viewport được so với màu nền chung. Nhãn được vẽ sau readback, không lẫn vào phép đo.

Để kiểm driver thật mà không thao tác cửa sổ:

```bash
./build/Debug/project_33_final.exe --verify
```

Chế độ này mở cửa sổ ẩn, chạy sáu frame rồi thoát: solid/smooth, transform, winding ngược, sửa vertex/màu và resize width lẻ. Mỗi frame có ba interior probes và một background probe, tolerance 2/255; lỗi trả exit code khác 0. CTest vẫn thuần CPU. Chế độ này cần driver OpenGL 3.3 thật và không kiểm thay thao tác kéo, focus hoặc DPI bằng tay.

`--smoke` mở ẩn rồi tự đóng sau sáu frame ở starter, từng checkpoint hoặc final, không thay GPU correctness verification. `--capture image.bmp` chạy verification và xuất framebuffer của ứng dụng trước khi đóng; không điều khiển hoặc chụp desktop. Khi chạy qua agent/CI, luôn có watchdog process tree ngoài chương trình theo ARCHITECTURE.md.

Toàn panel GPU cũng được so với CPU reference cùng kích thước: sai khác lớn hơn 2/255 chỉ được nằm trong dải cách cạnh tam giác không quá 1,5 pixel. Mọi sai khác sâu trong nội thất hoặc ở nền xa cạnh làm fixture thất bại. Số pixel khác ở cạnh được in riêng; không coi hai ảnh giống bằng mắt là đủ.

Bảng NDC phía GPU là đầu ra dự kiến theo contract CPU, không phải kết quả transform feedback. Dùng readback để kiểm output GPU thực. Cửa sổ nhỏ có thể cắt bớt chữ; khôi phục kích thước mặc định để đọc đủ controls.

## Tài liệu chuẩn

- [SDL_GL_CreateContext](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext)
- [SDL_GL_GetProcAddress](https://wiki.libsdl.org/SDL3/SDL_GL_GetProcAddress)
- [SDL_GetWindowSizeInPixels](https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels)
- [Khronos OpenGL reference pages](https://registry.khronos.org/OpenGL-Refpages/gl4/html/)
