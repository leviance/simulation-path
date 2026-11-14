# Project 44 — sửa lỗi mất mặt gần isovalue

Mốc 14/11/2026, sau commit lưu tiến độ `0e6f0b8`. Đây là hồ sơ của một bản sửa và các phép kiểm tương ứng. Quyết định nghiệm thu sau khi người dùng kiểm trực tiếp nằm trong [biên bản riêng](project-44-acceptance.md); các kết quả theo digest dưới đây vẫn giữ phạm vi lịch sử của chúng.

## Ca lỗi và nguyên nhân

Người kiểm dùng chuột khoét một lỗ xuyên sphere ở grid 128³, lưu field rồi xuất OBJ. Hình ảnh cho thấy có lỗ, nhưng phép parse/topology độc lập tìm thấy 12 cạnh biên không có mặt kề. Báo cáo trước sửa: `.validation/p44-ui-obj-audit-1794649315185.json`. Phép kiểm không hàn đỉnh theo epsilon và không gọi oracle C++ của ứng dụng.

Mesher dùng ngưỡng diện tích để bỏ triangle. Một mặt rất nhỏ nhưng vẫn khác 0 cũng bị loại, khiến các mặt bên cạnh không còn khép kín. OBJ writer/reader có một ngưỡng diện tích nhỏ tương tự: chỉ sửa mesher sẽ chưa đủ để xuất đúng dữ liệu ấy.

Đã giữ regression trước khi sửa:

- CPU: `.validation/p44-tiny-before-fix-1794649954998.log`. Một sample ở −0,00001, các sample còn lại bằng 1, phải tạo 24 mặt quanh sample đó; thực tế còn 0 vertices và bị loại 24 mặt.
- Canvas/GPU: `.validation/p44-topology-before-1794650952274.log` tái hiện cùng kỳ vọng 72 vertices/24 faces và cùng kết quả bị xóa hết. Chưa thay thuật toán ở lượt negative này.

## Bản sửa

- C++/GLSL/TypeScript tính cross product trong đơn vị cell, chia cho thành phần có độ lớn lớn nhất rồi mới dot/normalize. Chỉ bỏ mặt có cross product bằng 0 ở độ chính xác đang dùng; không dùng một epsilon diện tích để xóa mặt nhỏ.
- Helper trả **hướng**, không phải số đo diện tích. Normal của một mặt nhỏ vẫn có thể được normalize mà không bình phương một vector cực nhỏ thành 0.
- Count/emit vẫn đi qua cùng topology và policy. Không đổi capacity, không cắt bớt output, không hàn các đỉnh gần nhau và không sửa field để làm test qua.
- OBJ writer/reader kiểm cross product bằng double trong bounds vị trí đã có, độc lập với helper mesher. Fixture file giữ chính xác bytes ở ba thang cạnh 10⁻⁷, 10⁻¹², 10⁻²⁰ world unit; mặt có ba đỉnh thẳng hàng vẫn bị từ chối trước visitor.
- Bài 01 giải thích và đưa mã đầy đủ của helper; Bài 02/03/07, README và các excerpt cập nhật tương ứng. Hợp đồng hiện kiểm 113 đoạn C++ và 16 đoạn GLSL từ đúng checkpoint; không thay bằng pseudocode.
- Oracle topology của Canvas nay dùng tọa độ chính xác cho cả sphere/tunnel/bridge, không còn làm tròn tọa độ để ghép các điểm gần nhau trong test.

Source build Release mới qua CTest và GPU products trong `.validation/p44-topology-after-1794651225743.log`. Hai scalar −10⁻⁵ và −10⁻⁷ đều giữ đủ 72 vertices/24 faces, mesh kín và normal đơn vị. GPU kiểm thêm đúng 14 đỉnh duy nhất/36 cạnh, canaries và các sản phẩm khoét/nối/history 128³. Lượt này có 22 test toán/generator; sau khi thêm kiểm helper ở nhiều thang và tăng độ chặt của oracle Canvas, bộ đó đạt 23/23 trong hồ sơ web bên dưới.

## Xuất lại đúng field từng gây lỗi

Đã mở source build mới, load **nguyên field từng được khoét bằng chuột**, bấm E trong cửa sổ native, quan sát Files báo `EXPORTED OBJ / READ-BACK VERIFIED`, rồi Q thoát exit 0. Log `.validation/p44-native-ui-final-mouse-tunnel-fixed-1794651302170.log`; sau đó danh sách window được kiểm lại và không còn cửa sổ này.

OBJ thật được kiểm bằng parser/topology Node độc lập, giữ nguyên các assertion. Chỉ gộp tọa độ binary32 giống hệt nhau, chuẩn hóa dấu của zero, không dùng epsilon. Báo cáo sau sửa: `.validation/p44-ui-obj-audit-1794651377488.json`.

| Đại lượng      | Trước sửa | Sau sửa |
| -------------- | --------: | ------: |
| Vertex records |   422.652 | 422.676 |
| Triangle       |   140.884 | 140.892 |
| Đỉnh duy nhất  |    70.446 |  70.446 |
| Cạnh           |   211.332 | 211.338 |
| Cạnh hở        |        12 |       0 |
| Component      |         1 |       1 |
| Euler          |        −2 |       0 |

Khôi phục đúng 8 triangle; mesh sau sửa không có cạnh non-manifold hoặc cạnh sai hướng. Sai số độ dài normal lớn nhất 1,53234×10⁻⁷; ngưỡng dimensionless 10⁻⁴ không đổi. Signed volume dương. Đây là phép kiểm mesh của sản phẩm thực, khác với fixture một sample nhỏ hoặc preset torus.

## ZIP độc lập sau bản sửa

- `public/downloads/project-44-volume-sculptor.zip`: 2.154.247 bytes, 1.117 files, 6.311.394 bytes source.
- Digest source: `28a46d9794bc0904953dc7a8c871b2021600a05651ab3759dd39df366f1a93ad`.
- Giải nén mới tại `.validation/p44-zip-verify-f6dQup`; danh sách và từng byte khớp source, log `.validation/p44-topology-package-1794651523238.log`.
- Configure mới bằng VS 2022/MSVC 19.33, SDK 10.0.19041, x64 và SDL **3.4.8 EXACT** đã cài trong cache. Không tải/build lại SDL.
- Build đủ starter, checkpoint 01–12, final và tests ở Debug/Release. CTest Debug 1/1 trong 2,38 giây; Release 1/1 trong 0,25 giây. Log `.validation/p44-topology-zip-matrix-1794651670086.log`, cùng lượt final/tests Release đầu `.validation/p44-topology-zip-release-1794651595078.log`.
- Audit 15 compiler dependency logs/cấu hình, 495 workspace inputs/cấu hình: chỉ source trong gói và hai include directory do SDL package khai báo. Header/package đều 3.4.8, không có authored input ngoài gói.

Không đem kết quả CTest của digest baseline `18b2f86f…` thay cho các phép kiểm này. Snapshot, ZIP, build, SDL và log đều ignored; chỉ giữ nguồn authored trong Git.

## Runtime và benchmark từ ZIP mới

`.validation/p44-topology-zip-runtime-1794651914691.log` hoàn tất **16 mode hữu hạn**, chạy tuần tự: starter/01; CPU 02–05; field 06; prefix 07; surface/critical normals 08; jobs 09; analytic sphere/plane và checkpoint 12; slice; files; products; scene/resolution; shader fallback; benchmark.

Các phạm vi đáng chú ý:

- GPU 128³: 2.097.152 samples khác 2.048.383 cells; count/prefix đọc đủ slot, emit/normal/canaries và capacity/recovery đều qua. Không dùng CPU extraction cho workload 128³.
- Critical-normal fixture 32³: 384 fallback gradient 0 trong 3.330 vertices, normal hữu hạn/đơn vị.
- Slice: 45 probe trên ba trục, max scalar error 3,94783×10⁻⁸; 12 sign-color pixels và cache lifecycle.
- I/O: field 8.388.672 bytes, OBJ 39.704.266 bytes; so trực tiếp 408.024 vertices/normals với snapshot, giữ nguyên snapshot khi remesh. Cancel/checksum/candidate budget đều qua.
- Products: hai ca mặt nhỏ; drill 257 outside probes/Euler 0; bridge 129 inside probes/từ hai component thành một/Euler 2; undo/redo.
- Resolution 128→64→128: kiểm đủ samples đích với reference độc lập, giữ domain/field đã sửa; down max error 5,96046×10⁻⁷, up max error 7,15256×10⁻⁷. Reset/pause/cancel/allocation refusal giữ đúng lifecycle.
- Shader fallback: tạm chuyển source shaders trong **bản giải nén do runner sở hữu**, dùng runtime copy, kiểm analytic/layout 32³ rồi khôi phục. Không thay source authored.

Benchmark Release 128³ dùng 2 warm-up + 5 measured trials; không full-field/mesh readback trong workload. Log raw `.validation/p44-zip-runtime-benchmark-1794652007410.log`; audit độc lập `.validation/p44-zip-benchmark-audit-1794652125663.log` tính lại đủ 17 nhóm median/min/max/MAD.

Trên RTX 3050 Laptop/OpenGL 4.3.0 NVIDIA 546.30, median local count 4,759552 ms, full count 83,774464 ms, draw mesh-only 0,546816 ms, host total 4.206,4589 ms. Host total là cả trial có orchestration/chờ job, không phải frame time. Workload sphere 408.024 → edited 410.616 vertices; dirty 27/512 chunks, reuse 62 nonempty buffers; peak reservation theo dõi 59.861.328 bytes, cuối trial về 0. Không gọi đây là toàn VRAM, cam kết FPS hoặc speedup áp dụng cho mọi máy.

## Web và giới hạn bằng chứng

`.validation/p44-topology-web-source-1794652104463.log` qua 23/23 toán/generator, 6/6 source/giáo trình/MDX, architecture budgets, Git hygiene và lint ba file JS/TS thay đổi. Cold typecheck toàn repo qua: 2.771 compiler inputs, 732.953 KiB, 33,72 giây, heap cap 1.024 MiB/deadline 120 giây.

Production build sau bản sửa hoàn tất trong deadline 240 giây, log `.validation/p44-production-1794652246400.log`. Bộ render P44 đạt **10/10 trong 7,79 giây**, `.validation/p44-p44-render-1794652502241.log`: challenge, 12 lesson, source, One Dark/KaTeX, kích thước chunk và URL cũ đều qua.

Bộ browser P44 đạt **6/6 trong 50,0 giây**, `.validation/p44-p44-browser-1794652515198.log`, một worker/retries 0/deadline 30 giây mỗi ca. Đã mở cả 12 Canvas mode, kiểm DPR 1,5/reduced-motion, dark navigation, migration chỉ reset P44 cũ, source/copy/ZIP đúng project, capacity/last-good và Pause/step/cancel/retry/Reset/keyboard stamp. Runner dùng production server tạm do chính nó quản lý, không khởi động/restart dev server của người dùng; handle đã kết thúc sau kiểm.

Sau các phép kiểm này, người dùng đã kiểm trực tiếp và xác nhận sản phẩm đạt yêu cầu. [Biên bản nghiệm thu](project-44-acceptance.md) ghi việc bỏ nhãn chờ, gói phát hành cuối và phạm vi xác nhận native. Không biến kết quả topology thành trace của những thao tác agent chưa thực hiện; các lỗi CI ngoài P44 được báo cáo riêng.
