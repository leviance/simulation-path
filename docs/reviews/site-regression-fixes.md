# Rà soát website và mã giảng dạy — mốc trước khi xây lại Project 37

Ngày kiểm: 2026-10-29. Phạm vi: hoàn tất hai nhóm biên tập C++ đã được người dùng duyệt, đồng bộ bài học/ZIP và xử lý hồi quy Project 36. Đặc tả v4 và các quy tắc kiểm tra được giữ nguyên.

## Kết quả

Bản production đã qua **290/290 kiểm tra HTML, nội dung và source contract**, 0 failure, 0 skipped/cancelled. Lượt có bằng chứng lưu trên đĩa chạy toàn bộ `tests/rendered-html.test.mjs` trong khoảng 182,5 giây, dưới watchdog 300 giây. Kết quả bao gồm route của 67 project đã phát hành và 566 bài, internal links, glossary, One Dark, source, download và budget response/chunk.

Production build vẫn dùng giới hạn 240 giây, prepare 120 giây. Một lượt `test:site` hoàn chỉnh trước đó đạt 289/290 và chỉ ra test runner Project 36 chưa theo hợp đồng entry point. Sau khi sửa runner, lượt build kế tiếp đã sinh artifact mới nhưng handle terminal không còn; đã xác nhận không còn process cũ rồi chạy lại riêng toàn bộ suite HTML trên artifact đó. Không báo kết quả mất handle là thành công, không build lại chỉ vì mất phần output.

## Biên tập C++ và bài học

- Đã thay **105 toán tử điều kiện trong 39 file** bằng control flow tường minh. Đây là số token `?`; 93 dòng khớp regex đơn dòng là một cách đếm khác, không phải số biểu thức đầy đủ.
- Tổng cộng biên tập 57 file source-template và bốn file test C++: tên biến rõ, comment có ý nghĩa, lifecycle đúng nơi quản lý tài nguyên, thụt 4 spaces và khoảng cách giữa các khối.
- Giữ nguyên công thức, thứ tự PRNG, seed, số vật thể, bước thời gian và ngưỡng correctness. Các nhánh đổi tham số, chọn renderer, chọn màu/nhãn và trả mã thoát không dùng phép viết nén chỉ để rút ngắn code.
- Đồng bộ **48 code block trong 33 bài** với đúng source checkpoint; chuẩn hóa phần thụt dòng của đoạn trích và bỏ khoảng trắng đầu block. Bổ sung giải thích cho biến chọn tham số, correction fraction, dt index, shader uniform và phạm vi timing.
- Project 36 đặt runner đếm/báo lỗi và mã thoát trong `tests/tests.cpp`; 55 phép kiểm vẫn ở `core_checks.hpp`, không phụ thuộc NDEBUG. Không thêm runner giả hoặc bỏ fixture để qua regex.
- Không sửa `tests/source-contract.cases.mjs`, `tests/site-platform.cases.mjs`, `scripts/run-test-suite.mjs` hoặc `scripts/process-supervisor.mjs`. Đã so byte/SHA-256 với HEAD, không chỉ kiểm tên test.

## Native verification

**Project 23–28 và 30–35:** build starter, mọi checkpoint, final và tests ở cả Debug/Release; CTest đạt đủ 24 cấu hình. Project 29 không đổi. Project 36 chỉ đổi test harness, đã rebuild riêng target tests và chạy đủ 55 CPU checks ở cả hai cấu hình, 0 failures.

**OpenGL thật ở Project 33–35:** `--verify` đạt ở Debug/Release. Project 33 so màu/pixel và diagnostics; Project 34 kiểm 24 lần switch, resize, ba mesh, transform feedback và cleanup; Project 35 kiểm bốn effect, 40 mẫu analytic, compile/link/interface failure, last-good recovery, key adapter và error overlay.

Máy kiểm: Windows x64, Visual Studio 2022/MSVC 19.33, SDL 3.4.8; GPU verification dùng NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 3.3.0 NVIDIA 546.30. Đây không phải chứng nhận mọi OS/GPU hoặc benchmark hiệu năng.

Mỗi batch native có deadline tổng 240 giây, tối đa hai compiler. P24 Debug stress fixture chạm watchdog kiểm cục bộ 20 giây ở lượt đầu; chạy riêng với watchdog 60 giây hoàn tất trong 23,7 giây, Release 3,9 giây. Không đổi fixture/ngưỡng, CMake, CI hoặc timeout website để xử lý việc này. Các process lỗi/timeout được supervisor dọn trước khi chạy tiếp.

## Canvas và download

Chunk gốc Project 36 giảm **29.412 → 10.112 byte** bằng lazy import controls/readout, dưới budget **24.576 byte không đổi**. Đây là kích thước file gốc, không phải tổng JavaScript của trang. Không bỏ math, controls, nội dung hoặc chức năng mô phỏng.

Ba test Chrome authored của Project 36 đạt trên artifact production: stepper, camera/pause/preset/reduced-motion, pointer ownership/cancel, DPR 1,5 và source reader. Không page error, console error hoặc HTTP error; source JSON chỉ lấy Project 36. Browser dùng production handler và assets qua request routing, không mở dev/HTTP server hoặc profile cá nhân.

Đã kiểm riêng toàn bộ **67 ZIP khớp từng byte** với source đóng gói. TypeScript, architecture budgets và Git hygiene đạt. Source JSON/ZIP/build/cache/ảnh vẫn là output ngoài Git.

## Giới hạn của bằng chứng

Đây là mốc nghiệm thu đợt sửa hồi quy, trước các thay đổi xây lại Project 37. Chưa chạy lại toàn bộ `npm test`, mọi Canvas math/tooling suite hoặc desktop interactions của cả khóa học. Kết quả 290/290 không có nghĩa cả 78 project đã đạt đặc tả, và không thay cho kiểm thủ công native còn thiếu trong báo cáo Project 36.

Không stage, commit, push, publish hoặc tự mở/restart dev server. Các log, summary, scope proof và native result trong `.validation/` không được thêm vào Git.
