# Project 49 — kết quả kiểm bản xây lại

Ngày kiểm: 15/11/2026. Phạm vi là Project 49 và các điểm nối dùng chung cần cho bản mới; không phải báo cáo toàn site 100%.

## Sản phẩm và giáo trình

Đã thay bản cũ bằng buồng khói trắng 2D: hai nguồn phun liên tục, click thêm khói, drag chỉ khuấy, Paint/Erase/Probe riêng, tracer màu tùy chọn và các lớp Velocity/Pressure/Divergence. Có controls ngay trong ứng dụng C++ và Canvas, không phải chỉ in hướng dẫn ra console.

Mặc định 128×128 ô thật để tương tác; tùy chọn 256×256 để giữ các dải khói mảnh hơn. MAC, sampler/RK2, advection, viscosity, Jacobi/CG, projection, MacCormack có limiter, confinement và multigrid-preconditioned CG đều được tự viết. Không dùng ảnh động noise hoặc hạt trang trí để giả kết quả solver.

15 bài dẫn từ scaffold/texture đến bản hoàn chỉnh, có code từ đúng checkpoint, chỗ gọi, giải thích đơn vị, dự đoán, lỗi cố ý, kiểm chứng và bài tập. 34 snippet markers được đối chiếu nguyên đoạn, không chỉ kiểm token subsequence. Mã đầy đủ sau bài và ZIP chứa các chương trình độc lập. Source C++ dùng bốn dấu cách, comment và khoảng trắng giữa các khối; code block dùng One Dark.

Người dùng đã duyệt hướng khói trắng. So viewport 768×768 của capture cuối với ảnh được duyệt: **589.824 pixel, 0 pixel thay đổi**. Đây là bằng chứng giữ đúng hình đã duyệt ở cùng 180 tick, không phải chứng nhận mọi thao tác đã đạt.

## Các kiểm tra đã đạt

| Nhóm                       | Kết quả / phạm vi thực tế                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toán học Canvas            | 21/21: affine sampler/offset, phép dịch giải tích, scalar hằng, limiter, state cũ u/v, tường/flux, Jacobi tính tay, pressure biết trước, CG/PCG, viscosity, confinement, input, clock, dữ liệu không hữu hạn và norm tràn số                                         |
| Nội dung/source            | 4/4: đủ 15 bài và các phần bắt buộc, công thức KaTeX hợp lệ, 34 marker đúng snapshot, thuật toán xuất hiện theo từng checkpoint, comment/thụt dòng/khoảng cách source                                                                                                |
| Route production           | Tổng quan và cả 15 bài trả 200; có One Dark và phần mã chạy được. Suite scoped gồm bốn kiểm authored trên và một kiểm route, đạt 5/5                                                                                                                                 |
| TypeScript / ESLint        | Typecheck toàn repository và ESLint các module P49 đã đạt; không vô hiệu hóa quy tắc kiểm tra                                                                                                                                                                        |
| Architecture / Git hygiene | Các budget file được giữ; không có checkpoint sinh, ZIP, build, binary hoặc thư viện trong Git index; `git diff --check` đạt                                                                                                                                         |
| ZIP                        | 360 file được giải nén và so từng byte với nguồn đóng gói; digest `3efd09daec08e2e7fe4578fa9e27d5b84b1df9275c60003df9bbbfbbacf83d57`; ZIP 407.210 byte                                                                                                               |
| Native build               | Windows / Visual Studio 2022 x64, SDL 3.4.8 EXACT: starter + 15 checkpoint + final, **17 app target mỗi cấu hình**, một worker; Debug và Release đều đạt, không warning C++                                                                                          |
| CTest                      | Debug và Release đều đạt; require/exception vẫn kiểm khi NDEBUG bật; không cần window                                                                                                                                                                                |
| Render native hữu hạn      | Cả 17 app mở/vẽ/thoát với deadline; final chạy đủ 180 tick tại 256², chụp từ solver thật                                                                                                                                                                             |
| Chuột/phím native          | Computer Use trực tiếp trên executable Release trong ZIP: click thêm khói, drag chỉ khuấy, F1, Jacobi qua phím J và nút bấm, N khi paused/running, Space, nút Reset, V, L, P, G và Escape; quan sát lại cửa sổ sau từng thao tác                                     |
| Canvas trong Chrome        | 12 nhóm kiểm tại DPR 1 và 2, React development StrictMode, component thật và shim dynamic thật: gating, Jacobi qua nút/phím, paint/impulse/step, pointer capture, click khác drag, ca chuẩn riêng, dữ liệu 256², reduced-motion, resize và dispose; không page error |
| Website trên localhost     | 5/5 ca Playwright: N pause/step, gating/One Dark, Jacobi, keyboard/reset/validation/256², mouse/resize/dispose. Thêm 9/9 kiểm luồng đọc bài: alias, dark first frame, copy, progress sau reload, chuyển bài, Canvas, source JSON riêng P49, ZIP và search            |

Canvas được kiểm trong trang `about:blank` cô lập, không mở cổng/server hoặc dùng tab của người dùng. Nhãn accessible của dropdown đã được sửa sau khi kiểm thực tế phát hiện label lẫn toàn bộ option. Phím N đã được sửa để pause trước khi tiến một bước, kể cả khi solver đang chạy; có kiểm hồi quy bằng Chrome. Trang tổng quan tự chạy mẫu; bài học chờ bấm Chạy. Rời reduced-motion không tự khởi động lại.

Sau đó đã kiểm riêng trên **server localhost:3000 có sẵn**, không tự khởi động server. Kiểm tra TCP ban đầu trong sandbox không xác định đúng kết nối; kiểm lại với quyền mạng phù hợp xác nhận cổng đang nghe. Các ca localhost ở bảng trên dùng giao diện thật. Copy dùng clipboard stub trong profile test, không sửa clipboard OS hoặc tiến độ ở tab của người dùng.

Đã bổ sung chặn norm tràn số trong cả C++ và Canvas: trước bản sửa, dữ liệu finite cực lớn có thể dẫn tới `residual=target=Infinity` và bị so sánh thành converged. Bản mới từ chối norm không hữu hạn, pause/báo lỗi và có ca hồi quy riêng; không clamp velocity để che lỗi.

## Số đo kiểm chứng

- Jacobi 8×8: RHS ±64; vòng đầu p=±0.1875 và residual √14; vòng hai p(3,3)=0.19921875.
- N=16, Jacobi 160 vòng: RMS div 1.872867 → 0.0116005, dưới 8% ban đầu. Chưa đạt target pressure; report không gọi trường hợp này là converged.
- N=128, hai impulse, PCG 26 vòng: RMS div 1.457762 → 0.000107250795; residual 0.00643505, đạt target. C++/Canvas khớp fixture trong sai số đã công bố.
- Capture 256²/180 tick: 65.536 ô cấp phát/cập nhật/vẽ, 131.584 cạnh velocity; RMS div 1.92793 → 0.000170775; residual 0.0102465 ≤ target 0.0115676, 34 vòng trong lần projection cuối.
- Eigenmode Neumann có pressure/eigenvalue giải tích: CG và PCG đạt target và sai số pressure lớn nhất dưới 5e−5. Không sinh RHS bằng chính phép nhân ma trận đang được kiểm.

## Chi phí tính, không phải lời hứa FPS

Máy kiểm: AMD Ryzen 5 5600H, 6 nhân/12 luồng; Windows báo tổng RAM vật lý 5,86 GiB; Windows 11 Home Single Language 64-bit, build 10.0.26300. Hai GPU được hệ thống liệt kê là NVIDIA GeForce RTX 3050 Laptop GPU và AMD Radeon Graphics; bảng dưới đo solver CPU, không phải GPU. Đọc cấu hình bằng CIM chỉ lấy các trường trên, không thu số serial hoặc định danh máy.

Release / Visual Studio 2022 x64, hai luồng phun, dt=1/60, ν=0, buoyancy=0.8, confinement=8, MacCormack + PCG. Warm-up 30 tick, đo tám mẫu trên máy kiểm:

| Lưới | Median chuỗi toán tử | Khoảng min–max  |
| ---- | -------------------- | --------------- |
| 128² | 20.06 ms             | 19.70–27.55 ms  |
| 256² | 101.22 ms            | 98.51–143.00 ms |

Đây là profile thuần CPU theo từng toán tử, chưa gồm SDL/present hoặc các lượt kiểm finite đầu/cuối của `step`. Không suy ra FPS toàn ứng dụng. 256² tăng chi tiết nhưng đắt hơn; mặc định 128² không được hạ tiếp để giả kết quả workload. Cả hai đều xử lý đủ dữ liệu. Cache backtrace được dùng chung cho bốn scalar, không giảm số mẫu của solver.

App hoàn tất tick đang chạy rồi trả quyền nếu vượt ngân sách UI; báo thời gian bỏ qua thay vì chạy bù vô hạn. Mọi job kiểm có watchdog và deadline; native build một worker. Một lượt đóng gói toàn khóa học bị watchdog 30 giây ngắt đúng hạn, sau đó đã hoàn thành đóng gói/đối chiếu bằng thời hạn phù hợp. Không có test treo hàng giờ.

## Đối chiếu yêu cầu sản phẩm

| Yêu cầu trong đặc tả                                         | Bằng chứng để chốt                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Executable C++/SDL3 tương tác thật; Canvas không thay native | Build Debug/Release từ ZIP, 17 target/configuration; render hữu hạn và kiểm chuột/phím trực tiếp trên final Release                                                                                                                        |
| Ít nhất 128² ô, có timestep/boundary/iteration budget        | N=128 trong preset mặc định và fixture projection; N=256 cấp phát/cập nhật/vẽ đủ 65.536 ô; source/README công bố MAC closed-normal, dt=1/60 và budget solver                                                                               |
| Kéo tạo velocity, click thêm dye, pause/reset                | Native: click tạo đốm khói khi paused; drag không vẽ thêm dải dye nhưng đổi velocity/divergence; N chạy một tick, Space chạy liên tục, N đang chạy chuyển về paused; nút Reset xóa thao tác và đưa tick về 0. Canvas có kiểm hồi quy riêng |
| Xoáy liên tục, showcase sạch; debug bật/tắt                  | Hình khói trắng đã được người dùng duyệt và đối chiếu viewport; chạy native sau thao tác khuấy thấy khói uốn/cuộn; F1 bật readout, L chuyển lần lượt Velocity/Pressure/Divergence                                                          |
| Sampler, pressure solver và projection tự viết               | Source C++/TypeScript và tests độc lập: affine/translation, Jacobi tính tay, eigenmode Neumann, MAC flux và projection; không dùng animation hạt để giả solver                                                                             |
| Chuẩn divergence/residual/iterations và ngưỡng đặt trước     | Fixture N=16/N=128 ở trên; V trong native hiện PASS mà không tiến scene; Jacobi J/nút bấm thay pressure theo từng vòng, giữ tick; ca chưa đạt target không bị gắn converged                                                                |
| Tách ổn định và độ chính xác                                 | Bài advection/viscosity/timestep và các oracle dịch chuyển/limiter; công bố diffusion, Courant và thời gian bỏ qua, không dùng hình không nổ số làm chứng minh chính xác                                                                   |
| Giáo trình, source đầy đủ, checkpoint và ZIP khớp            | 15 bài, 34 marker nguyên đoạn, 360 file ZIP so từng byte, toàn bộ route P49 cùng source tải theo checkpoint; browser kiểm đọc bài/copy/progress/download/search                                                                            |

## Phạm vi nghiệm thu và giới hạn

- Lượt Computer Use trước hết thời gian chờ cấp quyền đã được dừng đúng quy định. Lượt kiểm bổ sung sau đó chọn đúng cửa sổ `Project 49 - Smoke Chamber`, kích hoạt và quan sát hình trước khi nhập; không gửi input vào ảnh chụp sai cửa sổ ở bước chọn ban đầu. Chỉ thao tác trên ứng dụng do bộ kiểm mở, mỗi phiên tự thoát sau tối đa 60 giây. Các thao tác native ở bảng trên đã được kiểm trực tiếp; không suy diễn từ CLI/capture hoặc kết quả browser.
- Thử nghiệm browser bằng Fetch handler trực tiếp thiếu bootstrap của adapter đã bị loại khỏi bằng chứng nghiệm thu. Các luồng website được kiểm lại thành công trên localhost thật như bảng trên; không suy diễn lỗi ứng dụng từ bộ kiểm cô lập không phù hợp.
- Chưa kiểm Linux/macOS hoặc thiết bị di động. Không chạy lại toàn suite ngoài Project 49; không suy ra các lỗi lịch sử của project khác đã được sửa.

Đã hoàn tất nghiệm thu Project 49 trong phạm vi Windows desktop và web nêu trên. Gỡ ghi chú “đang nghiệm thu” của riêng P49 trên roadmap, giữ `replacement` để route và tiến độ không gắn nhãn bản cũ. Các kiểm build/solver/ZIP không chạy lại chỉ vì sửa hồ sơ kiểm chứng và trạng thái metadata; source C++ và digest ZIP không đổi. Không tự stage, commit, push hoặc publish.

Sau khi cập nhật trạng thái: sinh lại registry không làm đổi payload; 8/8 kiểm roadmap/replacement đạt. Trang tổng quan trên localhost trả 200 với nội dung mới và không còn ghi chú chờ nghiệm thu. Architecture, Git hygiene, định dạng báo cáo/metadata và `git diff --check` đều đạt; staging area vẫn trống.

## Bằng chứng cục bộ

Các output sau nằm trong `.validation/` và được bỏ qua bởi Git: `p49-package-native-evidence.json`, `p49-native-input-evidence.json`, `p49-package-native.log`, `p49-profile.log`, `p49-site-evidence.json`, `p49-site.log`, `p49-canvas-evidence.json`, `p49-browser-live-evidence.json` và `p49-live-flows-evidence.json`. Source authored nằm trong `examples/project-49-stable-fluids/source-template`, `content/stable-fluids`, `course/projects/p49`, `lib/labs/smoke-chamber` và `components/labs/stable-fluids`.

Bản cũ được giữ có hash tại `.validation/retired-project-49-2026-11-15T12-41-32-139Z`; các file tracked cũ cũng còn trong Git. Việc thay nguồn/bài cũ không xóa lịch sử hoặc các project khác.
