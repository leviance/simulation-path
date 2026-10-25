import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "BOIDS + SPATIAL GRID",
    title: "Đàn lớn, cùng quy tắc chuyển động",
    description:
      "Chạy cùng mô phỏng bằng Brute hoặc Grid, xem candidates và hàng xóm, rồi đo cả chi phí dựng lại grid.",
  },
  modes: {
    "grid-address": {
      title: "Từ đàn Boids đến địa chỉ của một cell",
      description: "Ánh xạ position vào grid, xử lý tọa độ âm và cell cuối không đủ rộng.",
    },
    "grid-build": {
      title: "Dựng lại grid từ snapshot của đàn",
      description: "Đưa mỗi cá thể vào đúng một bucket và biết khi nào grid đã cũ.",
    },
    "grid-wrap": {
      title: "Tìm đủ cell ở hai phía của đường biên",
      description: "Chia khoảng tuần hoàn, xử lý cell cuối ngắn và tránh duyệt trùng.",
    },
    "grid-exact": {
      title: "Từ candidate đến hàng xóm thật sự",
      description: "Lọc theo khoảng cách của Project 27; bỏ self nhưng giữ cá thể trùng vị trí.",
    },
    "grid-flock": {
      title: "Dùng Grid để cập nhật cả đàn",
      description:
        "Thay neighbor search, giữ nguyên steering và chỉ đổi state sau một bước đầy đủ.",
    },
    "grid-validation": {
      title: "Kiểm chứng Grid có giữ nguyên mô phỏng không",
      description: "Đối chiếu toàn đàn nhỏ: tập hàng xóm, từng steering và state một bước.",
    },
    "grid-density": {
      title: "Cell size ảnh hưởng thế nào khi đàn tụ lại?",
      description: "Thử phân bố đều, hai cụm và cụm rất đặc trên cùng seed; đọc occupancy.",
    },
    "grid-batches": {
      title: "Cập nhật 10.000 cá thể mà vẫn hủy được",
      description: "Chia việc giữa các frame, không cắt hàng xóm và không công bố nửa bước.",
    },
    "grid-benchmark": {
      title: "Đo toàn bước, không chỉ đo phần Grid làm nhanh",
      description: "Hai warm-up, năm mẫu đo, median/min/max và trường hợp Grid chậm hơn.",
    },
    "grid-final": {
      title: "Hoàn thiện và nghiệm thu đàn Boids lớn",
      description: "Build Debug/Release, CTest, smoke hữu hạn và mã nguồn đầy đủ chạy độc lập.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
