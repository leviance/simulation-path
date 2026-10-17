export const voxelGreedyGlossaryTerms = [
  {
    id: "voxel-greedy-mask",
    term: "Greedy face mask",
    definition:
      "Bảng 2D của một hướng mặt tại một mặt phẳng trong chunk. Ô không có mặt nhận Air; ô có mặt giữ material. Duyệt hàng cố định, mở rộng width rồi height để tách các rectangle cùng khóa, sau đó xóa phần đã dùng. Đây không phải texture hoặc lát cắt các block.",
  },
  {
    id: "voxel-merge-key",
    term: "Khóa gộp mặt voxel",
    definition:
      "Các thuộc tính phải giống nhau trước khi gộp: mặt phẳng, hướng và vật liệu trong Project 61. Plane/hướng cố định trong từng mask nên chỉ cần so material. Nếu thêm ánh sáng, AO hoặc UV, phải mở rộng khóa/quy tắc; không gộp chỉ vì màu hiện tại trông giống nhau.",
  },
  {
    id: "voxel-surface-oracle",
    term: "Oracle bề mặt có hướng",
    definition:
      "Từ mỗi block đặc, kiểm sáu neighbor để liệt kê face key gồm tọa độ block, hướng và material. Bung quad lớn thành mặt đơn vị rồi so multiset đã sort. Cách này bắt lỗ, duplicate, đảo hướng và đổi vật liệu mà tổng diện tích đơn thuần không phát hiện được.",
  },
];
