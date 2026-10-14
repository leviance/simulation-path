export const volumeGlossaryTerms = [
  {
    id: "volume-voxel-centre",
    term: "Voxel centre và physical spacing",
    definition:
      "Volume có count mẫu trên ba trục; spacing là khoảng cách world giữa các centre. Project 53 đặt centre i tại lower+(i+0.5)*spacing và physical extent count*spacing. Voxel index, world point và pixel không phải cùng một hệ tọa độ.",
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
