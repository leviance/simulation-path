# Project 54 — Trạng thái xây dựng lại

**Chưa nghiệm thu.** Người dùng đã xem hình đầu ra và đánh giá đồ họa chưa đạt: không hiểu vật thể đang hiển thị có ý nghĩa gì. Kết quả build hoặc kiểm số không phủ nhận đánh giá này.

Nguồn chuẩn: [Product Specification v4 — Project 54](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Giữ nguyên yêu cầu volume 128³, perspective, ray–box, texture 3D, MIP/average/alpha, camera và so chất lượng–thời gian. Không hạ đặc tả để hợp thức hóa hình hiện có.

## Điểm chưa đạt của sản phẩm

- Dataset mặc định là một vòng và hai dải mật độ xoắn tổng hợp. Nó được dùng để thử shader nhưng chưa có bối cảnh quan sát đủ rõ để làm sản phẩm đầu ra.
- Màu xanh/cam được gán theo scalar và pha trộn dọc tia; không phải nhiệt độ hay vận tốc. Cảnh chưa giúp người xem tự nhận ra điều này.
- Camera, tia được chọn, biểu đồ và hình 3D chưa kể được một câu chuyện trực quan thống nhất. Có biểu đồ không đồng nghĩa người học hiểu đang đo điều gì.
- Chưa có ảnh C++ mới được người dùng chấp nhận. Ảnh `.validation/p54-native-alpha-final.bmp` là bản đã bị đánh giá chưa đạt, không phải bằng chứng nghiệm thu.

Đề xuất đang chờ duyệt: một đám mây thể tích có lớp loãng, vùng đặc và khoảng rỗng nhận biết được; chú giải rõ; cùng góc nhìn để so MIP/average/alpha. Chưa triển khai đề xuất này. Không tự thêm solver chất lưu, chuyển động mây hoặc multiple scattering/quang thực, vì sẽ mở rộng đáng kể phạm vi học volume rendering.

`course/roadmap-revisions.ts` giữ ghi chú chưa nghiệm thu. Không commit, push hoặc publish trong lượt này. Bản cũ có dự phòng tại `.validation/p54-retired-20261118-rebuild/`; các thay đổi P53 có sẵn được giữ nguyên.

## Công việc đã khép lại sau phản hồi

- Đồng bộ 34 đoạn C++/GLSL theo marker của source thật; khôi phục phần ghép chương trình trong Bài 3 và Bài 5.
- Sửa lỗi bộ đồng bộ có thể ăn mất heading/prose phía sau một code block rỗng. Test tái hiện lỗi trước khi sửa; kiểm cả LF/CRLF và block rỗng/có mã.
- Kiểm read-only marker P47–P54: không lesson nào khác bị thay đổi.
- Thêm compile đủ 10 bài bằng cấu hình MDX/One Dark/KaTeX thực của repository. Không chỉ kiểm bằng regex.
- Runner C++ vẫn hoạt động trong Release, trả mã lỗi cho CTest và không dùng `assert` làm cổng kiểm chứng.

## Bằng chứng hiện tại và giới hạn

| Phần                            | Bằng chứng                                                                                                               | Giới hạn                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Toán, source và công cụ         | 20/20 tests qua; 34 excerpt đúng source; 10 MDX compile qua                                                              | Không chứng minh chất lượng đồ họa                                  |
| C++ pure tests                  | Debug/Release CTest qua; 2.359.451 checks, 0 failures                                                                    | Không mở window, không kiểm chuột/phím OS                           |
| ZIP hiện tại                    | 243 file, 347.502 byte; mọi member so byte với source                                                                    | Bản WIP, chưa chốt sản phẩm; chưa build lại ZIP giải nén này        |
| Kiến trúc/Git                   | Budget và hygiene qua; không stage; output/build/ZIP nằm ngoài Git                                                       | Không phải chứng nhận toàn site                                     |
| Lượt kiểm trước phản hồi đồ họa | Starter + 10 checkpoint + final đã build Debug/Release; 24 smoke; GPU oracle 1.452 phép so, max raw error khoảng 0,00013 | Thuộc hình đã bị từ chối; không thay nghiệm thu đầu ra mới          |
| Web trước các sửa mới nhất      | Production build và 8 ca Chrome qua                                                                                      | Cần chạy lại sau khi đổi đồ họa và các sửa giao diện gần nhất       |
| Native input                    | Công cụ Computer Use hết thời gian chờ cấp quyền                                                                         | Chưa xác nhận thao tác chuột/phím qua Windows; không thử đường vòng |

Digest ZIP WIP: `c5e3823781287795aec8da4565619b06c635b233e23b3febda695a40caa41f6a`.

Lint riêng bốn file tooling vừa sửa chạm deadline 30 giây và đã bị supervisor dừng; không tính lượt này là PASS. Không khởi chạy lại suite dài trong lúc còn chờ duyệt hướng đồ họa.

## Kiểm toàn site chưa qua

Suite rendered HTML đầy đủ đã bị supervisor dừng ở deadline 180 giây; không được tính là PASS. Bảy ca đã được chạy riêng để lấy chẩn đoán hữu hạn, không nới quy tắc:

- Overview thiếu textual Canvas state: `particle-morph-studio` (P42).
- Entry chunk `charged-particle-chamber-lab` (P38) là 34.144 byte, vượt budget đang kiểm.
- Hai kiểm tra homepage/downloads không tìm được nội dung/nhóm mà assertion yêu cầu; chưa kết luận là lỗi sản phẩm hay assertion cũ.
- Bài `04-mask-tren-gpu.mdx` không có titled C++ block theo hợp đồng chung.
- Test runner P49 không khớp chữ ký mà kiểm chung yêu cầu; đây chưa phải bằng chứng CTest của P49 ngừng hoạt động trong Release.
- P42 `morph_app.hpp:13` thụt 10 dấu cách, không khớp quy tắc bốn dấu cách.

Lượt đầy đủ còn báo lỗi internal links và khả năng hiển thị P40/P41; do không hoàn thành toàn suite, chưa có báo cáo tổng số lỗi hoặc kết luận toàn site. Không sửa các nhóm ngoài P54 trong lượt này.

## Việc tiếp theo

1. Chốt cách trình bày đầu ra trước khi làm tiếp cảnh mới.
2. Làm C++ và Canvas nhất quán về dữ liệu, màu sắc và ý nghĩa phép chiếu; không dùng ảnh AI/ảnh dựng sẵn thay volume.
3. Gửi ảnh framebuffer C++ thật hoặc mở chương trình để người dùng xem lại đồ họa trước khi chốt học phần.
4. Cập nhật nội dung theo sản phẩm đã được chấp nhận, rồi kiểm lại native, web, checkpoint và ZIP riêng từng nhóm, với watchdog và build serial.

Giữ nguyên toàn bộ mục tiêu xây dựng lại Project 54. Các kiểm kỹ thuật đã qua không được dùng để đổi định nghĩa hoàn thành thành một demo dễ kiểm hơn nhưng không đáp ứng trải nghiệm yêu cầu.
