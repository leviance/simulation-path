# Project 40 — Xưởng vải 3D

Ứng dụng C++20/SDL3/OpenGL 4.3 để ghim, kéo và thả một tấm vải tam giác trong không gian ba chiều. Các cảnh gồm vải treo, vải phủ lên sphere và vải rơi lên bàn/capsule. Camera orbit/pan/zoom cho phép xem cả hai mặt; pattern, ánh sáng, wireframe, strain và contact/cell debug giúp đọc biến dạng.

Bản GPU giữ positions, velocity, constraints, multiplier, grid/contact và normals trên GPU. Renderer đọc trực tiếp bề mặt đã biến dạng. Baseline CPU nhỏ nằm ở checkpoint 4 và các fixture kiểm chứng; nó không giải vật lý hộ bản GPU mỗi frame.

README này mô tả mô hình, cách chạy và cách thu bằng chứng. Một lệnh build hoặc CTest thành công không tự chứng nhận scale GPU, hình ảnh hay tương tác native. Hồ sơ nghiệm thu trong repository nằm tại docs/reviews/project-40-rebuild-acceptance.md; kết quả chưa được ghi bằng chứng phải được báo là chưa kiểm chứng.

## Chuẩn bị

- CMake từ 3.24, compiler hỗ trợ C++20 và driver OpenGL compute 4.3.
- SDL được khóa ở 3.4.8; CMake tải bằng FetchContent với URL và SHA-256 đã khóa. Không cần tự cài SDL cho đường build mặc định.
- Máy hỗ trợ OpenGL graphics chưa chắc hỗ trợ compute/SSBO. App kiểm context và các giới hạn cần dùng; không tự chuyển physics về CPU dưới nhãn GPU.
- Lần configure đầu cần mạng để tải SDL nếu chưa có cache. ZIP source tự chứa CMake, starter, 14 checkpoint, final và tests; không cần ghép source từ project khác.

Trong repository, chạy bước sinh course/checkpoint ở thư mục gốc trước khi dùng CMake của project. ZIP đã đóng gói có sẵn các snapshot và CMake, không yêu cầu Node.js hoặc website để chạy ứng dụng.

## Build và kiểm CPU

Mở terminal tại thư mục có CMakeLists.txt.

Với Visual Studio hoặc generator multi-config:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Với generator single-config, dùng hai thư mục riêng:

```bash
cmake -S . -B build-debug -DCMAKE_BUILD_TYPE=Debug -DBUILD_CHECKPOINTS=ON
cmake --build build-debug
ctest --test-dir build-debug --output-on-failure --timeout 30
cmake -S . -B build-release -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON
cmake --build build-release
ctest --test-dir build-release --output-on-failure --timeout 30
```

Target mặc định là project_40_final và project_40_tests. BUILD_CHECKPOINTS=ON thêm project_40_starter cùng project_40_checkpoint_1 đến project_40_checkpoint_14. Muốn chạy một mốc học riêng:

```bash
cmake --build build --config Debug --target project_40_checkpoint_4
```

Visual Studio đặt executable trong build/Debug hoặc build/Release; single-config đặt trực tiếp dưới build-debug hoặc build-release. CTest chỉ chạy fixture CPU hữu hạn, không mở cửa sổ và không thay kiểm GPU thật.

## Chạy một cảnh

Các ví dụ PowerShell dưới đây dùng executable Release của Visual Studio:

```powershell
.\build\Release\project_40_final.exe --preset sphere --side 321
.\build\Release\project_40_final.exe --preset hanging --side 17 --steps 120
.\build\Release\project_40_final.exe --preset table --side 321 --seconds 20
```

Có thể dùng --steps, --frames hoặc --seconds để đặt điểm dừng. Đây là số bước/frame hoặc thời gian chạy của phiên ứng dụng, không phải GPU timer. CLI giới hạn side≤1001, steps≤1000, frames≤10000 và seconds≤120; tham số âm, không hữu hạn hoặc ngoài miền phải bị từ chối. --hidden dành cho phiên kiểm có điều kiện dừng, không phải cách che việc ứng dụng treo. --capture nhận tên tệp BMP khi cần lưu khung hình của phiên chạy hữu hạn.

## Điều khiển

| Tác vụ | Chuột/phím |
| --- | --- |
| Orbit / pan / zoom | Kéo chuột phải / kéo chuột giữa / wheel |
| Camera bằng phím | Mũi tên orbit; Q/E zoom |
| Đổi tool Camera, Drag, Pin | Tab hoặc nút tool |
| Kéo vùng vải | Chuột trái trong Drag tool |
| Thêm/bỏ ghim | Click trong Pin tool; P đổi ghim của đỉnh đang chọn |
| Pause / single-step / Reset | Space / N / R |
| Cảnh treo / phủ sphere / rơi bàn | 1 / 2 / 3 |
| Side 17 / 65 / 321 / 1001 | 4 / 5 / 6 / 7 |
| Validation / benchmark / Cancel | V / B / X |
| Gravity / wind / compliance | G / F / K; giữ Shift để giảm |
| Damping / friction / thickness | D / J / T; giữ Shift để giảm |
| Sphere X / Y / Z | [ và ] / PageUp, PageDown / Home, End |
| Capsule X | Dấu phẩy / dấu chấm |
| Đóng cửa sổ | Escape |

Các nút Wire/Strain/Cells bật lớp debug. C bật nhóm cell/contact và ba vòng hổ phách vuông góc trong world, tâm ở CSR debug probe được chọn lần cuối. Bán kính mỗi vòng đúng 2t mét, biểu diễn ngưỡng khoảng cách tâm hai đỉnh cho self-contact, không phải bán kính t của một đỉnh hoặc độ dày được phóng đại theo pixel. Zoom camera để đọc vòng nhỏ; không tăng thickness chỉ để marker dễ thấy. Candidate/contact preview giữ tối đa 32 ID mỗi nhóm, không phải toàn bộ contact set; giới hạn vẽ debug không giảm workload.

Khi kéo, mũi tên hồng đi từ last selected GPU probe tới Input.dragTarget. Nhãn TARGET / LAST PROBE và NOT NEWTON FORCE nhắc rằng đây là sai lệch tới target, không phải lực hoặc correction thực sự áp trong một substep. HUD góc dưới trái hiển thị ID, XYZ probe (m), inverse mass (1/kg), tuổi probe theo số completed steps, STALE/PENDING, tool/Pause, pin staged và drag target. Dữ liệu probe là snapshot 32 byte đã đọc về có giới hạn; nhãn tuổi/pending cho biết nó chưa chắc trùng bước hiện tại. Không thêm readback toàn mesh để vẽ HUD này.

Pause dừng tiến thời gian nhưng camera/inspector vẫn dùng được. Trong native, pin edit và drag target được xếp chờ bước mô phỏng kế tiếp; N hoặc Resume mới áp chúng. Reset, đổi preset/topology và đổi thickness hủy drag/picking/job cũ trước khi công bố state mới. Thickness thay grid plan nên không chỉ là đổi một uniform. Release, Cancel và mất focus/capture phải kết thúc drag an toàn.

Kéo là ràng buộc độ dời của vùng 5×5 nodes quanh ID chọn, không phải lực Newton của bàn tay. GPU giới hạn độ dời chung mỗi substep ở 6h mét, tương ứng tốc độ kéo tối đa 6 m/s. Vùng được xác định theo hàng/cột topology, không phải mọi lớp vải đang chồng lên nhau trong world. Vật cản đi tới target trong miền và vận tốc giới hạn; không teleport qua mặt vải để kiểm mô hình discrete.

## Ba preset native khác nhau ở đâu?

Hanging dựng vải đứng và ghim hàng trên; SphereDrape thả mặt vải ngang phủ lên quả cầu. DropTable thả vải lên mặt bàn có thanh capsule nhô lên, không chỉ đổi độ cao bắt đầu của cảnh sphere.

Helper presetSettings trong cloth_topology.hpp cấu hình vật cản khi app chọn preset:

| Preset | Plane Y (m) | Sphere | Capsule |
| --- | ---: | --- | --- |
| Hanging / SphereDrape | 0 | Tâm (0; 1,75; 0), radius 1,35 m | Hai đầu (−1; 0,9; 0) và (1; 0,9; 0), radius 0,45 m |
| DropTable | 0,7 | Tâm (0; 0,5; 0), radius 0,1 m; nằm hoàn toàn dưới bàn | Hai đầu (−1; 1,15; 0) và (1; 1,15; 0), radius 0,45 m; đáy chạm bàn, đỉnh cao 1,6 m |

Helper giữ nguyên grid/material/forces/timestep; các fixture validation có cấu hình riêng không bị tự động ghi đè. Các target vật cản vẫn di chuyển tối đa 0,5 m/s. Khi kiểm ba cảnh, nhìn từ bên để phân biệt vải treo, vòm sphere và vải trên bàn/thanh capsule; không coi ba tên preset là bằng chứng ba hình dạng khác nhau.

## Mô hình vật lý và đơn vị

- Position/rest length/thickness dùng mét, velocity dùng m/s, h dùng giây. Gravity và wind trong bản chuẩn là gia tốc world m/s²; wind không phải mô phỏng khí động học theo diện tích/góc vải.
- Position.w chứa inverse mass 1/kg. Giá trị zero là ghim, giá trị dương là đỉnh động. Pin không phải một lò xo rất cứng.
- Stretch ngang/dọc và shear hai đường chéo là distance constraints. Bend nối hai đỉnh cách nhau hai cạnh là **bend-distance xấp xỉ**, không phải ràng buộc góc nhị diện hay mô hình may mặc đầy đủ.
- Với constraint C=distance−rest, compliance α có đơn vị m/N. Solver dùng α/h² và multiplier lambda riêng từng constraint; lambda có đơn vị kg·m.
- Lambda reset về zero đầu mỗi substep, giữ và cộng qua các iteration trong substep. Bản chuẩn không warm-start multiplier qua substep.
- Frame step mặc định 1/60 s, hai substeps nên h=1/120 s; bốn iterations trong mỗi substep. Miền cho phép: dt từ 1/1000 đến 1/30 s, 1–8 substeps, 1–12 iterations.
- Damping là rate 1/s áp bằng exp(−damping·h) sau khi suy velocity từ displacement đã solve. Nó không phải toàn bộ mô hình Rayleigh damping của XPBD.
- Friction là tỷ lệ giảm velocity tiếp tuyến không đơn vị mỗi substep có analytic contact, từ 0 đến 1; đây không phải Coulomb friction theo lực normal. Đổi số substep có thể đổi tổng mức giảm trượt.
- Analytic contacts dùng plane, sphere và capsule với khoảng hở thickness t. Tâm/trục suy biến có normal fallback hữu hạn.
- Self-contact dùng khoảng cách đỉnh nhỏ hơn 2t, loại vùng topology có chênh hàng/cột đều không quá hai nodes. Mỗi vertex gather correction riêng từ snapshot, lấy trung bình contact và giới hạn correction t mỗi vòng; pass sau mới áp vào positions.
- Self-contact theo đỉnh **không bảo đảm phát hiện mọi giao cắt edge/triangle**, không có CCD và không chống xuyên mọi tốc độ. Mô hình này không được quảng bá như một solver may mặc chính xác.
- Velocity vải được giới hạn 20 m/s. Miền world và obstacle có bounds hữu hạn. Các clamp/rate/giới hạn là một phần mô hình đã công bố, không phải cách giấu NaN hoặc contact bị bỏ.

Công thức multiplier tham khảo [bài báo XPBD gốc](https://mmacklin.com/xpbd.pdf). Với finite iterations, vẫn còn residual và sai số thời gian; không hứa kết quả hoàn toàn bất biến khi đổi timestep/iterations. Có damping, friction, pin/drag hoặc obstacle bên ngoài thì không yêu cầu bảo toàn năng lượng của riêng vải.

## Pipeline và ownership

Một bước có các substep hữu hạn:

1. Giữ previous, áp input staged, dự đoán vị trí do gia tốc và reset lambda.
2. Giải constraints theo 12 màu; trong một màu không có hai cạnh chung endpoint. Mỗi màu là dispatch riêng, nối bằng shader-storage barrier.
3. Project analytic contacts; dựng grid từ positions hiện tại.
4. Count cells → hierarchical exclusive scan → prepare cursors → scatter ID → kiểm candidate work → self-contact gather/apply.
5. Suy velocity, bỏ phần đi vào vật cản, giảm trượt và damping.
6. Cập nhật normals/strain và diagnostics; renderer đọc buffers sau barrier phù hợp.

Grid ba chiều dùng ID x+nx·(y+ny·z). Cell size là max(4·spacing,2t), do đó stencil ±1 theo X/Y/Z đủ cho bán kính 2t. Nếu đổi chính sách cell size nhỏ hơn bán kính, phải mở rộng stencil; không giữ 27 cells rồi bỏ contact.

Counts, offsets, cursors và ID đều là uint. Atomic scatter không giữ thứ tự ID trong cell; kiểm membership/permutation/ranges, không đòi thứ tự arrival giống CPU. Hierarchical scan ở lại GPU; không readback block sums để CPU cộng hộ.

## Quy mô và ngân sách

| Preset | Tổng đỉnh | Đỉnh ghim ở cảnh treo | Đỉnh động ở cảnh treo | Tam giác | Constraints duy nhất |
| --- | ---: | ---: | ---: | ---: | ---: |
| Side 17, kiểm nhỏ | 289 | 17 | 272 | 512 | 1.566 |
| Side 321, mốc bắt buộc | 103.041 | 321 | 102.720 | 204.800 | 615.038 |
| Side 1001, mở rộng | 1.002.001 | 1.001 | 1.001.000 | 2.000.000 | 6.001.998 |

Số constraints tuân theo 6n²−10n+2. Cảnh không ghim có số đỉnh động bằng tổng đỉnh. Telemetry tách dynamic/pinned/updated/drawn. Constraint visits là số lượt đi qua constraint trong solver, không phải số cạnh duy nhất: ở side 321, hai substeps và bốn iterations tạo 4.920.304 visits một bước.

Ngân sách mặc định 512 MiB được kiểm trước cấp phát; kế hoạch gồm GPU buffers, grid/scan scratch, rollback, host staging và peak khi scene cũ/candidate mới cùng tồn tại. Dense grid bị chặn quá 32 triệu cells. SSBO size/bindings, workgroup count và các giới hạn context còn có thể từ chối cấu hình dù byte estimate vừa ngân sách.

Ở side 1001, riêng GPU estimate hiện vượt 512 MiB trước host staging. Bản chuẩn có preset và đường preflight riêng nhưng **không cam kết preset một triệu chạy trên mọi máy**. Nếu bị từ chối, báo lý do và giữ scene hợp lệ trước đó. Không giảm side âm thầm hoặc gọi số đỉnh cấp phát là số đỉnh động đã cập nhật.

Candidate budget mặc định là 128 triệu lượt xét có hướng ở occupancy hiện tại cho một lần traversal. GPU tính work bằng counter 64 bit ghép uint trước khi đi vào vòng contact. Quá budget từ chối toàn bước/rollback; không chỉ giữ một số contact đầu rồi giấu phần còn lại. Một dispatch đã gửi không thể bị Cancel giữa chừng, vì vậy mọi batch phải có giới hạn trước khi gửi.

## Kiểm GPU và đo hiệu năng

Các lệnh của final tách kiểm toàn pipeline, benchmark và mốc mở rộng:

```powershell
.\build\Release\project_40_final.exe --verify --side 321
.\build\Release\project_40_final.exe --benchmark --side 17
.\build\Release\project_40_final.exe --benchmark --side 321
.\build\Release\project_40_final.exe --exercise-controls --side 17
.\build\Release\project_40_final.exe --side 1001 --steps 1
```

--verify chạy fixture độc lập, đối chiếu CPU/GPU nhỏ, validation sáu ca và toàn bộ ba preset side=321, mỗi preset 120 bước; tham số --side chỉ chọn scene ban đầu, không thu nhỏ suite này. Cuối suite kiểm riêng đường từ chối preset một triệu và việc giữ last-good scene. Nó không gọi một triệu là scale PASS. --exercise-controls đẩy sự kiện qua chính SDL/app và kiểm lifecycle hữu hạn, không thay đánh giá thao tác bằng tay. Lệnh --side 1001 --steps 1 yêu cầu trực tiếp preset mở rộng; với ngân sách mặc định, preflight có thể từ chối trước khi có bước mô phỏng.

V mở validation UI trên state nhỏ riêng; B mở benchmark. Các job UI hữu hạn có tiến độ/Cancel/deadline; Cancel, timeout hoặc từ chối tài nguyên là incomplete, không PASS. Camera dùng được trong validation; benchmark khóa chỉnh sửa workload/camera đo nhưng X và đóng cửa sổ vẫn dùng được. Khi chạy tự động, dùng process supervisor/hard timeout và dọn process tree của môi trường ngoài app; một timeout của lời gọi công cụ không tự là watchdog tiến trình.

Fixture cần đáp án độc lập cho một/hai constraints, khối lượng/compliance/pin, zero distance/input lỗi, analytic normal/khoảng cách/penetration, scan integer và CSR permutation/cell membership. Self-contact so tập candidates/contacts với brute force trên fixture nhỏ có cell rỗng/đông, coincidence, topology neighbors và sát 2t. CPU/GPU dùng cùng snapshot, h, topology, exclusion và thứ tự màu.

Fixture một bước 17×17 dùng max Euclidean error trên mọi vertex: position≤0,0002 m, velocity≤0,025 m/s, normal≤0,001 không đơn vị; inverse mass exact và mọi thành phần finite. Các ngưỡng này không phải epsilon chung cho mọi probe hoặc quỹ đạo dài.

Benchmark chính dùng Release, tạo shadow scene từ cùng preset/configuration và khóa camera đo. Với mọi preset, job chạy **60 bước settling không thuộc nhóm mẫu đại diện**, sau đó hai cặp warm-up step/draw ở bước 61–62 rồi chín cặp đo ở bước 63–71. Tổng tiến độ là 71 bước; “2 warm-up + 9 mẫu” không phải toàn bộ công việc. Báo cáo tách thống kê GPU-only của chín bước đầu, không tổng hợp thời gian riêng cho cả 60 bước settling và không trộn chúng vào median/MAD của chín mẫu đại diện.

Job giữ riêng chín bước đầu của giai đoạn settling làm baseline GPU-only từ reset và báo cả analytic/self-contact events. Chỉ gọi baseline contact-free nếu cả hai loại events đều zero; chỉ gọi free fall khi còn không có đỉnh ghim. Baseline không có draw ghép tương ứng và thuộc trạng thái khác nhóm đã settling, nên không dùng hai nhóm này để tạo tỷ số speedup.

Deadline tổng 25 giây bao gồm cả settling, warm-up và đo; mỗi GPU step/draw còn có deadline riêng. Tổng analytic contact events trong chín mẫu đại diện của SphereDrape/DropTable phải lớn hơn zero, không chỉ đo vải đang rơi tự do. Nếu workload thiếu contact bắt buộc, thiếu mẫu hoặc không hoàn tất trong giới hạn, báo incomplete/fail, không tổng hợp một kết quả thành công từ số mẫu thiếu. Hanging không bị buộc phải có contact với vật cản.

Ghi hardware/driver, dynamic/pinned/updated/drawn, constraints/visits, candidates/contact events, memory, dt/substeps/iterations và median/MAD/min/max. Tách prediction, solver, grid/scan/scatter, contact, velocity, normals, draw và whole-step/frame. CPU submit time không phải GPU execution time; upload/readback cần nhãn phạm vi riêng. Shadow scene cũng tính vào peak memory budget cùng scene đang xem; vừa ngân sách một scene chưa bảo đảm đủ cho benchmark. Giữ cả ca nhỏ hoặc ít tiếp xúc mà GPU/grid không có lợi, không hứa FPS/speedup chung.

Cổng quy mô chỉ đạt khi ít nhất 100.000 đỉnh động, toàn constraints/contact/velocity/normals tương ứng thật được xử lý trên GPU. Hình ảnh và pin/drag/cancel/blur/Reset/Pause/camera native cần kiểm riêng; tests, Canvas hoặc timer không thay bằng chứng thao tác và chất lượng bề mặt.

## Đi qua source theo bài

| Mốc | Khả năng chính |
| --- | --- |
| Starter → 1 | Scene scaffold, camera và mặt vải tam giác đầu tiên |
| 2 → 3 | Prediction; một distance constraint XPBD có đáp án số |
| 4 | Vải CPU nhỏ, topology stretch/shear/bend-distance và lịch màu |
| 5 → 6 | Toàn constraints GPU theo màu; lambda/substep/velocity/damping |
| 7 | Tiếp xúc plane/sphere/capsule |
| 8 → 9 | Cell 3D; counts/scan/cursors/scatter thành CSR |
| 10 | Vertex self-contact theo snapshot/gather |
| 11 | Normal mesh biến dạng, strain và debug |
| 12 | Pin/drag/picking và vòng đời input |
| 13 | Validation/benchmark hữu hạn |
| 14 | Xưởng vải đầy đủ và preset ≥100.000 đỉnh động |

Riêng checkpoint 3 có fixture quan sát: sau khi tạo rest lengths, một endpoint động của cạnh được chọn bị dịch ra xa 0,4 m; chỉ cạnh ấy được giải. Pause → Reset → single-step giúp thấy correction trước/sau. Perturbation này không có ở checkpoint 4 hoặc final và không thay mô hình vật lý của bản hoàn thiện.

Scaffold camera/picking/renderer được cung cấp trong gói: cloth_camera.hpp có ray/view/projection; cloth_pick.hpp chọn trên GPU và chỉ readback PickResult 32 byte. cloth_input.hpp nối event, picking, plane kéo và cleanup capture/focus; cloth_application.hpp điều phối setup, simulation step, jobs và publish/reset scene. Trong cloth_renderer.hpp, appendContactRadiusRings vẽ ngưỡng 2t theo world, còn appendDragTargetVector đọc InteractionPreview để vẽ target error; cloth_ui.hpp dựng HUD của snapshot/probe hiện có. Đây là điểm tích hợp được công bố, không yêu cầu tự ghép một engine chọn mesh bên ngoài.

Phần toán/topology/CPU ở cloth_math.hpp, cloth_topology.hpp và cloth_cpu.hpp. GPU scheduling/buffers ở cloth_gpu.hpp, grid plan ở cloth_grid.hpp, scan nhiều tầng ở cloth_scan.hpp. Shaders cloth_solver.comp, cloth_grid.comp, cloth_scan.comp và cloth_scan_add.comp chứa các kernel cốt lõi. Renderer không sở hữu một bản positions CPU cập nhật mỗi frame.

cloth_verify.hpp giữ fixture GPU độc lập; cloth_validation.hpp là job UI sáu ca CPU/GPU; cloth_timing.hpp quản lý timer và benchmark shadow scene. cloth_acceptance.hpp nối --verify với toàn suite/scale, còn cloth_control_checks.hpp kiểm đường sự kiện native. Các phần này có phạm vi khác nhau; không dùng chữ PASS của một fixture để tuyên bố các cổng còn lại đã đạt.
