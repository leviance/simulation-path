# Thử thách — Nặn một khối mà bạn có thể khoét và ghép

Đây là bản biên tập dành cho học phần mới, chưa được đưa lên website. Yêu cầu dưới đây giữ phạm vi của Project 44 trong đặc tả; không phải tuyên bố bản nháp đã hoàn thành.

## Hãy thử tự xây trước khi đọc lời giải

Bạn đang làm một công cụ nặn khối 3D. Từ một khối cầu, người dùng phải khoét được lỗ xuyên qua, xoay camera để nhìn vào lỗ rồi lưu lại kết quả. Với hai khối tách rời, họ có thể kéo cọ qua khoảng hở để nối chúng thành một vật thể. Những thay đổi đó phải nằm trong dữ liệu hình học, không chỉ là hiệu ứng vẽ trên màn hình.

Hãy dành khoảng 90–120 phút cho bản thử đầu tiên. Trong thời gian ấy, chỉ cần tìm được cách sửa một vài mẫu và làm bề mặt đổi theo. Toàn bộ sản phẩm còn có GPU, lịch sử chỉnh sửa, dữ liệu file và các phép kiểm; không cần cố hoàn tất tất cả trong một lần ngồi.

## Kết quả cần sử dụng được

- Mở ứng dụng C++/SDL3 độc lập và thấy một khối cong có ánh sáng. Có cọ 3D để biết vị trí, bán kính và phần vật liệu sắp tác động.
- Chọn thêm hoặc bớt vật liệu, đổi bán kính/độ mạnh và kéo một nét liền. Thả chuột để nhận mesh mới; khi công việc chưa xong, mesh hợp lệ trước đó vẫn được giữ và có nhãn rõ.
- Undo/redo theo từng nét; reset đúng preset. Có preset khối cầu và hai khối rời để thử khoét, ghép; preset torus chỉ dùng đối chiếu, không thay cho lỗ tự tạo bằng cọ.
- Orbit, pan và zoom mà không trích lại mesh. Bật wireframe, normal, lát cắt và probe để đối chiếu bề mặt với field bên trong.
- Đổi isovalue và độ phân giải hợp lệ, hủy công việc đang làm. Đổi độ phân giải phải nói rõ giữ hay bỏ dữ liệu; không âm thầm mất phần đã nặn.
- Lưu rồi mở lại field hợp lệ; xuất triangle mesh có normal và đọc kiểm lại file. Không cần tài khoản hoặc backend.

## Đầu vào và giới hạn

Mỗi điểm trên grid lưu một scalar: nhỏ hơn isovalue là phía trong, từ isovalue trở lên là phía ngoài. Công bố origin, spacing và cách đổi world↔grid. Bản chính xử lý thật **128³ samples**, tương ứng **127³ cells**; preset nhỏ chỉ giúp học và tìm lỗi.

Field edit, count, prefix scan và emit của preset lớn phải chạy trên GPU. CPU được dùng làm reference nhỏ, không được đọc toàn volume về để trích mesh hộ GPU sau mỗi nét. Có thể đọc summary nhỏ để cấp phát, nhưng phải chỉ rõ số byte và mục đích.

Phần cốt lõi tự viết gồm brush/falloff, nội suy edge, extraction nhất quán giữa các cell, GPU count/scan/emit và vòng đời stroke/job. Khung cửa sổ, GL loader, camera và trình bày được cấp sẵn và phải được ghi rõ. Không dùng sculpt/meshing engine để thay phần cần học.

## Khi nào có thể tự xác nhận đã làm xong?

- Plane/sphere khớp reference độc lập về vị trí và normal; đo được sai số qua nhiều độ phân giải.
- Fixture tetra, cell và mặt chung không tạo crack ngoài ý muốn, không ghi ngoài buffer. Count phải xong trước allocation/emit; thiếu capacity không được cắt bớt triangle cho qua.
- Khoét và ghép làm field, mesh, undo/redo đổi nhất quán. Có bằng chứng lỗ thông và hai khối thực sự nối nhau, không chỉ chọn góc nhìn khiến chúng có vẻ dính lại.
- Camera không tăng generation mesh; blur/reset/cancel không cho pointer cũ viết tiếp. Không đủ bộ nhớ hoặc job lỗi vẫn giữ last-good có nhãn.
- Hiển thị đúng samples, cells, active cells, vertices/triangles và memory. Đo riêng brush/count/scan/emit/normals/draw; nếu báo benchmark, có cấu hình máy, warm-up, số lần lặp, median và độ phân tán.
- Starter, từng checkpoint, final, tests, README và ZIP độc lập cùng mô tả một sản phẩm. Canvas giúp đọc phép tính, không thay bằng chứng từ bản C++.

Nếu chưa biết bắt đầu từ đâu, hãy thu nhỏ câu hỏi: một cạnh có hai giá trị khác dấu thì bề mặt cắt cạnh ở đâu? Sau đó thử một tetra có bốn mẫu, trước khi nghĩ đến cả volume.
