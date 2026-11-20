export const voxelStreamingGlossaryTerms = [
  {
    id: "chunk-streaming",
    term: "Nạp chunk theo bước chân",
    definition:
      "Thay vì giữ toàn bộ bản đồ, giữ các cột quanh vị trí mắt. Mỗi khi tâm qua biên, lập danh sách cần nạp theo thứ tự gần trước; vẽ và tiếp nhận bàn phím trong lúc hàng còn việc.",
  },
  {
    id: "chunk-retention",
    term: "Vành nạp và vành giữ",
    definition:
      "Bán kính nạp 2 tạo vùng 5×5. Giữ thêm một vành trước khi gỡ để đi qua rồi lùi lại một bước không phải tạo lại nguyên cột. Một số cột còn cư trú ngoài vùng cần thấy là bình thường.",
  },
  {
    id: "chunk-signed-address",
    term: "Địa chỉ chunk ở phía âm",
    definition:
      "Với cạnh 16, x = −1 thuộc chunk −1, local 15. Dùng floor khi chia tọa độ world: chia nguyên rồi cắt về 0 sẽ gán điểm phía âm vào nhầm chunk.",
  },
  {
    id: "chunk-job-budget",
    term: "Ngân sách nạp mỗi frame",
    definition:
      "Giới hạn số cột nạp và số mép cần sửa mỗi lần cập nhật. Đây là giới hạn khối lượng công việc chứ không bảo đảm số mili giây, vì một cột rừng có thể tốn hơn một cột biển.",
  },
  {
    id: "voxel-cloud-layer",
    term: "Tầng mây trong tọa độ world",
    definition:
      "Tìm giao giữa tia nhìn và một tầng cao, rồi lấy mẫu độ phủ tại điểm ấy sau khi trừ độ trôi do gió. Một đám mây dịch khi đồng hồ chạy nhưng không nhảy sang chỗ khác chỉ vì người xem vừa bước qua biên chunk.",
  },
];
