# Project 44 — Xưởng điêu khắc thể tích

**Đang xây dựng, chưa nghiệm thu.** Bản nháp đã có cửa sổ C++/SDL3 và lõi GPU chạy ở 128³. Có starter, checkpoint 01 về một tetra và bản biên tập thử thách/bài đầu trong `course-draft/`; chưa có cả giáo trình, Canvas hoặc ZIP phát hành. Catalog cũ chưa thay. Không coi các kiểm tra dưới đây là bằng chứng hoàn thành toàn bộ đặc tả.

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
- `sculpt_gpu_pick.hpp`, `sculpt_controls.hpp`, `sculpt_guides.hpp`: picking field, một pointer owner, cọ dạng wire sphere, orbit/pan/zoom và hai chế độ thao tác riêng. Một stroke kéo trên mặt phẳng đi qua điểm bắt đầu, vuông góc hướng nhìn; không tự bám lại bề mặt sau mỗi stamp.
- `sculpt_field_file.hpp`, `sculpt_mesh_file.hpp`, `sculpt_export_jobs.hpp`, `sculpt_file_tasks.hpp`: Save/Load field có metadata/checksum, export OBJ với normal và đọc lại trước khi công bố file. Công việc được chia batch, cho hủy; không đưa readback lưu file vào đường meshing runtime.
- `sculpt_slice_inspector.hpp`: lát cắt đọc stored field trên GPU; probe số đọc đúng tám scalar (32 bytes), có nhãn field/mesh. Khung lát cắt và điểm probe cũng hiện trong không gian 3D.
- `sculpt_scene_tasks.hpp`: reset/preset và đổi resolution theo candidate riêng; đổi resolution resample field đã sửa trên GPU, giữ domain, không reset mất tác phẩm. Candidate bị hủy hoặc lỗi không thay model hiện có; history được xóa khi đổi grid thành công.
- `sculpt_mesh_topology.hpp`, `sculpt_gpu_product_verify.hpp`: oracle connectivity độc lập kiểm mesh kín, hướng cạnh, số thành phần và Euler characteristic. Fixture GPU khoét bằng subtract stroke rồi nối hai sphere bằng add stroke; không dùng torus preset thay lỗ cần tạo.
- `sculpt_tetra.hpp`, `sculpt_tetra_preview.hpp`: nhánh nhập môn CPU cho starter/checkpoint 01. Renderer chỉ phụ thuộc record mesh/buffer, không kéo GPU meshing vào đường gọi của bài đầu.

Picking đi từng bước bằng spacing/4 rồi chia đôi bracket 12 lần, tối đa 2.048 bước; không sphere-trace field đã sửa. Đây là picking xấp xỉ trên trilinear field: ca chạm tiếp tuyến hoặc chi tiết mỏng dưới bước lấy mẫu có thể bị bỏ sót. Giao điểm cũng không phải giao chính xác với từng triangle của marching tetrahedra.

Ngân sách 512 MiB áp dụng cho buffer điêu khắc được theo dõi: field, history, counts/offsets, mesh và snapshot I/O. Không gọi số này là toàn bộ VRAM của driver/window. UI và guide có budget geometry riêng. Batch GPU có fence deadline ba giây; file job có deadline tổng 60 giây. Grid job giới hạn 60 giây active work, không tính thời gian người dùng Pause; fence đang chạy vẫn có wall deadline riêng.

Kernel trả summary 16 bytes về số lần thực sự đổi sample. Stroke no-op không tạo history, xóa redo hoặc remesh. `BRUSH WRITES` đếm lượt ghi thay đổi qua các batch, không phải số sample duy nhất trong cả stroke.

## Điều khiển đang có

- Left drag: nặn khối; `Tab`: chuyển riêng sang camera. Right drag luôn orbit, middle drag pan; wheel zoom, `Home` đưa camera về ban đầu.
- `A` thêm, `D` bớt; F2/F3/F4 lần lượt tăng radius/strength/depth, giữ Shift để giảm, Ctrl để dùng bước lớn. Các nút −/+ trên panel nhận left click bước nhỏ, right click bước lớn. Phím cũ `[`/`]`, `-`/`=`, Page Up/Down vẫn có; Shift dùng bước lớn cho nhóm phím cũ này.
- `Z` undo, `Y` redo; `Escape` bỏ stroke và trả field về trước stroke. Bỏ focus hủy capture/stroke và pause meshing của model đang mở; candidate grid/file đang có vẫn được poll theo batch hữu hạn. Không cho pointer cũ viết vào model thay thế.
- F9 hoặc `V` bật slice, `X` đổi trục; Up/Down đổi layer, HJKL hoặc kéo trong ô slice đổi probe. F11/`W` wireframe, F12/`N` normal; Left/Right đổi isovalue.
- `R` reset preset đã chọn, `1` sphere, `2` hai sphere rời, `3` torus. F5/F6/F7/F8 đổi grid 32/64/128/192 samples mỗi trục. Reset bỏ chỉnh sửa; đổi resolution giữ field đã sửa qua GPU resampling, nhưng xóa history không còn cùng grid.
- `C` hủy grid job trước, rồi file job, nếu không có thì hủy remesh. `Enter` yêu cầu remesh lại. `Space` pause/resume grid job nếu có, nếu không thì pause meshing hiện tại; không phải nút pause tác vụ file. `Q` thoát.
- `S` lưu field vào một thư mục mới dưới `.runtime/volume-sculptor`, `O` mở lại field vừa lưu/đã load trong phiên, `E` xuất mesh đang được công bố. Mỗi file được kiểm lại trước khi đổi từ `.partial` thành `.scl`/`.obj`; không ghi đè file cũ. File partial của job bị hủy được giữ lại nhưng không được coi là kết quả hoàn chỉnh.
- Tools/Stats/Files có tab click hoặc F1. F10 thu gọn panel; nút Menu/F10 mở lại. Chế độ cọ/camera luôn có nhãn, kể cả khi panel thu gọn.

Sau khi build bằng fixture phát triển, bản native hỗ trợ `--grid 32|64|128|192`, `--load FILE`, `--seconds N`, `--hidden`, `--capture FILE.bmp`, `--show-slice`; các verifier riêng là `--verify`, `--verify-edits`, `--verify-files`, `--verify-slice`, `--verify-scene`, `--verify-products`, cùng `--plane` cho ca analytic. Không dùng verifier analytic cho field tùy ý đã load; các nhóm có đầu vào riêng và không được trộn tùy tiện.

`--radius`, `--strength`, `--depth`, `--subtract` chỉ khởi tạo cọ UI, chưa sửa field cho tới khi có stroke. `--trace-input` ghi key/scancode/modifier/repeat để chẩn đoán input trong chính app. F2/F3/F4 và nút panel là đường thay thế khi một bộ gõ không chuyển đủ phím dấu tới cửa sổ; chưa chứng nhận mọi bộ gõ/layout.

Starter và checkpoint 01 có CLI nhỏ riêng: `--hidden`, `--seconds 1..120`, `--capture FILE.bmp`. Bốn phím 1–4 đổi dấu mẫu, Left/Right đổi isovalue, drag orbit, wheel zoom, F11 wireframe, R reset. Các đường hướng dẫn tetra được vẽ xuyên qua mặt và có nhãn; triangle thật vẫn lấy từ CPU extraction. Đây chưa phải quy trình ZIP phát hành.

## Những phần chưa xong

Checkpoint 02 trở đi chưa có tiến triển học tập riêng: các snapshot ấy vẫn là fixture compile của bản editor, không được gọi là giáo trình hoàn chỉnh. Còn phải viết các bài tiếp theo và Canvas, hoàn tất benchmark có warm-up/lặp, kiểm thêm native controls/focus/resize, xây metadata/route thay thế và ZIP độc lập. Bài đầu đã có code thật và wiring; chưa gắn vào route hoặc Canvas nên vẫn là bản biên tập.

Kết quả theo từng phạm vi được ghi trong `docs/reviews/project-44-progress.md`; học phần Neighbor List cũ trên website chưa bị thay thế.

Kế hoạch và các gate nằm trong `docs/reviews/project-44-implementation-plan.md` của repository. Mọi build/test sẽ có hard timeout, không chạy toàn site hoặc tải/build lại SDL chỉ để kiểm một helper CPU.
