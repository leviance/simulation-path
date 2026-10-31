# Phần VII — biên tập lộ trình GPU Compute

Ngày biên tập: 2026-10-30. Nguồn chuẩn là [Product Specification v4 — 78 project](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), mục Project Index, bản đồ học và Phần VII. Báo cáo này ghi quyết định cùng phần triển khai còn thiếu, không tạo một đặc tả thay thế.

## Đích đến sau biên tập

| Project | Sản phẩm cuối trong đặc tả | Kiến thức tính toán phục vụ sản phẩm |
| --- | --- | --- |
| 37 | Máy tính vector CPU/GPU có inspector và benchmark | Vòng đời compute, layout, validation và phạm vi đo |
| 38 | Buồng hạt tích điện 3D trong điện trường/từ trường | State GPU lâu dài, Boris pusher, compute→graphics và kiểm quỹ đạo |
| 39 | Khám phá thành phố 3D với một triệu vật thể | Frustum culling, reduction/scan, compaction và GPU-generated indirect draw |
| 40 | Xưởng vải 3D: kéo, ghim và thả vải phủ lên vật thể | XPBD, giải constraint không race, grid/contact 3D và mesh biến dạng |

Người dùng đã chọn buồng hạt tích điện thay đài phun ở Project 38. Sau đó người dùng yêu cầu thay cả Project 39 và 40 vì tên/kết quả quá trừu tượng: sản phẩm phải kết hợp xử lý tính toán nặng với đồ họa trực quan. Hai project này được biên tập theo hướng ứng dụng thành phố/vải ở bảng trên, không dừng ở dashboard reduction/scan hoặc công cụ grid.

Project 32 vẫn là đài phun CPU với AoS/SoA. Boids ở 27–28 được giữ nguyên; luật Boids không còn là prerequisite của Project 40. Không đổi số thứ tự hoặc nội dung Project 66–78.

## Phạm vi và mức quy mô

- **38:** ít nhất một triệu hạt được cập nhật thật; năm triệu là mở rộng theo phần cứng. Hạt độc lập trong trường ngoài, không giải plasma tự nhất quán. Preset chuẩn không có respawn/va chạm làm thay đổi nghiệm tham chiếu.
- **39:** ít nhất một triệu object records được GPU xét ở mỗi frame nghiệm thu, không đếm tam giác hoặc pixel thay instance. Frustum culling không đồng nghĩa occlusion; phải công bố tested/accepted/submitted.
- **40:** ít nhất 100.000 đỉnh vải động cùng constraints/contacts tương ứng; một triệu đỉnh là mở rộng. Self-contact bản chuẩn xấp xỉ theo đỉnh có thickness công bố, không bảo đảm loại mọi giao cắt edge/triangle.
- Không hứa FPS/speedup hoặc kết quả độc lập tuyệt đối với timestep/iteration. Có reference, ngân sách tài nguyên, residual/sai số, pass timings và phép kiểm hữu hạn.
- Mỗi project có executable C++/SDL3 độc lập. Mảng nhỏ, dashboard, grid và Canvas là công cụ giảng dạy/kiểm chứng, không thay viewport 3D của Project 38–40.

Các hợp đồng chi tiết, interactions và Acceptance Criteria nằm trong tài liệu chuẩn; không chép lại toàn bộ vào báo cáo này.

## Triển khai hiện tại chưa được đổi theo đặc tả

| Project | Bằng chứng hiện có | Phần còn phải xây |
| --- | --- | --- |
| 37 | Workbench trong source/lessons hiện có được giữ | Đối chiếu riêng các cổng nghiệm thu; đợt biên tập không chứng nhận lại toàn project |
| 38 | [Source buồng hạt tích điện](../../examples/project-38-charged-particle-chamber/README.md), 12 bài và Canvas mới đã được xây | Theo dõi các cổng còn lại trong [hồ sơ nghiệm thu](project-38-rebuild-acceptance.md); chưa dùng build/GPU verification thay kiểm tương tác native |
| 39 | [Source hiện có](../../examples/project-39-gpu-reduction-prefix-sum/source-template/include/reduction_math.hpp) có reduction/scan trên float; ba shader reduce/scan/uniform-add phục vụ workbench | City scene/renderer, object bounds/IDs, culling/compaction/indirect commands, integer offsets và validation theo hợp đồng mới |
| 40 | [README source hiện có](../../examples/project-40-gpu-spatial-grid-neighbors/README.md) là công cụ grid/tìm hàng xóm 2D | Topology/constraint solver, mesh presentation, input pin/drag, grid/contact 3D, normals và bộ kiểm vải |

Project 38 đang được nghiệm thu theo sản phẩm mới; bản đài phun trước đó đã chuyển sang dự phòng ngoài Git. Project 39–40 vẫn giữ bản cũ. Xem hồ sơ riêng để phân biệt phần đã kiểm tự động, hình ảnh được duyệt và tương tác native chưa kiểm; bảng này không chứng nhận hoàn thành toàn bộ Phần VII.

## Thứ tự triển khai tiếp theo

1. Xây lại 38 với phép kiểm một hạt, rồi state/update/render trên GPU và nghiệm thu scale; không thay hình đài phun mà giữ nguyên phương trình cũ.
2. Xây 39 từ khu phố có thể khám phá, đưa culling/scan/compaction/commands vào cùng cảnh. Tận dụng primitive cũ sau khi đối chiếu hợp đồng, không dùng workbench làm sản phẩm cuối.
3. Xây 40 từ ràng buộc có đáp án độc lập và mảnh vải nhỏ, thêm contact/grid 3D rồi tăng resolution. Không mặc định grid 2D cũ đáp ứng contact/topology 3D.
4. Trong từng đợt, đồng bộ tên/description/dependency, lesson, source, tests và source ZIP cùng nhau. Thống nhất phạm vi thay nguồn và giữ dự phòng trước khi loại nội dung cũ; đợt biên tập này không xóa chúng.
5. Kiểm riêng correctness, build/checkpoints, GPU thật, desktop interactions và scale. Ghi rõ cổng chưa kiểm chứng, không dùng build hoặc ảnh đẹp thay phép kiểm còn thiếu.

Đợt biên tập đặc tả ban đầu chỉ đổi roadmap và báo cáo. Việc xây lại Project 38 là đợt triển khai riêng, có kết quả và cổng còn chờ tại hồ sơ nghiệm thu được liên kết ở trên. Chưa stage/commit/push/deploy.
