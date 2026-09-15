import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "SPATIAL GRID NEIGHBOR QUERY LAB",
    title: "Mở đúng khu phố thay vì hỏi cả thành phố",
    description:
      "Kéo circle qua 100.000 particles, đổi cellSize và quan sát grid đi từ cell range tới candidates, exact hits, oracle agreement và benchmark.",
  },
  modes: {
    "grid-layout": {
      title: "Một world position trở thành địa chỉ cell nào?",
      description:
        "Đổi cellSize và nhìn số hàng/cột; điểm ở maximum bound vẫn thuộc cell cuối nhờ bước clamp sau floor.",
    },
    "grid-insert": {
      title: "100.000 particle indices nằm trong buckets ra sao?",
      description:
        "Đọc non-empty cells và maximum bucket; tổng số entry phải bằng N vì mỗi particle chỉ thuộc một cell.",
    },
    "grid-candidates": {
      title: "Circle cần mở những cell nào?",
      description:
        "Các ô xanh là hình chữ nhật cell bao trọn circle; kéo qua góc để xem row/column range được clamp mà không lặp cell.",
    },
    "grid-filter": {
      title: "Candidate và hit khác nhau ở đâu?",
      description:
        "Mọi hạt trong ô xanh là candidate, nhưng chỉ hạt vàng vượt exact circle test mới là hàng xóm thật.",
    },
    "grid-compare": {
      title: "Grid có trả đúng cùng hàng xóm như brute force không?",
      description:
        "Mỗi lần kéo đều canonicalize hit set ngoài hot loop rồi so nearest hit với oracle quét toàn bộ N particles.",
    },
    "grid-benchmark": {
      title: "Grid nhanh hơn vì đã bỏ bao nhiêu distance test?",
      description:
        "Chạy cùng query set cho cả hai thuật toán và đọc checksum, candidates, scans cùng ms/query thay vì chỉ nhìn FPS.",
    },
    "grid-cell-size": {
      title: "Cell nhỏ hơn có luôn tốt hơn không?",
      description:
        "So 0.025, 0.05, 0.1 và 0.2: fine grid ít candidates hơn nhưng phải mở nhiều cells và duy trì nhiều buckets hơn.",
    },
    "grid-validation": {
      title: "Spatial Grid đã đủ chắc để làm nền cho mô phỏng chưa?",
      description:
        "Kiểm address, insertion, edge range, exact hits, nearest tie, checksum, build/query timing và interaction trước Project 29.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
