export const voxelGreedyGlossaryTerms = [
  {
    id: "voxel-greedy-mask",
    term: "Mask để gộp mặt",
    definition:
      "Trên một mặt phẳng ứng với một hướng, ghi vật liệu ở ô có mặt cần vẽ. Từ một ô chưa dùng, mở rộng theo chiều ngang rồi thử thêm từng hàng đủ rộng. Gạch vùng đã dùng để không xuất hai quad trùng nhau.",
  },
  {
    id: "voxel-merge-key",
    term: "Điều kiện gộp mặt",
    definition:
      "Chỉ gộp các mặt cùng mặt phẳng, hướng và vật liệu, có cách lặp UV tương thích. Đất đứng yên có thể thành một mảng lớn, nhưng lá sẽ uốn và mặt biển cần các đỉnh riêng để tạo sóng.",
  },
  {
    id: "voxel-surface-oracle",
    term: "Đối chiếu tập mặt đơn vị",
    definition:
      "Bung một quad rộng w và cao h thành w×h mặt theo ô, hướng và vật liệu. So chúng với bản chưa gộp sẽ phát hiện lỗ, mặt trùng và sai hướng mà tổng diện tích không chỉ ra.",
  },
  {
    id: "voxel-rooted-wind",
    term: "Gió lấy mẫu tại gốc",
    definition:
      "Gió phụ thuộc vị trí world, thời gian và hướng truyền. Dùng độ cao tương đối để gốc nhận trọng số 0, đầu lá nhận trọng số lớn hơn. Mỗi frame bắt đầu từ hình dạng nghỉ, không cộng dồn độ lệch của frame trước.",
  },
];
