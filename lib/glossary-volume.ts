export const volumeGlossaryTerms = [
  {
    id: "volume-context-surface",
    term: "Bề mặt tham chiếu của volume",
    definition:
      "Mesh tại một isovalue giúp định hướng các lát trong khối. Project 53 dùng iso 0.12/stride 2 và zero padding chỉ trong bộ dựng vỏ; không sửa scalar gốc. Ba ảnh vẫn lấy mẫu toàn volume. Vỏ có shading để thấy chiều sâu, không dùng làm dữ liệu đo và không phải volume ray marching.",
  },
  {
    id: "volume-voxel-centre",
    term: "Voxel centre và physical spacing",
    definition:
      "Spacing là khoảng cách world giữa hai tâm mẫu liên tiếp. Tâm i ở origin+(i+0.5)*spacing, kích thước box là count*spacing. Project 53 giữ box 160×192×224 mm khi đổi 64³/128³; scalar Float32 không có đơn vị y khoa. Chỉ số voxel, tọa độ world và pixel là ba việc khác nhau.",
  },
  {
    id: "volume-window-level",
    term: "Window/level của ảnh scalar",
    definition:
      "Level là tâm cửa sổ scalar, width là độ rộng dương. Brightness=clamp((value−(level−width/2))/width,0,1), rồi mới quantize sang byte. Chỉnh tương phản không thay dữ liệu volume; phantom [0,1] của Project 53 không phải Hounsfield Units.",
  },
  {
    id: "volume-trilinear",
    term: "Trilinear sampling",
    definition:
      "Nội suy từ tám voxel centre quanh world point bằng tích ba trọng số tuyến tính. Tổng trọng số một; trường affine được tái tạo đúng trong vùng centre. Boundary replication không cho phép lấy mẫu ngoài physical box và không phục hồi chi tiết đã mất khi voxel hóa.",
  },
  {
    id: "volume-orthogonal-slices",
    term: "Orthogonal slices và crosshair",
    definition:
      "Ba mặt XY/XZ/YZ giữ z/y/x cố định, đi qua cùng một world cursor. Một lần pick sửa hai tọa độ trong plane nên hai view còn lại đổi vị trí cắt. Quy ước hiển thị toán của Project 53 không phải quy ước hướng ảnh radiology.",
  },
];
