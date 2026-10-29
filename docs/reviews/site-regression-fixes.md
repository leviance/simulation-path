# Rà soát lỗi website sau Project 35

Ngày kiểm: 29/10/2026. Phạm vi: các lỗi hồi quy trong báo cáo Project 35, kiểm tra tiếp toàn site và giữ nguyên yêu cầu của đặc tả v4.

## Kết quả hiện tại

Build production thành công với hard timeout 240 giây không đổi. Suite rendered HTML chạy hết **287 kiểm tra trong 228,8 giây: 285 đạt, 2 chưa đạt**, không bị timeout. Đây chưa phải kết quả 100%.

Hai case còn lại kiểm tra cách trình bày C++, không phải lỗi chạy trang:

- `teaching source favors explicit control flow over compressed expressions`: quy tắc cấm biểu thức `?:`; quét theo regex của test tìm thấy 103 chỗ khớp trong 39 file, cần đọc từng chỗ trước khi biên tập. Case dừng tại `project-24-collision-tank/source-template/include/lab.hpp`.
- `C++ lessons use four-space indentation and complete source is documented`: dừng tại file thiếu comment giải thích `project-23-integrator-race/source-template/include/presentation.hpp`. Quét bổ sung theo các điều kiện của case tìm thấy 19 file thiếu line comment, 15 file thiếu khoảng cách giữa các khối và 11 entry point không có comment lifecycle theo mẫu. Các nhóm có thể chồng nhau; với entry point ủy quyền cho `Application`, cần giải thích đúng nơi quản lý SDL/cleanup, không chèn comment sai chỉ để qua regex.

Chưa sửa hoặc bỏ qua hai quy tắc này để làm kết quả xanh. Việc mở rộng biên tập source C++ và các đoạn mã bài học liên quan đang chờ người dùng xác nhận phạm vi.

## Dung lượng trên bản build đã kiểm

| Thành phần                  | Trước sửa (byte) | Sau sửa (byte) | Budget không đổi |
| --------------------------- | ---------------: | -------------: | ---------------: |
| Response bài 03 Project 26  |          563.094 |        290.285 |        < 307.200 |
| Chunk gốc Canvas Project 24 |           35.605 |         13.610 |         < 24.576 |
| Chunk gốc Canvas Project 25 |           29.650 |         10.316 |         < 24.576 |
| Chunk gốc Canvas Project 26 |           25.235 |         10.184 |         < 24.576 |

Số liệu chunk là từng file gốc, không phải tổng JavaScript của một trang. Controls/readout được tách thành các chunk riêng, mỗi file đã đo đều dưới 24 KiB. Không giảm số vật thể, thay solver hoặc bỏ chức năng để đạt budget.

## Các lỗi đã xử lý

- **Project 20:** clean mode có trạng thái văn bản ngay trong HTML, gồm pause, góc quay, khoảng cách camera và kiểu nội suy.
- **Project 24–26:** tách controls/readout bằng lazy import và Suspense; có trạng thái tải bằng văn bản. Giữ nguyên code physics, input và lifecycle.
- **Code và công thức:** giữ nguyên HTML One Dark/KaTeX, MathML, annotation và thụt dòng. Compiler gom thẻ lặp vào dictionary; client boundary dựng lại đúng HTML trong SSR lẫn hydration. Không tải Shiki/KaTeX runtime xuống trình duyệt. Đây không phải cơ chế chấp nhận HTML tùy ý từ người dùng.
- **Diff cuối bài:** vẫn được tạo từ checkpoint thật, nhưng chỉ tô màu khi mở tên tệp; không gửi sẵn cây tô màu lớn cho mọi diff.
- **Project 11:** bổ sung lập luận hai tam giác đồng dạng. Test depth guard kiểm ba nhánh và `return` trong checkpoint thực tế, thay vì đòi một dòng gọi hàm phải được lặp lại trong bài đang đọc.
- **Project 31 và 34:** làm rõ thứ tự các bước, đánh số thí nghiệm và hướng dẫn hoàn tác. Project 31 có đủ lệnh build/CTest Debug và Release.
- **Project 34:** entry contract dùng `ViewerScene`/`ViewerState`, đúng công cụ OBJ hiện tại.
- **Project 15 và 18:** kiểm source JSON thực sự được phát hành, hash, danh sách tệp và byte nguồn; không còn đòi source nằm trong client JS.
- **Validation lesson:** lấy bài cuối từ catalog của cả 67 project, không dùng bảng số bài cố định đã lỗi thời ở Project 16.

## Độ tin cậy của kiểm thử

- Development pipeline đã compile **564/564 bài**, khoảng 26,7 giây ở lượt cuối thay đổi compiler. Test middleware tắt filesystem watcher vì chỉ transform URL cụ thể; cấu hình `npm run dev` không bị thay đổi.
- **69 kiểm thử chuyên biệt** cho static markup, source reader, cache, texture, collision, spring và chaos đạt; hai kiểm tra cấu trúc bài học/lệnh validation cũng đạt.
- Toàn bộ **881/881 test toán Canvas** đạt trong khoảng **50,2 giây** với hai worker, dưới timeout 60 giây không đổi. Lượt dùng mức song song mặc định trước đó chạm giới hạn và đã bị supervisor dọn; không tính lượt đó là đạt.
- **98/98 test tooling** đạt trong khoảng **11,5 giây**, gồm hồi quy cache in-flight, giới hạn worker và an toàn dọn fixture Git. Lượt `fast` trong sandbox dừng vì hai fixture không được ghi Git HEAD tạm; đã xin quyền và chạy riêng toàn bộ tooling thành công, không bỏ hai test. Không tuyên bố toàn bộ lệnh `fast` trong sandbox đã chạy xong một mạch.
- TypeScript, format, architecture budgets, generated-course check và kiểm tra Git index đạt. Toàn bộ **67 ZIP** khớp source qua kiểm tra riêng có timeout 120 giây. Hai file lệch Prettier (`course/projects/p28/learning.ts` và `tests/projects-35-tooling.cases.mjs`) chỉ được sửa cách xuống dòng/thụt dòng, không đổi dữ liệu hoặc logic.
- **Sáu test Chrome authored** đạt trên output production: bốn test hồi quy website/Canvas/source và hai test Project 35. Không có browser error; source reader chỉ yêu cầu JSON của project đang kiểm. Test tương tác chờ Canvas vẽ frame đầu, không nhầm readout SSR với trạng thái đã hydrate. Browser dùng request routing tới assets/handler production, không khởi động HTTP server hay dùng profile cá nhân.
- Cache route giữ tối đa 64 response trong RAM, có disk tier riêng cho từng lần chạy dưới `.validation`. Không tái sử dụng cache giữa các bản build. Unit tests kiểm eviction, byte response, chạy đồng thời, retry và cách ly từng lần chạy.
- Kiểm tra HTML, liên kết, dung lượng và source contract vẫn đi qua handler production thật; response chỉ được dùng lại trong cùng tiến trình test. Không dùng fixture HTML thay website thật.
- Website build giữ giới hạn 240 giây; rendered suite dùng giới hạn chuẩn sẵn có 300 giây. Các lượt chạm giới hạn trước đó đã bị supervisor dọn, không được tính là đạt.

## Phạm vi bàn giao

Không thêm sửa đổi source C++ trong đợt này; giữ nguyên các thay đổi Project 35 đã có trước lượt rà soát. Không tự mở/restart dev server, không publish, stage, commit hoặc push repository dự án. Git chỉ ghi vào repository fixture tạm khi kiểm guard; đường dẫn dọn fixture được kiểm tra để từ chối workspace thật. Generated output, ZIP, source JSON, build và cache kiểm thử vẫn nằm ngoài Git. Cần hoàn tất hai nhóm biên tập C++ nêu trên trước khi gọi toàn bộ suite đạt 100%.
