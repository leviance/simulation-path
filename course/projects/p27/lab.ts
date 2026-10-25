import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "BOIDS 2D LAB",
    title: "Một đàn hình thành từ những tương tác cục bộ",
    description:
      "Chạy, pause, chọn một cá thể và thử ba trọng số. Brute force tìm hàng xóm cho toàn đàn; không có quỹ đạo dựng sẵn.",
  },
  modes: {
    "boids-motion": {
      title: "Vẽ một cá thể và cho nó di chuyển",
      description: "Đọc khung SDL, vẽ tam giác theo vận tốc và nối bước cập nhật vào event loop.",
    },
    "boids-flock": {
      title: "Tạo đàn có thể lặp lại và nối hai mép thế giới",
      description: "ID, seed, 256–1.024 cá thể và ý nghĩa của hai snapshot đọc/ghi.",
    },
    "boids-neighbors": {
      title: "Tìm đúng hàng xóm cho từng cá thể",
      description: "Radius, self, minimum image và vòng lặp mọi cặp có phép kiểm độc lập.",
    },
    "boids-separation": {
      title: "Separation: tránh chen chúc mà không đổi hướng đột ngột",
      description:
        "Từ hướng tránh tới desired velocity và gia tốc có giới hạn, kể cả khi trùng vị trí.",
    },
    "boids-alignment": {
      title: "Alignment: điều chỉnh hướng theo hàng xóm",
      description: "Đọc vận tốc cục bộ, xử lý trung bình bằng 0 và giữ separation đang có.",
    },
    "boids-cohesion": {
      title: "Cohesion: tìm về đàn qua cả mép tuần hoàn",
      description: "Tâm cục bộ từ displacement, không lấy trung bình sai giữa hai mép thế giới.",
    },
    "boids-integration": {
      title: "Ghép ba quy tắc và cập nhật đồng bộ",
      description: "Trọng số, speed cap, fixed timestep, giới hạn catch-up và kiểm thứ tự duyệt.",
    },
    "boids-benchmark": {
      title: "Quan sát cá thể và đo chi phí toàn đàn",
      description: "Hoàn thiện controls, chọn/drag, vector debug và benchmark hữu hạn có thể hủy.",
    },
    "boids-validation": {
      title: "Kiểm chứng và chạy dự án Boids hoàn chỉnh",
      description: "Fixture, oracle chín ảnh, permutation, dt, CTest và gói source độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
