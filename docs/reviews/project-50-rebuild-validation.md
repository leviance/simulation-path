# Project 50 — kết quả kiểm bản xây lại

Ngày kiểm: 15–16/11/2026. Phạm vi là Project 50 trên Windows desktop và website local, không phải chứng nhận toàn khóa học đã đạt 100%.

Nguồn yêu cầu: Project 50, Mục 0 và Mục 3.4–3.6 của [đặc tả v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Bản mới thay bể khoảng 100 hạt/capacity 384 bằng một ứng dụng SPH 2D có **5.000 hạt thật** ở preset chuẩn. Không hạ quy mô của đặc tả.

## Sản phẩm và cách học

Bản C++/SDL3 có cột nước đổ xuống, hồ nước, vòi và vật cản tròn. Người dùng có thể pause, tiến một substep, reset, đổi cảnh/N, chỉnh slider và đọc thông tin của hạt. Mặt nước xanh liền khối được dựng từ vị trí của toàn bộ hạt, không phải lớp ảnh động che lên những quả bóng va chạm. Có các lớp Particles/Density/Pressure/Speed và chế độ debug tách khỏi hình quan sát sạch.

12 bài đi từ cửa sổ SDL3 và cách vẽ 1.000 hạt tới kernel, density, pressure, viscosity, grid, timestep, mặt nước 5.000 hạt, vòi, vật cản và kiểm chứng. Mỗi bài có bối cảnh, dự đoán, code từ checkpoint thật, vị trí gọi hàm, thí nghiệm lỗi, checklist và bài tập. Bài đầu có code đổi tọa độ/vẽ đĩa/vòng lặp vẽ, không để người học tự đoán phần trình bày. Các mốc thay pipeline có code nối toàn bước, không chỉ đưa helper rời.

30 đoạn code được đối chiếu nguyên đoạn bằng marker trong đúng snapshot. Source hoàn chỉnh có comment, thụt dòng bốn dấu cách và không dùng `?:` để rút ngắn cách viết. Website giữ One Dark và cuộn ngang. Thời lượng tách 6 giờ đọc, 13 giờ tự viết và 4 giờ thử/kiểm; không tính cài đặt hoặc build. Thử thách đầu học phần dành cho người muốn tự xây trước khi đọc lời giải.

Source C++ chia thành `include/sph/` cho mô hình/solver và `include/app/` cho SDL/input/UI. Canvas cũng tách engine, session, draw, controls và readout; state hạt không bị clone vào React mỗi frame. Không thêm dependency, backend hoặc đăng nhập.

## Đối chiếu yêu cầu và bằng chứng

| Yêu cầu                                                                 | Bằng chứng thực tế                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable tương tác độc lập; C++20/SDL3, không dùng engine thay solver | Build từ ZIP trên Visual Studio 2022 x64, Debug và Release. CMake ≥3.24, SDL 3.4.8 EXACT; đường mặc định FetchContent có URL/SHA-256 và link `SDL3::SDL3`. Bản kiểm dùng gói SDL đúng phiên bản đã build trên máy để không tải/build thư viện lặp lại.                                         |
| Bắt đầu 1.000, bản cuối ít nhất 5.000 hạt thật                          | Starter + 12 checkpoint + final: 14 app target/configuration. Các mốc đầu dùng 1.000; từ mốc mặt nước và final dùng 5.000. Hai ca native cuối đều báo alive/updated/drawn = 5.000. Capacity 12.000; 10.000 là mở rộng, không được coi là mốc đã nghiệm thu chỉ vì có trong menu.               |
| Tự viết kernel, hàng xóm, density/pressure/viscosity và lực biên        | `source-template/include/sph/` và `lib/labs/sph-water/`: cubic spline 2D, gradient, summation density/EOS, lực đối xứng và artificial viscosity; grid count/prefix/scatter, tìm 3×3 cell rồi lọc support thật; mẫu tường/vật cản và contact giải tích.                                         |
| Công bố support/đơn vị, có oracle phù hợp                               | h=0,091 m, support=2h=0,182 m; density kg/m², pressure N/m, mass=4,9 kg/hạt. Kiểm tích phân diện tích, finite difference gradient, cặp có lực khác 0 tính độc lập, dấu công suất viscosity, grid so all-pairs ở neighbor IDs/density/pressure/acceleration và quỹ đạo nhỏ.                     |
| Pour/spawn/reset, container interaction và slider                       | Kiểm native trực tiếp: click thêm bảy hạt, kéo vòi không phát theo từng mouse event, slider c, reset, pause/step, bật và kéo target vật cản; chạy lại thấy vật cản tiến tới target. Browser có ca riêng cho bàn phím, chuột/pointer capture, reset giữ preset, overlap/mass và reduced-motion. |
| Khối nước liên tục, dam-break, biên rõ, clean/debug                     | Native chạy 2.200 tick dam-break với capture và đã quan sát sóng/splash. Surface đọc đủ mọi hạt; có thể đổi sang lớp hạt/density/pressure/speed. Capture không được dùng thay bằng chứng thao tác.                                                                                             |
| Equilibrium, density error, dt, leakage và giới hạn ổn định             | Ca lattice zero-gravity chạy 50 bước, drift dưới 1e−4 m; lực pressure dương được kiểm riêng. Có log dam/pool 5.000 hạt ở dưới. Không dùng ca zero-gravity để nhận đã chứng minh thủy tĩnh có gravity.                                                                                          |
| Giáo trình, source đầy đủ và ZIP đồng nhất                              | 12 bài, 30 marker đúng checkpoint; ZIP 228 file được giải nén và so từng byte với nguồn chuẩn. Source viewer tải đúng JSON của P50; ZIP được tải qua localhost và kiểm SHA-256, không chỉ kiểm `href`.                                                                                         |
| Website dùng được và không kéo source cả khóa học                       | Production build toàn bộ bài học thành công; tổng quan + 12 route P50 đều 200, One Dark, mã hoàn chỉnh, không lỗi KaTeX. Chunk workshop 8.632 byte. 5 ca browser P50 và 9 luồng website riêng đã qua; request source chỉ thuộc `/project-sources/50/`.                                         |
| Giới hạn tài nguyên và vệ sinh repository                               | All-pairs giới hạn 1.000; frame tối đa 24 substep, báo dropped time, nonfinite/dt quá nhỏ thì dừng. Build native một worker; các job có supervisor/watchdog và deadline. Architecture/Git hygiene/snippet checks đạt, không đưa output build/ZIP/thư viện vào Git.                             |

## Phép kiểm thuật toán và hành vi

- **22/22 kiểm tra toán/nội dung:** 18 ca engine/session TypeScript và bốn ca authored. Bao gồm scale thật, kernel/gradient, đơn vị self/tường, lực cặp, viscosity, grid/cutoff/cell âm, quỹ đạo, timestep, NaN/Inf, mass/capacity, contact, surface không sửa solver, clock và input. Các ca authored kiểm đủ phần bài học, công thức KaTeX, thuật toán xuất hiện đúng checkpoint, marker và style source.
- **C++ Debug/Release:** CTest đều qua; kiểm không dựa vào `assert` bị NDEBUG vô hiệu hóa. Cả 14 app Release đều qua smoke render ẩn/thoát hữu hạn. Final hiện `REFERENCE passed=1 integral=1 grid=0 force=0 equilibrium_drift=0` trên ca chuẩn riêng.
- **Canvas cô lập:** 14 nhóm kiểm qua trong React development StrictMode ở DPR 1 và 2. Có mốc chưa physics, cặp lực sau hydration/reset, cập nhật/vẽ đủ 5.000, emission/overlap, drag capture, kiểm chứng không đổi scene, N khi đang chạy, reduced-motion giữ pause, resize và dispose. Không dùng kết quả cô lập để nhận đã kiểm điều hướng website.
- **Browser trên localhost thật:** 5/5 ca `tests/browser/project-50.spec.ts` qua. Chín luồng bổ sung kiểm alias bài cũ, dark first frame và theme qua chuyển bài, code copy, tiến độ qua reload, physics 5.000, ca chuẩn riêng, source theo project, ZIP thật và tìm kiếm. Copy dùng clipboard stub, không thay clipboard hệ thống. Không có script error.
- **Chuột/phím native:** đã quan sát dam-break 5.000, N chuyển về paused, Reset về tick 0, click tăng lên 5.007, drag vòi giữ 5.007, slider c từ 20 lên 31,60, V hiện PASS không tiến thời gian, O/M chọn vật cản, kéo target lúc pause và Space cho vật cản tiến, F1 hiện số đo/support, L đổi lớp và P đổi hồ. Không tuyên bố mọi shortcut tùy chọn đã được bấm riêng.

Phiên kiểm input native diễn ra trước hai chỉnh sửa cuối: chọn `const dt` rõ theo checkpoint và dọn SDL surface khi capture báo lỗi. Token của 14/16 file runtime vẫn giống baseline, gồm toàn bộ `app/input`, `app/state`, `app/draw`, boundary và emitter; hai file đổi là `sph/solver.hpp` và `src/main.cpp`. Sau đó đã build/CTest toàn bộ lại và chạy dam/pool/render từ ZIP mới, **không tái sử dụng log scale cũ**. Một lần thử Escape diễn ra sau khi phiên 60 giây tự thoát nên không tính là đã qua kiểm phím Escape. Một phiên kiểm tương tác bị watchdog 125 giây dừng đúng hạn; đây là giới hạn phiên kiểm, không phải solver treo.

## Kết quả mô hình 5.000 hạt

Log density dùng tỷ số `ρ/ρ₀`, không phải trực tiếp kg/m². Median density lấy phần tử `N/2` sau sắp xếp (upper median với N chẵn); p95 lấy chỉ số `floor(0,95(N−1))`, rồi chỉ giữ phần nén dương so với 1. Benchmark thời gian dùng trung bình hai mẫu giữa khi có tám mẫu.

| Ca native | Tick / thời gian mô hình | Density min / median / max  | p95 compression | dt cuối       | Leakage / mass |
| --------- | ------------------------ | --------------------------- | --------------- | ------------- | -------------- |
| Dam-break | 2.200 / 1,50372 s        | 0,26907 / 1,05038 / 1,20902 | 14,4306%        | 0,000542553 s | 0 / 24.500 kg  |
| Hồ        | 1.600 / 1,18783 s        | 0,26907 / 1,02734 / 1,08320 | 6,56057%        | 0,000697814 s | 0 / 24.500 kg  |

Cả hai có alive=updated=drawn=5.000, allocated=12.000, không thêm/mất hạt trong ca kiểm. Đây là bằng chứng workload/containment và kết quả mô hình tại các thời điểm đã đo, không phải lời hứa ổn định vô hạn hoặc nước không nén chính xác. Giá trị thấp ở hạt thiếu support, đặc biệt mặt thoáng/hạt tách ra, và nén tới khoảng 21% ở dam-break phải được nhìn nhận là giới hạn của WCSPH/boundary hiện tại. Mặt nước mượt không xóa các sai số này.

## Chi phí Release

Máy kiểm đã ghi nhận trong phiên: AMD Ryzen 5 5600H, 6 nhân/12 luồng; Windows báo tổng RAM vật lý 5,86 GiB; Windows 11 Home Single Language 64-bit, build 10.0.26300. Compiler MSVC 19.33.31630, Visual Studio 2022 x64. Đây là đo CPU, không phải benchmark GPU.

Lệnh trong ZIP: `project_50_tests.exe --benchmark`. N=1.000/5.000, warm-up 30 tick, tám mẫu từ bản clone của cùng state sau warm-up; copy nằm ngoài khoảng đo. c=20 m/s, alpha=0,3, g=9,81 m/s², max dt=0,001 s, grid cell=2h. Bảng ghi **median [min–max]**, đơn vị ms; không chọn lượt nhanh nhất từ các phiên trước.

| Công việc                         | 1.000 hạt                | 5.000 hạt                 |
| --------------------------------- | ------------------------ | ------------------------- |
| Grid / search                     | 0,8460 [0,6294–1,0410]   | 2,4304 [2,1871–3,8500]    |
| Density / EOS                     | 0,1597 [0,1328–0,2054]   | 0,7702 [0,6740–1,1279]    |
| Forces                            | 0,3910 [0,3241–0,4657]   | 1,8350 [1,6242–3,5673]    |
| Dt / integrate / finite           | 0,0888 [0,0718–0,1219]   | 0,4229 [0,3462–1,4352]    |
| Full step thật                    | 1,5360 [1,2896–1,9079]   | 6,1387 [5,1027–8,7825]    |
| CPU surface 720×432, chưa gồm SDL | 11,7703 [9,0134–13,3541] | 13,4887 [11,5112–15,4041] |

Full step có validate/finite/allocation/destruction của solver; các toán tử được đo riêng để giải thích chi phí. Surface gồm reconstruct/shade, chưa gồm SDL upload/present hay một frame hoàn chỉnh. Không cộng các median để suy ra median frame hoặc hứa FPS. Một frame có thể cần nhiều substep nhỏ; khi hết ngân sách ứng dụng báo thời gian bỏ, không chạy bù vô hạn. Đồ họa mặt nước vẫn là chi phí đáng kể, kể cả ở N nhỏ.

## Source tải về và phạm vi chốt

Gói hiện tại có 228 file, 260.900 byte. Source digest của gói:

```text
84cffb866f37e901a6d61e5c8dcb35e6a2c7175cd6a7df2137c6474a08833575
```

SHA-256 của chính file ZIP được phục vụ trên localhost:

```text
8c6eaec9b0df4d07169ff51083f501f117e37fa21451849ceef9550a913b3565
```

Hai digest có ý nghĩa khác nhau: digest thứ nhất so nguồn đầu vào gói; digest thứ hai so byte của archive. Native được build từ ZIP đã giải nén/đối chiếu, không chỉ từ một thư mục final có sẵn.

Đã hoàn tất nghiệm thu trong phạm vi Windows desktop và web nêu trên. Bỏ ghi chú chờ nghiệm thu của riêng P50, giữ `replacement` và các alias để bài cũ vẫn dẫn tới nội dung tương ứng. Build production được kiểm sau khi source/lesson/Canvas cuối đã đóng băng; thay đổi sau đó chỉ là hồ sơ này và nhãn nghiệm thu trong metadata. Kiểm lại registry, trạng thái roadmap và trang tổng quan local cho thay đổi nhãn; không build lại toàn khóa học chỉ vì thay văn bản này.

Sau khi cập nhật nhãn: 11/11 kiểm roadmap/replacement/glossary đã qua; registry đồng bộ. Trang tổng quan trên localhost trả 200, không còn ghi chú đang nghiệm thu, và cả chín luồng website vẫn qua. Architecture, Git hygiene và 30 marker đều đạt; staging area trống.

Chưa kiểm Linux/macOS, thiết bị di động hoặc các mốc mở rộng 10.000–100.000 qua đầy đủ scale/render/input. Bể là 2D; không có surface tension, pressure projection hoặc rigid-body phản lực hai chiều. Chưa kiểm cân bằng thủy tĩnh có gravity tới một nghiệm chính xác. Những giới hạn này được công bố trong bài/README, không sửa specification để che đi.

Commit `946ce14` trước đó đã đưa phần xây lại lên GitHub khi còn nhãn chờ nghiệm thu. Hồ sơ và việc chốt nhãn sau lượt nghiệm thu này chưa tự stage, commit, push hoặc publish.

## Bằng chứng cục bộ và khả năng khôi phục

Các output nằm trong `.validation/`, không đưa vào Git: `p50-native-evidence.json`, `p50-native.log`, `p50-native-input-evidence.json`, `p50-final-runtime-tokens.json`, `p50-profile-evidence.json`, `p50-site-evidence.json`, `p50-site.log`, `p50-canvas-evidence.json`, `p50-browser-live-evidence.json` và `p50-live-flows-evidence.json`. Mỗi loại chứng minh đúng phạm vi đã nêu, không thay thế nhau.

Nguồn authored nằm trong `examples/project-50-sph-water/source-template`, `examples/project-50-sph-water/tests`, `content/sph-water`, `course/projects/p50`, `lib/labs/sph-water` và `components/labs/sph-water`. Bản cũ được giữ có hash tại `.validation/retired-project-50-2026-11-15T16-00-02-845Z`; các file tracked cũ cũng còn trong Git. Không sửa lịch sử hoặc xóa project khác khi thay nguồn/bài cũ.
