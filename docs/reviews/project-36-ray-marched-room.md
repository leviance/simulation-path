# Project 36 — đối chiếu đặc tả và kết quả kiểm tra

Ngày kiểm: 2026-10-29. Nguồn chuẩn: Product Specification v4, mục Project 36 và các hợp đồng 0.7–0.10, 3.4–3.6.

Ứng dụng C++/SDL3, 11 bài học và Canvas đã được đồng bộ theo sản phẩm căn phòng ray-march. Các kiểm tra tự động dưới đây đã đạt. **Chưa nghiệm thu đầy đủ thao tác native**: giữ WASD, kéo chuột phải, mất focus, resize và high-DPI vẫn cần kiểm thủ công; không dùng kết quả Canvas để thay cho các bước này.

## Sản phẩm native

| Yêu cầu | Triển khai | Bằng chứng đã chạy |
| --- | --- | --- |
| Ray-march per pixel, không thay bằng mesh | Một fullscreen triangle; SDF sphere/box/torus và năm slab hữu hạn trong fragment shader | Driver OpenGL thật; bốn material ID xuất hiện; đã xem ảnh capture 1280×800 và cửa sổ ứng dụng |
| Camera move/look và parameters | Position/yaw/pitch, WASD/QE, RMB hoặc mũi tên, FOV/radius/settings | Kiểm toán CPU và build mọi snapshot đạt; con lăn đổi FOV đã kiểm trực tiếp; giữ phím và kéo RMB chưa kiểm đầy đủ |
| Normal, lighting, shadow và clean/debug view | Central differences, Lambert/specular, shadow hữu hạn; Beauty/Steps/Hit/Normal và overlay riêng | GPU outputs hữu hạn; normal đối chiếu analytic sphere qua epsilon sweep; Tab và V đã đổi giao diện trực tiếp |
| Oracle độc lập | Quadratic ray–sphere trong `raymarch_oracle.hpp`, không gọi SDF/march | 55 CPU checks, gồm fixture t=3.03m, inside exit=0.82m, miss, near-surface và tangent |
| Giới hạn và chính sách rõ | Abs-distance; stop reason; max steps/distance, hit/normal epsilon riêng | CPU/GPU kiểm step/distance/invalid/empty; tangent dùng sqrt bound, normal dùng angular error |
| Shader lifecycle an toàn | Compile/link/type/array/required-uniform validation trước khi thay program | Final có 250 GPU checks; lỗi giữ ảnh/program/locations/generation, bản đúng phục hồi; object tạm/cũ/final được nhả; F5 đã tăng generation trực tiếp |
| Source độc lập từng mốc | Starter, checkpoint 01–11, final, CMake và tests | Build thực tế từ snapshot sinh bằng generator, không chỉ source-template; Debug và Release đều đạt |
| Shader runtime riêng từng target | `shaderRuntimePerTarget: true` | Verification với shader directory riêng của starter và final đều đạt |

Cấu hình kiểm: Windows x64, Visual Studio 2022/MSVC 19.33.31630, SDL 3.4.8 từ cache local, NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 3.3.0 NVIDIA 546.30. Đây không phải chứng nhận Linux/macOS hoặc mọi GPU.

### Build, CPU và GPU

`.validation/check-p36-generated.mjs` có deadline tổng 240 giây, tối đa hai compiler; CTest có timeout 20 giây. Starter có 21 GPU checks; checkpoint 01–10 có 35 kiểm lifecycle/interface; checkpoint 11 và final có 250 kiểm đầy đủ. Mọi target đã chạy `--verify` ở cả Debug và Release. CTest là CPU-only: 55 checks, 0 failures cho mỗi configuration.

Final: 250 GPU checks, 0 failures cho mỗi configuration. Probe image 192×128 có sphere 732 pixel, box 760, torus 194, room 22.890; các pixel ray được so với CPU sau khi đổi đúng gốc ảnh. GPU readback không được báo thành kernel time hoặc benchmark FPS.

Sau ma trận build, bốn file C++ chỉ được chỉnh khoảng trắng và cách ngăn khối. `.validation/p36-cpp-token-proof.json` xác nhận token vẫn giống bản đã biên dịch. Source snapshot và ZIP đã được sinh lại; không báo bước này thành một lần compile mới.

### Kiểm trực tiếp cửa sổ C++

Đã quan sát Showcase, overlay và heatmap; kiểm Tab, V, N, R, Escape, con lăn FOV và F5. N tăng clock từ 0.00 lên 0.10 khi đang pause; R trả camera/view/clock về mặc định; F5 đổi generation 1 → 2 mà giữ FOV/clock. Một lần Escape kết thúc ứng dụng bình thường. Các phiên kiểm có watchdog 120 giây để không để cửa sổ chạy vô hạn.

Thao tác “Right” của công cụ UI không kiểm được mũi tên phải: log SDL nhận `scancode 94`, `keycode 1073741918` — `KP_6`, không phải `SDL_SCANCODE_RIGHT` (79). Không đổi mapping của ứng dụng để bù sai lệch công cụ. Việc chạm W cũng không đủ bằng chứng cho hành vi giữ WASD theo thời gian.

## Nội dung bài học và source tải về

- 11 bài đi từ starter đang chạy qua camera ray, lát cắt SDF, marcher, normal, primitives, room/material, shadow, camera input, oracle và nghiệm thu.
- Thử thách đầu học phần tách hành vi sản phẩm khỏi ràng buộc thuật toán; thời lượng tách đọc/tự viết/kiểm chứng, không tính setup/build.
- Mỗi bài giải thích nơi gọi hàm và nối uniform, kết quả có thể quan sát, hai thí nghiệm lỗi hữu hạn cùng cách hoàn nguyên. Không dùng undefined array access hoặc loop GPU vô hạn làm bài tập.
- Mỗi bài có đủ bảy phần: vấn đề, trực giác, viết code, chạy checkpoint, thử lỗi, checklist và hướng mở rộng. Canvas nằm cạnh phần trực giác; tên mục cụ thể vẫn được giữ để người đọc biết mình sắp làm gì.
- 11 MDX compile bằng pipeline KaTeX/One Dark thật; **31 block C++/GLSL khớp token liên tiếp với đúng checkpoint**. Feature mới chỉ xuất hiện tại mốc được dạy.
- C++ thụt 4 spaces, có comment và khoảng cách giữa các khối; source chia theo toán, shader compilation/reflection, renderer, state/input, UI, application và verification.
- Generator loại macro checkpoint khỏi bản tải về; `checkpointNumber` là literal của từng snapshot. Các checkpoint chạy độc lập, không phụ thuộc build definition bị thiếu.
- ZIP chứa **238 file**, đã giải nén và so khớp từng byte với nguồn đóng gói; digest manifest khớp. Các ZIP project khác không đổi.

Hai bài 08/09 cũ được thay bởi bốn bài mới 08–11, không giữ route cũ hoặc alias. Nội dung cũ vẫn khôi phục được từ Git. Output sinh, build, ảnh và ZIP tiếp tục nằm ngoài Git.

## Canvas hỗ trợ giảng dạy

Canvas dùng cùng camera, primitive, slab hữu hạn, abs-distance marcher, stop reason, material và hai epsilon với C++. Oracle ray–sphere độc lập; readout hiển thị sai số khoảng cách và góc normal, không dùng nhãn “đạt” dựa trên hai bản tính cùng thuật toán.

Mười một chế độ bám theo bài: pixel/ray, camera, lát cắt SDF, từng bước march, normal, primitives, materials, bóng/đèn, free camera, oracle và validation. Canvas là CPU preview, **không thay ứng dụng OpenGL**. Preview giới hạn 6.144 ray, chia batch tối đa 96 ray/khoảng 6ms và nhường event loop giữa các batch; job cũ bị hủy khi đổi tham số hoặc unmount.

Phần toán, session/input, image job và scheduler được tách khỏi diagrams, renderer, controls và readout. Không module mới nào quá 11,2 KiB; root component khoảng 8,6 KiB. Chunk production riêng của lab là 29.412 byte, chỉ tải khi mở lab.

Các hành vi đã kiểm: pause/step/reset theo preset, camera vẫn điều khiển được khi pause, stage-gated controls, pointer capture có chủ sở hữu, từ chối pointer phụ, cancel/Escape, keyboard có modifier/repeat/IME guard, DPR 1,5, reduced-motion và dispose job. Kéo chuột trái trong Canvas và bước di chuyển bằng phím được giải thích riêng, không trình bày như thao tác RMB/held-key của ứng dụng native. Clock của preview chỉ tăng tối đa 0,05 giây sau khi render xong một ảnh CPU, không được gọi là FPS của OpenGL.

## Regression và website

| Phạm vi | Kết quả |
| --- | --- |
| `tests/lab-math-ray-marched-shape-room.test.mjs` | 22 nhóm đạt: toán, oracle, policies, state/input, rendering và scheduler |
| `tests/projects-36.cases.mjs` | 5 kiểm đạt: style C++, 11 lesson/metadata, MDX thật, 31 source excerpts và stage progression |
| Hợp đồng nội dung dùng chung | Toàn bộ 566 bài đạt bảy teaching roles; không hạ validator để bỏ qua bài mới |
| TypeScript, registry và architecture budgets | Đạt |
| Production build sau cập nhật cuối | Đạt, qua cả năm môi trường build của Vinext |
| `tests/browser/project-36.spec.ts` trên Chrome với production artifact | 3 kiểm đạt: stepper, final lab, pointer/source/DPR; không page error, console error hoặc HTTP error |
| Route, anchor, glossary | Overview và 11 lesson đều HTTP 200; mọi liên kết P36 được kiểm đều có đích; HTML mỗi trang dưới 300 KiB |
| Source JSON và download trong production | Manifest/common/checkpoint JSON và ZIP trùng từng byte với output hiện tại |
| Source-guide contract Project 36–42 | Đạt: chỉ liệt kê file thực sự thay đổi tại checkpoint |
| Git hygiene | Không generated course output, thư viện hoặc compiled artifact trong index; `git diff --check` đạt |

Browser regression phục vụ production artifact qua interception trong Playwright, không tự mở HTTP/dev server. Localhost:3000 không khả dụng khi probe. Không start/restart server, deploy, stage, commit hoặc push trong lượt này.

Đây là kết quả kiểm Project 36 cùng các hợp đồng dùng chung nêu rõ ở bảng, **không phải tuyên bố toàn bộ test của 78 project đạt 100%**. Không dùng kết quả toàn site từ lần trước làm bằng chứng mới.

## Phần cần kiểm thủ công trước khi nghiệm thu đầy đủ

1. Giữ WASD/QE liên tục, đồng thời giữ hai phím đối nghịch hoặc chéo; xác nhận di chuyển theo `dt`, không nhanh hơn theo đường chéo.
2. Giữ RMB rồi kéo để nhìn quanh; kiểm giới hạn pitch, thả chuột, chuyển focus ra/vào cửa sổ và reset trong lúc tương tác.
3. Resize cửa sổ và kiểm màn hình high-DPI thật: ray/aspect, viewport và overlay phải còn đúng. DPR của Canvas đã được kiểm, không thay cho bước native này.
4. Kiểm tính dễ đọc và khả năng điều khiển trên máy người học; kết quả tự động hiện chỉ đại diện cho cấu hình Windows/GPU ở trên.

Log, ảnh, token proof và helpers trong `.validation/` là output kiểm tra, không phải nguồn giảng dạy và không được thêm vào Git.
