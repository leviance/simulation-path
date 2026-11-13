# Project 44 — Xưởng điêu khắc thể tích

**Đang xây dựng.** Thư mục draft chưa được gắn vào catalog, chưa có ZIP phát hành và chưa phải chương trình C++/SDL3 hoàn chỉnh. Không dùng các fixture CPU dưới đây để nhận đã đạt GPU 128³.

Đích của học phần là một công cụ nặn khối 3D: dùng cọ thêm/bớt vật liệu, tạo lỗ hoặc nối hai khối, undo/redo, xem lát cắt và xuất mesh. Field lưu bằng scalar samples thật; sau mỗi chỉnh sửa phải trích lại bề mặt phù hợp với dữ liệu đó. Không dùng ray-marched primitive ghép sẵn thay cho field có thể sửa.

## Hợp đồng dữ liệu đang triển khai

- Domain mặc định [-1,5; 1,5]³, âm là inside, dương là outside, isovalue 0. N samples mỗi trục cho (N−1)³ cells; `index=(z*N+y)*N+x`, spacing `3/(N−1)`.
- Một cube dùng sáu tetra quanh đường chéo 0–6. Mặt chung dùng cùng diagonal; mỗi giao điểm edge sắp endpoint theo sample ID trước khi nội suy. Giá trị đúng isovalue thuộc outside. Triangle có diện tích suy biến được đếm riêng và không emit; count/emit dùng cùng quy tắc.
- Normal lấy từ gradient của trilinear field. Gradient gần 0 dùng face normal và tăng fallback counter; không giấu winding/crack bằng cách chỉ làm shading mượt.
- Cọ add giảm field, subtract tăng field, falloff `(max(0,1−(distance/radius)²))²`. Strength là độ đổi scalar mỗi stamp, không phải lực hoặc tốc độ vật lý. Brush giữ nguyên sample biên; không nhận field sau chỉnh sửa còn là SDF.
- Stroke lấy mẫu mỗi radius/4, giữ phần quãng đường thừa giữa các input event. Một segment có tối đa 256 stamp; segment quá dài bị từ chối trước khi sửa dữ liệu. Chỉ pointer owner được đi tiếp/kết thúc; abort/reset không ghi tiếp vào grid khác.
- CPU extraction và brush/document bị chặn trên 64³. Final bắt buộc dùng field edit/count/scan/emit GPU trên 128³, với count trước allocation và last-good khi không đủ capacity.

## Nguồn hiện có

`sculpt_math.hpp`, `sculpt_grid.hpp`, `sculpt_topology.hpp`, `sculpt_cpu_mesh.hpp`, `sculpt_brush.hpp` và `sculpt_document.hpp` là đường học/fixture CPU. GPU, cửa sổ SDL3, công cụ đầy đủ, bài học và Canvas vẫn phải được hoàn thiện trước khi thay bản Neighbor List cũ.

Kế hoạch và các gate nằm trong `docs/reviews/project-44-implementation-plan.md` của repository. Mọi build/test sẽ có hard timeout, không chạy toàn site hoặc tải/build lại SDL chỉ để kiểm một helper CPU.
