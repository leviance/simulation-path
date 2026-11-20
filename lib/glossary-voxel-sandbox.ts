export const voxelSandboxGlossaryTerms = [
  {
    id: "voxel-world-flakes",
    term: "Tuyết trong tọa độ world",
    definition:
      "Chỉ sinh bông mới trong một hộp gần mắt để tiết kiệm công. Bông đã sinh có vị trí riêng và tiếp tục rơi, trôi theo gió dù người xem đi sang bên. Depth buffer quyết định nó ở trước hay sau thân thông.",
  },
  {
    id: "voxel-unknown-picking",
    term: "Ô chưa biết khác ô Air",
    definition:
      "Nếu cột chưa cư trú, ống ngắm trả về chưa biết chứ không nhìn xuyên vào phía sau. Bộ dựng mesh có lý do khác: nó tạm giữ mặt ngoài ở mép chưa nạp rồi sửa mặt đó khi dữ liệu tới.",
  },
  {
    id: "voxel-day-clock",
    term: "Đồng hồ cảnh và hướng nắng",
    definition:
      "Cùng giờ cảnh quyết định vị trí Mặt Trời, sắc trời và phía sáng của vách đá. Pause dừng sóng, gió, hạt và giờ nhưng không khóa camera: ta vẫn có thể đi vòng quanh để kiểm chiều sâu.",
  },
  {
    id: "voxel-walk-collision",
    term: "Đi bộ trên bậc voxel",
    definition:
      "Kiểm chân, đầu và bề ngang người ở vị trí sắp tới. Bậc thấp có khoảng trống trên đầu thì bước được; vách cao hoặc cột chưa nạp phải chặn. Chỉ cho nhảy khi chân đang được đỡ.",
  },
];
