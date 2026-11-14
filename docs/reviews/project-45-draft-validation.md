# Project 45 — kiểm chứng bản nháp Atomic Playground

> Hồ sơ lịch sử của giai đoạn **trước khi tích hợp catalog**. Các đường dẫn,
> trạng thái TypeScript và số đo dưới đây thuộc phiên bản nháp lúc kiểm, không
> phải kết luận cho source hiện tại. Xem [hồ sơ nghiệm thu hiện hành](project-45-acceptance.md)
> để biết kết quả và phạm vi kiểm chứng sau tích hợp.

Ngày kiểm: 2026-11-14. **Chưa nghiệm thu, chưa thay Project 45 cũ trong catalog.**
Nguồn chuẩn là phần Project 45 của Product Specification v4 complete. Không lấy
việc test xanh làm bằng chứng rằng toàn bộ sản phẩm đã đáp ứng đặc tả.

## Nguồn hiện tại

- C++/GLSL/tests/README/REFERENCES: `examples/drafts/atomic-playground/`.
- Metadata chờ tích hợp: `examples/drafts/atomic-playground/course/`.
- 11 bài: `content/atomic-playground/`.
- Canvas và toán: `components/labs/atomic-playground*`, `lib/labs/atomic-playground/`.
- Fixture Canvas: `tests/lab-math-atomic-playground.test.mjs`.

Ba metadata của học phần cũ vẫn giữ nguyên; catalog, ZIP và route cũ chưa được
đổi nhãn thành Atomic Playground. Glossary mới đã đăng ký nguồn để không làm
generator lỗi do có module chưa đăng ký. Chưa stage, commit hoặc push đợt P45.

## Bằng chứng đã có

Các lệnh dài chạy qua ProcessSupervisor/guardian, có deadline và cleanup. Chỉ
một job build/test nặng tại một thời điểm; MSBuild dùng một worker và tắt node
reuse. Không khởi động dev server.

### CPU và GPU

- CPU fixtures chạy thành công: density có oracle độc lập, tích phân/normalization,
  node/sign/axis, CDF/RNG, uniform-volume/affine field, nhiều seed, lỗi sampler,
  histogram, Wilson và config parser/round-trip.
- GPU thật: OpenGL 4.3.0, NVIDIA driver báo `546.30`. Verifier có deadline tổng
  30 giây; lượt cuối hoàn thành trong 693,797 ms, 25 job, tổng 1.635.628 mẫu sinh
  và chấp nhận, N lớn nhất 1.000.003. Bài kiểm gồm N sát ranh workgroup, canary,
  readback nhỏ so CPU, histogram/region toàn buffer ở nhiều seed, pause/cancel.
- Ứng dụng final đã sinh và render hai cloud riêng, mỗi cloud 1.000.000 mẫu:
  2pz và 3dxy. Requested/generated/accepted/submitted khớp. GPU live/peak trong
  lượt này là khoảng 69,12 MiB (buffer/target do ứng dụng theo dõi, không phải
  toàn bộ bộ nhớ driver). Không kiểm và không nhận mốc 5 triệu.
- Benchmark hữu hạn 3 giây sau khi bỏ 10 resolved draw queries: 79 kết quả,
  median GPU draw 2,78118 ms, p95 6,65293 ms. Đây chỉ là pass vẽ hai pane trên
  máy này; không phải thời gian toàn frame hoặc cam kết FPS. Table CPU, sample
  GPU và probe GPU được báo riêng; raw draw samples có trong stdout.

### Snapshot C++

Trong khi catalog còn giữ bản cũ, snapshot thử được tạo ở `.validation/p45-snapshots`
bằng đúng pure renderTemplate của generator repository và template courseCmake.
Không dùng snapshot thử để thay cho lần đối chiếu chính thức khi tích hợp catalog.

- Starter, 11 checkpoint và final đã build Release; CTest final đạt 1/1.
- Starter và 11 checkpoint đã smoke-run hữu hạn, từng tiến trình tự thoát.
- Sau các sửa cuối về benchmark/fit comparison, final, starter và tests đã build
  lại thành công; còn cần build lại đủ 11 checkpoint ở phiên bản cuối và Debug.
- Một lượt chuỗi smoke kết thúc bất thường khi vào final GPU+comparison với
  exit `3221225480` (`0xC0000008`). Chưa xác định nguyên nhân. Comparison chạy
  riêng sau đó qua; GPU+comparison+capture lặp lại qua; bản có unit-buffered log
  và benchmark cũng qua. Không coi các lượt qua sau là bằng chứng đã sửa được
  nguyên nhân của lần thoát này. Cần tiếp tục quan sát và lưu log nếu tái diễn.

### Canvas, TypeScript và bài học

- 16/16 fixture Canvas đạt (842 ms ở lượt có CDF trace và table resolution).
- TypeScript scope phần P45 mới đạt, bao gồm Canvas, toán, glossary và metadata
  draft. Metadata draft dùng type riêng, không giả ID cũ để vượt union công khai.
- TypeScript toàn repository chạm hard timeout 60 giây; watchdog đã dừng tiến
  trình. Không có kết quả pass toàn repository và chưa kết luận nguyên nhân.
- 11 bài đã được review chéo với nguồn và thao tác thực; snippets được lấy từ
  snapshot đã bỏ LAB_CHECKPOINT. Sau khi sửa source, vẫn phải refresh/đối chiếu
  fenced code lần cuối bằng source-contract chính thức.
- Cả 11 MDX đã compile bằng courseMdxOptions thật (One Dark/KaTeX/static markup),
  trước lượt refresh cuối các fenced code benchmark. Chưa có bằng chứng render
  route hoặc tương tác web cho bản mới.
- Git hygiene không thấy output hoặc binary được theo dõi trong index. Bản
  nháp mới vẫn chưa stage, nên phải kiểm lại staged paths trước commit sau này.

## Những sửa đã thực hiện qua kiểm tra

- Tách starter clear frame khỏi checkpoint 1 nối field vào renderer; không để
  hai bản giống hệt nhau. Kernel GPU trước bài 4 là stub không được dispatch.
- N nhỏ tới bài 4; một triệu từ bài 5. Không gọi lattice preview là mẫu ngẫu nhiên;
  draw-submitted của preview tách khỏi generated/accepted.
- Candidate/last-good và mode của dữ liệu đang vẽ tách khỏi cấu hình yêu cầu;
  không đổi nhãn trước publication. Chỉ tái sinh pane có cấu hình thay đổi.
- Job thất bại không được làm bounded run/capture báo thành công. Fence lỗi có
  đường kết thúc hữu hạn; kiểm giới hạn SSBO của driver trước cấp phát.
- Probe giữ source trong lúc chạy; publication và revision/generation có guard.
  Clip/camera/brightness không gọi generation. Mẫu số đo là toàn cloud được giữ.
- CDF trace Canvas dùng chính phép tính sampler, không phải số minh họa dựng sẵn.
  Thao tác job chỉ ở pane B cũng được điều khiển đúng.
- Cập nhật kích thước trước hit test, lọc mouse buttons, thêm camera keyboard,
  sửa cờ vsync khi hidden interval bằng 0 và fit comparison theo cả hai pane.
- Tách phép đo cuối pass với benchmark nhiều query; không lấy cùng một giá trị
  UI lặp lại làm nhiều mẫu timing.

## Công việc bắt buộc còn lại

1. Compile/render 11 MDX bằng pipeline thực; đối chiếu C++/GLSL snippets và links,
   glossary, lesson order/prev-next, code guide, source/source viewer.
2. Kiểm target student-tests được dạy trong bài 11; CTest mặc định kiểm final,
   không được dùng kết quả đó để công nhận starter do người học sửa.
3. Build lại đủ snapshot bản cuối, Debug/Release, chạy CTest và các negative CLI
   cases hữu hạn. Tiếp tục điều tra nếu exit bất thường tái diễn.
   Density evaluation hiện gộp trong table CPU và sample GPU, chưa có timer
   evaluate độc lập; cần hoàn thiện phép đo này theo spec và giải thích scope.
4. Kiểm trực tiếp native controls/camera, probe, clip, comparison, save/load,
   cancel/reset/last-good; không nhận kiểm toán thay cho kiểm tương tác.
5. Tích hợp catalog/revision/metadata/lab/glossary/test suites, chuyển nguồn cũ
   có bản dự phòng, sinh source/ZIP mới và kiểm equality/hygiene.
6. Kiểm route/Canvas trên server do người dùng bật nếu có, không tự bật server;
   kiểm site build và các gate liên quan. TypeScript toàn repo vẫn chưa qua.

Không bỏ acceptance note hoặc đánh dấu goal hoàn tất trước khi có bằng chứng
cho các phần còn lại. Không hạ spec để khớp sản phẩm đang có.
