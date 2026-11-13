# Project 43 — Khám phá fractal Mandelbulb

Ngày kiểm: 13/11/2026. Đối chiếu mục Project 43 và các hợp đồng 0.7–0.10, 3.4–3.6 trong Product Specification v4 complete. Slug mới: `mandelbulb-explorer`; revision nội dung: 2. Không thay đổi hoặc hạ yêu cầu của đặc tả.

## Sản phẩm và giáo trình

Thay Project 43 Molecular Dynamics cũ bằng ứng dụng C++20/SDL 3.4.8/OpenGL 4.3 tự tính Mandelbulb từ field 3D. Chương trình không dùng mesh fractal, ảnh zoom sẵn hoặc fractal engine. Canvas 2D là công cụ học CPU riêng, không được dùng để nhận quy mô GPU.

Chín bài đi từ lát cắt nhìn thấy được tới ray 3D, DE, normals/lighting, camera, work/oracle, generation và progressive refinement, palette/AO/shadow/AA, rồi kiểm toàn ảnh và export. Đầu học phần có thử thách và Definition of Done. Mỗi bài giải thích điểm xuất phát, dữ liệu, vị trí gọi hàm, mã thật, thí nghiệm lỗi, checklist và bài tập. Source viewer cấp chương trình đầy đủ sau từng bài và toàn bộ final.

Các code block C++/GLSL được đối chiếu token liên tiếp với đúng checkpoint, không dùng subsequence để bỏ qua một toán tử sai. Source có snippet markers. Code C++/GLSL dùng bốn spaces, khối mã One Dark cuộn ngang. Thời gian đọc, viết và kiểm chứng được tách; không tính setup/build lần đầu. Không cố ép số bài thành sáu.

Ngay bài đầu có ảnh kết quả 960×540 xuất từ renderer native, ghi rõ power/AA/palette và phân biệt với Canvas CPU nhỏ. Ảnh được chọn làm minh họa giảng dạy tại `public/illustrations/project-43-mandelbulb.png`, không phải texture dùng để render fractal. Không thêm thư viện hoặc cả cây output QA vào Git.

Mapping và DE đã đối chiếu phần 2.1 của [McGraw & Herring, Shape Modeling with Fractals](https://web.ics.purdue.edu/~tmcgraw/papers/mcgraw_fractal_2014.pdf). Không triển khai RBF warping của bài báo. Các phép kiểm dưới đây, không phải hình trong bài báo, là bằng chứng cho implementation này.

## Đối chiếu yêu cầu

| Yêu cầu                      | Nguồn triển khai và bằng chứng                                                                                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recurrence, bailout và guard | `bulb_field.hpp`, `bulb.comp`; r=0, trục, overflow sau cập nhật, NaN/Inf có state riêng. Probe dùng đúng evaluator GLSL và oracle CPU nhân số phức độc lập.                                                                                                                                        |
| DE khác exact SDF            | `bulb_trace.hpp`, Bài 3 và README công bố epsilon shell, safety, R=2/far=32, iteration/ray caps và precision. Không khẳng định DE là lower bound toàn cục.                                                                                                                                         |
| Bề mặt, normals và chiều sâu | GPU ray tạo thể tích thật; central differences, lighting, orbit trap, AO và shadow hữu hạn. Đã xem ảnh native và ảnh export 960×540, không dùng screenshot kéo giãn làm bằng chứng độ phân giải.                                                                                                   |
| Camera và tương tác          | Orbit/pan/dolly có giới hạn, mouse capture/focus-loss cleanup, preset/reset và keyboard controls. Kiểm OS trực tiếp orbit/wheel, Space, 2, X, Enter, H, F, R, Q; CTest có pan tọa độ giải tích, center ray và camera bounds. Không nhận kiểm pan chuột phải qua OS khi chưa thực hiện thao tác đó. |
| Preview/refinement/cancel    | Preview native 120×68 rồi tile tối đa 32×16; generation được kiểm ở controller, buffer và presentation. Pause vẫn cho đổi camera/preview. Cancel không hứa ngắt dispatch đã gửi.                                                                                                                   |
| Ảnh hoàn chỉnh và AA         | Toàn 518.400 record được kiểm generation/count/finite values/work/canary. Samples=4 kiểm đủ 2.073.600 mẫu và tổng work; không suy số hit từ OR mask.                                                                                                                                               |
| Heatmap và timing            | Ray steps riêng với mọi orbit body, gồm normals/AO/shadow. Work cộng từ pixel khớp atomics. Elapsed GPU query được đọc khi sẵn sàng; không gọi enqueue/FPS là kernel time.                                                                                                                         |
| Giới hạn tài nguyên          | Preflight GL 4.3/SSBO/workgroup/bytes; payload renderer 25.666.752 byte. Cận final batch 3.575.808, preview 3.590.400 orbit bodies, đều dưới bốn triệu. Fence ba giây, verification/export có deadline và watchdog ngoài tiến trình.                                                               |
| Source độc lập               | CMake 3.24+, C++20, FetchContent SDL 3.4.8 có SHA-256, target `SDL3::SDL3`; shader fallback theo target. ZIP có README, CMake, starter, 9 checkpoint, final và tests; đã giải nén/build/CTest không cần source từ project khác.                                                                    |
| Website và migration         | Catalog/roadmap/search/glossary/lab cùng sản phẩm mới. Chỉ reset tiến độ P43 cũ. P44/P45 giữ math legacy và ghi rõ tài liệu Molecular Dynamics cũ, không gọi fractal là prerequisite vật lý.                                                                                                       |

## Kết quả kiểm chứng

Máy kiểm: Windows, MSVC 19.33 x64/Visual Studio 2022, SDL 3.4.8, NVIDIA GeForce RTX 3050 Laptop GPU, driver 546.30, OpenGL context 4.3. RAM hệ thống khoảng 6 GB. Các job chạy tuần tự với hard timeout; build tối đa hai worker.

- Ma trận native: 12 target gồm starter, 9 checkpoint, final và CPU tests build ở cả Debug/Release; CTest đạt cả hai cấu hình. Starter/checkpoint 1–9 đều chạy smoke hữu hạn ở cả hai. Khi thêm fixture camera cuối đợt, chỉ rebuild/retest target CPU ở hai cấu hình; renderer không đổi.
- Field GPU: 195 orbit ổn định, 60 one-step mapping unit-axis và 30 probe invalid qua power 2/6/8/10/12 và bailout 2/8/16. Count lẻ 19 kiểm tail/canary. DE tolerance abs `3e-5` + rel `2e-4`; không buộc long orbit trên unit-axis nhạy biên bằng nhau giữa float và CPU.
- GPU toàn ảnh: preset mặc định, power 6, camera gần, cap 4 iterations, AA bốn sample và cấu hình palette/quality cao đều hoàn tất, không có invalid. Camera distance 0,1 cho đúng 518.400 inside, không bị tính là một ảnh bề mặt.
- Ray GPU: chín ray mỗi cấu hình mặc định, power 6, góc nhìn gần và cap 4 được so uniform scanner độc lập, bước `0,0005`, tolerance t `0,006` world units. CPU còn kiểm ba ray tới vùng finite-orbit bằng bước `0,00025`; không chỉ so lại DE shell.
- Web production phạm vi P43: 7/7 kiểm tra source, catalog/overview và cả 9 route đạt; 6/6 Playwright đạt. Các ca gồm copy code bằng clipboard thật, One Dark, theme/navigation/search, ZIP HTTP, progress/reload, DPR, pointer capture, keyboard, reduced motion, input sai, supersession/cancel/last-good, AA/heatmap và bố cục desktop/mobile. Mọi mode được render không có page error; lưu ảnh Canvas để quan sát riêng.
- TypeScript và ESLint phạm vi P43 đạt; kiểm cả browser test và metadata/glossary mới. Architecture budgets và Git hygiene toàn repository đạt. Không tuyên bố typecheck, production build hoặc browser regression của toàn 582 bài đã được thực hiện trong đợt này.
- ZIP được kiểm danh sách và từng byte với nguồn, giải nén rồi configure/build Release và CTest. Lượt này tái sử dụng package SDL 3.4.8 đã build để tránh tải/build lại thư viện; nhánh FetchContent mặc định được kiểm qua CMake/source contract, không nhận đã tải lại dependency trên mạng.

Một số lượt metadata/lint đầu đã chạm timeout; tiến trình được dọn, không tính là pass. Sau khi đóng bề mặt QA, giải phóng session chụp hình và chạy tuần tự với heap hữu hạn, lượt kiểm cuối đạt. Không tắt rule, tăng budget file hoặc hạ yêu cầu để làm xanh tests.

Một lượt kiểm output checkpoint của cả 67 project chạm thời hạn 45 giây, nên không nhận toàn bộ lệnh `check:course` đã xanh. Metadata/lesson registry toàn khóa đã kiểm; output và ZIP của riêng P43 được kiểm đầy đủ trong fixture và đối chiếu với bản local. Lượt quét toàn khóa chưa xong không được tính thành một kết quả pass từ kiểm hẹp.

## Giới hạn và phạm vi kết luận

DE chỉ là estimator; ngưỡng hit hữu hạn không phải membership của Mandelbulb vô hạn. Oracle bước đều vẫn có thể bỏ feature mỏng hơn bước, và fixture hữu hạn không chứng minh mọi silhouette đúng. Trên MSVC `long double` có 53 bit mantissa như `double`; tính độc lập ở đây đến từ mapping và chiến lược dò, không phải lời hứa precision cao hơn.

Với samples=4, oracle ray qua tâm được báo SKIPPED do ảnh dùng subpixel khác; vẫn chạy lượt samples=1 riêng và kiểm toàn count/work ở lượt AA. Normal/state chi tiết từng pixel được đối chiếu mạnh nhất ở lượt một sample. Camera inside là chính sách báo trạng thái rồi cho lùi ra, không phải renderer mặt sau từ bên trong.

Timings GPU thu được là các quan sát correctness/smoke trên một máy, chưa phải benchmark qua warm-up/median hay cam kết FPS. Không kiểm Linux; macOS OpenGL 4.1 không đáp ứng compute. Các giới hạn này được công bố, không âm thầm thay sản phẩm bằng Canvas hoặc ảnh độ phân giải thấp.

## Nguồn cũ và output được sinh

Nguồn/bài học Molecular Dynamics cũ được giữ tại `.validation/retired-project-43-periodic-molecular-box-20261112-mandelbulb`; source tracked cũ còn khôi phục từ Git. Math legacy được giữ cho P44/P45. Snapshot, payload JSON, ZIP, build, screenshots và log QA đều ngoài Git. Đợt chốt nghiệm thu không tự commit, push hoặc publish.

README gốc không còn ghi nhầm toàn bộ Project 39–45 đều chờ xây dựng lại. Nhãn chờ nghiệm thu của P43 được gỡ sau các gate riêng; overview và cả chín lesson được kiểm không còn banner đó hoặc tiêu đề H1 lặp.

## Gói đã bàn giao trên local

- ZIP: `public/downloads/project-43-mandelbulb-explorer.zip`, **267 file, 390.645 byte**. Danh sách và từng byte khớp source, gói đã giải nén/build/CTest. HTTP tại localhost:3000 trả 200 và đúng byte của ZIP đã kiểm.
- Source/package digest: `3e4fcdfc9909b8a527c4b8c0e6bf90a2b8216622137c19bb9a7365900726dc70`.
- SHA-256 của ZIP: `87ae8f6a4e69783bed1fd74104414e6619289fa39fccf454f86dba4f490cd4ba`.
- Gói Molecular Dynamics cũ được chuyển nguyên byte vào thư mục dự phòng `public-downloads-1794505027429` dưới cây retired, không xóa mất dữ liệu.

Bằng chứng native của lượt cuối nằm tại `.validation/p43-native-p4NUWj/artifacts/checked-1794503536919/` (log từng cấu hình, ảnh export và capture cửa sổ), gồm log riêng `ctest-Debug.log` và `ctest-Release.log`. Fixture production/ZIP tại `.validation/p43-site-oiom3U`; ảnh Canvas và ảnh minh họa native trên web được lưu trong `test-results`. Các đường dẫn QA này là dữ liệu local được bỏ qua bởi Git, không phải dependency của website hoặc ZIP.

Manifest bằng chứng cuối tại `.validation/p43-final-evidence.json`: chín bài, **31 code block C++/GLSL**, 24 file source-template, hash mã native/tests/ZIP và browser status passed. Payload source ở repository đã được so từng byte với fixture đã nghiệm thu; kiểm checkpoint output của riêng P43 đạt, không thay thế kết luận cho toàn bộ 67 project.
