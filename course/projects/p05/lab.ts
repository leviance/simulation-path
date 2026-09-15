import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "COORDINATE LAB",
    title: "Một điểm đang ở screen hay world space?",
    description: "Pan, zoom quanh cursor và theo dõi round-trip error.",
  },
  modes: {
    "coordinate-spaces": {
      title: "Một điểm đang được đọc ở screen hay world space?",
      description: "Camera được giữ cố định; di chuyển con trỏ để chỉ tập trung vào hai hệ tọa độ.",
    },
    "coordinate-inverse": {
      title: "screenToWorld phục hồi điểm dưới con trỏ thế nào?",
      description:
        "Camera được giữ cố định để bạn đối chiếu screen point với world point tương ứng.",
    },
    "coordinate-zoom": {
      title: "Zoom quanh cursor có giữ đúng world anchor?",
      description: "Bật đầy đủ pan và zoom, đồng thời đo round-trip error cùng zoom-anchor error.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
