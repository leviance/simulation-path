# Project 44 — tiến độ và bằng chứng bản nháp

Ngày ghi nhận: 14/11/2026. Đây **không phải** biên bản nghiệm thu toàn học phần. Nguồn chuẩn vẫn là mục Project 44 trong [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

Nguồn mới ở `examples/drafts/project-44-volume-sculptor`. Catalog, bài học, Canvas và ZIP Neighbor List cũ chưa được thay hoặc đổi nhãn thành sản phẩm mới.

Ghi chú đặc tả: ví dụ ở Mục 3.6 còn nhắc Project 44 bằng số hạt, không cùng sản phẩm với mục Project 44 hiện là xưởng điêu khắc. Đợt này không sửa đặc tả; phạm vi và quy mô triển khai bám mục Project 44 cụ thể, tối thiểu 128³ scalar samples.

## Triển khai hiện tại

- Stored field GPU; init, brush, count, exclusive scan, emit, gradient normals; grid 128³ samples = 2.097.152 samples, không phải 2.097.152 cells. Số cells thật là 127³ = 2.048.383.
- Chunk 16³ cells, tối đa 147.456 vertices/chunk, capacity mesh 4.194.304 vertices. Count xong toàn dirty job mới bắt đầu cấp phát output; không cắt triangle để vừa buffer.
- Dirty dependency gồm geometry và halo gradient. Chunk tái sử dụng giữ generation đã build thật, thêm `validForGeneration` riêng; không giả vờ chạy lại GPU cho chunk giữ nguyên.
- Một pointer owner, resampling theo quãng đường, cọ/preview 3D, orbit/pan/zoom, add/subtract, undo/redo bốn snapshot GPU. Capture/blur/cancel có rollback field; mesh cũ còn hiển thị trong khi job mới chạy.
- Summary GPU 16 bytes đếm lượt thực sự đổi sample: no-op không ghi history/xóa redo/remesh. Bộ đếm brush writes không được gọi là số sample duy nhất.
- Slice shader đọc cùng stored field; probe số đọc tám scalar (32 bytes), có revision/generation. Numeric cache được giữ có nhãn khi field còn thay đổi và xóa khi chọn điểm mới.
- Reset/preset/resolution dùng model candidate; GPU resampling giữ field đã sửa/domain và chỉ handoff khi mesh xong. Pause không tiêu ngân sách active work, nhưng fence GPU vẫn có wall deadline; yêu cầu mới thay yêu cầu cũ, failure/cancel giữ model đang mở.
- File field little-endian, header 64 bytes, metadata được validate, checksum gồm metadata và payload. Load dùng một model riêng, upload theo batch; chỉ handoff sau checksum/EOF và meshing hoàn chỉnh.
- Save đóng băng field GPU; export giữ các buffer mesh immutable. File được ghi, flush, đọc lại rồi mới đổi tên thành kết quả hoàn chỉnh. OBJ dùng các triangle `position//normal` đã trải phẳng; parser nghiêm ngặt cho đúng format này, không phải importer OBJ tổng quát.
- Starter và checkpoint 01–07 đã tách hành vi: một tetra → ghép cell → gradient normal → stamp CPU → stroke/history CPU → field GPU qua lát cắt → count/scan và prefix inspector. Bước 06 không count/scan/emit; 07 chưa cấp mesh output. 08–12 vẫn chưa có giáo trình riêng.
- Phần vẽ/probe lát cắt được tách vào `sculpt_field_slice.hpp`, dùng chung cho viewer 06 và editor cuối. Resampling shader chỉ xuất hiện từ checkpoint 10; không buộc Bài 06 học đổi resolution trước khi biết init/edit.
- `GpuChunkLayout` là pass count/scan chung cho editor cuối và viewer 07; `dispatchScan` dùng cho cả runtime và fixture mảng biết trước. Viewer 07 không cấp mesh output, chặn mutation khi có count ticket và giữ summary cũ có nhãn khi xử lý snapshot mới.

## Đã kiểm bằng lệnh

Máy: NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL context 4.3, driver 546.30. C++20/MSVC Visual Studio 2022, SDL 3.4.8 từ package đã cấu hình ở máy; không tải/build lại SDL cho mỗi lượt.

| Phạm vi | Bằng chứng hiện có |
| --- | --- |
| Build native | Editor draft, tests, starter và checkpoint 01–07 đã build Debug/Release. Chưa phải ma trận đầy đủ mọi checkpoint của giáo trình. |
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
| GPU no-op 32³ | Zero changed writes giữ nguyên field, revision, generation, buffer IDs, undo và redo; không remesh. |
| GPU resolution 128→64→128 | Đối chiếu mọi sample với stored CPU trilinear reference: down max 5,96046e-7, up max 7,15256e-7. Giữ domain và phần đã nặn; history mới rỗng. |
| GPU grid lifecycle | Same-grid no-op; coalesce yêu cầu; reset trong stroke bỏ owner cũ; pause giữa batch; cancel, budget refusal và invalid N giữ last-good. |
| GPU slice 128³ plane | 45 probe ở ba trục/ba layer/năm UV, max scalar error 3,02792e-7; 12 pixel trên ba mặt phẳng khớp sign color và viewport/DPR mapping của stored field. |
| GPU sản phẩm khoét/ghép | Release 128³: drill bằng subtract stroke cho mesh kín, oriented, 1 component, Euler 0; 257 probe thông tunnel. Bridge add stroke chuyển 2→1 component, Euler 4→2, 129 probe ở phần nối inside. Undo/redo khôi phục cả hai topology. Debug 32³ cũng qua; không gọi kết quả 32³ là quy mô nghiệm thu. |
| Oracle connectivity | Không gọi lại extraction: kiểm số owner và hướng của edge, connected components, V−E+F. CTest phân biệt sphere/torus/hai sphere và phát hiện missing/reversed triangle. Fixture readback tối đa một triệu vertices, không nằm trong đường meshing runtime. |
| Pause/camera/domain CPU | Fake clock mô phỏng 897 giây Pause, không sleep; deadline đúng 60 giây active. Pan model có origin dịch không nhảy về world origin; domain import phải nằm trong miền thao tác cọ. |
| Tetra nhập môn | 16 mask × 3 isovalue, edge reference double và affine gradient độc lập; từ chối hai ca overflow hữu hạn. Starter chỉ vẽ input, checkpoint 01 tạo triangle. Smoke/capture hữu hạn Debug/Release xác nhận mặc định 0/1 triangle tương ứng. |
| Normal CPU 02/03 | Positions/topology bit-exact khi đổi face→gradient. Sai số RMS hướng normal với sphere radial analytic: 0,0855207 → 0,00169478; checker field còn kiểm 384 lần fallback gradient 0. Không phải sai số vị trí hoặc góc tính theo độ. |
| Picking/stamp CPU | Plane tolerance 2e-5 world unit, field nhân 3 không còn SDF, ray từ bên trong, pick sau khi nặn và giao mặt phẳng drag. Stamp riêng không tạo history; no-op giữ redo, đổi thật mới xóa history cũ. |
| Presentation CPU 02–05 | Tám lượt Debug/Release ở N=24 đều có 13.176 vertices/4.392 triangles, field và mesh field cùng revision. Ảnh 02/03 thể hiện shading khác nhau với cùng geometry. Đây chỉ là initial presentation smoke, chưa phải kiểm mouse/keyboard của từng viewer. |
| Field GPU checkpoint 06 | Debug/Release ở 128³: tám lượt scalar reference, năm quan hệ bit-exact history/no-op, 27 probe; sphere max 4,23268e-7, plane Release max 5,89759e-7. 8.388.608 field bytes, 64 guard bytes; không count/scan/emit hoặc CPU extraction. |
| Field 06 mở rộng/CLI | Release 192³ chạy 7.077.888 samples/6.967.871 cells, max 4,87464e-7. Chỉ chứng minh field, không phải meshing 192³. Bảy input CLI sai bị từ chối exit 1 trước window; timeout trước khi verifier xong không được báo PASS. |
| Bài 01–07 dạng draft | 49 code block C++ và chín GLSL khớp token liên tiếp ở đúng checkpoint. Bảy bài compile qua MDX thật, đủ bảy teaching roles, One Dark 10 màu và KaTeX accessible. Bài 07 giải thích padding, edge/tetra count, scan cây/ba pha, input gate và publication; chưa kiểm route/Canvas vì chưa đăng ký catalog. |
| Scan GPU mảng biết trước | Bốn mảng 4.096 phần tử: zero, max 36, impulse tại ranh block và seeded mixed. So đủ 16.384 offsets/tổng bằng uint64 prefix tuần tự độc lập, emitted 0, guard nguyên. Cùng shader/dispatch với native mesher, không có thuật toán scan thứ hai. |
| Count-only 07 ở 128³ | Debug/Release: bốn snapshot init/add/undo/redo, mỗi snapshot so 2.097.152 padded offsets và đúng 2.048.383 real cells. Counted vertices 408.024 → 410.472 → 408.024 → 410.472; emitted 0. Không CPU extraction/count toàn field 128³; oracle tetra CPU chạy ở 32³. |
| Lifecycle 07 | Input gate Enter/Z/Y, Pause sau batch, cancel giữ summary, idle cancel no-op, retry mới generation, selection không recount/không đổi cell qua edit/history. Reset khi còn ticket đợi drain rồi thay field, xóa history và invalidation summary/timing/inspection; preset gốc 128³ trở lại 408.024 counted vertices, field/count revision 1, generation 8. Debug/Release qua; Release plane 32³ cũng qua CPU oracle/reset. |
| Hồi quy slice/grid cuối | Sau khi tách renderer dùng chung: 45 numeric probe (max 3,94783e-8) và 12 sign-color pixels/DPR qua; resample 128→64→128, reset, cancel, pause, allocation refusal/last-good đều qua lại. Không suy ra các controls desktop đã được kiểm thêm. |
| Hồi quy pass count/scan chung | Sphere 128³ vẫn đủ 408.024 vertices/136.008 triangles; oracle 32³ so 29.791 cells, prefixes và 11.772 closed edges. Dirty edit 27/512 chunks vẫn byte-exact với full mesh; history/no-op, partial rollback, cancel/capacity/budget/storage refusal giữ last-good và canary. Đây là các kết quả editor cuối, tách với viewer count-only 07. |

Các phép kiểm GPU 128³, edit và file chạy bằng Release; topology/scan 32³ đã chạy cả Debug và Release, sản phẩm khoét/ghép chạy thêm Debug 32³. Không đồng nhất CTest Debug với toàn bộ GPU fixtures ở Debug. Có query rendering riêng, không chặn và gắn scene epoch/mesh generation; đã quan sát giá trị trong Stats của native app. Chưa có benchmark warm-up/median/dispersion, không dùng một snapshot timing để kết luận hiệu năng.

Fixture phát triển nằm dưới `.validation/p44-core` và `.validation/p44-volume-native`, có supervisor/hard deadline; app GPU có fence timeout ba giây. Không đưa fixture, thư viện SDL, CMake output, executable, snapshot, file export hoặc ZIP vào Git. Bộ build native hiện chạy serial để giảm RAM, tắt MSBuild node reuse.

## Đã quan sát trực tiếp trong cửa sổ C++

Đã kéo Add/Subtract, undo/redo và orbit mà generation mesh không tăng. Click nhanh tạo một stroke. Kéo probe trong ô slice làm đổi điểm/giá trị nhưng không thêm stroke; F10/Menu và tab Tools/Stats/Files hoạt động.

Hai sphere preset 2 được nối bằng một stroke kéo chuột qua khoảng hở; orbit thấy cầu nối có chiều sâu. Export từ UI báo OBJ đã đọc kiểm lại. Save → Reset → Load khôi phục được phần đã nặn.

Với sphere mặc định, cọ subtract radius 0,58, strength 0,65, depth 0,25 và bốn click ở giữa viewport đã tạo lỗ nhìn xuyên. Field được lưu rồi mở lại đúng hình. Đây là ca UI khác drill stroke dọc Z trong verifier; không gán các số topology của ca tự động cho tác phẩm UI.

Log input có lượt không nhận đủ keydown của phím dấu; chưa kết luận nguyên nhân cụ thể. Đã thêm nút −/+ và F2/F3/F4 với modifier rõ; kiểm trực tiếp được Ctrl+F2/Ctrl+F3/Ctrl+F4 và right click bước lớn. Không đổi cài đặt Windows. F11 wireframe đã quan sát; normal view, alias slice F9, pan/zoom và toàn bộ blur/resize/reset/resolution cần lượt kiểm cuối sau khi ổn định giáo trình. Không lấy API fixture thay bằng chứng UI của các controls ấy.

Các lượt UI có app deadline 120 giây và supervisor 130 giây; khi hết hạn, tiến trình đã được xác nhận exit 0. Có một lượt helper báo người dùng đang thao tác; đã quan sát lại trạng thái, không tiếp tục gửi phím từ ảnh cũ. Không tự bật dev server hoặc commit phần xây tiếp.

Viewer 06 mới chỉ được mở ẩn để chạy verifier và capture; chưa thao tác desktop trực tiếp. Ảnh đã xem cho thấy lát cắt/contour, circle cọ, counters và hướng dẫn bàn phím không đè nhau ở 1280×820. Lượt smoke đầu bắt lỗi chưa gọi `gl.loadAll()`; đã sửa đúng thứ tự context → load → preflight → allocation và chạy lại Debug/Release. Không lấy các fixture GPU thay bằng chứng pointer capture/blur của viewer này.

Viewer 07: F8 đổi cell từ count 18/offset 0/end 18 sang count 24/offset 18/end 42 mà field revision/count generation vẫn 1. Một left drag tạo bulge trên lát cắt; lúc count đang chạy, summary còn count revision 1 và inspector chờ snapshot mới. Hoàn tất có 417.696 counted vertices ở revision 2. Z khôi phục sphere và 408.024 vertices ở revision 3. Đây là stroke UI khác stamp tự động của verifier, không gán 410.472 của fixture cho thao tác chuột này.

Cửa sổ 07 tự thoát theo app deadline 120 giây, supervisor xác nhận exit 0 và inventory không còn cửa sổ. Lần gửi Y sau đó nhận `foreground window did not report a process id`; đã dừng input, không dùng lại screenshot/handle cũ và reset session. Redo desktop và các controls/focus/resize còn phải kiểm tiếp. Đã sửa việc selection tự nhảy về cell đầu khi field đổi; fixture mới xác nhận selection được giữ, chưa kiểm lại riêng thay đổi đó bằng chuột.

Verifier 07 Debug 128³ ban đầu tự dừng thất bại ở 20 giây. Sau khi batch tối đa bốn chunk CPU/tick, kiểm bằng pointer chỉ sau khi xác nhận đúng kích thước và vẽ UI verifier 10 Hz, cả Debug/Release qua trong cùng giới hạn. Giữ đủ bốn snapshot/all prefix checks, không tăng timeout hoặc giảm N. Timings phaseWallMs/readbackAndCpuCheckMs là host time của fixture, không phải GPU kernel benchmark.

## Còn phải làm trước khi thay học phần cũ

1. Hoàn thiện ma trận native UI còn thiếu ở trên và benchmark Release có warm-up/lặp/median/độ phân tán; kiểm các trạng thái lỗi/query recovery không làm nhãn stale. Rà thêm vị trí floor/guide khi load domain có origin/extent khác mặc định: camera đã center/pan theo model nhưng floor hiện vẫn đặt quanh world origin.
2. Xây checkpoint 08: cấp mesh buffer từ tổng đã kiểm, emit đúng từng range, normals và draw mesh GPU; sau đó dirty chunks/generation và ghép editor. 08–12 hiện còn là compile fixture; không trình bày chúng như các mốc học đã hoàn thành.
3. Biên tập các lesson còn lại; thử thách và bảy bài đầu đang ở `course-draft/`, chưa đăng ký. Hoàn tất kiểm trực tiếp các viewer CPU/GPU nhập môn, đặc biệt capture/focus/reset/queue. Phân biệt scaffold với phần tự viết, giữ snippet markers/contract và wiring từ code chạy được.
4. Canvas 2D phục vụ câu hỏi học tập, controls/accessibility/DPR/reduced-motion; metadata, glossary, search/progress revision, roadmap/route thay thế cũ.
5. ZIP độc lập, build/CTest từng checkpoint và final, kiểm gói/website, browser QA nếu localhost có sẵn. Không tự bật dev server.
6. Audit từng yêu cầu trong spec với bằng chứng hiện tại rồi mới chuyển trạng thái nghiệm thu. Không tăng budget hoặc hạ spec để hợp thức hóa bản nháp.
