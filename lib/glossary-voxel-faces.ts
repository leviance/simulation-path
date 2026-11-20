export const voxelFaceGlossaryTerms = [
  {
    id: "voxel-neighbor-face-elimination",
    term: "Bỏ mặt tiếp giáp",
    definition:
      "Xét vật liệu trong ô và ô phía bên kia mặt. Hai viên đá chung mặt không cần mặt ở giữa. Tại mép cát–nước, chỉ một phía giữ mặt; không để hai quad cùng che một diện tích.",
  },
  {
    id: "voxel-face-count-oracle",
    term: "Đếm mặt bằng F = 6N − 2E",
    definition:
      "Với N block opaque và E cặp chung mặt, mỗi cặp làm mất hai mặt. Công thức không thay bảng xử lý nước, cũng không phát hiện mọi lỗi ở vị trí: mất một mặt và thừa một mặt khác có thể cho cùng tổng.",
  },
  {
    id: "voxel-active-cut",
    term: "Mặt ngoài của hốc",
    definition:
      "Hốc là khoảng Air trong dữ liệu: sáu mặt hướng vào một ô Air kín vẫn thuộc bề mặt mesh dù camera ở ngoài không thấy. Khác với bảng lớp, nơi ta chỉ đọc một tầng mà không thay block.",
  },
  {
    id: "voxel-mesh-invalidation",
    term: "Khi nào phải dựng lại mesh?",
    definition:
      "Đi bộ hay đổi hướng nắng cần vẽ lại ảnh nhưng không đổi hình học của nền đất. Nạp thêm cột sát cạnh thì khác: những mặt tạm giữ ở đường nối có thể phải mất đi, nên đánh dấu đúng các cột có chung mặt.",
  },
];
