# Project 41 — Lennard–Jones Pair Lab

Project này xây một mô phỏng C++20/SDL3 cho hai nguyên tử tương tác bằng thế Lennard–Jones. Chỉ với một cặp hạt, bạn có thể nhìn rõ khoảng cách, thế năng, lực trên từng nguyên tử, động năng, tổng năng lượng, động lượng và tâm khối lượng. Đây là bước chuẩn bị trước khi chuyển sang mô phỏng động lực học phân tử nhiều hạt ở Project 42.

## Bạn sẽ học gì?

- Dùng hệ đơn vị rút gọn với `sigma = epsilon = mass = 1` trước khi gắn mô hình với đơn vị vật lý cụ thể.
- Đọc ba mốc của đường cong Lennard–Jones: `U(sigma)=0`, `r0=2^(1/6)sigma` và `U(r0)=-epsilon`.
- Đổi đạo hàm theo khoảng cách thành vector lực hút–đẩy dọc theo đường nối hai nguyên tử.
- Tạo hai lực bằng nhau, ngược chiều từ một lần tính tương tác của cặp.
- Cập nhật `position` và `velocity` bằng Velocity Verlet với bước thời gian cố định.
- Dùng độ lệch năng lượng, động lượng và độ trôi tâm khối lượng làm tiêu chí kiểm chứng.

## Cấu trúc gói source

- `starter/`: framebuffer SDL3 và hai nguyên tử tĩnh, chưa có công thức Lennard–Jones.
- `checkpoints/01` … `checkpoints/07`: mã nguồn sau từng bài học.
- `final/`: Lennard–Jones Pair Lab hoàn chỉnh, có chú thích và đầy đủ thao tác điều khiển.
- `tests/tests.cpp`: CTest thuần CPU, không tạo cửa sổ và không chạy vô hạn.
- `source-template/`: nguồn chuẩn dùng để sinh `starter`, các checkpoint và `final`.
- `include/lennard_jones_ui.hpp`: phần vẽ đồ thị độ dốc và trình bày báo cáo kiểm chứng, tách khỏi vòng lặp SDL trong `main.cpp`.

## Build bản hoàn chỉnh

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Muốn build cả bản khởi đầu lẫn từng checkpoint:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
```

Nếu CI đã cung cấp đúng SDL `3.4.8`:

```bash
cmake -S . -B build -DCOURSE_USE_INSTALLED_SDL3=ON
```

## Điều khiển trong bản hoàn chỉnh

- `Space`: chạy hoặc tạm dừng.
- `N`: tiến đúng một bước thời gian khi đang tạm dừng.
- `1`, `2`, `3`: chọn khoảng cách ban đầu ở vùng đẩy, đáy thế hoặc vùng hút.
- `[` / `]`: đổi bước thời gian qua bốn mức có sẵn; mỗi lần đổi sẽ chạy lại đúng điều kiện ban đầu để so sánh công bằng.
- `E`, `S`, `M`: đổi `epsilon`, `sigma` hoặc khối lượng.
- `V`: chạy bộ kiểm mô hình chuẩn (20.000 bước với thời gian đã chuẩn hóa), đồng thời đánh giá 1.000 bước từ điều kiện đầu đang chọn với đúng `dt` hiện tại. Terminal báo sai số lớn nhất của lần chạy này; `VALID` chỉ nói về bộ chuẩn.
- `R`: trả toàn bộ tham số về mặc định.
- Kéo nguyên tử màu đỏ: chọn hướng và khoảng cách mới; mô phỏng tự tạm dừng và xóa vận tốc cũ.
- `Esc`: thoát.

## Đọc kết quả đúng cách

Đường thế năng màu tím và đường `dU/dr` màu xanh được cắt theo chiều cao để dễ quan sát; các giá trị đưa vào mô phỏng vẫn được giữ nguyên. Đồ thị U/K/E cho thấy thế năng và động năng đổi qua lại, còn thanh trạng thái cho biết độ trôi của tâm khối lượng so với lúc bắt đầu.

Nếu khoảng cách quá nhỏ khiến phép tính không còn hữu hạn, `velocityVerletStep` từ chối trạng thái mới và giữ lại trạng thái hợp lệ cuối cùng. Cần nhớ rằng `U=0` tại `sigma` không có nghĩa lực bằng 0; lực chỉ bằng 0 tại `r0=2^(1/6)sigma`.

Bộ chuẩn PASS không bảo đảm mọi điều kiện đầu đều chính xác. Ở vùng đẩy mạnh (`r=0.82 sigma`, epsilon=2, sigma=0.8, mass=0.5), `dt=0.004` có thể tạo sai số trên 15% dù trạng thái vẫn hữu hạn. Đọc báo cáo sai số lớn nhất và giảm `dt`. Khi so độ hội tụ, giữ cùng thời lượng và không vượt ngân sách kiểm thử; không gỡ giới hạn bước hoặc chạy tới khi năng lượng “có vẻ ổn định”.
