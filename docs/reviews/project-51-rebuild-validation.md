# Project 51 — kiểm bản xây lại

Ngày kiểm: 16/11/2026. Nguồn yêu cầu: Project 51 và các mục chung trong [đặc tả v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không thay hoặc hạ yêu cầu của đặc tả.

**Trạng thái: đã nghiệm thu Project 51 ngày 16/11/2026.** Build, correctness GPU, mốc 100.000+, giáo trình và web có bằng chứng tự động dưới đây. Với phần native, người dùng trả lời “project đã đạt yêu cầu” sau khi được đề nghị tự kiểm Checklist tương tác trong README. Đây là xác nhận thủ công của người dùng, không phải agent đã tự bấm các nút/phím C++. Đã bỏ ghi chú chờ nghiệm thu trên giao diện; chưa commit/push/publish P51.

## Sản phẩm và cách học

Ứng dụng C++20/SDL3/OpenGL 4.3 mở paused ở 48³=110.592 hạt. Khối nước 0,4 m đặt sát đáy hộp 3D, gravity và pressure làm khối lan ra. Camera perspective orbit/zoom, sàn lưới và biên bể giúp đọc chiều sâu. Sphere impostor tự tính giao tia–cầu, normal/shading và gl_FragDepth; vẽ toàn N, không cap 100.000 điểm hoặc giảm số hạt physics.

UI native có controls, clean/debug, water/density/pressure/speed/unlit, N cấp phát/sống/cập nhật/vẽ, model time/dt, density distribution/leakage và profiler từng pass. Reset chờ batch đang chạy rồi đặt lại cùng N/tham số; chọn preset chỉ arm, Enter mới cấp phát. B bắt đầu benchmark hữu hạn; V kiểm oracle ở engine phụ, không reset scene chính. Kiểm toán/source/CLI và xác nhận thủ công của người dùng là hai nguồn bằng chứng riêng; không gọi phần tự động là đã bấm trực tiếp toàn bộ nút/phím.

12 bài đi theo các thay đổi có thể chạy: preview/camera → SSBO/initialization → sphere rendering → kernel thể tích → density → pressure/viscosity → integration/boundary → CSR grid → reduction/dt → fence/profiler → scale → verification/final. Bài có code helper, shader và vị trí gọi, không chỉ các công thức rời. 48 code block C++/GLSL lấy nguyên marker từ đúng checkpoint; tests chặn drift và yêu cầu đoạn token liên tiếp. Mã hoàn chỉnh, comments và source ZIP được giữ cùng một nguồn authored; C++/GLSL thụt bốn spaces, không ép xuống dòng theo chiều rộng in giấy.

Canvas là oracle CPU tối đa 216 hạt, không WebGL/WebGPU/WASM và không giả chạy GPU 100k. Các đường support là ba đường tròn lớn trong world chiếu perspective; việc chọn hàng xóm vẫn dùng khoảng cách 3D. Bản native và Canvas dùng cùng camera/quy ước, công thức và đơn vị, nhưng có mục đích/quy mô khác nhau.

## Đối chiếu đặc tả

| Yêu cầu                                       | Bằng chứng và phạm vi                                                                                                                                                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable C++/SDL3 độc lập, tự xây lõi SPH   | ZIP 703 file so byte với authored/snapshot; Visual Studio 2022 x64, CMake, SDL 3.4.8 EXACT. Build starter, 12 checkpoint, final và tests ở Debug/Release. Tái dùng SDL đúng phiên bản đã có; không tuyên bố đã tải dependency mới từ mạng.                        |
| SPH 3D, đúng normalization/đơn vị             | Kernel 1/(πh³), m=rho0 spacing³, density kg/m³ và pressure Pa. CTest/TypeScript kiểm tích phân thể tích, gradient finite difference, self/cutoff, pair pressure và viscosity.                                                                                     |
| GPU grid + density + force + integration      | Compute passes tự viết, GPU count→hierarchical scan→scatter, stencil 27 cell và lọc support 3D. Readback chỉ dùng oracle nhỏ hoặc record thống kê cố định; không đưa cả state lớn về CPU.                                                                         |
| CPU oracle kiểm small-N                       | Sáu fixture GPU qua hai tick: 512 lattice, 257 tail, acoustic, prescribed-force, perturbed, scan. So initialization, CSR ownership/permutation, density/pressure/acceleration và integration/dt CPU độc lập.                                                      |
| Scan/reduction qua nhiều workgroup            | Fixture scan có 257 hạt nhưng 4.096 cell, tầng đầu 8 workgroup, 2 tầng. Mốc 110.592 có reduction 432→2→1 record. Lane đuôi pad neutral nhưng vẫn tới barrier.                                                                                                     |
| Ít nhất 100.000 hạt thật, cảnh động           | Từ ZIP: allocated/alive/updated/drawn=110.592, tick=1.200; model time/dt/density/leakage ghi riêng ở dưới. 512k/1M chưa kiểm và không được dùng để quảng bá kết quả đã đạt.                                                                                       |
| Đồ họa 3D, depth/shading, scenario mạnh       | Mọi target Release qua finite render/context/shader. Capture dam-break cho thấy khối lan trên đáy, chiều sâu z, sphere shading và grid. Không dùng capture thay cho tương tác camera bằng chuột/phím.                                                             |
| Camera, pause/reset và N presets              | Đã triển khai chuột/phím dùng chung Controls; preset 512/32.768/110.592/512.000/1.000.000, chọn rồi Apply. Người dùng xác nhận đạt yêu cầu sau đề nghị kiểm Checklist native ngày 16/11/2026; không tính là agent đã kiểm OS input.                               |
| Profiler từng pass, benchmark rõ cấu hình     | GPU timestamp từng interval; 30 warm-up + 8 compute + 8 frozen-render samples, median/min/max. Tách CPU enqueue, submit→commit và GPU scene render; không suy FPS ứng dụng từ một pass.                                                                           |
| Website/source/tải về hoạt động               | Production build toàn bộ 595 bài; tổng quan + 12 route P51 đều 200, One Dark, mã đầy đủ, không lỗi KaTeX. 5 browser cases và 6 luồng bổ sung qua localhost có sẵn. Source viewer chỉ tải 3 payload thuộc P51. ZIP HTTP thực được so SHA-256, không chỉ kiểm href. |
| Canvas có thể dùng được và thu hồi tài nguyên | 10 nhóm kiểm ở React development StrictMode, DPR 1/2: stage gating, pressure/viscosity khác 0, oracle riêng, drag capture, wheel/keyboard, preset/reset, animation/reduced-motion, resize và unmount đang chạy không còn RAF.                                     |
| Giới hạn tài nguyên/Git                       | Một GPU batch pending; poll timeout 0, batch deadline 5 s; job/process guardian hữu hạn, build một worker. Architecture và Git hygiene đạt; không stage output, ZIP, compiler cache hay SDL library.                                                              |

## Correctness: các ca nhỏ không được quá dễ

- **Initialization:** position/w/zero velocity GPU so với lattice CPU, trước khi fixture được biến đổi. Không lấy preview CPU làm bằng chứng SSBO.
- **Lattice/tail:** toàn pipeline hai tick, có self và guard invocation dư. CSR phải liên tiếp, không lặp/mất ID, đúng cell của state cũ.
- **Perturbed:** nén lattice và thêm relative velocity; pressureMax=137.822 Pa, viscosityDelta=5,75139 m/s². Fixture phải đạt ngưỡng pressure/viscosity khác 0 trước khi so CPU↔GPU; ca lực gần 0 không đủ thay nó.
- **Scan:** 4.096 cell buộc qua nhiều workgroup và uniform-add. Không dùng count=257 để giả định scan cũng chỉ có 257 phần tử.
- **Acoustic:** dt=3,17383×10⁻⁵ s, thực sự nhỏ hơn maxDt. **Prescribed-force:** dt=6,37377×10⁻⁵ s từ gia tốc biết trước, chỉ kiểm reduction/integration, không kiểm lực SPH.
- **Independent dt:** CPU tự tính vmax/amax/rhoMax từ old state/reference rồi chọn dt; không dùng GPU dt làm đáp án. Nonfinite luôn fail, không tăng tolerance hoặc tắt checks để PASS.

CTest Debug/Release đều qua, không dựa vào assert bị NDEBUG loại bỏ. 17/17 checks toán/nội dung/snippet helpers qua; suite P51 production 7/7 qua (bao gồm một số authored checks dùng lại). Hợp đồng C++ toàn khóa học qua cho 595 bài. Không suy ra toàn bộ suite toàn site hoặc mọi hệ điều hành đã đạt 100%.

## Kết quả mô hình 110.592 hạt

Source được kiểm có đáy khối ban đầu y=0. Kết quả pilot trước thay đổi ấy không dùng cho bảng này.

| Đại lượng                                     | Kết quả cuối ca dam                   |
| --------------------------------------------- | ------------------------------------- |
| allocated / alive / updated / drawn           | 110.592 / 110.592 / 110.592 / 110.592 |
| Tick / model time                             | 1.200 / 0,231729 s                    |
| dt cuối                                       | 0,000179614 s                         |
| min / median bin / max / p95 bin của rho/rho0 | 0,145428 / 1,0125 / 1,13212 / 1,0125  |
| Leakage sau integration / invalid             | 0 / 0                                 |

Density thuộc **đầu tick cuối**, leakage thuộc **sau integration**. Median/p95 là tâm bin xấp xỉ của histogram 64 bin trên [0,1,6], không phải percentile chính xác. Mặt thoáng/hạt tách rời có density thấp; thành chỉ collision, không bù support. Đây không phải solver incompressible/hydrostatic đã hội tụ. Atomic scatter có thứ tự cộng float không cố định, nên không hứa lặp từng bit.

## Benchmark Release, không đồng nhất với FPS

Máy kiểm: AMD Ryzen 5 5600H, Windows 11 Home Single Language 10.0.26300, NVIDIA GeForce RTX 3050 Laptop GPU/PCIe/SSE2, OpenGL 4.3.0 NVIDIA 546.30. Compiler MSVC 19.33.31630; RAM visible khoảng 5,86 GiB. Không suy rộng số đo sang GPU khác.

Cấu hình: N=110.592, side=48, CSR bật, c=12 m/s, alpha=.15, gravity=9.81 m/s². Khởi động lại lattice/camera/water view, warm-up 30 tick, lấy 8 tick liên tiếp rồi 8 frame scene ở state cuối đóng băng. Deadline benchmark nội bộ 20 s, process ngoài 30 s. Model time sau compute=0,00854731 s. Các compute samples không phải tám lần chạy từ cùng một state.

| Khoảng đo (ms)                          |    Median |       Min |       Max |
| --------------------------------------- | --------: | --------: | --------: |
| Clear diagnostics                       |  0,005120 |  0,005120 |  0,005120 |
| Grid clear                              |  0,006144 |  0,005120 |  0,006144 |
| Grid count                              |  0,025600 |  0,016384 |  0,026624 |
| Grid scan / add                         |  0,025600 |  0,024576 |  0,030720 |
| Grid scatter                            |  0,027648 |  0,023552 |  0,028672 |
| Density / EOS                           |  0,952320 |  0,947200 |  1,172480 |
| Forces                                  |  6,897150 |  6,800380 |  7,243780 |
| Reduction / dt                          |  0,046080 |  0,044032 |  0,053248 |
| Integration                             |  0,056320 |  0,056320 |  0,065536 |
| Diagnostics                             |  0,080384 |  0,079872 |  0,084992 |
| Finish timestamp interval               |  0,006144 |  0,001024 |  0,006144 |
| GPU compute batch                       |  8,135170 |  8,026110 |  8,675330 |
| CPU enqueue                             |  2,545950 |  2,433400 |  3,760400 |
| Submit→commit, gồm nhịp poll/event loop | 21,014400 | 20,494600 | 21,974500 |
| GPU frozen-scene render, không UI/swap  |  0,356352 |  0,350208 |  0,357376 |

Đây là median/min/max của một lượt hữu hạn, không phải thống kê trên mọi trạng thái dòng chảy. Không cộng các median pass rồi đòi bằng median batch; không gọi submit→commit là GPU execution. Không có phép đo speedup CPU–GPU hoặc cam kết 60 FPS. Model time không chạy lockstep theo wall-clock.

## Website, Canvas và gói tải

Full TypeScript, scoped ESLint, production build và kiểm 48 marker P51 đều qua; 30 marker P50 kiểm hồi quy cũng qua sau khi script dùng chung hỗ trợ GLSL. 5 ca browser thật kiểm lesson đầu/force/final, pointer/keyboard/reset và tiến độ/theme. Sáu luồng bổ sung kiểm dark first frame, copy đúng nội dung qua clipboard stub, client navigation, lazy source chỉ thuộc P51, ZIP bytes và search. Không đụng clipboard hệ thống, không dùng download tracker, không tự chạy/restart dev server.

Sau xác nhận của người dùng, bước chốt chỉ sửa hồ sơ, metadata nghiệm thu và test trạng thái roadmap. 11 kiểm metadata/source qua; tổng quan và bài cuối trên localhost hiện có đều HTTP 200, không còn thông báo chờ nghiệm thu và vẫn giữ đúng ZIP. C++/Canvas/lesson và gói đã kiểm không đổi, digest/hash được đối chiếu lại; không build lại C++ hoặc chạy lại scale chỉ để bỏ nhãn. Một lượt đồng bộ registry chạm deadline 25 s và được dừng, không tính PASS; lượt chạy lại với deadline 90 s hoàn tất, output không đổi. Các giới hạn solver/GPU và quy tắc kiểm vẫn giữ nguyên.

ZIP HTTP 200, magic PK, 708.096 byte, 703 file khi giải nén. Source digest `7399a4be0ea9a2ddfda85d768231e8f69864dc2e5237672b6cffe5bcc4d859cd`; archive SHA-256 `bb23f2c9f2e941d115e3d6e6697b1e145ff6028372c281a522332037f099271e`. So byte, build, GPU scale và HTTP download đều thuộc cùng gói này.

Evidence cục bộ nằm ngoài Git: `.validation/p51-native-evidence.json`, `p51-site-evidence.json`, `p51-canvas-evidence.json`, `p51-browser-live-evidence.json`, `p51-live-flows-evidence.json`; capture native tại `.validation/p51-package-a6XVlp/dam.bmp`. Source cũ có backup/hash riêng; các file build, snapshot, JSON source và ZIP tiếp tục bị ignore.

## Xác nhận thủ công và giới hạn kiểm chứng

1. **Native đã được người dùng xác nhận đạt ngày 16/11/2026.** Câu trả lời “project đã đạt yêu cầu” được gửi cho yêu cầu tự kiểm Checklist tương tác native trong README và là căn cứ chốt bước này. Trước đó Computer Use trả đúng cửa sổ `Project 51 - SPH3D Water Tank`, nhưng yêu cầu chụp/điều khiển báo `Computer Use app approval timed out`; agent không gửi input hoặc đổi cách điều khiển để vượt quyền. Guardian dừng phiên ở 180 s. Lượt công cụ hết hạn vẫn không tính PASS, kể cả sau khi người dùng xác nhận thủ công.
2. Lượt build đầu bắt cảnh báo tham số ở checkpoint chưa có command tương ứng. Đã đánh dấu maybe_unused rõ ràng, sinh/package/build lại; các build cuối không có warning C++.
3. Smoke shader ban đầu giới hạn 50 ms, quá ngắn cho initialization, báo incomplete ở checkpoint 2. Chỉnh **harness smoke** thành 500 ms, vẫn giữ timeout ngoài 7 s và deadline batch 5 s. Toàn bộ 14 target sau đó qua. Không tăng deadline solver, nới tolerance hoặc gọi lượt lỗi là PASS.
4. Rà soát cuối phát hiện oracle phụ và handler nút có thể bắt mất lỗi fence/deadline. Đã dùng `GpuBatchError` riêng, ném tiếp qua hai handler tới main để dừng submit/thoát thất bại. CTest giữ kiểu lỗi bằng fixture tổng hợp; kiểm source khóa hai nhánh ném lỗi, thứ tự catch/ném tiếp và đường cleanup/EXIT_FAILURE, không cho submit sau fatal catch. Không cố làm GPU/driver treo để tạo lỗi. Sau sửa đã sinh ZIP mới, build/CTest đủ Debug/Release và chạy lại toàn bộ fixture/scale, không tái sử dụng log scale của gói cũ.
5. Mốc 512.000/1M, Linux/macOS, mobile và toàn suite toàn site không nằm trong bằng chứng nghiệm thu lần này. Xác nhận của người dùng áp dụng cho sản phẩm P51 ở phạm vi bắt buộc; không suy ra đã chạy các mốc nâng cao hoặc kiểm mọi hệ điều hành.

Checklist đã đề nghị người dùng kiểm: Run/pause/N; R khi đang chạy đưa về tick 0; drag/zoom/Home; chọn N rồi C không cấp phát, Enter đổi N vẫn paused; F1/L và cuộn profiler; F/Q/G trên hệ nhỏ; B hoàn tất/cancel; V không đổi N/time/state chính; blur không tự resume; đóng cửa sổ khi một batch nhỏ đang pending. Người dùng đã xác nhận project đạt yêu cầu cho yêu cầu kiểm này; không gán kết quả chi tiết của từng shortcut cho tác vụ tự động.
