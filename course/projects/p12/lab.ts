import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "ROTATION LAB",
    title: "Một tam giác 3D thay đổi thế nào khi xoay quanh từng trục?",
    description:
      "Theo dõi local triangle, pivot, world triangle và ảnh perspective; điều chỉnh từng angle hoặc kéo trực tiếp để thấy rotation giữ hình nhưng thay đổi orientation.",
  },
  modes: {
    "rotation-triangle": {
      title: "Ba vertex được chiếu và nối thành tam giác ra sao?",
      description:
        "Di chuyển cả triangle trong world space, xem ba projection result và chỉ nối cạnh khi mọi vertex đều visible.",
    },
    "rotation-pivot": {
      title: "Vì sao phải đưa vertex về quanh pivot trước khi xoay?",
      description:
        "So local vertex với world vertex, kéo model position và quan sát centroid luôn trùng với pivot đã chọn.",
    },
    "rotation-x": {
      title: "Rotation X thực chất là vòng tròn nào?",
      description:
        "Giữ X, xoay cặp Y/Z trên mặt phẳng vuông góc với trục X và theo dõi độ dài vector không đổi.",
    },
    "rotation-euler": {
      title: "XYZ và ZYX có cho cùng một orientation không?",
      description:
        "Điều chỉnh pitch/yaw/roll rồi đổi order để thấy các rotation 3D nói chung không giao hoán.",
    },
    "rotation-mouse": {
      title: "Mouse delta được đổi thành yaw và pitch thế nào?",
      description:
        "Kéo ngang/dọc trên canvas, theo dõi delta, sensitivity và giới hạn pitch trong khi pointer capture đang hoạt động.",
    },
    "rotation-validation": {
      title: "Làm sao biết rotation không làm méo tam giác?",
      description:
        "Chạy, pause hoặc step animation; đo edge-length error và rotate→inverse round-trip error ở mọi orientation.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
