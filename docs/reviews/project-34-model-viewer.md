# Project 34 — Kết quả kiểm chứng model viewer

Ngày kiểm: 28/10/2026. Sản phẩm được đối chiếu với Project 34 trong đặc tả v4: một viewer OBJ, hai backend, không thu nhỏ sản phẩm cuối thành cube.

## Phạm vi đã hoàn thiện

- Rocket 32 tam giác, sphere 2.976 tam giác và cube debug từ Project 21. Loader giữ nguyên ngữ nghĩa; bản ZIP độc lập, assets chỉ lưu một lần.
- Một ViewerScene cho camera/object/model/lighting/settings; tài nguyên nằm trong ViewerBackends. CPU giữ clipping/raster/depth, GPU dùng indexed draw và cùng shader inputs.
- Chín bài với mã trích liên tiếp từ checkpoint thật; GLSL đúng source. Bài cuối có toàn bộ source và ZIP.
- Canvas 2D dùng lại parser/dataset cùng công thức camera/clipping/shading. Không giả làm OpenGL hoặc phép đo GPU.
- URL/demo ID cũ được giữ để không phá liên kết; tên hiển thị và nội dung là model viewer. Content revision 2 dành riêng cho nội dung xây lại của Project 34.

## Build và tests

Windows, Visual Studio 2022 x64, SDL **3.4.8** từ package đã build cục bộ. CMake dùng option installed-SDL để tránh tải/build thư viện lặp lại; đường mặc định trong ZIP vẫn là FetchContent khóa đúng phiên bản.

- Starter, checkpoint 01–09, final và test executable build thành công ở Debug lẫn Release, tối đa hai compiler process.
- CTest: 1/1 ở mỗi cấu hình; test không tạo window. Kiểm asset thật, normalization, index/normal, camera, sáu mặt clip, near/eye crossing, culling, deterministic/order-independent raster/depth và bộ so ảnh.
- Finite smoke: starter và cả chín checkpoint Debug kết thúc thành công.
- 10 tests Node cho mesh/Canvas math, reuse dataset/parser và nội dung/source contracts đạt. Mã C++ phải trích liên tiếp, cân bằng khối; không còn source marker chưa thay thế.
- TypeScript, generated-course checks, architecture budgets, git artifact guard và git diff --check đạt.

## OpenGL thật

GPU: NVIDIA GeForce RTX 3050 Laptop GPU. OpenGL 3.3.0, driver 546.30.

`project_34_final --verify` đạt ở cả Debug và Release:

- 24 lần chuyển backend, resize sau lần 20, đổi ba model đã cache, giữ scene và resource IDs.
- Transform feedback đọc gl_Position từ vertex shader thật: clip/NDC tolerance 2e-5, screen 0,01 pixel, window depth 1e-5.
- Ảnh solid kiểm coverage/RGB/depth với dải cạnh cố định 1,5 pixel: **0 interior failures**, 37.886 interior covered, 25 edge differences cộng dồn trong chuỗi snapshot chính. Mỗi ảnh vẫn phải đạt giới hạn edge differences riêng; không lấy tổng để nới ngưỡng.
- Các phép kiểm bổ sung: phía sau model, depth tắt/thứ tự đảo, fixture CCW/CW và near/eye crossing.
- CPU texture presenter giữ màu/origin. Buffer, VAO, program, texture đã bị xóa được kiểm bằng glIs* khi context còn current.

Không suy rộng kết quả này sang GPU/driver/hệ điều hành chưa chạy.

## Benchmark Release

Sphere 2.976 tam giác; cùng frozen scene; viewport 640×480; VSync xác nhận 0; ba warm-up và 12 mẫu/backend. Có glFinish trước swap, CPU sync wait ghi riêng. Các số dưới đây là trung bình ms của một lượt, không phải thứ hạng hoặc cam kết hiệu năng.

| Phạm vi                   |              CPU mode |   GPU mode |
| ------------------------- | --------------------: | ---------: |
| Preparation, CPU timer    |              0,001275 |   0,000750 |
| CPU geometry/raster/depth |              2,306580 | Không chạy |
| CPU texture upload call   |              0,178975 | Không chạy |
| CPU command submission    |              0,002225 |   0,001633 |
| GPU geometry timer query  | Không đo geometry GPU |   0,003413 |
| CPU sync wait             |              0,491400 |   0,079425 |
| Presentation call         |              0,035458 |   0,022767 |
| CPU frame wall            |              3,017970 |   0,106142 |

CPU geometry và GPU geometry khác phạm vi công việc; GPU query không gồm clear/HUD/swap. CPU mode vẫn dùng GPU texture presenter. Không tính speedup từ hai cột không tương đương.

## Website, Canvas và ZIP

- Production build hoàn tất, không đổi timeout 240 giây. Lượt đầu bị watchdog dừng ở giới hạn; lượt chạy riêng tiếp theo hoàn tất khoảng 112 giây. Chưa đủ bằng chứng để quy nguyên nhân chênh lệch cho một yếu tố cụ thể.
- 10 route (overview + chín bài) trả 200 qua handler production; code blocks dùng One Dark.
- Chrome headless chạy hai test thực: điều hướng/source/download link; chọn sphere, 24 switch, orbit, pan, zoom, debug modes, reset, pointer capture/Escape, reduced motion, keyboard focus và resize. Không có browser error.
- Source reader tải JSON đúng Project 34; DPR 1,5 và ảnh Canvas được kiểm. Chrome dùng assets/handler production qua request routing, không mở HTTP server hoặc profile cá nhân.
- ZIP **238 file**, **355.799 byte**, giải nén và đối chiếu từng byte với source. Production/source JSON cũng khớp byte với output hiện tại.
- Source + assets 212.913 byte; asset sphere 93.888 byte là dữ liệu OBJ, không phải thư viện. File C++ lớn nhất khoảng 14,7 KiB; output được sinh/ZIP/build vẫn ngoài Git.

## Giới hạn desktop trực tiếp

Đã quan sát cửa sổ C++ thật và hình model. Quyền Computer Use đầu tiên hết hạn; sau khi người dùng cấp lại quyền, công cụ phát hiện input của người dùng và từ chối gửi phím. Không tiếp tục chen thao tác. Watchdog dọn cửa sổ kiểm sau ba phút.

Vì vậy chưa đánh dấu toàn bộ chuột/bàn phím/focus/resize của native viewer là đã kiểm thủ công. Toán camera, hai nhánh render, switch/resize/resource và phần cứng đã có bằng chứng tự động ở trên; kiểm desktop trực tiếp vẫn cần một phiên không có thao tác đồng thời hoặc người dùng tự kiểm.

Localhost:3000 chưa bật khi thăm dò. Không khởi động dev server; người dùng tự chạy npm run dev. Không stage, commit, push hoặc xuất bản website trong đợt này.
