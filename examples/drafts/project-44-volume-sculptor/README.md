# Project 44 — Xưởng điêu khắc thể tích

**Đang xây dựng, chưa nghiệm thu.** Bản nháp đã có editor C++/SDL3/GPU ở 128³, starter và checkpoint 01–12 có tiến triển riêng. Thử thách và mười hai bài ở `course-draft/`; benchmark native đã được kiểm, nhưng Canvas, tích hợp website và ZIP phát hành chưa hoàn thành. Catalog cũ chưa thay. Không coi các kiểm tra dưới đây là bằng chứng hoàn thành toàn bộ đặc tả.

Đích của học phần là một công cụ nặn khối 3D: dùng cọ thêm/bớt vật liệu, tạo lỗ hoặc nối hai khối, undo/redo, xem lát cắt và xuất mesh. Field lưu bằng scalar samples thật; sau mỗi chỉnh sửa phải trích lại bề mặt phù hợp với dữ liệu đó. Không dùng ray-marched primitive ghép sẵn thay cho field có thể sửa.

## Hợp đồng dữ liệu đang triển khai

- Domain mặc định [-1,5; 1,5]³, âm là inside, dương là outside, isovalue 0. N samples mỗi trục cho (N−1)³ cells; `index=(z*N+y)*N+x`, spacing `3/(N−1)`.
- Một cube dùng sáu tetra quanh đường chéo 0–6. Mặt chung dùng cùng diagonal; mỗi giao điểm edge sắp endpoint theo sample ID trước khi nội suy. Giá trị đúng isovalue thuộc outside. Triangle có diện tích suy biến được đếm riêng và không emit; count/emit dùng cùng quy tắc.
- Normal lấy từ gradient của trilinear field. Gradient gần 0 dùng face normal và tăng fallback counter; không giấu winding/crack bằng cách chỉ làm shading mượt.
- Cọ add giảm field, subtract tăng field, falloff `(max(0,1−(distance/radius)²))²`. Strength là độ đổi scalar mỗi stamp, không phải lực hoặc tốc độ vật lý. Brush giữ nguyên sample biên; không nhận field sau chỉnh sửa còn là SDF.
- Stroke lấy mẫu mỗi radius/4, giữ phần quãng đường thừa giữa các input event. Một segment có tối đa 256 stamp; segment quá dài bị từ chối trước khi sửa dữ liệu. Chỉ pointer owner được đi tiếp/kết thúc; abort/reset không ghi tiếp vào grid khác.
- CPU extraction và brush/document bị chặn trên 64³. Final bắt buộc dùng field edit/count/scan/emit GPU trên 128³, với count trước allocation và last-good khi không đủ capacity.

## Phần đã có trong bản nháp

- `sculpt_grid.hpp`, `sculpt_topology.hpp`, `sculpt_cpu_mesh.hpp`, `sculpt_brush.hpp`, `sculpt_document.hpp`: toán, extraction và document CPU nhỏ để học/đối chiếu. Không làm thay workload GPU 128³.
- `sculpt_gpu_document.hpp`: field thật trên GPU, cọ add/subtract, hàng đợi tối đa 512 stamp, snapshot device-to-device và tối đa bốn snapshot undo/redo tổng cộng. Blur/cancel khôi phục cả khi một vùng cọ mới được xử lý một phần.
- `sculpt_gpu_mesh.hpp` cùng shader field/extract/scan/normals: count trước allocation, scan riêng, emit triangle và gradient normal. Chunk 16³ cells; giữ chunk không bị ảnh hưởng và publish toàn giao dịch. Lỗi/cancel giữ mesh hợp lệ trước đó, không trộn output hai generation.
- `sculpt_gpu_layout.hpp`: storage và dispatch count/scan dùng chung cho mesher cuối và viewer Bài 07. Pass không cấp mesh vertex buffer; shader chỉ có một thuật toán scan, không có bản khác dành riêng cho bài học.
- `sculpt_gpu_pick.hpp`, `sculpt_controls.hpp`, `sculpt_guides.hpp`: picking field, một pointer owner, cọ dạng wire sphere, orbit/pan/zoom và hai chế độ thao tác riêng. Một stroke kéo trên mặt phẳng đi qua điểm bắt đầu, vuông góc hướng nhìn; không tự bám lại bề mặt sau mỗi stamp.
- `sculpt_field_file.hpp`, `sculpt_mesh_file.hpp`, `sculpt_export_jobs.hpp`, `sculpt_file_tasks.hpp`: Save/Load field có metadata/checksum, export OBJ với normal và đọc lại trước khi công bố file. Công việc được chia batch, cho hủy; không đưa readback lưu file vào đường meshing runtime.
- `sculpt_slice_inspector.hpp`: lát cắt đọc stored field trên GPU; probe số đọc đúng tám scalar (32 bytes), có nhãn field/mesh. Khung lát cắt và điểm probe cũng hiện trong không gian 3D.
- `sculpt_scene_tasks.hpp`: reset/preset và đổi resolution theo candidate riêng; đổi resolution resample field đã sửa trên GPU, giữ domain, không reset mất tác phẩm. Candidate bị hủy hoặc lỗi không thay model hiện có; history được xóa khi đổi grid thành công.
- `sculpt_mesh_topology.hpp`, `sculpt_gpu_product_verify.hpp`: oracle connectivity độc lập kiểm mesh kín, hướng cạnh, số thành phần và Euler characteristic. Fixture GPU khoét bằng subtract stroke rồi nối hai sphere bằng add stroke; không dùng torus preset thay lỗ cần tạo.
- `sculpt_tetra.hpp`, `sculpt_tetra_preview.hpp`: nhánh nhập môn CPU cho starter/checkpoint 01. Renderer chỉ phụ thuộc record mesh/buffer, không kéo GPU meshing vào đường gọi của bài đầu.
- `sculpt_cpu_preview.hpp`, `sculpt_cpu_controls.hpp`, `sculpt_cpu_pick.hpp`: các bước 02–05 dùng grid nhỏ, normal face/gradient, picking stored field, một stamp rồi stroke/history. Cọ vẫn sửa CPU field ở các bước này; GPU chỉ vẽ mesh đã upload.
- `sculpt_gpu_field_preview.hpp`, `sculpt_gpu_field_controls.hpp`, `sculpt_gpu_field_verify.hpp`: bước 06 sửa field GPU qua một lát cắt, chưa count/scan/emit. `--verify` đối chiếu field/history/probe riêng, không gọi CPU extraction. `sculpt_field_slice.hpp` dùng chung phần vẽ/probe với editor cuối, không sao chép một renderer khác.
- `sculpt_gpu_count_job.hpp`, `sculpt_gpu_count_overlay.hpp`: bước 07 đếm toàn bộ chunk và hiển thị count/offset của cell được chọn. Khóa edit khi đọc snapshot, công bố summary theo generation/revision; chưa emit hoặc cấp mesh output. Counted và emitted được ghi riêng.
- `sculpt_gpu_scan_verify.hpp`, `sculpt_gpu_count_verify.hpp`: bốn mảng scan biết trước, kiểm mọi prefix/padding, tetra oracle CPU chỉ ở 32³, layout bit-exact khi undo/redo, input gate/pause/cancel/retry và reset khi còn count ticket. Không nằm trong đường runtime count của editor.
- `sculpt_gpu_surface_preview.hpp`, `sculpt_gpu_surface_overlay.hpp`: bước 08 tạo và vẽ mesh GPU 3D; cố ý rebuild toàn volume sau một edit thật. Dirty reuse chỉ bật từ checkpoint 09. Viewer 08 chưa hiện slice/resolution/file controls của các bước sau.
- `sculpt_gpu_emit_verify.hpp`: kiểm emit/normal, full rebuild, field+mesh history, camera không remesh và capacity refusal/recovery. Fixture riêng với spacing nhị phân kiểm gradient 0, giữ normal mặt; readback chỉ để kiểm, không nằm trong vòng nặn tương tác.
- `sculpt_grid_guides.hpp`: mặt lưới và hướng X/Z theo origin/extent tài liệu, dùng chung cho các viewer; pure CPU fixture kiểm domain mặc định và domain đã dịch/thu phóng.
- `sculpt_chunk_inspector.hpp`: hộp world-space của một chunk trong work list, kể cả tail chunk không đủ 16 cells. Bước 09 thêm I/F6 để xem mà không remesh, F5 full rebuild để đối chiếu dirty reuse; không tạo một thuật toán extraction khác.
- `sculpt_gpu_job_verify.hpp`: Pause thu hồi fence/không gửi batch mới, queued request không bị gắn nhãn current, stale count bị bỏ, cancel sau khi candidate đã emit một phần vẫn giữ active, trả candidate bytes và retry byte-exact. Bước 09 dùng verifier edit chung với editor cuối, không giả lập workload GPU trên CPU.
- `sculpt_mesh_snapshot.hpp`: payload CPU chỉ phục vụ fixture, so trực tiếp bytes của từng chunk; có test phân biệt signed zero, normal lệch một ULP, empty và số đỉnh khác nhau. Runtime không readback toàn mesh để làm phép so này.

Picking đi từng bước bằng spacing/4 rồi chia đôi bracket 12 lần, tối đa 2.048 bước; không sphere-trace field đã sửa. Đây là picking xấp xỉ trên trilinear field: ca chạm tiếp tuyến hoặc chi tiết mỏng dưới bước lấy mẫu có thể bị bỏ sót. Giao điểm cũng không phải giao chính xác với từng triangle của marching tetrahedra.

Ngân sách 512 MiB áp dụng cho buffer điêu khắc được theo dõi: field, history, counts/offsets, mesh và snapshot I/O. Không gọi số này là toàn bộ VRAM của driver/window. UI và guide có budget geometry riêng. Batch GPU có fence deadline ba giây; file job có deadline tổng 60 giây. Grid job giới hạn 60 giây active work, không tính thời gian người dùng Pause; fence đang chạy vẫn có wall deadline riêng.

Kernel trả summary 16 bytes về số lần thực sự đổi sample. Stroke no-op không tạo history, xóa redo hoặc remesh. `BRUSH WRITES` đếm lượt ghi thay đổi qua các batch, không phải số sample duy nhất trong cả stroke.

## Điều khiển của editor GPU cuối

- Left drag: nặn khối; `Tab`: chuyển riêng sang camera. Right drag luôn orbit, middle drag pan; wheel zoom, `Home` đưa camera về ban đầu.
- `A` thêm, `D` bớt; F2/F3/F4 lần lượt tăng radius/strength/depth, giữ Shift để giảm, Ctrl để dùng bước lớn. Các nút −/+ trên panel nhận left click bước nhỏ, right click bước lớn. Phím cũ `[`/`]`, `-`/`=`, Page Up/Down vẫn có; Shift dùng bước lớn cho nhóm phím cũ này.
- `Z` undo, `Y` redo; `Escape` bỏ stroke và trả field về trước stroke. Bỏ focus hủy capture/stroke, pause meshing và grid job; fence đã gửi vẫn được poll. File task tiếp tục theo batch, dùng C để hủy. Không cho pointer cũ viết vào model thay thế.
- F9 hoặc `V` bật slice, `X` đổi trục; Up/Down đổi layer, HJKL hoặc kéo trong ô slice đổi probe. F11/`W` wireframe, F12/`N` normal; Left/Right đổi isovalue.
- `R` reset preset đã chọn, `1` sphere, `2` hai sphere rời, `3` torus. Ctrl+1/2/3/4 đổi grid 32/64/128/192 samples mỗi trục; F5 full remesh, I/F6 hiện/chọn chunk. Reset bỏ chỉnh sửa; đổi resolution nội suy field đã sửa trên GPU, có thể mất chi tiết khi giảm N và xóa history không còn cùng grid.
- `C` hủy grid job trước, rồi file job, nếu không có thì hủy remesh. `Enter` yêu cầu remesh lại. `Space` pause/resume grid job nếu có, nếu không thì pause meshing hiện tại; không phải nút pause tác vụ file. `Q` thoát.
- `S` lưu field vào một thư mục mới dưới `.runtime/volume-sculptor`, `O` mở lại field vừa lưu/đã load trong phiên, `E` xuất mesh đang được công bố. Mỗi file được kiểm lại trước khi đổi từ `.partial` thành `.scl`/`.obj`; không ghi đè file cũ. File partial của job bị hủy được giữ lại nhưng không được coi là kết quả hoàn chỉnh.
- Tools/Stats/Files có tab click hoặc F1. F10 thu gọn panel; nút Menu/F10 mở lại. Chế độ cọ/camera luôn có nhãn, kể cả khi panel thu gọn.

Sau khi build bằng fixture phát triển, bản native hỗ trợ `--grid 32|64|128|192`, `--load FILE`, `--seconds N`, `--hidden`, `--capture FILE.bmp`, `--show-slice`; các verifier riêng là `--verify`, `--verify-edits`, `--verify-files`, `--verify-slice`, `--verify-scene`, `--verify-products`, cùng `--plane` cho ca analytic. Không dùng verifier analytic cho field tùy ý đã load; các nhóm có đầu vào riêng và không được trộn tùy tiện.

`--radius`, `--strength`, `--depth`, `--subtract` chỉ khởi tạo cọ UI, chưa sửa field cho tới khi có stroke. `--trace-input` ghi key/scancode/modifier/repeat để chẩn đoán input trong chính app. F2/F3/F4 và nút panel là đường thay thế khi một bộ gõ không chuyển đủ phím dấu tới cửa sổ; chưa chứng nhận mọi bộ gõ/layout.

## Các checkpoint nhập môn đã có

| Mốc | Kết quả chạy được |
| --- | --- |
| Starter | Bốn scalar samples và khung tetra; chưa tạo triangle. |
| 01 | Một tetra tạo triangle qua edge interpolation. |
| 02 | Ghép sáu tetra/cell và nhiều cell thành một khối nhỏ, normal theo face. |
| 03 | Giữ nguyên positions/topology, chuyển sang gradient normal từ trilinear field. |
| 04 | Picking field thật và đặt một stamp add/subtract mỗi click. |
| 05 | Kéo stroke theo world distance; commit/rollback và undo/redo theo nét. |
| 06 | Init/edit stored field GPU 128³; xem lát cắt và probe, chưa tạo mesh GPU. |
| 07 | Count/prefix scan GPU, xem phân bố counts/offsets và địa chỉ output; emitted vertices vẫn bằng 0. |

Starter/01 có CLI nhỏ riêng: `--hidden`, `--seconds 1..120`, `--capture FILE.bmp`. Phím 1–4 đổi dấu mẫu, Left/Right đổi isovalue, drag orbit, wheel zoom, F11 wireframe, R reset. Tetra guides được vẽ xuyên mặt; triangle thật lấy từ CPU extraction.

Checkpoint 02–05 dùng `--grid 12|24|32` (mặc định 24), `--hidden`, `--verify`, `--seconds`, `--capture`. `--verify` ở đây chỉ kiểm presentation khởi đầu; không phải toàn bộ kiểm input. Bài 03 thêm F8 đổi face/gradient, F12 normal view; Bài 04 đặt stamp, chưa có history; Bài 05 mới có stroke và Z/Y. F10 thu gọn panel, F11 wireframe, Tab đổi cọ/camera, right drag orbit và middle drag pan.

Checkpoint 06 dùng `--grid 32|64|128|192` (mặc định 128), `--hidden`, `--seconds`, `--capture`, `--verify`; `--plane` chỉ đi cùng verifier. Viewer là lát cắt SSBO, không phải mesh: X đổi trục, Up/Down hoặc wheel đổi layer, HJKL chọn điểm, Enter đặt stamp, left drag kéo stroke, A/D đổi mode, F2/F3 đổi radius/strength (Shift giảm, Ctrl bước lớn). Z/Y, Escape, Space, R và preset 1–3 vẫn có. Tham số/slice bị khóa trong capture; blur/resize/reset bỏ owner cũ và rollback stroke.

Verifier 06 so tám lượt toàn field với double reference, kiểm năm quan hệ bit-exact về history/no-op và 27 probe. Nó có readback hữu hạn chỉ để kiểm; đường tương tác không tải toàn field về CPU. Các timings trên panel là GPU query, chưa phải benchmark lặp. Quy trình CMake/ZIP cho bản phát hành vẫn còn phải nghiệm thu riêng.

Checkpoint 07 dùng cùng CLI với 06 nhưng `--verify` kiểm pipeline count/scan. F5/F6 chọn chunk, F7/F8 chọn cell, Ctrl dùng bước 16; selection được giữ qua edit/history và không làm job chạy lại. C hủy count đang chạy, F1 đếm lại, Space Pause sau batch đang bay. Enter/Z/Y/cọ không được sửa field lúc count/scan đang đọc nó. Lát cắt và phần đọc probe dùng chung với Bài 06; prefix inspector chỉ đọc/cache một chunk 32 KiB, không tính scan bằng CPU.

Verifier 07 kiểm đủ 4.096 offsets trên bốn mảng biết trước, rồi toàn counts/offsets của init/add/undo/redo; ở 128³ là 8.388.608 prefix checks qua bốn snapshot. Sau đó kiểm pause/cancel/retry/reset. Một lượt Debug ban đầu đã dừng đúng 20 giây; đã tối ưu kiểm CPU theo batch hữu hạn và chỉ vẽ UI verifier 10 Hz, giữ nguyên workload/checks/timeout. Debug/Release 128³ hiện qua, không phải benchmark. Kiểm desktop 07 mới xác nhận F8, một stroke và undo; còn các controls/focus/resize cần lượt kiểm tiếp.

Checkpoint 08 trả lại viewport 3D: left drag nặn, Tab đổi riêng sang camera, right drag orbit, middle drag pan, wheel zoom; F2/F3/F4 chỉnh radius/strength/depth, Shift giảm/Ctrl bước lớn. F11/F12 xem wireframe/normal, F10 thu gọn panel; Z/Y history, Home camera, R reset sphere, Space pause, C cancel, Enter resume/retry, Q thoát. Chưa có controls slice/resolution/file trong viewer này. Panel ghi riêng counted request và emitted active, báo last-good khi job chưa xong; một edit thật vẫn rebuild 512/512 chunk ở N=128.

Verifier 08 có `--verify` cho plane/sphere và CPU layout oracle nhỏ; `--verify-edits` kiểm cọ, full rebuild, history field+mesh, camera và capacity/recovery; `--verify-normals` chạy riêng fixture grid 32³ có spacing nhị phân, kiểm 384 lượt fallback gradient 0 trong 3.330 vertices. Các fixture không trộn với nhau. Debug/Release 128³ đã qua edit; plane lớn Release và topology oracle ở 32³ cũng qua. Desktop đã kiểm stroke, Z/Y, orbit, zoom, F10/F11/F12 và nhãn camera sau sửa; focus/resize và các controls còn lại vẫn cần kiểm tiếp.

Checkpoint 09 giữ viewport/cọ của 08 và bật dirty reuse. I hiện hộp chunk được chọn, F6 chọn chunk tiếp trong work list; F5 yêu cầu full remesh cùng isovalue. Inspector không sửa field hoặc generation. `--verify-edits` kiểm dirty so với full cùng history/failure/recovery; `--verify-jobs` kiểm queued request, Pause, stale count, cancel giữa emit và retry, chạy riêng trong 20 giây. Undo/redo vẫn đánh dấu toàn grid dirty; chưa có tối ưu delta history.

Pause chặn cả API cọ/undo/redo ở model. Nhãn current dựa trên field/mesh/requested khớp nhau, không chỉ dựa vào enum ready; một yêu cầu đang chờ Pause được ghi `REMESH REQUEST QUEUED`, còn active mesh giữ nhãn last-good.

Checkpoint 10 chuyển sang editor Tools/Stats: slice/probe, isovalue và grid candidate. F9/V bật slice, X đổi trục, Up/Down đổi layer, HJKL/left drag trong ô chọn điểm. Probe chỉ đọc tám scalar khi field/mesh current; cache theo cả field revision và mesh generation, bị bỏ khi thay model. Ctrl+1/2/3/4 đổi resolution; 1/2/3 không Ctrl reset preset. F5/F6 không bị đổi nghĩa. File UI/CLI chưa xuất hiện ở bước này.

Bài 10 giải thích riêng UV/đảo v, logical/drawable viewport, nội suy trilinear khác nội suy trong tetra, isovalue không ghi field và giảm/tăng N không khôi phục chi tiết đã mất. GPU fixture 128³ kiểm 45 probe, 12 sign-color pixels và cache lifecycle; resample 128→64→128 so toàn samples đích với reference độc lập, giữ domain/world edits và last-good khi lỗi/hủy. 17 CLI sai của editor 10 bị chặn trước window. Build và CTest Debug/Release qua; chưa có ma trận UI trực tiếp đầy đủ cho editor 10.

Checkpoint 11 thêm tab Files, S/O/E và `--load`/`--verify-files`. `course-draft/11-luu-field-va-xuat-mesh.mdx` dạy layout little-endian/checksum, stream theo batch, candidate load, snapshot export và read-back trước rename. Checksum/digest không được trình bày như chữ ký hay bằng chứng byte-exact; `MeshReader` có visitor triangle phục vụ phép so trực tiếp, không giữ cả OBJ trong RAM.

I/O Release 128³ và Debug 32³ qua: save/load so field cùng từng chunk mesh bằng bytes; OBJ parse so đủ 408.024/23.544 vertices và normals với snapshot nguồn dù remesh đang diễn ra. Cancel save/export/load không công bố partial hoặc thay model; candidate load trả budget và phát tín hiệu giữ document cũ. CTest kiểm thêm signed zero/binary32 qua bốn batch sizes, face sai bị chặn trước visitor. 20 CLI sai của editor 11 và ba ca startup load (đúng, checksum sai, thiếu file) qua. Đây không phải kiểm S/O/E bằng chuột/phím hoặc nghiệm thu mở OBJ trong phần mềm khác.

## Benchmark của checkpoint 12/final

`sculpt_benchmark.hpp` dùng cùng mesher/brush/shaders với editor. Mỗi trial tạo model mới, dựng sphere, đặt một stamp add tại (0,7; 0; 0), radius 0,32/strength 0,28 rồi full remesh cùng field đã sửa. Hai trial warm-up bị loại, năm trial sau mới tính median/min/max/MAD. Báo 16 cột GPU (init field/count/scan/emit/normals, local brush/history/count/scan/emit/normals, full count/scan/emit/normals, draw) và host total riêng. Không đọc cả field/mesh trong workload đo; có đọc summaries/canary và một pixel ngoài draw query.

```powershell
cmake --build build --config Release --parallel 1 --target project_44_final
./build/Release/project_44_final.exe --benchmark --grid 128
```

Chỉ `--grid`/`--hidden` đi cùng benchmark. Cờ này tự dùng hidden window, không capture input; draw chỉ vẽ mesh với camera/drawable cố định trong lượt, không gồm clear, panel, slice, swap/vsync. App có deadline 45 giây, fence ba giây; runner tự động cần supervisor bên ngoài khoảng 50 giây và cleanup process tree. Đừng thêm `--seconds`, ghép verifier hoặc dùng preset nhỏ thay kết quả 128³. Nếu không đủ mọi trial, không có aggregate hoàn tất.

`BENCH_TRIAL` giữ cả mẫu warm-up; `BENCH_STAT` báo thống kê; `BENCH_COUNTERS` nêu workload. Kèm lệnh configure/build, CPU/OS/compiler khi chia sẻ; NDEBUG chỉ là một marker, không tự nhận diện mọi build configuration. Dùng Release cho phép đo chính, Debug chỉ chẩn đoán. Script kiểm local đã tính lại 17 nhóm thống kê từ raw samples, không chỉ tìm chữ COMPLETE.

Release 128³ trên RTX 3050 Laptop: sphere 408.024 → edited 410.616 vertices, local 27/512 chunk và 62 nonempty buffers được reuse. Benchmark final và checkpoint 12 qua, Debug 32³ cũng qua với nhãn diagnostic. Peak reservation 59.861.328 bytes ở 128³, cuối trial về baseline 0; chỉ gồm buffers được theo dõi/guards, không gọi là tổng VRAM. Số thời gian cụ thể chỉ thuộc máy/protocol trong hồ sơ kiểm, không phải ngưỡng pass hoặc cam kết FPS.

Bài 12 nối phép đo với sản phẩm thực: fixture Release 128³ vẫn khoét tunnel bằng subtract, kiểm 257 outside probes/Euler 0, và nối hai sphere thành một với 129 inside probes/Euler 2; undo/redo giữ các trạng thái topology. Kiểm correctness, benchmark và UI là ba phạm vi riêng. Editor từ chối `--capture` đi với edit/file/scene/product verifier chạy riêng để không báo thành công trong khi đã bỏ qua yêu cầu tạo ảnh; analytic/slice capture ở đường vòng lặp chính vẫn có thể dùng.

## Những phần chưa xong

Mười hai bài đã có mã thật/wiring và kiểm source, chưa gắn vào route hoặc Canvas. Còn phải viết Canvas, kiểm thêm native controls/focus/resize và load domain dịch, chạy ma trận checkpoint sau thay đổi cuối, xây metadata/route thay thế cùng ZIP độc lập. Các verifier GPU và benchmark không thay cho kiểm chuột/bàn phím desktop hoặc build lại gói tải về.

Kết quả theo từng phạm vi được ghi trong `docs/reviews/project-44-progress.md`; học phần Neighbor List cũ trên website chưa bị thay thế.

Kế hoạch và các gate nằm trong `docs/reviews/project-44-implementation-plan.md` của repository. Mọi build/test sẽ có hard timeout, không chạy toàn site hoặc tải/build lại SDL chỉ để kiểm một helper CPU.
