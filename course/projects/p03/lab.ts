import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "STROKE LAB",
    title: "Từ các mẫu chuột đến một nét liền",
    description:
      "Tô pixel bằng công thức C++, thử lấy mẫu thưa và so khoảng cách trước/sau nội suy.",
  },
  modes: {
    "stroke-brush": {
      title: "Bán kính 2 tạo ra bao nhiêu pixel?",
      description:
        "Phóng to lưới của đầu bút tròn, đổi bán kính và đối chiếu điều kiện dx² + dy² ≤ r².",
    },
    "stroke-sampling": {
      title: "Đo khoảng hở trước khi sửa",
      description: "Giữ nội suy tắt, lấy 1 trên N mẫu và xem khoảng cách giữa các tâm.",
    },
    "stroke-interpolation": {
      title: "Chia đoạn thành đủ số khoảng",
      description:
        "Bật/tắt nội suy trên cùng mẫu; giảm khoảng tâm không có nghĩa khôi phục quỹ đạo đã mất.",
    },
    "stroke-validation": {
      title: "Hai nét riêng có bị nối nhầm?",
      description: "Thử preset, click/kéo hoặc Enter và phím mũi tên; so pixel và khoảng dấu bút.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
