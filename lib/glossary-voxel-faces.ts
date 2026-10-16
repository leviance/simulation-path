export const voxelFaceGlossaryTerms = [
  {
    id: "voxel-neighbor-face-elimination",
    term: "Loại mặt tiếp giáp voxel",
    definition:
      "Với block opaque, chỉ dựng một mặt khi ô bên kia là Air hoặc ngoài miền đang hiển thị. Hai block opaque kề mặt làm mất hai mặt đối nhau, kể cả khác Block ID. Quy tắc không phụ thuộc camera, khác back-face culling, occlusion culling và greedy meshing. Project 59 xét một chunk đơn lẻ; biên không có chunk lân cận được coi là Air theo phạm vi đó.",
  },
  {
    id: "voxel-face-count-oracle",
    term: "Oracle số mặt F=6N−2E",
    definition:
      "N là số block opaque trong miền đang hiển thị, E là số cặp block kề mặt vô hướng. Ban đầu mỗi block có sáu mặt; mỗi cặp kề loại hai mặt đối nhau. Đếm E theo ba chiều dương để không đếm đôi. Công thức kiểm tổng số quad của mesher không gộp mặt, nhưng cần thêm face keys và winding để phát hiện mặt sai vị trí/hướng.",
  },
  {
    id: "voxel-active-cut",
    term: "Miền voxel sau mặt cắt",
    definition:
      "Khi chỉ hiển thị y<=slice, cả block nguồn và neighbor phải được xét trong cùng miền đó. Neighbor trên cut được coi là Air hiển thị để giữ mặt nắp, không phải xóa Block ID khỏi chunk. Ngoài chunk, ngoài cut và Air thật là ba lý do khác nhau cùng dẫn đến giữ mặt.",
  },
  {
    id: "voxel-mesh-invalidation",
    term: "Mesh dirty và frame dirty",
    definition:
      "Preset, chế độ mesher hoặc lớp cắt thay đổi geometry nên đánh dấu meshDirty. Camera chỉ đổi phép chiếu nên frameDirty. Rebuild thành công làm frameDirty; rasterize xong mới clear frameDirty. Chọn ô debug chỉ đổi overlay. Tách hai bước giúp tránh dựng lại geometry khi xoay mà không cần một benchmark vô hạn.",
  },
];
