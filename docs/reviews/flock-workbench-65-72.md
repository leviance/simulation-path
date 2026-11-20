# Từ đàn chim đến một giao diện lập trình được

Đối tượng để cả tám project điều khiển là **một đàn Boids của Project 28**, không phải tám mô phỏng trang trí khác nhau. Khóa học không nhằm xây một trình duyệt. Đặc tả v4 vẫn là nguồn chuẩn cho phạm vi và nghiệm thu.

| Project               | Việc người học làm được trước mắt                                             | Cách nhận ra kết quả không phải giả lập giao diện                                                     |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 65 · Control tự vẽ    | Dừng đàn, mở bán kính quanh chim vàng, chỉnh lực tách, bật/tắt hàng xóm.      | Đổi bán kính trong lúc Pause thay tập ID nhưng không đổi vị trí; ẩn lớp quan sát không đổi solver.    |
| 66 · Widget Tree      | Dịch, che, ẩn hoặc xóa một nhóm control khi cửa sổ vẫn chạy.                  | Child đi theo cha; release sau khi xóa không tác động vào ID cũ; Reset đàn không dựng lại cây.        |
| 67 · Box Layout       | Đổi khoảng cách hoặc ẩn Reset; các control dưới nó tự dời.                    | Cùng bounds mới cho cả vẽ lẫn hit-test; 1.000 frame không đổi hình học không có thêm lượt layout.     |
| 68 · TinyHTML         | Sửa thứ tự nhóm đàn trong `panel.html`, reload mà không biên dịch.            | Hai file thật sinh hai cây; file hỏng báo vị trí, bàn quan sát đang dùng không mất.                   |
| 69 · TinyCSS          | Cùng panel chuyển giữa hai giao diện bằng `style.css`.                        | Inspector chỉ ra rule thắng; đổi màu không đo layout, đổi padding thì phải đo.                        |
| 70 · TinyFlex         | Để toolbar và nhóm tham số thành hàng/cột rồi thu hẹp cửa sổ.                 | Xem main/cross axis, phần dư và clipping; không có bảng tọa độ theo từng kích thước màn hình.         |
| 71 · Event và binding | Đổi vị trí các control trong HTML nhưng Pause, Reset và hai tham số vẫn đúng. | Event tới target/ancestor theo hợp đồng, một click chỉ phát một lệnh; kéo không chọn nhầm chim.       |
| 72 · TinyScript       | Đổi hành vi của nút bằng `let`, `if` và `function` trong file script thật.    | Hai script cho hai hành vi trên cùng executable; script lỗi hoặc hết ngân sách không làm treo cửa sổ. |

Tách bốn loại bằng chứng: test độc lập cho thuật toán; build và CTest đúng snapshot trong Debug/Release; thao tác native; hình/đường dẫn/ZIP trên web. Ảnh được lấy bằng chính renderer, không dùng ảnh hay bài test parser để thay cho một chương trình tương tác chạy được.

## Một phép thử để đi hết phần UI

1. Mở Project 65, chọn một con chim rồi bấm Pause. Kéo Radius: số hàng xóm thay đổi ngay nhưng chim vẫn đứng yên. Đổi Separation: phải cho đàn chạy tiếp mới thấy quỹ đạo tách ra.
2. Ở Project 70, thử **bài 03**. Hai nút có basis 20 và 30 px, cách nhau 10 px. Trong khung 150 px, chia phần dư theo tỉ lệ 1:2 cho hai bề rộng 50 và 90 px. Thước Canvas cho kéo lại phép tính; ảnh bên cạnh là toolbar thật trong C++.
3. Ở Project 72, giữ chung file HTML, CSS và executable. Bấm giữa thanh Radius với hai script khác nhau. [Script thường](../../public/field-notes/flock-workbench/p72-direct.png): 80 px, 3 hàng xóm. [Script khảo sát gần](../../public/field-notes/flock-workbench/p72-close.png): 50 px, 2 hàng xóm. Cả hai ảnh cùng cá thể số 101 và cùng tick 0; không phải hai cảnh được chọn riêng cho đẹp.

## Phạm vi đã kiểm tra

Tám học phần có lần lượt **7, 8, 9, 6, 5, 6, 5 và 7 bài**. Trên Windows, Visual Studio 2022 build starter, từng checkpoint và final. CTest chạy ở cả Debug lẫn Release (16 lượt). Tất cả 69 target ứng dụng đã chạy lần lượt ở cả hai cấu hình với `--smoke`: 138 lượt khởi tạo SDL, vẽ và kết thúc sau một frame. 55 ảnh đi kèm dùng renderer C++/SDL3. Đây là bằng chứng chương trình chạy và hiển thị được; không thay cho việc một người thử chuột, bàn phím và cảm giác kéo trong từng cửa sổ.

Tám ZIP đã được giải nén, so danh sách file và so từng byte với source. Riêng ZIP Project 72 còn được build độc lập bằng MSVC, chạy CTest và mở một frame SDL từ bản vừa giải nén (dùng bản SDL 3.4.8 đã cài). 118 đoạn mã hoặc file đầu vào trong các bài khớp với nguồn chuẩn. Tất cả 53 bài và tám trang tổng quan đã render trong bản production. Chromium chạy một worker: 10/10 ca của phần Boids/UI đạt, gồm kéo thước, thao tác bàn phím và tải ZIP; bốn ca hồi quy video/ảnh của phần voxel cũng đạt.

Trong 65–72, 84 liên kết nội bộ khác nhau trong bài và trong danh sách thuật ngữ đều trỏ tới đích có thật. Bản production cũng có một chunk riêng cho thước TinyFlex (3.674 byte); không tải nó chỉ để xem ảnh SDL.

### Kết quả ngoài phạm vi phần này

Lượt kiểm toàn site phát hiện ba điểm không thuộc học phần 65–72. Không coi các test chuyên biệt ở trên là xác nhận toàn bộ repository xanh:

- **Project 38, bài cuối:** link `/roadmap/39` trả 404. Project 39 hiện có trang `/projects/million-object-city`. Liên kết cũ đã có trong HEAD trước đợt này.
- **Project 38, dung lượng Canvas:** chunk `charged-particle-chamber-lab` là 34.144 byte, vượt budget 24 KiB. Không tăng budget để bỏ qua lỗi.
- **Project 42, trạng thái Canvas:** trang có phần đọc kết quả nhưng dùng lớp CSS riêng; bộ kiểm toàn site tìm token `lab-readout`. Hai component liên quan không bị thay đổi trong đợt này.
