# Project 44 — tiến độ và bằng chứng bản nháp

Ngày ghi nhận: 14/11/2026. Đây **không phải** biên bản nghiệm thu toàn học phần. Nguồn chuẩn vẫn là mục Project 44 trong [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

Nguồn mới ở `examples/drafts/project-44-volume-sculptor`. Catalog, bài học, Canvas và ZIP Neighbor List cũ chưa được thay hoặc đổi nhãn thành sản phẩm mới.

## Triển khai hiện tại

- Stored field GPU; init, brush, count, exclusive scan, emit, gradient normals; grid 128³ samples = 2.097.152 samples, không phải 2.097.152 cells. Số cells thật là 127³ = 2.048.383.
- Chunk 16³ cells, tối đa 147.456 vertices/chunk, capacity mesh 4.194.304 vertices. Count xong toàn dirty job mới bắt đầu cấp phát output; không cắt triangle để vừa buffer.
- Dirty dependency gồm geometry và halo gradient. Chunk tái sử dụng giữ generation đã build thật, thêm `validForGeneration` riêng; không giả vờ chạy lại GPU cho chunk giữ nguyên.
- Một pointer owner, resampling theo quãng đường, cọ/preview 3D, orbit/pan/zoom, add/subtract, undo/redo bốn snapshot GPU. Capture/blur/cancel có rollback field; mesh cũ còn hiển thị trong khi job mới chạy.
- File field little-endian, header 64 bytes, metadata được validate, checksum gồm metadata và payload. Load dùng một model riêng, upload theo batch; chỉ handoff sau checksum/EOF và meshing hoàn chỉnh.
- Save đóng băng field GPU; export giữ các buffer mesh immutable. File được ghi, flush, đọc lại rồi mới đổi tên thành kết quả hoàn chỉnh. OBJ dùng các triangle `position//normal` đã trải phẳng; parser nghiêm ngặt cho đúng format này, không phải importer OBJ tổng quát.

## Đã kiểm bằng lệnh

Máy: NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL context 4.3, driver 546.30. C++20/MSVC Visual Studio 2022, SDL 3.4.8 từ package đã cấu hình ở máy; không tải/build lại SDL cho mỗi lượt.

| Phạm vi | Bằng chứng hiện có |
| --- | --- |
| Build native | Fixture CMake mới build executable draft và tests ở Debug, Release. Chưa phải ma trận starter/từng checkpoint/final của giáo trình. |
| CPU CTest Debug/Release | Row-major/bounds/overflow; 16 mask tetra, tie/winding; 48 mask mặt chung ở ba trục; mặt cầu kín 4.680 edges; plane/gradient; refinement; brush/stroke/history; parser field và OBJ. |
| Refinement CPU | RMS bán kính sphere ở N=12/24/48: 0,00705054 → 0,00215023 → 0,00048578 world unit. |
| GPU sphere 128³ | 22.778 active cells, 408.024 vertices, 136.008 triangles; RMS bán kính 0,0000703696, max 0,000249134 world unit; max scalar error 4,23268e-7; canary nguyên. |
| GPU plane 128³ | 32.075 active cells, 481.134 vertices, 160.378 triangles; RMS vị trí 5,58448e-8, max 3,32594e-7 world unit; outward normal và packing hợp lệ. |
| GPU topology/scan 32³ Debug và Release | Đối chiếu CPU từng cell/prefix/emit: 29.791 cells, 23.544 vertices; 11.772 mesh edges có hai owner với tọa độ bit-exact, không crack trên fixture sphere kín. |
| GPU edit 128³ | Stroke mẫu chỉ rebuild 27/512 chunks, tái sử dụng 62 chunk không rỗng; toàn bộ mesh/normals khớp từng byte với full remesh cùng field. Max scalar error add 4,06516e-7, subtract 1,14335e-7 so với falloff double độc lập. |
| GPU history/lifecycle | Sai owner không sửa/kết thúc stroke; undo/redo bit-exact; rollback giữa các batch của vùng cọ; sáu stroke thêm vẫn chỉ giữ bốn snapshot. Cancel, capacity refusal, budget refusal và fault injection thiếu buffer storage giữ last-good/budget/canary. Không gây OOM thật để thử lỗi. |
| GPU picking | Ba ray trúng, một ray trượt và một ray xuất phát bên trong; max sai số z 0,000454587 world unit so với sphere analytic; summary readback 64 bytes, tối đa 2.048 bước. Không chứng minh mọi ca tiếp tuyến/chi tiết dưới bước lấy mẫu. |
| GPU field file 128³ | 8.388.672 bytes gồm header; field đang sửa sau lúc đóng băng không làm đổi file; load khôi phục field và GPU mesh bit-exact, history mới rỗng. |
| GPU mesh file | Export/parse đủ 408.024 vertices, 136.008 triangles, 39.704.266 bytes trên Windows. Numeric hash khớp bit-exact dù editor đã remesh generation khác. |
| File lifecycle | Hủy save/export không công bố file partial; payload sai checksum không được handoff và không sửa model hợp lệ đang có. |

Các phép kiểm GPU 128³, edit và file chạy bằng Release; topology/scan 32³ đã chạy cả Debug và Release. Không đồng nhất build/CTest Debug với việc đã chạy toàn bộ GPU fixtures ở Debug. Timings trong verifier là GPU query cho từng pass, không phải enqueue; chưa có benchmark warm-up/median/dispersion và chưa đo draw pass.

Fixture phát triển nằm dưới `.validation/p44-core` và `.validation/p44-volume-native`, có supervisor/hard deadline; app GPU có fence timeout ba giây. Không đưa fixture, thư viện SDL, CMake output, executable, snapshot, file export hoặc ZIP vào Git. Bộ build native hiện chạy serial để giảm RAM, tắt MSBuild node reuse.

## Đã quan sát trực tiếp trong cửa sổ C++

Đã kéo cọ Add rồi Subtract, thấy field/mesh đổi hình, undo trở lại sphere, redo khôi phục stroke. Đã chuyển riêng sang camera và orbit: góc nhìn đổi nhưng generation mesh không tăng. Trong lúc undo đang remesh, mesh hợp lệ cũ vẫn hiện cùng nhãn field/mesh khác revision.

Lượt này diễn ra trước khi thêm file controls và sửa click nhanh. **Chưa xác nhận lại** click nhanh, Save/Load/Export bằng phím trong UI, blur/reset/resolution, slice/probe, wireframe/normal trong sản phẩm cuối. Không lấy fixture gọi API trực tiếp thay cho bằng chứng thao tác các controls này.

## Còn phải làm trước khi thay học phần cũ

1. Slice/probe có giá trị field thật và nhãn phiên bản; reset/preset/resolution có lifecycle an toàn; đo draw riêng.
2. Tạo lỗ xuyên khối và cầu nối bằng cọ trong native app; rà đồ họa/độ sâu, khả năng đọc panel, brush không chạm sample và các tình huống picking/input. Hiện vùng dirty bảo thủ có thể tạo history entry dù kernel không thực sự đổi sample; cần counter chỉnh sửa thực để bỏ qua stroke no-op. Giải thích giới hạn picking fixed-step và field không phải SDF.
3. Viết thử thách, các lesson tiếng Việt tự nhiên, checkpoint có tiến triển thật, snippet markers/contract và mã hoàn chỉnh; phân biệt phần scaffold cấp sẵn.
4. Canvas 2D phục vụ câu hỏi học tập, controls/accessibility/DPR/reduced-motion; metadata, glossary, search/progress revision, roadmap/route thay thế cũ.
5. ZIP độc lập, build/CTest từng checkpoint và final, kiểm gói/website, browser QA nếu localhost có sẵn. Không tự bật dev server.
6. Audit từng yêu cầu trong spec với bằng chứng hiện tại rồi mới chuyển trạng thái nghiệm thu. Không tăng budget hoặc hạ spec để hợp thức hóa bản nháp.
