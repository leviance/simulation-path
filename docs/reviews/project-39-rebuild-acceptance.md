# Project 39 — hồ sơ xây dựng và nghiệm thu

Nguồn chuẩn: [Product Specification v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), mục Project 39.

Ứng dụng **Khám phá thành phố 3D với một triệu vật thể** có source C++20/SDL3/OpenGL 4.3 mới, không còn lấy bảng reduction/prefix sum làm sản phẩm cuối. Native giữ scene và pipeline GPU-driven; Canvas 2D chỉ minh họa một tập CPU thu nhỏ.

Các artifact cuối đã được sinh, build, kiểm GPU và đóng gói đồng bộ. Executable final đã sinh, không chỉ bản source-template, vượt qua kiểm thuật toán, quy mô một triệu object và tích hợp sự kiện. Website production, các route, browser suite và ZIP cũng đã được kiểm riêng. **Thao tác chuột/phím trực tiếp trên cửa sổ C++ chưa được xác nhận**; không dùng kiểm tự động để tự đánh dấu cổng đó.

## Đối chiếu các yêu cầu sản phẩm

| Yêu cầu | Bằng chứng hiện có | Giới hạn / bước còn lại |
| --- | --- | --- |
| Thành phố 3D có đường, quảng trường, nhiều hình dáng/vật liệu, perspective/depth | Renderer native đã cho ảnh thành phố; camera có tầm phố/trên cao, observer inset và frustum/bounds | Chưa xác nhận trải nghiệm trực tiếp bằng chuột/phím trên cửa sổ native |
| Scene tái lập, ID ổn định, ngân sách và đổi N/seed an toàn | CPU tests và SDL-queue integration trên final đã sinh kiểm initial R/N, last-good scene, hủy/đổi cấu hình; candidate giữ riêng | Input OS thực vẫn thuộc cổng manual |
| Sáu plane, sphere trong/ngoài/cắt mép | CPU fixture và GPU fixture độc lập; scalar double classifier đối chiếu mask | Đáp án fixture không thay kiểm khả năng sử dụng camera/debug |
| Reduction sum/min/max và hierarchical integer scan | GPU thật kiểm N=0/1/7/257/513/262.145; arbitrary integer data/counts→offsets, nhiều tầng, guard records | Integer so exact; khoảng cách float dùng tolerance riêng |
| Compaction theo mesh rồi record index | Mask/prefix/visible list khớp toàn tập fixture; stable ID rời rạc, không mất/trùng/ghi quá buffer | Visible list chứa record index, không đánh tráo thành Object.id |
| GPU ghi command, renderer đọc GPU list | Kiểm mọi field/range của ba command, all-visible→mixed→empty không giữ count cũ | Frame path không full readback hoặc CPU compaction |
| Scene ít nhất một triệu object records thật | Final đã sinh chạy N=1.000.003: tested đủ N, full mask/prefix/IDs/commands khớp; resident/accepted/submitted được báo | Bằng chứng tại các snapshot/fixture công bố, không khẳng định mọi cấu hình bất kỳ đều đã được thử |
| Culling on/off giữ hình hợp lệ | Sáu camera snapshot có framebuffer A/B giống nhau | Frustum culling không phải occlusion culling |
| Camera/FOV/culling/debug/picking/reset/cancel | Integration qua SDL event queue kiểm các transition; browser controls đạt 9/9 kiểm trong suite web | Chưa xác nhận input OS/chuột/phím thực trên native |
| Validation có deadline/cancel | Runtime job 12/12 camera/toggle fixture và nhánh Cancel đạt; source có giới hạn batch/fence/total | V kiểm 257 record trong buffer riêng, không tự chứng nhận scene một triệu |
| Đo hiệu năng đúng phạm vi | Final Release đã sinh hoàn tất sáu camera × on/off, hai warm-up/chín sample mỗi cấu hình; đủ query GPU, CPU submit, whole frame và GPU-ready | Máy/build/background load và scope được ghi bên dưới; không hứa FPS hoặc speedup chung |
| Starter/checkpoint/final/CTest | Sau sửa winding trong city_mesh.hpp, đủ 14 app build Debug/Release, CTest 1/1 mỗi cấu hình; cả 14 bản Release smoke/compile GLSL thật đạt; final đã sinh vượt toàn bộ --verify | CPU tests còn kiểm normal hướng ra ngoài cho mọi mặt của cube, tapered tower và pyramid |
| Giáo trình và source theo từng bài | 12 MDX, bảy vai trò giảng dạy; 38 C++/GLSL excerpts khớp đúng checkpoint; content 5/5, source 5/5 | Đây là cổng nội dung/source, không phải tuyên bố toàn site 100% |
| Canvas và trang web | Math 11/11; production rebuild sau mesh/bài đầu qua trong 177,5 s; trên đúng build này, routes 5/5 và production Playwright 4/4 đều qua | Không suy từ suite targeted thành toàn site 100% |
| ZIP/catalog/publication | ZIP mới sau city_mesh.hpp: 409 file, 574.641 byte; giải nén so byte và digest đều khớp | Entry revision 39 được gỡ vì artifact đã thay đồng bộ và các cổng tự động qua, không vì manual đã đạt |

Entry chờ xây dựng lại của Project 39 đã được gỡ sau khi lesson, C++, Canvas, metadata và ZIP được thay đồng bộ và các cổng tự động hoàn tất. Trạng thái “đã có hướng dẫn” là trạng thái biên tập, không phải chứng nhận cổng manual đã qua.

## Bằng chứng GPU và quy mô

Phần cứng đã chạy: NVIDIA GeForce RTX 3050 Laptop GPU, NVIDIA driver 546.30, OpenGL 4.3. Mốc một triệu được chạy bằng dữ liệu thật trên GPU, không lấy số tam giác/pixel hoặc số mẫu Canvas để thay object records.

- Primitive fixtures N=0, 1, 7, 257, 513 và 262.145 đều qua. N=262.145 buộc scan đi qua ba mức; integer sum/min/max và bốn channel counts→offsets được kiểm độc lập.
- Scene fixtures đi từ all-visible sang mixed rồi empty trên allocation đang dùng. Mask, prefix, compacted record indices, sparse stable IDs, command ranges và guard records được đối chiếu.
- Scene N=1.000.003 có full mask/prefix/IDs/commands khớp chính xác, tested=N. Snapshot camera ban đầu nhận 7.594 object; buffers dùng 88.251.572 byte. Accepted/submitted không có nghĩa từng object đều tạo pixel cuối cùng.
- Sáu camera snapshot được so culling off/on bằng framebuffer thật, không có HUD che ảnh đối chiếu; các cặp ảnh giống nhau.
- Runtime validation job trên final đã sinh hoàn tất 12/12 fixture camera/toggle; nhánh Cancel được kiểm riêng và không trở thành PASS.
- SDL-queue integration trên final đã sinh kiểm culling, FOV, tầm phố/góc trên cao, tour/Pause, inset picking, V/B/Cancel, initial R/N và last-good scene. Sau sửa winding, final --verify được chạy lại, gồm toàn N, sáu camera framebuffer A/B và kiểm SDL controls. Đây không phải kiểm chuột/phím OS trực tiếp.

Khoảng cách được so bằng ngưỡng tuyệt đối 0,002 world units cộng phần tương đối 2e-5 × |reference|. Count/offset/ID không dùng epsilon. Tập accepted rỗng giữ sentinel +infinity/-infinity cho distance min/max và được UI ghi là empty.

## Kết quả hiệu năng có phạm vi

Lần đo mới nhất chạy bằng **executable final Release đã sinh**, GPU/driver nêu trên, seed 39. Cả sáu camera × culling on/off hoàn tất hữu hạn; mỗi cấu hình bỏ hai warm-up rồi lấy chín sample. Camera 0 với N=1.000.003 cho kết quả sau, đơn vị millisecond:

| Culling | GPU median | GPU MAD | CPU submit median | CPU whole-frame median | Frame-to-GPU-ready median |
| --- | --- | --- | --- | --- | --- |
| On | 1,30355 | 0,006144 | 1,2946 | 1,3365 | 3,119 |
| Off | 7,57453 | 0,036864 | 9,0841 | 9,1389 | 17,4775 |

Ca nhỏ N=257, camera 0 không cho thấy lợi ích của culling:

| Culling | GPU median (ms) | GPU MAD (ms) |
| --- | --- | --- |
| On | 0,147456 | 0,03072 |
| Off | 0,11776 | 0,007168 |

Các số trên được đo lại sau sửa winding. Median on của ca nhỏ cao hơn off, nhưng chín sample và độ phân tán quan sát được không đủ để suy một tỷ lệ chậm chung. Trong đợt đo, production web build cũng đang chạy trên CPU. Vì vậy, đây là bằng chứng phép đo và workload đã hoàn tất trên máy này, **không phải benchmark trong điều kiện máy rảnh được kiểm soát**, không bảo đảm FPS trên phần cứng khác và không chứng minh mọi góc nhìn đều có cùng speedup.

Các đồng hồ hiện có giữ nhãn riêng:

- GPU pass query: cull, reduction, scan, compaction, command và draw; tổng là tổng các query.
- CPU submit: từ đầu frame đến trước present.
- CPU whole frame: từ đầu frame đến sau SDL_GL_SwapWindow, gồm thời gian CPU trong present; không tự chứng minh GPU đã hoàn tất.
- Frame-to-GPU-ready: từ đầu frame đến lúc poll thấy query GPU xong, gồm độ trễ chờ/poll; không phải kernel time thuần.

Không cộng những khoảng thời gian chồng lấp này thành một “tổng” mới.

## Chất lượng giáo trình và khả năng tái tạo

Mười hai bước nối vào cùng ứng dụng: khu phố chạy được → record/seed/budget → frustum CPU → mask GPU → reduction → block scan → hierarchical scan → grouped compaction → indirect draw → debug/picking/safe rebuild → validation/benchmark → bản hoàn chỉnh.

Bài đầu giải thích mesh/instancing/camera và phần scaffold được cung cấp. Bài 2 chạy N=257 trước, tăng qua 65.537 rồi mới 1.000.003; bản nhỏ giúp đọc dữ liệu, không hạ mốc nghiệm thu. Mỗi bài có vấn đề, mô hình, các bước code, chạy thử, lỗi cố ý, checklist và bài tập. Final nêu build Debug/Release, CTest, CLI kiểm/đo và source đầy đủ.

Các kiểm đã qua:

- Content 5/5 và source-contract 5/5, gồm 12 MDX compile và 38 excerpts khớp token liên tiếp trong đúng checkpoint.
- Canvas math 11/11; Canvas công bố số mẫu CPU, không tạo GPU timing giả.
- Browser trên localhost đã có: 3/3 trong 48,8 s, đi qua 12 bài/mode tương ứng, controls 9/9, source JSON/code và progress sau reload.
- Production Playwright trên build cuối đạt 4/4 trong 22,9 s: pointer capture/drag, bỏ qua pointer không sở hữu, cancel, DPR, reduced motion, keyboard, source và tiến độ sau reload. Server kiểm thử tạm đã được runner dọn sau khi kết thúc; dev server của người dùng không bị khởi động lại hoặc dừng.
- Production routes đã đạt 5/5 gồm 13 route mới, route workbench cũ trả 404, roadmap/home/downloads nhất quán; production rebuild sau city_mesh.hpp và đoạn giảng bài đầu qua trong 177,5 s.
- TypeScript cuối sau rebuild và ESLint targeted đều exit 0.
- Support tests 14/14, architecture và Git hygiene qua; bước regeneration cuối không đổi hoặc xóa output nào.
- ZIP sau city_mesh.hpp có 409 file, 574.641 byte; đã giải nén và so byte/digest với source/checkpoints/final, tất cả khớp.

Snapshot, source JSON, ZIP, dependency và build output là dữ liệu được sinh ngoài Git; Git hygiene kiểm riêng phần này. Kết quả targeted không được dùng để tuyên bố toàn site đã đạt 100%.

## Những lỗi đã được phát hiện và sửa

- Stats pending của scene cũ có thể hoàn tất sau commit N/seed mới. Scene commit nay invalidates cả fence/bản chụp cũ, không chỉ đặt valid=false.
- Picking trong inset nay dùng camera observer, rectangle và aspect của inset; không lấy ray của camera chính để chọn trong ảnh phụ.
- Inset được clear color/depth và hình frustum dùng đúng far plane thay vì một khoảng debug không trùng phép kiểm.
- R/N trong lúc tạo scene đầu tiên dùng requested count phù hợp, không vô tình tạo scene rỗng.
- P/Space điều khiển đường camera tham quan. Pause không dừng camera thủ công, input hoặc biến scene tĩnh thành mô phỏng chuyển động giả.
- Winding một số mặt mesh không khớp hướng normal cần có. Mesh chung nay nằm trong city_mesh.hpp với indices CCW; CPU fixture kiểm mọi mặt của cube, tapered tower và pyramid hướng ra ngoài. Đã rebuild cả ma trận, smoke đủ 14 executable và kiểm lại GPU/framebuffer sau sửa, không chỉ đổi ảnh hoặc ánh sáng để che lỗi.

Các nhánh này có kiểm tích hợp SDL queue. Đó là bằng chứng phần xử lý sự kiện/transition, không thay việc dùng chuột/phím OS thật.

## Bàn giao kiểm trực tiếp native

Phần còn chưa được xác nhận là thao tác chuột/phím OS thực trên cửa sổ C++. Cần kiểm camera phố/trên cao, right-drag/capture/focus, inset picking, bounds/frustum, FOV, culling, seed/N/reset, P/Space và V/B/X; đồng thời kiểm resize/high-DPI và lỗi last-good. SDL queue integration giúp kiểm logic xử lý sự kiện, không thay cổng sử dụng trực tiếp này.

Phiên kiểm Windows UI chưa thu được state cửa sổ do công cụ không định danh đúng foreground PID; cửa sổ đã tự đóng sau giới hạn 120 giây. Không ghi native manual đã qua và không để phiên kiểm treo vô hạn. Bước này vẫn cần kiểm trực tiếp hoặc bàn giao rõ cho người dùng.
