export const ctGlossaryTerms = [
  {
    id: "ct-fan-beam",
    term: "Fan-beam và detector phẳng",
    definition:
      "Các tia xuất phát từ một nguồn điểm và tới những pixel khác nhau trên detector phẳng. Trong Project 56, radial/tangent quay cả nguồn lẫn detector quanh vật thể. Vệt điểm có hệ số phối cảnh 8/(4-p_r), không phải đường sin thuần của parallel-beam; quy ước góc/trục phải đi cùng dữ liệu.",
  },
  {
    id: "ct-sinogram",
    term: "Sinogram",
    definition:
      "Mảng các projection theo góc. Project 56 đặt góc ở hàng, pixel detector ở cột và lưu p=-ln(I/I0) theo row-major. Đây là dữ liệu forward projection, chưa phải ảnh lát cắt được tái dựng. Tên sinogram không có nghĩa mọi vệt trong hình học fan-beam đều là đường sin chính xác.",
  },
  {
    id: "ct-acquisition",
    term: "Lượt quét nhất quán",
    definition:
      "Một Scan giữ cố định phantom, strength và lưới góc trong suốt lượt đo. Thay các thông số đó phải xóa dữ liệu cũ; đổi màu hiển thị hoặc chọn ô để xem không tạo phép đo mới. NaN biểu diễn ô chưa đo, khác số đo p=0 của tia đi trong không khí.",
  },
  {
    id: "ct-angular-sampling",
    term: "Lấy mẫu góc",
    definition:
      "Chọn một số hữu hạn góc để đo projection. Lưới nửa mở [0,2π) với 30/60/120 góc có bước 12°/6°/3°, không lặp 360°. So các độ phân giải phải dùng cùng góc vật lý; tăng kích thước ảnh hoặc nội suy màu không bổ sung phép đo.",
  },
];
