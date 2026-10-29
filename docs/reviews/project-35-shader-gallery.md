# Project 35 — Kiểm chứng shader gallery

Ngày kiểm: 29/10/2026. Đối chiếu với [Project Specification v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), mục Project 35. Phạm vi là công cụ fullscreen có ít nhất bốn hiệu ứng, không phải cube đổi màu.

## Sản phẩm và giáo trình

- Một executable C++20/SDL3/OpenGL 3.3 Core, cùng window/context/renderer cho Gradient Aurora, Circle Ripples, Mandelbrot và Noise Flow.
- Shader ngoài executable; loader tự viết, compile/link log thật, kiểm active uniform type/size bằng driver, candidate transaction giữ last-good.
- F5, auto reload sau debounce 140 ms, chọn 1–4, mouse/time/resolution/zoom, pause/step/reset, debug/showcase và panel lỗi.
- Mười bài tiếng Việt: fullscreen/file → compile → link/reflection → transaction → watcher → uniforms → gradient/circle → Mandelbrot → noise → nghiệm thu.
- Các đoạn C++ là token liên tiếp và khối hoàn chỉnh trong đúng checkpoint; GLSL là nguyên source. Bài cuối hiển thị đủ source và ZIP độc lập.
- Checkpoint 02 mới thêm driver shader log; checkpoint 03 mới thêm program log/reflection. Không chỉ đổi tên bài mà để code đầu vào/đầu ra giống nhau.
- Canvas 2D dùng reference TypeScript cho bốn effect, không chạy GLSL/WebGL. Editor chỉ hỗ trợ đổi SPEED của mẫu đã biết; lỗi mô phỏng và source ngoài phạm vi được nói rõ.

## Bằng chứng theo yêu cầu

| Yêu cầu                                         | Bằng chứng đã chạy                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Bốn hiệu ứng fullscreen, có chuyển động/tham số | Ảnh GPU của bốn effect; `--verify` thay time/mouse/zoom; chọn 1–4 trực tiếp trong cùng app                         |
| Loader, logger, trigger tự xây                  | Source `shader_files.hpp`, `shader_renderer.hpp`, `shader_application.hpp`; CTest I/O và watcher; F5 trực tiếp     |
| Candidate lỗi không thay bản tốt                | Driver compile/link/interface fixtures kiểm ID, locations, generation, fingerprint và ảnh tại cùng snapshot        |
| Sửa rồi reload không restart                    | Verifier sửa candidate sau nhiều lần lỗi và khôi phục đúng ảnh; F5 trực tiếp không reset time/effect               |
| Uniforms, resize, high-DPI                      | CTest logical→physical/bottom-left; GetUniformfv/readback ở hai kích thước; desktop maximize và Chrome DPR 1,5     |
| Debug và showcase sạch                          | Tab trực tiếp; ảnh error overlay trong showcase; verifier kiểm có pixel chữ và cleanup overlay                     |
| Correctness độc lập                             | Mandelbrot điểm biết trước, noise liên tục/corner hash, reference CPU đối chiếu 40 mẫu pixel GPU                   |
| Code hoàn chỉnh và đóng gói                     | Starter, 10 checkpoint, final build Debug/Release; ZIP 195 file khớp từng byte; source JSON production khớp output |
| Website học được                                | 11 route P35 trả 200, One Dark, source cuối bài, link ZIP; Chrome chạy test source/editor/input/reduced motion     |

## Build, CPU và OpenGL

Windows, Visual Studio 2022 x64/MSVC 19.33, SDL **3.4.8** từ package cục bộ. CMake mặc định trong ZIP vẫn FetchContent đúng phiên bản và link SDL3::SDL3. Compiler tối đa hai process song song.

- Starter, checkpoint 01–10, final và tests đã build ở Debug lẫn Release sau thay đổi source cuối.
- CTest **1/1 ở mỗi cấu hình**; không tạo window, không dùng assert bị NDEBUG vô hiệu hóa.
- Finite smoke starter và 10 checkpoint Debug kết thúc thành công.
- GPU: NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 3.3.0, driver 546.30.
- `--verify` đạt ở Debug/Release, và đạt thêm khi đọc shader từ thư mục fallback riêng của target Release.
- Bốn effect × hai kích thước × năm mẫu = **40 pixel probes**, RGB tolerance **6/255**. Không cam kết mọi pixel biên Mandelbrot giống bit giữa các driver.
- Lỗi thật đã thử: fragment compile, vertex compile, link stage mismatch, thiếu uniform, sai kiểu uMouse. Các shader/program tạm, active cũ và tài nguyên overlay được kiểm bằng glIs* khi context còn sống.
- Không suy rộng kết quả sang GPU/driver/macOS/Linux chưa kiểm. CPU/frame của overlay không phải GPU timer riêng hay một benchmark so sánh backend.

## Desktop trực tiếp

Sau khi người dùng cấp lại quyền mở viewer, đã kiểm bằng Computer Use: chọn đủ bốn effect, Space pause, N step, F5 giữ time, kéo chuột đổi tâm circle, wheel zoom, R reset không đổi effect, Tab showcase, maximize giữ circle tròn và Escape thoát. Cửa sổ kiểm đã đóng.

Chưa kiểm trực tiếp mọi tổ hợp OS input: hủy một drag đang giữ nút bằng Escape, kéo qua nhiều màn hình có DPI khác nhau, log dài bằng PgUp/PgDn và Save bằng editor ngoài. Hành vi tương ứng có kiểm code/CPU/driver và checklist học viên; không ghi các thao tác desktop chưa chạy là đã đạt.

## Website, Canvas và file tải về

- TypeScript toàn dự án đạt. **17 tests** P35 cho toán, source, lesson, transaction, compile MDX và runtime layout đạt.
- Production build giữ nguyên hard timeout **240 giây**. Lượt đầu chạm giới hạn và bị dọn; lượt chạy tách riêng hoàn tất. Build lại sau chỉnh nội dung cuối cũng đã hoàn tất, và ZIP/route/Chrome đã được kiểm lại trên đúng output cuối; không dùng artifact của lượt bị dừng.
- Chrome headless chạy hai test authored: entry/final source/ZIP link; draft→save→last-good, bốn preset, SPEED, lỗi, auto reload, keyboard, pointer capture/Escape, reduced motion và reset. Không có browser error.
- Chrome dùng assets/handler production qua request routing, không khởi động HTTP server và không dùng profile cá nhân. Source reader chỉ tải JSON của Project 35; DPR 1,5 được đối chiếu với backing canvas.
- 11 route (overview + 10 bài) trả 200, code dùng One Dark. Response lớn nhất **241.922 byte** (bài cuối), dưới budget 300 KiB; lazy Canvas chunk **18.338 byte**, dưới budget 24 KiB.
- Bài 01 có ước lượng riêng cho đọc/tự viết/kiểm chứng, không tính thời gian setup/build. Đoạn văn thời lượng được thêm sau build; đã compile lại cả 10 MDX qua pipeline thật thay vì chạy lại build toàn site chỉ vì sửa văn bản. Các số response phía trên là output production trước đoạn văn bổ sung này; ứng dụng C++ và code Canvas không đổi.
- ZIP **195 file**, **241.249 byte** tại lần đối chiếu; giải nén rồi so từng byte với source. Build/output/ZIP vẫn ngoài Git. File C++ lớn nhất khoảng 14,5 KiB, dưới budget.
- Không khởi động hay restart dev server. Thăm dò localhost cần quyền mạng; lần thử được cấp quyền hết thời hạn 1,5 giây, nên không kết luận server đã tắt.

## Hồi quy toàn site chưa đạt

Phần này ghi lại lượt kiểm trước đợt sửa chung. Kết quả và các lỗi còn lại mới nhất nằm trong [báo cáo sửa hồi quy toàn site](site-regression-fixes.md); không dùng danh sách lịch sử dưới đây để kết luận cả chín lỗi vẫn còn.

Suite toàn site bị dừng ở hard timeout 180 giây, không có kết quả hoàn tất. Một lượt chỉ chạy lại các case đã thất bại xác nhận chín vấn đề nằm ngoài Project 35:

1. Project 20: thiếu textual Canvas state trong HTML ban đầu.
2. Project 24: chunk `collision-tank-lab` 35.605 byte, vượt budget 24 KiB.
3. Project 26: response bài 03 dài 563.094 byte, vượt budget 300 KiB.
4. Project 31 bài 01: chưa đáp ứng contract ít nhất ba bước code được giải thích.
5. Test entry Project 34 vẫn đòi CubeScene dù giáo trình đã là OBJ viewer.
6. Test văn phong Project 11 đòi cụm “tam giác đồng dạng”.
7. Test Project 15 còn đòi source nằm trong client chunk, khác cơ chế JSON hiện tại.
8. Test Project 18 còn đòi source registry nằm trong client payload.
9. Bảng validation lesson của Project 16 còn trỏ bài 07 thay vì bài kết thúc hiện tại.

Không sửa bài học/source của các project khác để che các lỗi này, không nới budget và không gọi toàn site xanh. Cần rà riêng để phân biệt test lỗi thời với lỗi sản phẩm thực tế.
