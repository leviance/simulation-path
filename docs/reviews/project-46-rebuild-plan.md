# Project 46 — kế hoạch xây lại Hộp cát số

Ngày bắt đầu: 15/11/2026. Nguồn chuẩn: Project 46 và hợp đồng 0.9–0.10 trong [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

## Khoảng cách của bản đang phát hành

- Final mặc định 96×64, constructor còn chặn ở 256×256. Chưa chứng minh quy mô hàng trăm ô ở **cả hai chiều** của sản phẩm cuối.
- Không có speed control; vẽ từng ô bằng một draw call, toàn bộ thông tin dồn vào window title. Thiếu một nơi thao tác và đọc kết quả dễ quan sát ở viewport lớn.
- Fixtures nhỏ và moved mask đã có ích, nhưng hai lần gọi cùng thuật toán chỉ chứng minh tính lặp lại, không thay oracle về luật. Cần giữ các ca một bước có kết quả biết trước, thêm thử thứ tự quét và mốc lớn có số liệu cụ thể.
- Chưa có parser CLI/finite capture/benchmark cho nghiệm thu ứng dụng. Không dùng vòng chạy tương tác vô hạn làm tác vụ kiểm.

## Sản phẩm đích

Ứng dụng C++20/SDL 3.4.8 độc lập, không cần GPU compute. Bản cuối dùng lưới 512×320 (163.840 ô), cập nhật toàn lưới bằng luật tại chỗ. Cát rơi/trượt/đổi chỗ nước, nước giả rơi/lan ngang, tường đứng yên, biên ngoài đóng. Không gọi đây là nghiệm chất lưu hoặc thêm áp suất giả để làm hình đẹp.

Có paint/erase với nét liền và bán kính, cursor bàn phím, run/pause/step, speed, clear/reset, nhiều preset có seed được công bố, chế độ nhìn sạch/debug, inspector và thí nghiệm đổi chiều quét. Input và render không được âm thầm đổi luật. Pause vẫn cho vẽ/kiểm ô; reset tái tạo cùng preset/seed và trở về pause. Đổi màu không sinh hay xóa vật liệu.

Tách thời gian update, chuyển ô thành RGBA/upload và render submission. Không gọi CPU submission là GPU time. Mọi lượt đo có thời lượng/số bước giới hạn; warm-up và cùng input được ghi rõ. Lưới nhỏ/Canvas chỉ là bước học, không thay mốc 512×320.

## Chuỗi bài dự kiến

1. Vẽ lưới nhỏ bằng SDL3; phân biệt Cell, index và màu.
2. Biến chuột thành brush; letterbox/resize, nội suy và kết thúc nét.
3. Rơi thẳng một ô mỗi tick; swap và moved mask.
4. Trượt chéo, thứ tự quét và giới hạn đối xứng.
5. Nước giả và cát đổi chỗ với nước; bảo toàn từng loại.
6. Fixed tick, accumulator, speed và ngân sách bù bước.
7. Nâng lên 512×320; streaming texture, RGBA/pitch và cách đọc chi phí.
8. Hoàn thiện sandbox: preset/seed, bảng điều khiển, clear/reset, inspector, đổi scan order.
9. Kiểm chứng sản phẩm, benchmark hữu hạn, Debug/Release, mã đầy đủ và ZIP.

Số bài có thể điều chỉnh nếu việc biên tập cho thấy một bước cần tách hoặc gộp; không hạ sản phẩm để vừa con số này. Snippet lấy từ snapshot thật, bốn dấu cách, không dùng ternary để nén logic.

## Trình tự và bằng chứng

Nguồn mới được soạn ở `examples/drafts/falling-sand-workshop` trong lúc bản cũ vẫn hoạt động. Chỉ tích hợp catalog, lesson, Canvas và source chính thức khi chúng khớp nhau. Khi thay bản, bump content revision của riêng P46; giữ bản dự phòng local và xử lý URL bài cuối cũ rõ ràng.

- CPU: bounds/index, brush sát biên, một bước với oracle cụ thể, moved mask, đổi chỗ, từng vật liệu/tường qua nhiều tick, order-dependent fixture và fixed clock/speed/stall/NaN.
- Quy mô: 512×320 thực sự được cập nhật và vẽ; công bố ô cấp phát, ô đã xét, movable, swaps, seed, thứ tự quét và timings. Không lấy số trên UI thay số thực trong buffer.
- C++: build starter, từng checkpoint và final; CTest Debug/Release, kiểm nguồn giải nén từ ZIP.
- Web: đúng trình tự học, snippet liên tiếp, công thức, glossary, mode và source đầy đủ; Canvas pointer/keyboard/pause/reset/presets/speed, DPR/reduced-motion và cleanup.
- Công cụ: từng stage qua process supervisor, một heavy job mỗi lúc, hard timeout và dọn process tree. Không tự bật server hoặc commit/push.

Đây là kế hoạch triển khai, chưa phải hồ sơ nghiệm thu. Nguồn nháp hiện đã chuyển sang các thư mục chính thức; tiến độ và bằng chứng hiện tại ở [hồ sơ xây lại Project 46](project-46-rebuild-validation.md).
