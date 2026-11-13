# Project 44 — Xưởng điêu khắc thể tích

**Đang xây dựng, chưa nghiệm thu.** Bản nháp đã có cửa sổ C++/SDL3 và lõi GPU chạy ở 128³. Chưa gắn vào catalog, chưa có giáo trình/checkpoint học tập hoặc ZIP phát hành. Không coi các kiểm tra dưới đây là bằng chứng hoàn thành toàn bộ đặc tả.

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

Picking đi từng bước bằng spacing/4 rồi chia đôi bracket 12 lần, tối đa 2.048 bước; không sphere-trace field đã sửa. Đây là picking xấp xỉ trên trilinear field: ca chạm tiếp tuyến hoặc chi tiết mỏng dưới bước lấy mẫu có thể bị bỏ sót. Giao điểm cũng không phải giao chính xác với từng triangle của marching tetrahedra.

Ngân sách 512 MiB áp dụng cho buffer điêu khắc được theo dõi: field, history, counts/offsets, mesh và snapshot I/O. Không gọi số này là toàn bộ VRAM của driver/window. UI và guide có budget geometry riêng. Các batch GPU có fence deadline ba giây; tác vụ file có deadline tổng 60 giây.

## Điều khiển đang có

- Left drag: nặn khối; `Tab`: chuyển riêng sang camera. Right drag luôn orbit, middle drag pan; wheel zoom, `Home` đưa camera về ban đầu.
- `A` thêm, `D` bớt vật liệu; `[`/`]` đổi radius; `-`/`=` đổi strength; Page Up/Down dịch mặt phẳng cọ theo hướng nhìn, trong khoảng [-1; 1] world unit.
- `Z` undo, `Y` redo; `Escape` bỏ stroke đang kéo và trả field về trước stroke. Bỏ focus hủy capture/stroke và pause job; camera vẫn dùng được khi pause.
- `W` wireframe, `N` normal; Left/Right đổi isovalue; `C` hủy file job nếu đang có, nếu không thì hủy remesh; `Enter` yêu cầu remesh lại. `Space` pause/resume job hiện tại; `Q` thoát.
- `S` lưu field vào một thư mục mới dưới `.runtime/volume-sculptor`, `O` mở lại field vừa lưu/đã load trong phiên, `E` xuất mesh đang được công bố. Mỗi file được kiểm lại trước khi đổi từ `.partial` thành `.scl`/`.obj`; không ghi đè file cũ. File partial của job bị hủy được giữ lại nhưng không được coi là kết quả hoàn chỉnh.

Sau khi build bằng fixture phát triển, executable hỗ trợ `--grid 32|64|128|192`, `--load FILE`, `--seconds N`, `--hidden`, `--capture FILE.bmp`, `--verify`, `--verify-edits`, `--verify-files` và `--plane` cho fixture analytic. Các nhóm fixture có đầu vào riêng; không dùng `--verify` analytic cho một field tùy ý đã load. Đây chưa phải quy trình CMake/ZIP dành cho người học.

## Những phần chưa xong

Slice và probe tương tác, reset/preset/resolution trong UI, GPU draw timing, bằng chứng trực tiếp tạo lỗ/cầu nối, rà soát đồ họa/khả năng đọc panel và toàn bộ giáo trình/Canvas/ZIP vẫn còn phải hoàn thiện. Click nhanh và file controls mới cần lượt kiểm cửa sổ C++ tiếp theo. Các snapshot sinh trong fixture hiện chỉ dùng compile, chưa phải các checkpoint giảng dạy khác nhau.

Kết quả theo từng phạm vi được ghi trong `docs/reviews/project-44-progress.md`; học phần Neighbor List cũ trên website chưa bị thay thế.

Kế hoạch và các gate nằm trong `docs/reviews/project-44-implementation-plan.md` của repository. Mọi build/test sẽ có hard timeout, không chạy toàn site hoặc tải/build lại SDL chỉ để kiểm một helper CPU.
