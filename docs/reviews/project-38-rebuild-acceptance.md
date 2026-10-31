# Project 38 — hồ sơ xây dựng và nghiệm thu

Nguồn chuẩn: [Project Specification v4, Project 38](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md#project-38--buồng-hạt-tích-điện-3d-quỹ-đạo-trong-điện-trường-và-từ-trường).

Ứng dụng C++20/SDL3/OpenGL 4.3 **Buồng hạt tích điện 3D** đã có source mới, không dùng lại gravity/lifetime/respawn của đài phun. Người dùng đã duyệt hướng đồ họa qua hai góc nhìn native và yêu cầu tiếp tục hoàn thiện học phần. Việc duyệt hình ảnh không thay kiểm thao tác chuột/phím trên executable.

Phần triển khai và kiểm tự động đã được đồng bộ theo sản phẩm mới. Người dùng chọn **tự kiểm tra thủ công cửa sổ C++**, nên agent không mở lại hoặc ghi cổng này đã đạt. Entry 38 của bản đài phun được gỡ để website không gọi source/bài học buồng hạt là “Bản cũ”; trạng thái “đã có hướng dẫn” là trạng thái biên tập, không chứng nhận mọi cổng manual đã qua.

## Các cổng phải hoàn thành

- [x] Bốn preset: thẳng, tròn, xoắn, gia tốc điện; hai dấu điện tích, mass dương, units và giới hạn rõ.
- [x] Boris CPU/GLSL tự viết; x/v lưu cùng mốc full-time, drift đối xứng, fixed timestep và catch-up hữu hạn.
- [x] Nghiệm độc lập: thẳng/gia tốc đều/tròn/xoắn; chiều quay, v song song B, tốc độ và sai số pha khi giảm dt.
- [x] GPU state tồn tại qua nhiều dispatch; graphics đọc cùng SSBO, barrier theo consumer, guard phần đuôi.
- [x] Preflight capability/size/budget; đổi N/tham số lỗi không phá state hợp lệ; seed/reset tái lập.
- [x] Ít nhất một triệu state thực cập nhật và vẽ trên GPU; năm triệu là kiểm tra mở rộng riêng, không giả số đo hoặc tự giảm N.
- [ ] Camera orbit/pan/zoom khi Pause; chọn ID/probe có giới hạn, trails bị chặn dung lượng, debug/showcase và chú giải màu.
- [x] Validation/benchmark có config/generation riêng, deadline, hủy, fence/query không chờ vô hạn; báo update/draw/frame và máy/build.
- [x] Checkpoint độc lập, starter, final có comment; CTest thuần, kiểm GPU thật, ghi nhận khác biệt giữa test/build/quan sát.
- [x] Bài học tiếng Việt tự nhiên: scene trước, công thức/code kết nối app, thí nghiệm lỗi, validation và bài tập; snippets đối chiếu source.
- [x] Canvas TypeScript/Canvas 2D dạy cùng biến/công thức, không giả GPU: camera/picking, pause/reset/preset, DPR, keyboard, capture/cancel và reduced motion.
- [x] Catalog, progress revision, search, glossary, roadmap, ZIP và mọi liên kết liên quan được đồng bộ; không còn gắn source đài phun cho đề bài mới.

## Bằng chứng hiện có

| Phần kiểm | Kết quả hiện có |
| --- | --- |
| Source/lessons | 12 bài, bảy vai trò giảng dạy, ít nhất ba code block/bài; mọi đoạn C++/GLSL khớp token liên tiếp trong đúng checkpoint; MDX compile 12/12 |
| CPU C++ | CTest Debug và Release đều 1/1; nghiệm độc lập E/B, charge sign, speed/parallel, phase convergence, invalid input, seed, phase snapshot, budget/clock |
| Ma trận executable | Starter + 12 checkpoint + final build Debug/Release; toàn bộ 14 bản Release chạy smoke hai frame và compile GLSL đúng snapshot |
| GPU một triệu | Final đã sinh thật: N=1.000.003, kiểm đủ state, mirror=0/analytic=0, allocated/updated/drawn đủ N, 41.955 pixel thay đổi trong fixture render |
| GPU năm triệu | Final đã sinh thật: N=5.000.000, kiểm đủ state, mirror=0/analytic=0, đủ N core, 44.598 pixel thay đổi; 160.000.000 byte/state |
| Canvas toán/controller | 12/12 tests: nghiệm, dt convergence, invalid input, staged/active, pointer ownership, camera không sửa state, bounded trails và job timeout/cancel |
| Nội dung/hợp đồng | 5/5 project tests; 5/5 source-contract checks cho validation, thụt dòng/comment, snapshot sạch/tăng dần, thứ tự layer và changedPaths |
| Production routes | 12 lesson + overview trả 200; route fountain cũ trả 404, không alias sang mô hình mới |
| Browser production | 4/4: mở đủ 12 mode không page error; staged/active, step/reset, invalid apply, camera/pointer, DPR, reduced motion, đối chiếu CPU, source/ZIP và tiến độ sau reload |
| ZIP | 409 file byte-identical với source/checkpoints/final; manifest digest khớp; ZIP nằm ngoài Git |
| Website | Production build cuối qua trong 153,9 s; TypeScript và ESLint targeted qua; architecture/Git hygiene qua; homepage/roadmap/downloads + routes đạt 5/5, glossary/progress/revisions đạt 14/14 |
| Tương tác native | Người dùng chọn tự kiểm thủ công. Agent không mở lại cửa sổ; chưa ghi native mouse/keyboard đã qua |

GPU thử trên NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 4.3.0 / NVIDIA 546.30; MSVC 19.33, Visual Studio 2022, Windows SDK 10.0.19041, SDL 3.4.8. Đây là số đo một máy, không phải bảo đảm FPS trên phần cứng khác.

| N | Update GPU min/median/max (ms) | Particle draw GPU min/median/max (ms) | Frame CPU+present min/median/max (ms) |
| --- | --- | --- | --- |
| 1.000.003 | 0,359 / 0,369 / 0,414 | 1,321 / 1,690 / 2,213 | 1,810 / 2,463 / 3,579 |
| 5.000.000 | 1,762 / 1,771 / 2,173 | 6,728 / 6,941 / 7,695 | 6,877 / 7,636 / 11,607 |

Các lượt trên có 4 warm-up/20 cặp sample trong harness hữu hạn. Draw chỉ particle core/halo, không toàn bộ hậu kỳ/HUD; frame có phạm vi khác. Sampling halo được công bố, core/state không bị giảm N. Readback toàn N chỉ ở validation job, không frame path.

Đối chiếu đầy đủ N lớn dùng fixture E-only một bước; scene render N lớn dùng helix. Bốn preset và hội tụ pha được kiểm riêng ở N nhỏ, không tuyên bố đã đối chiếu tất cả preset × mọi N. Các bản checkpoint đầu còn một số warning C4189 do biến scaffold chưa dùng ở bước đó; build không lỗi, nhưng đây không phải báo cáo “zero warnings”.

Một lượt source-contract toàn site bị supervisor dừng ở hard timeout 120 s và đã phát hiện checkpoint 8 trùng checkpoint 7. Sau khi bổ sung telemetry thực, nhóm source checks được chạy lại đạt 5/5. Không hạ quy tắc kiểm tra, không để test chờ vô hạn và không dùng nhóm targeted để tuyên bố toàn site 100%.

## Bàn giao kiểm thủ công

1. Kiểm trực tiếp native: Pause/N/R, orbit/pan/zoom, ID/picking/focus, panel/showcase và chú giải speed/q; Apply/invalid config, V/B/Escape và resize/camera đổi giữa benchmark.
2. Ghi lại kết quả kiểm tay hoặc lỗi kèm preset, N, seed, dt, E/B và thao tác tái hiện. Không dùng kết quả automatic hoặc hình ảnh đã duyệt để tự đánh dấu cổng manual.
3. Ghi kết quả hoặc giới hạn của toàn site regression rõ ràng. Chưa chạy toàn bộ suite nên không dùng kết quả targeted để nói “toàn site 100%”.

Chạy bản đã build tại `.validation/p38-matrix/Release/project_38_final.exe`, hoặc tự build từ ZIP theo README. Agent không mở lại cửa sổ theo lựa chọn của người dùng.

| Thử bằng tay | Kết quả cần thấy |
| --- | --- |
| H mở panel, Space Pause; N ba lần | Tick tăng đúng ba, position/velocity đổi theo bước; Pause không tự thêm trail point |
| Pause rồi kéo trái/phải, wheel, IJKL/Shift-IJKL và Page Up/Down | Camera orbit/pan/zoom; ID, tick và state đang đọc không tự đổi |
| 1–4 và cặp ID 0/1 | Thẳng/tròn/xoắn/gia tốc; hai dấu điện tích cong trái chiều khi có B |
| [ / ], F và click một trong 32 hạt theo dõi | Inspector báo đúng ID/probe time; F nhìn hạt; không giả click chọn toàn bộ một triệu |
| Sửa STAGED rồi Enter; R với cùng seed | Sửa chưa đổi ACTIVE; Apply về t=0; Reset lặp snapshot. Yêu cầu lỗi không phá state đang hợp lệ |
| T/M/D/H; góc trước và góc bên | Trails/legend speed-q/field arrows/panel đúng; có che khuất và chiều sâu, không đổi physics |
| V/B, Escape; đổi camera/resize khi benchmark đang chạy | Job đủ số mẫu/record mới complete; hủy hoặc đổi workload báo incomplete, cửa sổ vẫn đóng được bằng Q |

Các output cũ được giữ tại `.validation/retired-project-38-fountain`, ngoài Git. Source tracked cũ vẫn có thể khôi phục từ lịch sử; chưa stage/commit/push. Trong đợt kiểm đã sửa nhánh zero-size trước event loop, chú giải speed ở showcase và nhánh checkpoint 6 tham chiếu nhầm CPU preview.

## Chuỗi bài học đã triển khai

12 bài: dựng buồng 3D → state/seed → lực Lorentz → Boris → nghiệm tham chiếu → capability/SSBO → compute/render → thời gian/input và telemetry → ID/trails → validation hữu hạn → benchmark/quy mô → hoàn thiện. Số bài theo nội dung; không thay hoặc thu nhỏ phạm vi sản phẩm.
