# Project 52 — Bắn tia vào hình học

Xây một công cụ khảo sát tia trong cảnh 3D: ngắm vào plane, sphere, AABB hoặc triangle, di chuyển nguồn/vật thể, rồi đổi góc nhìn để quan sát điểm chạm và pháp tuyến. Đây là bài cầu nối cho picking và các project volume/voxel; không cần học SPH, CT hoặc GPU compute trước.

## Sản phẩm và cách học

Viewport lớn hiển thị bề mặt có chiều sâu, nguồn tia, đường tia, hit và normal. Cửa sổ ngắm nhỏ cho biết ray của emitter đi qua pixel nào. Bảng bên phải đọc được t/point/normal/frontFace, entry/exit hình học của sphere/AABB, barycentric của triangle và hit gần nhất. Không cần console để thao tác công cụ.

Điểm quan trọng: **observer chỉ đổi góc nhìn; emitter quyết định ray**. Orbit để nhìn tia từ bên cạnh không làm thay đổi phép đo đang giữ. Phép giao tự viết, không dùng engine raycast, ray marching hoặc quét các triangle minh họa của sphere để thay phương trình cầu.

Thời gian gợi ý 11–14 giờ, gồm đọc, tự viết và kiểm chứng; setup/build đầu không tính vào giờ học. Đầu mỗi bài nói rõ trạng thái đang có và phần sẽ thêm. Source đầy đủ của mỗi mốc chạy độc lập; không cần tự ghép các ZIP khác.

### Tự thử trước (90–120 phút)

Tạo một ứng dụng SDL3 có bốn hình nói trên. Cho người dùng ngắm, dịch nguồn, chọn/dịch từng hình và đổi góc quan sát. Hiện điểm chạm, outward normal và t; sphere/AABB có cả entry/exit, plane/triangle chỉ có một giao bề mặt. Thử nguồn trong solid, ray song song, tiếp tuyến, nhìn ngược và nhiều vật thẳng hàng.

Definition of Done: các dấu vẽ và số liệu dùng cùng world space; chỉ chọn surface hit trong interval đã công bố; orbit không đổi ray; reset/pause không làm input bị kẹt; unit test vẫn chạy ở Release. Tách yêu cầu hành vi này khỏi cách giải, rồi đọc lần lượt khi cần gợi ý.

## Yêu cầu và build

C++20, CMake **3.24+**, compiler có C++20, SDL **3.4.8** khóa URL/SHA-256 bằng FetchContent và link `SDL3::SDL3`. Không có OpenGL/compute hay thư viện đồ họa cao cấp; SDL renderer chỉ trình bày framebuffer CPU và UI. CMake tải SDL khi configure lần đầu, nên lần đó cần kết nối mạng. ZIP đã chứa CMake/snapshots, **không cần Node.js**.

Windows/Visual Studio 2022:

```bash
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Mở `build/Debug/project_52_final.exe` hoặc bản Release. Không bật checkpoint nếu chỉ cần final: bỏ `-DBUILD_CHECKPOINTS=ON`. Một worker tránh đẩy nhiều compiler/process lên cùng lúc trên máy ít RAM.

Generator single-config (Ninja/Makefiles) dùng `-DCMAKE_BUILD_TYPE=Debug` hoặc Release và build directory riêng. Executable nằm trực tiếp trong build directory. Hướng dẫn CMake đa nền tảng không phải bằng chứng đã kiểm tương tác trên mọi hệ điều hành.

### Chạy kiểm hữu hạn

```bash
build/Release/project_52_final.exe --frames 2 --capture result.bmp
build/Release/project_52_final.exe --frames 2 --preset 1 --capture inside-sphere.bmp
```

`--frames` nhận 1..600; `--capture` yêu cầu số frame hữu hạn. Preset 0: nguồn ban đầu; 1: trong sphere; 2: trong box; 3: hướng ra ngoài. Ảnh được chụp sau khi vẽ, trước present. Chế độ này kiểm khởi tạo/render và tự đóng; không thay kiểm chuột/phím. CTest thuần không mở cửa sổ hoặc cần driver graphics. Khi tự động hóa, luôn có supervisor/hard timeout bên ngoài; không chạy nhiều job nặng đồng thời.

## Tám mốc phát triển

| Mốc | Thay đổi quan sát được |
| --- | --- |
| starter | Window/renderer, nền tối, resize/thoát; chưa vẽ hình |
| 01 | Cảnh bốn bề mặt, camera quan sát và dịch hình; chưa có ray |
| 02 | Emitter/cửa sổ ngắm, ray world và dịch nguồn; chưa có Hit |
| 03 | Plane, Hit, outward normal và marker/bảng số |
| 04 | Sphere giải tích, hai nghiệm và entry/exit chưa cắt range |
| 05 | AABB ba slab, normal mặt vào/ra, phân biệt volume/surface |
| 06 | Triangle hai phía, Möller–Trumbore, barycentric và suy biến |
| 07 | Nearest/tie, click chọn từ observer, preset và scan/pause |
| 08 / final | Kiểm residual trong cửa sổ, tests và source hoàn chỉnh |

Phần trình bày được cung cấp từ đầu: rasterizer triangle CPU, mesh minh họa và UI/nút. Các hàm intersection, cameraRay, candidates/nearest và validator chỉ xuất hiện từ checkpoint tương ứng; scaffold không gọi thuật toán tương lai để vẽ cảnh.

## Điều khiển

| Thao tác | Chuột/nút | Bàn phím |
| --- | --- | --- |
| Xoay góc quan sát | Kéo chuột phải | Ctrl+mũi tên |
| Pan góc quan sát | Shift+kéo chuột phải | Ctrl+Shift+mũi tên |
| Zoom | Lăn chuột | PageUp/PageDown |
| Chọn primitive | Nút Plane/Sphere/AABB/Triangle; từ 07 có click cảnh | 1–4 |
| Dịch vật đang chọn x/y/z | Hàng OBJECT, nút X/Y/Z ± | A/D, Q/E, S/W |
| Ngắm ray (từ 02) | Kéo trong cửa sổ ngắm | Mũi tên |
| Dịch nguồn x/y/z | Hàng SOURCE, nút X/Y/Z ± | J/L, U/O, K/I |
| Ngắm tâm vật đang chọn | F Aim target | F |
| Đổi tMax | tMax− / tMax+ | − / + |
| Preset nguồn (từ 07) | Room / In S / In B / Away | 5–8 |
| Quét/dừng (từ 07) | Start/Pause scan | Space |
| Hiện/ẩn lưới/trục phụ | Debug | B |
| Reset toàn bộ | Reset | R |
| Thoát | Đóng cửa sổ | Esc |

Pause chỉ dừng tiến phase quét; camera, chỉnh geometry và inspector vẫn làm việc. Dịch nguồn/vật hoặc ngắm thủ công dừng quét; đổi góc nhìn không dừng. Mất focus/minimize dừng quét và nhả mouse capture. Reset khôi phục scene, hai camera, đối tượng, u/v, tMax và phase; không giữ nhầm thay đổi cũ. Native mở ở trạng thái dừng; Canvas còn tôn trọng reduced motion và không tự chạy lại khi tắt preference ấy.

SDL dùng logical 1200×760 kiểu letterbox. Mọi mouse event đổi bằng `SDL_ConvertEventToRenderCoordinates` trước hit-test, rồi trừ vị trí `aimRect` khi tính u/v. Cửa sổ ngắm giữ aspect 280/190; viewport quan sát có aspect riêng. UI native dùng font ASCII sẵn của SDL để ZIP không phải tải font; hướng dẫn tiếng Việt nằm trong tài liệu/web.

## Quy ước hình học và giới hạn

- World y-up; emitter mặc định (0,1.5,−7) nhìn (0,0.3,0), FOV dọc 55°. Observer độc lập, có orbit/pan/zoom và giới hạn khoảng cách/góc. Camera nhìn thẳng đứng dùng basis dự phòng.
- Ray `[tMin,tMax]` đóng, tMin=1e−6, tMax mặc định 14 và chỉnh trong [0.1,30]. Camera ray unit; hàm giao vẫn giữ hệ số `a=dot(direction,direction)`. t chỉ là khoảng cách khi direction unit.
- Hit giữ geometric outward normal, không face-forward. `frontFace = dot(direction,normal)<0`; tiếp tuyến có dot=0 nên false theo đúng định nghĩa này. Plane/triangle không tự có hai mặt vào/ra.
- Sphere/AABB trả entry/exit của đường thẳng chưa clip interval. Trong solid, entry có thể âm; chọn exit nếu hợp lệ. Đoạn tia nằm trọn trong solid mà chưa tới mặt thoát **không có surface hit**. Volume overlap là API khác.
- Plane gần song song hoặc coplanar trả miss vì không có một giao duy nhất theo chính sách bài. Angular threshold 1e−10; triangle dùng threshold tương đối với độ dài cạnh/direction. Box xử lý thành phần direction bằng zero trước phép chia, không dùng epsilon của plane cho slab.
- Sphere dùng q và c/q để hạn chế triệt tiêu; q=0 có nhánh riêng. Không kẹp discriminant âm thành zero. Đây không phải phép tính bảo đảm robust cho mọi thang tọa độ.
- Box luôn axis-aligned, không xoay. Normal ở cạnh/góc không duy nhất; tie trục giữ thứ tự x→y→z. Triangle hai phía, cạnh đóng, **không watertight** cho mesh cạnh chung.
- Mọi candidate dùng cùng ray/range; nearest chọn t nhỏ nhất, tie chính xác chọn ID nhỏ hơn. Click ở viewport lớn tạo pickRay riêng từ observer để chọn hình, không ghi đè ray của emitter.
- Plane toán học vô hạn, miếng lưới hữu hạn chỉ để nhìn. Dịch theo x/z không đổi plane ngang; sửa sang plane nghiêng phải sửa phần vẽ cho khớp.
- Bề mặt có depth test. Marker/normal là debug world-space; phần tia khuất là nét đứt tối, điểm ra màu vàng và nearest xanh lá. Mesh sphere chỉ dùng để vẽ, query vẫn dùng cầu giải tích.

## Cấu trúc source

- `vector.hpp`, `camera.hpp`, `shapes.hpp`: dữ liệu và phép toán, không phụ thuộc SDL.
- `hit.hpp`, `sphere.hpp`, `box.hpp`, `triangle.hpp`, `query.hpp`: phép giao, candidates và nearest.
- `workshop.hpp`, `scan.hpp`: state của công cụ; observer độc lập emitter, tịnh tiến geometry có giới hạn.
- `raster.hpp`, `mesh-drawing.hpp`, `scene-drawing.hpp`: scaffold CPU có near clipping/depth/flat shading; không dùng engine raycast.
- `view.hpp`, `panel.hpp`, `controls.hpp`, `input.hpp`, `run-options.hpp`, `src/main.cpp`: SDL presentation, UI/input, finite smoke và lifetime tài nguyên.
- `validation.hpp`, `tests/tests.cpp`: residual và fixture thuần, chạy cả Debug/Release.

Repository phát triển giữ `source-template/` làm nguồn chuẩn. Starter/checkpoints/final và CMake được sinh; không sửa trực tiếp snapshot, không đưa output build/ZIP/thư viện vào Git. Code block trong bài lấy từ marker của đúng checkpoint. ZIP tải về chứa các snapshot và tự build mà không cần generator của website.

## Checklist tương tác

1. Nhận diện cả bốn hình; resize, đổi DPI/letterbox; nhãn/marker không lệch bề mặt.
2. Ngắm sphere rồi orbit/pan/zoom: direction/hit phải giữ nguyên. Kéo tâm ngắm mới làm ray đổi; buông ngoài vùng ngắm không kẹt capture.
3. Chọn/dịch từng hình bằng chuột/nút và phím; AABB giữ kích thước, triangle giữ cạnh. Dịch nguồn giữ hướng; F ngắm đúng vật đang chọn.
4. Preset trong sphere/box cho entry âm và exit dương. Đặt tMax=0.5 khi ở tâm box: không nhận một điểm trong lòng hộp là bề mặt.
5. Nhìn ngược, song song, tiếp tuyến; đặt các vật thẳng hàng và kiểm min t. Tam giác hai phía vẫn chọn được, đảo vertex order chỉ đổi normal/frontFace.
6. Quét/dừng/reset, blur/minimize, thoát; pause không khóa camera. Không có job tự chạy vô hạn ngoài event loop tương tác do người dùng mở.

Unit tests có nghiệm biết trước, round-trip nhiều aspect, residual phương trình bề mặt, invalid input, multi-object nearest/tie, camera độc lập, phép tịnh tiến và raster depth/near clipping. Với các fixture nhỏ, t/world point dùng sai số tuyệt đối 1e−9; projection dùng 1e−7 pixel. Runtime tách worldTolerance=1e−8 đơn vị world và normalTolerance=1e−10 không đơn vị; không dùng cùng một epsilon cho vị trí và độ dài normal. Kiểm hữu hạn trước so sai số, không để NaN được coi là gần đúng.

`validateHits` chỉ kiểm tính nhất quán của record được báo. Một miss rỗng không chứng minh thuật toán không bỏ sót giao; round-trip có thể cùng sai ở hai phía. Vì vậy vẫn cần fixture giải tích và kiểm sử dụng riêng. Báo cáo nghiệm thu trong repository ghi rõ build/unit/browser/native input/package đã kiểm tới đâu; không suy diễn bước chưa làm thành PASS.

## Học tiếp và tham khảo

Project 53 dựng khối dữ liệu và máy cắt lát 3D. Các project sau mới dùng volume interval để tích lũy theo tia; Project 52 không phải ray tracer tạo ảnh hoàn chỉnh.

- [SDL CMake](https://wiki.libsdl.org/SDL3/README-cmake)
- [SDL render-coordinate conversion](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates)
- [SDL DebugText](https://wiki.libsdl.org/SDL3/SDL_RenderDebugText) và [RenderReadPixels](https://wiki.libsdl.org/SDL3/SDL_RenderReadPixels)
- [PBRT — Spheres](https://www.pbr-book.org/4ed/Shapes/Spheres), [ray/bounds](https://www.pbr-book.org/4ed/Shapes/Basic_Shape_Interface)
- [Möller–Trumbore](https://my.eng.utah.edu/~cs6965/papers/MT97.pdf)
