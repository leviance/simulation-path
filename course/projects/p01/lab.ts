import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PIXEL MEMORY LAB",
    title: "Một pixel nằm ở đâu trong bộ nhớ?",
    description: "Rê chuột hoặc dùng phím mũi tên để đọc tọa độ, linear index và RGBA.",
  },
  modes: {
    "pixel-memory": {
      title: "Tọa độ (x, y) nằm ở đâu trong vector?",
      description: "Chỉ tập trung vào row-major index; màu và pattern sẽ xuất hiện ở các bài sau.",
    },
    "pixel-rgba": {
      title: "Một màu RGBA trở thành số 32 bit thế nào?",
      description: "Đổi từng kênh và đối chiếu giá trị 0xRRGGBBAA với byte order trong RAM.",
    },
    "pixel-patterns": {
      title: "Công thức tọa độ tạo ra pattern nào?",
      description: "So gradient, checkerboard và deterministic noise trên cùng một lưới pixel.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
