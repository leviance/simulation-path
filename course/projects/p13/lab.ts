import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "WIREFRAME CUBE LAB",
    title: "Từ tám điểm trong không gian đến cube điều khiển được",
    description:
      "Dùng cùng dữ liệu và công thức với C++: vertex cache, clipping, hai phép chiếu, chuyển động và chiều sâu.",
  },
  modes: {
    "cube-vertices": {
      title: "Từ một điểm đến tám đỉnh của cube",
      description: "Đặt hai lớp bốn đỉnh trong local space, chạy bộ khung SDL và xem từng index.",
    },
    "cube-edges": {
      title: "Nối mười hai cạnh từ index",
      description:
        "Tách vị trí khỏi quan hệ nối, cache phép chiếu và vẽ các đoạn đã clip bằng Bresenham.",
    },
    "cube-transform": {
      title: "Xoay hình dạng rồi mới đặt vào world",
      description:
        "Dùng lại rotation trực tiếp của P12 trên tám local vertex; quan sát pivot và hai thứ tự.",
    },
    "cube-projection": {
      title: "Hai phép chiếu cho cùng một cube",
      description:
        "Suy công thức orthographic, so kích thước hai lớp Z và giữ cùng quy ước clipping.",
    },
    "cube-input": {
      title: "Di chuyển, kéo chuột và zoom",
      description:
        "Đọc keyboard state theo dt, giữ pointer owner và tách zoom phép chiếu khỏi đổi khoảng cách.",
    },
    "cube-depth": {
      title: "Làm rõ chiều sâu, giữ bản demo sạch",
      description:
        "Sắp cạnh theo Z, đổi độ sáng, thêm tự quay/pause/step và ẩn overlay mà không ẩn cube.",
    },
    "cube-validation": {
      title: "Kiểm chứng và chạy ứng dụng hoàn chỉnh",
      description:
        "Khóa đáp án tính tay, thử clipping/tương tác và build toàn bộ mã nguồn độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
