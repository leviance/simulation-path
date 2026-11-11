# Project 41 — Nghiệm thu Xưởng hình học 3D

Nguồn chuẩn: [Product Specification v4, Project 41](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md#project-41--xưởng-hình-học-3d-tạo-vỏ-ốc-dải-möbius-và-nút-thắt).

**Trạng thái: đã mở hướng dẫn; kiểm lại hình học, giáo trình và ZIP đạt, còn chờ kiểm kéo chuột native.** Giáo trình ở `content/geometry-workshop/`, metadata ở `course/projects/p41/` và C++ ở `examples/project-41-geometry-workshop/`. Phần VIII của Lộ trình mở thẳng chín bài, Canvas và ZIP của Xưởng hình học 3D.

## Bằng chứng theo yêu cầu

| Yêu cầu                                    | Bằng chứng đã kiểm                                                                                                                                                                                                                                                                                   | Giới hạn                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Dựng mặt từ công thức và quan sát bốn hình | Starter có cửa sổ, camera và sàn. Các checkpoint lần lượt thêm patch, ô lưới, torus, Möbius, vỏ ốc và knot. Cả 11 app target (starter, 9 checkpoint, final) đã build Debug/Release và qua smoke bằng context OpenGL ẩn.                                                                              | Lượt ẩn kiểm renderer và input có kịch bản, không thay việc dùng con trỏ thật.                                                       |
| Tangent, winding, mép và frame             | CTest Debug/Release kiểm mốc tọa độ/bounds/normal torus, seam đảo của Möbius, frame liên tục, index và winding. Trên web, các kiểm độc lập tính mốc, sai phân, khép frame, đổi UV, độ sâu và index OBJ.                                                                                              | Seam trùng vị trí không có nghĩa đã hàn index. Vỏ ốc mở hai đầu, không có bề dày thành; các giới hạn tham số không loại mọi tự giao. |
| Đổi tham số và xem nhanh                   | Mã native giữ preview tối đa 65×17 mẫu, lưới đầy đủ tiến tối đa tám hàng mỗi batch. Kịch bản native kiểm camera không dựng lại, đổi yêu cầu, input lỗi và cancel giữ last-good; sự kiện SDL mô phỏng kiểm panel, kéo, buông và mất focus.                                                            | Chưa kiểm OS capture bằng chuột thật; không có cam kết thời gian mỗi frame.                                                          |
| Ít nhất 65.536 đỉnh thật                   | Bản Release chạy OpenGL 3.3 trên NVIDIA RTX 3050 Laptop, driver 546.30: knot 256×256 ô báo `vertices=66049 triangles=131072 payloadBytes=4479020`. Renderer đối chiếu kích thước buffer trước khi nhận mesh.                                                                                         | Payload là đỉnh và index của một mesh, không phải tổng RAM/VRAM.                                                                     |
| Xuất và kiểm lại mesh                      | Release chạy từ ZIP đã giải nén báo `OBJ FILE ROUND-TRIP PASS` cho chính mesh 256×256. Bộ đọc kiểm thuộc tính và index trước khi đổi tên file tạm. CTest thử cả fixture tam giác viết riêng, chỉ số 0, vượt phạm vi và dữ liệu không hữu hạn.                                                        | Chỉ kiểm tập con OBJ mà xưởng xuất; không có tangent trong OBJ và không phải trình nhập OBJ đa dụng.                                 |
| Giáo trình theo từng checkpoint            | 9 bài biên dịch qua pipeline MDX của site; 25 block C++/GLSL khớp một đoạn liên tiếp trong đúng snapshot. Kiểm tiêu đề/thứ tự, link bài kế, hướng dẫn source, mốc Canvas và anchor thuật ngữ.                                                                                                        | Tiêu đề và mốc dựng theo nội dung, không dùng checkpoint trống thay bài.                                                             |
| Canvas và giao diện                        | 12 test toán/session/raster đạt. Build site chỉ với Project 41 đạt, 3 nhóm render kiểm trang chủ, Lộ trình, overview, cả 9 bài, Downloads, search, glossary và mã nguồn. Chrome headless qua 6 nhóm tương tác: bàn phím/DPR/reduced motion, Möbius, knot, preview/cancel, OBJ, orbit/release/resize. | Canvas chiếu trực giao và giới hạn 96×40 ô; không chứng minh GPU hay OS capture native. Lượt kiểm tích hợp ghi riêng bên dưới.       |
| ZIP tự chứa                                | Generator tạo 304 output từ nguồn authored. Giải nén và so từng byte với source; trên bản giải nén mới, Visual Studio 2022 build starter, checkpoint 5, final và tests ở Release, CTest 1/1 đạt. Chạy hidden final, giữ mốc GPU và OBJ nêu trên.                                                     | Lượt này dùng package SDL 3.4.8 có sẵn; FetchContent khóa cùng phiên bản. Chưa thử tải lại SDL trên máy sạch.                        |

Fixture native đầu tiên: `.validation/p41-course-LWD06K/`. Bản web cô lập: `.validation/p41-site-RHKwED/`. Trên bản tích hợp toàn khóa, Chrome headless kiểm mở cả Project 40 và Project 41 từ Lộ trình, giữ tiến độ Project 40 và chỉ làm mới các bài Project 41 cũ. Sáu nhóm thao tác Canvas cũng qua trên bản này. Không khởi động dev server.

Bản production toàn khóa build được. Lượt quét render toàn site dừng ở giới hạn 289 giây; không tính lượt đó là đạt. Các nhóm kiểm route Project 40–42, block code từ checkpoint, quy tắc trình bày source và giới hạn kiến trúc đã qua ở lượt kiểm riêng.

Gói phát hành trong `public/downloads/` khớp từng byte của 261 file. Visual Studio 2022 build starter, cả chín checkpoint và final từ ZIP đã giải nén ở `.validation/p41-catalog-zip-v8F2uT/`. CTest Debug/Release đạt 1/1 mỗi cấu hình; chạy final với OpenGL ẩn vẫn đạt mốc 66.049 đỉnh và đọc lại đúng OBJ. Build dùng SDL 3.4.8 có sẵn và quyền đọc cấu hình Windows SDK. ZIP, BMP/PNG, OBJ và executable nằm ngoài Git.

## Lượt kiểm lại ngày 2026-11-11

- Bộ kiểm toán, session và raster của Canvas đạt 12/12. CTest C++ đạt 1/1 ở Release và 1/1 ở Debug, dùng bản build từ ZIP đã giải nén.
- Cả chín bài biên dịch MDX thành công. Đối chiếu lại 25 đoạn C++/GLSL với đúng checkpoint, danh sách tệp hướng dẫn, liên kết bài tiếp theo và chín chế độ Canvas.
- Giải nén lại riêng ZIP Project 41, so byte của cả 261 tệp với source hiện tại và đầu vào của bản native đã build: khớp hoàn toàn. Digest trong manifest là `d88f29e2ffaaff831ece0a59a6c80388b35e6fb82d2269cfc39f5771319beb4e`.
- Đã mở cửa sổ native thật và quan sát torus knot cùng vỏ ốc có ánh sáng, lưới sàn và bảng tham số. Knot báo 66.049 đỉnh, 131.072 tam giác và 4.479.020 byte payload; phiên chạy hữu hạn kết thúc với mã 0.
- Công cụ hiện đã truy cập được cửa sổ, nhưng các lệnh bàn phím và kéo tham số bị dừng với thông báo `user input was detected in this window; call get_window_state before continuing`. Sau khi đọc lại trạng thái, cảnh báo vẫn lặp lại. Không tính các lệnh bị chặn là thao tác đã thực hiện, không coi ảnh chụp hoặc lần mở cửa sổ là bằng chứng kéo/buông hay mouse capture đạt.
- Không chạy lại build hoặc bộ test toàn site. Các phiên native giới hạn 120 giây, có process supervisor và đường hủy; phiên bị ngắt để tránh tranh chuột/bàn phím không được tính là một ca PASS.

## Kiểm trực tiếp còn chờ

Chạy bản đã build từ ZIP hoặc tự build theo README, rồi mở cửa sổ tối đa hai phút:

```powershell
.\build\Release\project_41_final.exe --preset knot --resolution 256 --seconds 120
```

1. Chọn torus, vỏ ốc, Möbius và knot. Đổi từng tham số; xác nhận ảnh hưởng đúng lên hình, không chỉ thay góc nhìn. Dùng W/U/N/S để đọc seam; Möbius phải nhìn được từ hai phía.
2. Giữ thanh Growth ở vỏ ốc và kéo ra ngoài cửa sổ rồi buông. Thử lại bằng cách đổi focus khi đang giữ. Khi quay lại, rê chuột không được tiếp tục thay giá trị.
3. Giữ và buông để thấy preview chuyển sang lưới đầy đủ. Trong lúc làm mịn, xoay/pan/zoom, đổi preset hoặc nhấn X. Đối chiếu tên hình đang vẽ, số đỉnh và yêu cầu đang chờ.
4. Reset và xuất OBJ sau khi dựng xong. Kiểm đường dẫn in ra terminal và giữ nguyên file của lần xuất trước.

## Bản Lennard–Jones trước đây

Catalog dùng slug `geometry-workshop` và revision nội dung 2. Tiến độ Lennard–Jones không đánh dấu nhầm các bài mới; các project khác không bị xóa tiến độ. Tài liệu, source, test và ZIP cũ được giữ trong bản sao local `.validation/retired-project-41-lennard-jones/`; source tracked cũ vẫn còn trong lịch sử Git. Project 42 đã được thay bằng học phần biến hình hạt. Các phiên bản cũ của Project 43–45 vẫn là mô phỏng phân tử; chúng dùng phần giải thích và source riêng của Project 43 cùng Glossary, không còn yêu cầu học Project 41–42 cũ.
