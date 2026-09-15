import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "GPU SPATIAL GRID LAB",
    title: "Một triệu particles tìm hàng xóm mà không quét cả thành phố",
    description:
      "Theo dõi particle đi qua bốn bước: đếm theo cell, exclusive scan, đưa index vào CSR và tìm hàng xóm. Canvas 2D giúp bạn nhìn thấy dữ liệu đổi ra sao sau mỗi pass; thời gian hiển thị không phải benchmark GPU thật.",
  },
  modes: {
    "grid-contract": {
      title: "Một world position trở thành cell ID nào?",
      description:
        "Kéo particle trong vùng mô phỏng, đọc cột, hàng và row-major ID; đồng thời quan sát cách chỉ số được chặn lại ở mép phải và mép dưới.",
    },
    "atomic-count": {
      title: "Nhiều invocation cùng tăng một cell ra sao?",
      description:
        "Cho từng particle đi vào cell, rồi bật hoặc tắt atomic để thấy lost update khiến tổng số phần tử trong grid nhỏ hơn số particle ban đầu.",
    },
    "count-scan": {
      title: "Exclusive scan biến counts thành ranges thế nào?",
      description:
        "Sửa số particle trong tám cell rồi đọc offset cùng đoạn [begin, end). Sau đó kiểm tra offset cuối cộng count cuối có đúng bằng N hay không.",
    },
    "csr-scatter": {
      title: "Atomic cursor đặt particle vào slot nào?",
      description:
        "Đổi thứ tự particle đi vào grid để thấy thứ tự bên trong mỗi đoạn CSR có thể khác, nhưng tập particle thuộc cell đó vẫn phải giữ nguyên.",
    },
    "candidate-cells": {
      title: "Một query radius cần mở những cell nào?",
      description:
        "Kéo particle, đổi bán kính tìm kiếm và kích thước cell để xem vùng cell được tính từ AABB và chặn theo biên, thay vì luôn cố định ở 3 × 3.",
    },
    "exact-neighbors": {
      title: "Candidate nào thực sự là neighbor?",
      description:
        "So sánh khoảng cách bình phương, loại chính particle đang xét và dùng index để phân xử khi hai hàng xóm cách đều nhau.",
    },
    "grid-pass-graph": {
      title: "Pass sau cần đọc buffer nào?",
      description:
        "Đi qua clear, count, scan, prepare, scatter và query; ở mỗi chặng, chọn barrier phù hợp trước khi compute shader hoặc CPU đọc buffer.",
    },
    "grid-validation": {
      title: "Grid hỏng ở count, offset hay scatter?",
      description:
        "Tạo lỗi lost update, offset sai hoặc index bị lặp; đọc từng điều kiện kiểm tra để tìm đúng pass gây lỗi trước khi so kết quả hàng xóm với bản CPU.",
    },
    "gpu-grid-final": {
      title: "Toàn bộ GPU grid đã hoạt động đúng chưa?",
      description:
        "Đổi số particle, kích thước cell, bán kính và seed; theo dõi mức lấp đầy, số ứng viên phải xét, số pass và mô hình thời gian.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
