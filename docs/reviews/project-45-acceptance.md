# Project 45 — nghiệm thu Atomic Playground

Bằng chứng tự động và quan sát của agent: ngày 14/11/2026. Xác nhận nghiệm thu thủ công của người dùng: ngày 15/11/2026 (Asia/Bangkok). Nguồn chuẩn: [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), phần Project 45 và hợp đồng chung 0.9–0.10.

**Trạng thái: đã nghiệm thu ngày 15/11/2026.** Kết luận dựa trên bằng chứng tự động và quan sát đã ghi bên dưới, cùng xác nhận trực tiếp của người dùng: “tôi đã kiểm tra, project đạt yêu cầu”. Xác nhận này đóng phần nghiệm thu thủ công native còn mở trước đó, gồm keyboard pan/zoom và regression notice sau cancel pane B rồi reset A. Đây là kết quả kiểm thủ công do người dùng xác nhận, không phải trace thao tác của agent hoặc bằng chứng rằng agent đã thực hiện từng bước checklist. Canvas web thực tế đã qua **13/13 ca Playwright**, gồm đủ 11 mode và tương tác.

**Đính chính kiểm tra localhost:** các probe cũ trong sandbox bắt mọi exception rồi ghi “không lắng nghe”, trong khi nguyên nhân thực là EACCES. Probe chỉ-đọc có quyền phù hợp cho thấy IPv4 127.0.0.1 bị ECONNREFUSED nhưng IPv6 ::1 và hostname localhost đang lắng nghe. Trang `/projects/atomic-playground` trả HTTP 200, đúng tiêu đề Atomic Playground. Không được dùng kết luận server đã tắt của những probe cũ. Playwright đã kiểm qua server IPv6 có sẵn; agent không khởi động/restart server. Lượt preview trong ứng dụng gặp lỗi hạ tầng preview, không phải bằng chứng ứng dụng hoặc server không hoạt động; kết quả này tách biệt với lượt Playwright thực tế đã qua.

## Sản phẩm và phạm vi

11 bài đi từ field preview tới sampler, GPU, batch một triệu, HDR splat, camera/mặt cắt, probe/histogram, comparison, cấu hình và kiểm chứng. Có starter, 11 checkpoint, final và tests chạy độc lập. Thuật toán trước mốc được dạy còn là stub; người học sửa starter, không đổi macro để kích hoạt đáp án đã viết sẵn.

Nguồn authored: `course/projects/p45`, `content/atomic-playground`, `examples/project-45-atomic-playground/source-template`, `components/labs/atomic-playground` và `lib/labs/atomic-playground`. Catalog chuyển sang `atomic-playground`, content revision 2. URL Molecular Lab GPU cũ chuyển tới overview mới; tiến độ cũ không được công nhận là đã học Atomic Playground.

Công thức hydrogen một electron được cung cấp và có nguồn trong REFERENCES. Mỗi chấm là mẫu vị trí, không phải một electron riêng. Không có lực giữa các mẫu, quỹ đạo cổ điển hoặc solver nhiều hạt. Không chép code/asset/bin từ video tham chiếu. Canvas CPU nhỏ không được tính thay mốc GPU.

Bản molecular cũ và output được giữ trong `.validation/retired-project-45-molecular`; metadata cũ trong `.validation/retired-project-45-atomic`. Đây là dự phòng local, không phải nguồn phát hành hoặc file cần đưa vào Git.

## Đối chiếu các Acceptance Criteria

| Yêu cầu                                 | Triển khai và bằng chứng                                                                                                                                                                                        | Giới hạn                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Field có nguồn, node/đối xứng/chuẩn hóa | Catalog 1s, 2s, ba hướng real 2p, đại diện 3d/4f; C++/GLSL. CPU fixtures có giá trị/node/sign/trục, Gauss–Legendre và Simpson độc lập với bảng sampler.                                                         | Không dùng screenshot làm oracle khoa học.                                                            |
| Generic weighted sampler                | Midpoint CDF theo r² dr dμ dφ, μ=cosθ; RNG theo sample ID/seed; jitter trong cell. Uniform-volume và affine field có tích phân biết trước; histogram/region ở nhiều seed.                                       | Tail, table approximation và sampling uncertainty tách riêng.                                         |
| Một triệu mẫu GPU thật, N lẻ và memory  | Verifier có N=1.000.003, counter/canary/readback nhỏ. Final từ ZIP sinh và vẽ hai pane, mỗi pane 1.000.003 mẫu riêng; renderer đọc SSBO.                                                                        | **5 triệu chưa kiểm chứng.** Không tạo triệu positions trên CPU.                                      |
| Clip/probe/histogram/comparison         | Probe xử lý toàn cloud, tách visible/region/intersection; mẫu số vẫn là accepted N. Origin sphere có reference giải tích; shifted sphere không giả nhãn nghiệm chính xác. Same-scale hoặc auto-fit có nhãn. Web đã kiểm moved probe, clipping, histogram và comparison. | Canvas CPU không thay bằng chứng GPU/native.                                                        |
| Finite job/last-good/reset              | Batch 32.768, fence/deadline, candidate riêng active. Sáu regression CloudPane: pause queue, cancel giữ active, obsolete không publish, reset seed và budget failure giữ last-good. Phần native còn mở được đóng bằng xác nhận nghiệm thu thủ công của người dùng ngày 15/11/2026. | Không có trace agent hoàn tất từng bước regression notice; không suy từ runtime log thành input PASS. |
| Evaluate/sample/draw/probe và workload  | Pass/query tách biệt; current probe phải đúng generation/revision và đủ examined/finite N. Workload đổi thì xóa draw samples và warm-up lại.                                                                    | Evaluation dùng chung field GLSL là consistency check, không phải oracle toán độc lập.                |
| Tương tác và hình ảnh                   | Đã quan sát native preset, clipping, comparison/B-only, probe click, save/load, pause/cancel/reset; kéo orbit, wheel, palette, opacity, point size, seed và clean mode. Capture cuối từ ZIP có node/thùy/depth. Browser 13/13 kiểm đủ 11 mode, keyboard/pointer/DPR1.5/reduced-motion. Người dùng xác nhận đã kiểm tra và project đạt yêu cầu ngày 15/11/2026. | Native keyboard pan/zoom và notice được chốt theo xác nhận người dùng, không gán thành trace của agent. |
| Giáo trình/source/gói độc lập           | 60 excerpt C++/GLSL khớp token liên tiếp; 53 fence C++ thụt dòng đúng bội số 4. 11 route production, One Dark, KaTeX, source đầy đủ và ZIP link đã kiểm.                                                        | Không coi render HTML là test tương tác Canvas.                                                       |

## Gói phát hành và bằng chứng build

ZIP phát hành ngày 15/11/2026: `project-45-atomic-playground.zip`, **763.610 bytes**, **459 files**, **2.041.705 bytes source**. Digest:

```text
ad40a26bd5579b70892abe143a2882b9cac4eeae74af9f5cb7a1e6ca5a31344f
```

Đã giải nén gói phát hành vào `.validation/p45-atomic-zip-Sxu8Di`, đối chiếu chính xác danh sách và từng byte với source hiện tại, gồm README, REFERENCES, CMake, starter, checkpoint 01–11, final và tests. Không chứa source-template, build tree, DLL, executable hoặc dependencies tải về.

Đối chiếu tiếp với gói đã build ngày 14/11/2026: chỉ **README.md** thay đổi để ghi nhận nghiệm thu; **458 file còn lại giống từng byte**, gồm toàn bộ CMake, source/checkpoint/final, shader và tests. Vì không đổi mã chạy, không build hoặc chạy lại test C++ chỉ để cập nhật README. Gói cơ sở đã build có digest `33f99ced3362ae5b94e9e2bb1f9a01aa6cb582f019e05f4ceaae3a96481b17cd`; các log build/GPU bên dưới thuộc gói cơ sở đó, không phải lượt biên dịch mới của gói phát hành. Bằng chứng đóng gói và trạng thái phát hành: `.validation/p45-release-final.json`.

Gói cơ sở được giải nén tại `.validation/p45-atomic-zip-9wz9Nf`. Configure/build từ chính thư mục này bằng Visual Studio 2022 x64, C++20, SDL 3.4.8 EXACT. Đủ **14 target mỗi cấu hình** (starter + 11 checkpoint + final + tests), tổng 28 target Debug/Release, đã build thành công với một worker. CTest Release 1/1 trong 0,27 giây; Debug 1/1 trong 2,44 giây. Không lấy kết quả của build draft thay cho ZIP.

Log: `.validation/p45-zip-native-1794665007852.log`. Cả starter và 11 checkpoint đều smoke-run hữu hạn từ ZIP; trước bài probe, log ghi not_current, không báo thời gian giả. Những lượt một giây sau bài probe có thể kết thúc khi probe còn pending: đây là smoke-run, không được ghi thành đã nghiệm thu measurement.

Target student-tests trong Bài 11 còn được kiểm riêng với fixture hoàn chỉnh có hình dạng starter. Debug/Release đều qua. Cố ý sửa hằng RNG **trong fixture starter** khiến CTest fail với counter hash golden vectors; khôi phục thì pass. Điều này chứng minh target đọc starter, không tự chứng nhận mã người học.

## GPU và thống kê

Máy kiểm: Windows, MSVC 19.33, NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 4.3.0 NVIDIA 546.30, SDL runtime 3.4.8. Preflight kiểm core context, compute local size/group count, SSBO bindings/block size và timer bits trước point allocation.

Verifier Release của ZIP hoàn thành trong 789,077 ms: 25 jobs, 1.635.628 generated/accepted, N lớn nhất 1.000.003. Evaluation đã xét 1.000.003 records; fixture 257 records bị sửa một density phát hiện đúng một invalid. Có 6 lifecycle checks. Debug GPU verifier cũng qua; không suy Debug từ kết quả Release.

Fixture CDF độc lập đo trên 32.769 vị trí cố định cho mỗi preset, đủ 12 field/preset ở Rmax mặc định:

- 1.024 bins: maximum CDF error 1,05538e−5.
- 2.048 bins: 2,63851e−6.
- 4.096 bins: 6,60102e−7.
- Ở bảng mặc định, max histogram error 1,10112e−6, origin-sphere 7,93345e−7 và negative-μ hemisphere 5,96046e−9.

Các số trên qua ở cả Debug/Release. Đây là maximum trên **fixture hữu hạn**, không phải global bound. Allowance 0,0003 của verifier không bao gồm tail hoặc Monte Carlo uncertainty và không được quảng cáo là bảo đảm cho mọi field/cấu hình.

### Benchmark có phạm vi rõ

Lượt Release từ ZIP: hai pane 2pz/3dxy, N=1.000.003 mỗi pane, seed 12345/98765, Rmax 32/60, bảng 2048×64×128, drawable 1280×820, cùng world scale. Log giữ cả camera, palette, opacity, size, exposure, boost, clip và probe highlight.

Bỏ 10 resolved draw queries rồi giữ 136 mẫu: median GPU draw **2,710525 ms**, p95 **3,67411 ms**. Runner đọc raw samples và tính lại độc lập, khớp số báo. Không loại mẫu chậm và không coi đây là thời gian toàn frame hoặc cam kết FPS.

Sample GPU 0,982016/0,892928 ms; probe GPU 1,01171/1,024 ms; evaluate 0,339968/0,330752 ms. Peak tracked GPU resources 69,1217 MiB, không phải tổng VRAM driver. CPU table, CPU allocate/upload-submit và generation wall được ghi riêng. Generation wall còn gồm shader setup/table/upload/poll/readback, nhịp UI và pause; không gọi là kernel time. Evaluation còn gồm đọc record/so sánh/atomics, không phải ALU thuần và không cộng vào sample để tạo tổng frame.

Ca âm từ chính ZIP: benchmark một triệu mẫu với deadline 0,9 giây đã sinh đủ cloud nhưng probe chưa xong. Chương trình trả exit 1 với lỗi current probe revision chưa hoàn tất; runner yêu cầu đúng lỗi này và xác nhận expected failure. Không dùng dữ liệu đo dở hoặc thời gian cũ để nhận benchmark.

Capture thật từ ZIP đã quan sát: `.validation/p45-final-1794665185858.bmp`. Đây là hình render, không phải bằng chứng thay cho kiểm xác suất.

## Website và tooling

- Browser thực tế **13/13** trong **1,7 phút**, dùng server IPv6 có sẵn; log `.validation/p45-browser-existing.log`. Đủ 11 mode mount Canvas ở DPR1.5, không có page error trong các ca có thu lỗi; đã kiểm CDF/sample ID và đổi table, pause/step/cancel/reset/last-good, clipping/brightness/camera và mẫu số, comparison/B-only, N/seed, wrong samplers, moved probe/quadrature, JSON, pointer pan/wheel, keyboard, blur/resize/pointer capture, reduced-motion và cleanup khi điều hướng. Cũng kiểm migration/theme và source/copy/ZIP link. Screenshot Canvas mode validation: `.validation/p45-browser-validation.png`. Các lỗi selector/relative locator ở lượt cũ đã được sửa; không dùng kết quả 2/13 hoặc lượt retry còn lỗi để mô tả trạng thái hiện tại.
- Kiểm riêng P45 **27/27** trong 6,95 giây: 16 ca toán/Canvas, 1 package-layout và 10 ca source/giáo trình/MDX/production route/chunk budget.
- Cả overview, 11 lesson và alias URL cũ đều qua; mỗi lesson HTML dưới budget 350 KiB. Entry Canvas 1.587 bytes, workshop 13.224 bytes và trace 3.294 bytes, đều dưới budget đang có.
- Test công thức dùng math nodes của parser, không nhầm ký tự dollar trong CMake/shell code với công thức. Kiểm lazy import đọc biểu thức import thực, kể cả template literal do Rolldown sinh; không nâng giới hạn để làm test qua.
- Full cold TypeScript: **2.786 input files**, 727.779 KiB compiler memory, **24,51 giây**. Không dùng pass scope P45 thay cho toàn repository.
- Lint phạm vi P45 đã chọn: **20 file, 0 errors, 0 warnings**, CLI kết thúc bình thường trong 11,54 giây; report `.validation/p45-lint-final.json`. Lượt thử trước chạm deadline riêng 45 giây nên không tính pass, dù đã ghi được report. Lượt đạt có deadline hữu hạn 90 giây, vẫn thấp hơn giới hạn lint 180 giây sẵn có của repository; không đổi rule hoặc bỏ file vì lỗi. Không suy kết quả scoped này thành toàn repository hết lỗi lint.
- Source payload/download contracts **9/9** trong 11,80 giây, gồm đối chiếu manifest/payload của toàn catalog, mirror server/browser, runtime declarations, lazy fetch đúng project/checkpoint và deadline/cancellation. Log `.validation/p45-source-payload-current.log`.
- Production build đầu bị hard timeout 240 giây ở bước SSR cuối và đã dọn process; **không tính là pass**. Sau sửa nhãn native chồng chữ và đóng lại ZIP, lượt mới thành công trong cùng giới hạn; suite gồm chuẩn bị + build mất 249,2 giây. Không tăng timeout hoặc sửa test rules.
- Log web: `.validation/p45-web-current.log`; build thành công: `.validation/p45-production-retry.log`. Registry/checkpoint, architecture, format và Git hygiene được đối chiếu riêng trước bàn giao.

Rà soát build graph còn thấy khoảng 39,8 MiB payload C++ ở nhánh server, vì SSR dùng source để tính diff/line count/initial preview. Có khoảng 4,4 MiB payload giống nhau, chủ yếu final và checkpoint cuối. Đây là output được sinh, không phải thư viện bị thêm vào Git. Chưa refactor nhánh này trong đợt P45; cũng chưa kết luận nó là nguyên nhân duy nhất của timeout. Alias registry hoặc metadata/diff sinh sẵn là hướng tối ưu sau, phải giữ đầy đủ source và hợp đồng SSR.

Các kiểm toàn site ngoài P45 không được nhận là xanh. Chẳng hạn bài cuối Project 42 vẫn thiếu lệnh CTest Debug trong lượt chẩn đoán nguồn; các lỗi cũ khác được giữ trong [báo cáo ngoài P44](site-issues-outside-project-44.md). Không sửa lan hoặc hạ rule để hợp thức hóa kết quả.

## Kết luận nghiệm thu

Ngày 15/11/2026, sau câu hỏi về các mục kiểm thủ công native còn lại, người dùng xác nhận: “tôi đã kiểm tra, project đạt yêu cầu”. Kết hợp với bằng chứng tự động ngày 14/11/2026, xác nhận này đóng gate nghiệm thu native và chốt Project 45 đạt yêu cầu. Không còn mục nghiệm thu bắt buộc chờ người dùng kiểm lại trong hồ sơ này; mốc mở rộng năm triệu vẫn được ghi đúng là chưa kiểm chứng.

Các lượt bị input guard chặn bên dưới được giữ làm lịch sử, không được đổi thành trace PASS. Xác nhận chung của người dùng không cung cấp log/ảnh hoặc xác nhận riêng từng phím; hồ sơ không bổ sung các chi tiết ấy. Đã bỏ `acceptanceNote` của riêng Project 45, giữ `replacement`, chuyển hướng URL cũ và migration revision 2. Model roadmap hiện trả `published`, đúng slug `atomic-playground`, 11 bài và không còn ghi chú chờ nghiệm thu. Registry/checkpoint, byte-equality ZIP, architecture budgets và Git hygiene đã được kiểm khi chốt; chưa stage, commit hoặc push P45.

### Checklist native lịch sử — đã đóng bằng xác nhận của người dùng

Đây là kịch bản đã dùng để mô tả phần kiểm thủ công còn thiếu trước ngày 15/11/2026, không phải bản ghi agent đã chạy xong từng bước. Gate của kịch bản được đóng bằng xác nhận nghiệm thu chung của người dùng nêu trên. Giữ nội dung để tái kiểm khi cần; không cần build lại nếu source/digest không đổi. Từ thư mục ZIP đã build, phiên tái kiểm hữu hạn có thể mở bằng:

```powershell
.\build\Release\project_45_final.exe --compare 2s --count 1024 --seconds 120
```

Chờ cả hai pane có active cloud; pane A đang được chọn. Nếu thao tác chậm hơn thời hạn, phiên chạy kết thúc không đồng nghĩa checklist đã qua. Escape/Q vẫn cho phép thoát sớm.

| Bước | Thao tác    | Điều cần quan sát                                                                                                                                           |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Shift+Right | Camera pan; hình/vùng đo dịch trong viewport nhưng N/seed/generation không đổi.                                                                             |
| 2    | F8          | Zoom vào bằng phím; không sinh lại cloud.                                                                                                                   |
| 3    | F9          | Zoom ra; đối chiếu với bước 2, counts vẫn giữ nguyên.                                                                                                       |
| 4    | Tab         | Panel chọn pane B.                                                                                                                                          |
| 5    | Space       | Pause generation; camera/input vẫn dùng được.                                                                                                               |
| 6    | N           | B yêu cầu 16.384 mẫu nhưng job đang pause; active cũ 1.024 mẫu vẫn được vẽ với đúng nhãn.                                                                   |
| 7    | C           | Hủy candidate đang chờ; B giữ last-good. C là lệnh hủy chung, không phải hủy riêng pane B; A ở ca này không có candidate cần hủy.                           |
| 8    | Tab         | Chọn lại A.                                                                                                                                                 |
| 9    | F2          | Tắt comparison, tạm ẩn B.                                                                                                                                   |
| 10   | R           | Trong trạng thái chỉ hiện A, reset dựng lại A với cùng preset/seed; B không được request lại.                                                               |
| 11   | Space       | Resume, chờ A trở thành current với 1.024 mẫu.                                                                                                              |
| 12   | F2          | Hiện B lại. A vẫn được chọn và current; notice cancel của B không được lấn vào thông báo của A. B vẫn phải mang nhãn last-good/chưa có cấu hình đã yêu cầu. |

Nếu tái kiểm, phải ẩn B ở bước 9: R khi comparison còn bật sẽ request lại **cả hai pane**, xóa trạng thái cancel cần giữ để kiểm regression. Muốn ghi trace từng bước thì phải có log/ảnh tương ứng; chỉ có log kết thúc runtime không chứng minh input đã được thực hiện.

### Lịch sử các lượt kiểm native của agent

Trong lượt trước ngày người dùng xác nhận nghiệm thu, phiên từ ZIP tự thoát bình thường sau 60 giây, nhưng Computer Use hai lần báo user input was detected; agent dừng gửi input. Không tính những thao tác bị từ chối là pass. Log `.validation/p45-native-input-current.log` là runtime/benchmark, không phải trace hoàn tất input.

Lượt kiểm tiếp theo vẫn gặp `user input was detected in this window` ngay ở phím đầu tiên; agent chỉ refresh để quan sát rồi dừng gửi input. Phiên tự thoát bình thường sau 60,0017 giây. Log `.validation/p45-native-remaining-controls.log` xác nhận runtime còn phản hồi, nhưng **không** chứng minh các phím trong checklist đã qua. Kết luận localhost không lắng nghe trong lượt ấy đã được đính chính ở đầu hồ sơ; browser QA đã qua 13/13 trên server IPv6 có sẵn, tách biệt với phần nghiệm thu native khi đó còn mở.

Lượt cuối của agent trước xác nhận nghiệm thu dùng runner `.validation/p45-native-final-ui.mjs`, đối chiếu digest với gói ZIP đã kiểm trước khi mở final với hai pane, 1.024 mẫu mỗi pane, runtime hữu hạn 120 giây và deadline supervisor 128 giây. Đã chọn duy nhất cửa sổ Atomic, kích hoạt và quan sát UI thật; ngay phím F8 đầu tiên, Computer Use lại từ chối với `user input was detected in this window; call get_window_state before continuing`. Agent refresh trạng thái chỉ-đọc rồi không gửi thêm input. Phiên đã tự kết thúc với exit 0 sau **120,004 giây**. Log `.validation/p45-native-final-ui.log` xác nhận cả hai cloud có đủ 1.024 mẫu, probe/evaluate current và invalid bằng 0; đây là bằng chứng runtime kết thúc hữu hạn, **không** chứng minh phím bị từ chối hoặc checklist native đã qua. Không suy nguyên nhân của thay đổi giao diện từ log kết thúc.

Rà soát cuối trước xác nhận nghiệm thu đã đối chiếu lại spec, source/capability/lifecycle/renderer/catalog và fixtures CPU/GPU; digest authored khi đó khớp gói cơ sở đã build ngày 14/11/2026. Chưa phát hiện thêm thiếu sót triển khai trọng yếu. Hai mục nghiệm thu native khi đó còn mở vì cùng chặn input lặp lại qua nhiều phiên đã được chuyển cho người dùng kiểm thủ công, và được đóng bằng xác nhận ngày 15/11/2026. Không đổi kết quả input guard, chạy lại build hoặc hạ tiêu chí để chốt nghiệm thu.

Một lượt draft cũ từng exit 0xC0000008 chưa xác định nguyên nhân. Các verifier, matrix, comparison, capture và phiên native sau đó qua, nhưng không gọi đó là bằng chứng đã sửa được nguyên nhân. Giữ lịch sử trong [hồ sơ nháp](project-45-draft-validation.md); nếu tái diễn phải lưu log và chẩn đoán từ bằng chứng mới.
