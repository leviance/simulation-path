# Project 37 — xây lại máy tính vector GPU

Ngày đối chiếu: 2026-10-30. Nguồn chuẩn: Product Specification v4, Project 37; hợp đồng chung 0.7–0.10 và 3.4–3.6. **Đã hoàn tất phần triển khai và kiểm tự động; còn kiểm trực tiếp thao tác trong cửa sổ C++.** Kết quả kiểm toàn site không thay cho bằng chứng sản phẩm compute đáp ứng đặc tả.

## Sản phẩm phải đạt

Một ứng dụng C++20/SDL3/OpenGL compute có dashboard so CPU với GPU theo N. Bản cuối xử lý ít nhất một triệu phần tử thật, kiểm toàn bộ kết quả, cho chạy/hủy phép đo và đổi N. Dữ liệu đầu vào, output, lỗi và phạm vi của từng số đo phải đọc được trong cửa sổ; không chỉ có các cột không nhãn và một title dài.

Giữ ba phép toán Add, AXPY và Difference trên `Vec4` 16 byte. Preset 1.000.003 phần tử có 3.907 workgroup 256 lane, trong đó 189 lane không được đọc/ghi phần tử ngoài mảng. Đây là một bài thí nghiệm compute, không đổi thành particle scene hoặc ép thêm camera 3D.

## Phát hiện ở bản trước khi xây lại

Bảng này ghi nhận source tại HEAD `1694a1eb554e0147a9d6a33afbbcb11cd456288e`, không mô tả nhầm các file mới đang biên tập trong worktree.

| Yêu cầu | Bằng chứng từ bản tại HEAD nêu trên | Hướng sửa |
| --- | --- | --- |
| CPU vs GPU, timing theo N | `main.cpp` chỉ thu GPU milliseconds và median. Không có khoảng đo CPU kernel, bảng theo N hoặc phép đo end-to-end | Thêm CPU baseline, GPU kernel và end-to-end có nhãn/ranh giới riêng; giữ cả kết quả GPU không thắng |
| Cùng workload trong một lượt đo | Các phím N/operation/scalar/reset không hủy hoặc khóa `benchmarkActive`; chín mẫu có thể đến từ nhiều cấu hình | Chụp cấu hình/seed ở đầu job, gắn generation với mẫu; đổi mô hình hủy job cũ |
| Query có vòng đời rõ | `execute` kiểm availability một lần rồi trả; lần gọi sau dùng lại cùng query ID | Giữ pending query cho tới khi có kết quả hoặc hủy; không ghi đè mẫu chưa đọc |
| Warm-up và độ phân tán | Warm-up dựa vào lượt tính trước benchmark; chỉ báo median của chín GPU mẫu | Warm-up riêng cho mỗi case, lưu raw samples cùng min/median/max; không trộn warm-up với mẫu đo |
| Dashboard trực quan | Cửa sổ chỉ vẽ 64 cột thành phần X qua `tanh`; số đo và controls chủ yếu ở title | Dựng panel dữ liệu, trục/đơn vị, bảng kết quả và inspector A/B/CPU/GPU; đọc từ output thật |
| Tính toán kích thước an toàn | `makeDispatchPlan(N, 0)` có thể trừ unsigned dưới 0; byte count nhân trước khi kiểm giới hạn | Chặn input/overflow trước phép nhân, cast hoặc cấp phát; báo rõ giới hạn phần cứng và ngân sách ứng dụng |
| Reference và tolerance đáng tin | `computeCpu` dùng kích thước nhỏ hơn của A/B; tolerance không có finite/non-negative guard | Không âm thầm cắt input lệch size; kiểm tolerance, scalar và operation; dùng fixture độc lập có đáp án tính tay |
| Giữ ứng dụng phản hồi | Đọc shader và cấp phát không có ngân sách rõ; readback xảy ra ngay trong lời gọi dispatch | Tách prepare/submit/poll/readback/validate thành công việc hữu hạn; không busy-wait và không gọi GPU từ CTest |
| GPU correctness đủ mạnh | CPU tests chỉ kiểm mô hình CPU; chưa có chế độ native verification hữu hạn | Thêm `--verify` dùng driver thật: odd N, sentinel/canary, ba operation, input không bị ghi, sai số, lỗi shader và cleanup |
| Canvas phục vụ câu hỏi học tập | Có mode/timeline mô hình; tests hiện chủ yếu gọi cùng helper và kiểm từ khóa | Tách model/controller/render/readout; kiểm state/pointer/lifecycle; nói rõ timeline mô hình không phải số đo GPU |

Nguồn của các phát hiện: `source-template/src/main.cpp`, `include/vector_compute_engine.hpp`, `include/vector_compute_math.hpp`, `tests/tests.cpp`, các bài 08–09 và Canvas ở bản trước khi xây lại. Đây là các thiếu sót nhìn thấy trong source cũ; chưa dùng chúng để suy ra tốc độ hay mức tiêu thụ bộ nhớ trên máy người học.

Khronos quy định việc dùng lại query object sẽ bỏ kết quả query trước đó. Vì vậy availability gate phải đi cùng state giữ mẫu chưa hoàn tất, không chỉ xuất hiện như một dòng kiểm tra: [glGetQueryObject](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glGetQueryObject.xml). Barrier cho buffer readback và việc chờ công việc GPU hoàn tất được giải thích riêng: [glMemoryBarrier](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glMemoryBarrier.xml), [glClientWaitSync](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glClientWaitSync.xml).

## Hướng tổ chức bản xây lại

- Native: tách kiểu/workload, dispatch/capability, validation, statistics/job state, GL loader/program/buffers, application/input, dashboard và verification. Mỗi file nằm trong budget hiện có; không gom toàn bộ job/UI vào `main.cpp`.
- Một job giữ cấu hình cố định. Kết quả chỉ được công bố sau khi đúng generation, đã đọc đủ output và validation đạt; timeout/cancel không được biến thành kết quả hoàn tất.
- Số đo ghi rõ đơn vị, build configuration, N/operation/scalar/seed, warm-up và số mẫu. Không gọi enqueue time hay FPS là GPU kernel time. Nếu công việc CPU được chia batch, công bố cách cộng khoảng đo và tách thời gian chờ UI khỏi thời gian kernel.
- Renderer/font scaffold được cung cấp và chỉ rõ nơi gọi; compute wrapper, dispatch, barrier, reference và phép kiểm là phần người học tự viết. Canvas chỉ minh họa, không thay app native.
- Đã triển khai 11 mốc: CPU calculator nhìn thấy được → capability → SSBO → một workgroup → tail của N lớn → đồng bộ/readback → validation → ranh giới timing → benchmark nhiều N → inspector/điều khiển → verification và bản hoàn chỉnh. Số bài theo nội dung, không hạ sản phẩm để giữ số bài cũ.

## Cổng nghiệm thu cần có bằng chứng

1. Starter, mọi checkpoint, final và CTest build ở Debug/Release; SDL 3.4.8/CMake hiện tại được giữ nguyên.
2. GPU thật xử lý toàn bộ preset ít nhất một triệu phần tử; không dùng checksum vài mẫu thay validation toàn output.
3. Fixture số 0, số âm, đáp án tính tay, N ngắn/không chia hết local size, canary và input preservation. Công bố sai số tuyệt đối/tương đối, NaN/Inf và first mismatch.
4. Đo CPU/GPU kernel và end-to-end trên cùng dữ liệu; warm-up, raw samples, median/độ phân tán; không assert một bên luôn nhanh hơn.
5. Trigger/change N/preset, pause/cancel/reset đúng nghĩa; không trộn mẫu sau khi đổi cấu hình. Kiểm desktop riêng với build/unit/GPU verification.
6. Bài học có khung chạy được, từng thay đổi nối vào app, source checkpoint khớp code block, ví dụ lỗi hữu hạn và ZIP tự chứa.
7. Canvas có câu hỏi rõ, controls theo bài, pointer ownership/cancel, keyboard, DPR, reduced-motion, reset/pause và dispose; không trình bày timing mô hình như benchmark thật.
8. Build web, route/source/glossary/download, kiểm browser và Git hygiene. Không đưa output sinh hoặc thư viện vào Git, không tự mở server hay push/deploy.

Chỉ đối chiếu từng mục với bằng chứng thực thi bên dưới, không suy ra đã đạt từ nhãn “đã phát hành” hoặc test kiểm từ khóa. Báo cáo không sửa hoặc thay thế yêu cầu của specification.

## Trạng thái triển khai hiện tại

### Native và giáo trình

Đã chia source thành các phần toán/benchmark, program reflection, compute engine, worker, application, software dashboard và verification; `main.cpp` chỉ giữ đọc tham số chạy và scope cleanup. Mỗi file nằm trong budget hiện có.

Benchmark dùng ba N: 256, 65.537 và 1.000.003. Mỗi case có hai lượt warm-up và chín mẫu đo, lưu riêng CPU/kernel/end-to-end cùng min/median/max. Job chụp operation/scalar/seed theo giá trị, giữ query pending đến lúc đọc xong, có deadline và hủy; kết quả chỉ được công bố khi đủ mẫu và validation đạt. Inspector đọc x/y/z/w từ output đã công bố, phân biệt cấu hình đang chọn với cấu hình đã đo.

GPU kernel time chỉ bao dispatch. End-to-end bao upload, dispatch, đồng bộ và readback; gồm độ hạt của fence polling, không gồm tạo input/cấp phát ban đầu, CPU reference, validation hoặc UI. Phạm vi này được giải thích trong bài học và README; không chọn số đo để chứng minh GPU luôn thắng. Cleanup bỏ binding program trước khi xóa để không giữ reference của program đang dùng: [glDeleteProgram](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDeleteProgram.xml).

Đã biên tập 11 bài, metadata, code guide và README theo source mới. Người học bắt đầu từ CPU preview 256 phần tử rồi nối SSBO/dispatch/tail/readback/validation/timing vào ứng dụng chạy được. Mỗi bài có ít nhất ba bước giải thích thay đổi và ba code block có tên, thí nghiệm quan sát, điều kiện hoàn thành và source checkpoint đầy đủ. Trích đoạn C++/GLSL khớp token liên tiếp trong đúng checkpoint, không chỉ là subsequence lỏng. Bài cuối hướng dẫn build Debug/Release, CTest và `--verify`.

### Canvas

Đã thay bản mô hình cũ bằng các module model/controller/render/scopes và lazy controls/readout. Canvas minh họa workgroup/tail, capability, validation, bốn thành phần vector và phạm vi ba đồng hồ. Không tạo số milliseconds giả, không gọi kết quả JavaScript là GPU readback hoặc giả vờ kiểm giới hạn GPU của trình duyệt.

Controller giới hạn một pointer owner, chọn đúng ô theo cả hai tọa độ, giải phóng capture khi cancel/reset/blur/dispose và dừng animation hữu hạn. Reduced motion giữ chế độ bước thủ công. Controls có accessible name ổn định và chưa nhận thao tác trước hydration để không làm mất lựa chọn đầu tiên khi chuyển bài.

### Kết quả kiểm đã thực thi

| Phần kiểm | Kết quả và phạm vi |
| --- | --- |
| Build native | Starter, 11 checkpoint, final và tests build thành công ở cả Debug/Release; C++20, SDL 3.4.8, Visual Studio 2022/MSVC 19.33 |
| CPU tests | 53 phép kiểm đạt ở mỗi cấu hình; runner đếm lỗi và trả mã thoát thật, không phụ thuộc NDEBUG |
| GPU thật | 120 phép kiểm đạt ở mỗi cấu hình trên RTX 3050 Laptop/OpenGL 4.3.0 NVIDIA 546.30; sáu N từ 1 đến 1.000.003, ba operation, toàn bộ output, fixture độc lập, guard/canary, input preservation, interface lỗi và last-good program |
| Worker/benchmark thật | 55 phép kiểm đạt ở mỗi cấu hình; ba N với 33 lượt warm-up/đo, cấu hình bất biến, raw samples hữu hạn, spread có thứ tự, kết quả N lớn và cancel không công bố dữ liệu thiếu hoặc generation cũ |
| Chạy từng mốc | 26 lượt `--smoke` đạt: starter, mọi checkpoint và final ở Debug/Release; mỗi chương trình tự đóng sau số frame hữu hạn |
| Dashboard | Đã chạy benchmark và kiểm ảnh xuất từ chính SDL framebuffer bằng `--snapshot`; đủ ba hàng N và 33/33 lượt, số đo chính cao 14 px, inspector bốn thành phần và trạng thái PASS. Đây không phải kiểm thao tác bàn phím hoặc ảnh chụp cửa sổ qua hệ điều hành |
| Production và nội dung | Build thành công; **293/293** kiểm HTML/source contract đạt, 0 failed/skipped/cancelled; lượt cuối khoảng 133,9 giây |
| Canvas math | **903/903** kiểm toàn bộ Canvas đạt với hai worker, 0 skipped/cancelled; lượt cuối khoảng 44,9 giây, trong giới hạn 60 giây không đổi; gồm 16 kiểm riêng P37 |
| Browser P37 | Ba test Chrome authored đạt: grid/pointer, timing/reduced motion, inspector/error probes/source/progress qua reload; DPR 1,5, không page/console/HTTP error; source JSON chỉ tải P37 |
| Dung lượng và source | Chunk gốc Canvas P37 4.842 byte; toàn bộ 67 ZIP khớp từng byte; TypeScript, architecture budgets và Git hygiene đạt |

Browser QA dùng artifact production và request routing trong context kiểm thử riêng, không mở dev/HTTP server hoặc profile cá nhân. Probe localhost không tìm thấy server đang bật. Kết quả browser không chứng nhận dev server hoặc mọi thiết bị/GPU.

Không thay `tests/course-content.cases.mjs`, `tests/source-contract.cases.mjs`, `tests/site-platform.cases.mjs`, `scripts/run-test-suite.mjs` hoặc `scripts/process-supervisor.mjs`; đã đối chiếu với HEAD. Không giảm fixture, bỏ test hoặc nới giới hạn chung để đạt kết quả trên. Một lượt Canvas math trước đó chạm timeout khi trùng lúc biên dịch native; supervisor đã dọn tiến trình, lượt kiểm cuối chạy tuần tự và đạt với cùng giới hạn 60 giây.

Native batch có deadline tổng 240 giây, build stage 90 giây/tối đa hai compiler, GPU verification 30 giây và CTest 20 giây. Các lượt smoke/snapshot cũng có watchdog và cleanup độc lập. Bằng chứng local ở `.validation/p37-native-results.json`, `.validation/p37-checkpoint-smokes.json`, `.validation/p37-final-qa-results.json`, `.validation/p37-final-site-summary.json` và `.validation/p37-browser-results.json`; đây là output ngoài Git, không phải nguồn authored.

### Phần chưa nghiệm thu trực tiếp

Chưa xác nhận bằng thao tác trong cửa sổ C++: phím B chạy benchmark, đổi N/operation/scalar, inspector, hủy bằng Esc, resize trực tiếp và high-DPI của native window. Quyền điều khiển cửa sổ qua Computer Use đã hết thời gian chờ; không có input được gửi. Đã hỏi người dùng chọn cho phép kiểm lại hoặc tự kiểm, chưa coi lựa chọn mặc định là đồng ý. Không thay bằng một đường điều khiển Windows khác để bỏ qua quyền.

Các kiểm GPU/worker và ảnh framebuffer ở trên không thay cho phần kiểm tương tác còn thiếu. Chưa chạy lại toàn bộ `npm test`, lint hoặc suite MDX development toàn khóa học; không dùng kết quả production để tuyên bố các suite đó đã chạy.

Không stage, commit, push, deploy hoặc tự mở/restart dev server. Source JSON, snapshot, ZIP, build, cache và log vẫn nằm ngoài Git.
