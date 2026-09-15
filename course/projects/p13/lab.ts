import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "WIREFRAME CUBE LAB",
    title: "Tám vertex và mười hai edge tạo thành cube như thế nào?",
    description:
      "Theo dõi index, topology, projection cache, rotation và camera-space depth của một cube được raster hoàn toàn trên CPU.",
  },
  modes: {
    "cube-vertices": {
      title: "Quy ước index có đặt đúng tám góc của cube không?",
      description:
        "Thay half extent, xem local coordinate của từng index và kiểm tra tám projection marker trước khi nối bất kỳ cạnh nào.",
    },
    "cube-edges": {
      title: "Mười hai cặp index khép thành sáu mặt ra sao?",
      description:
        "Chọn một edge để highlight, đọc hai endpoint và đếm degree của mỗi vertex mà không viết tọa độ màn hình trong edge list.",
    },
    "cube-transform": {
      title: "Một topology có thể đi theo mọi orientation không?",
      description:
        "Đổi pitch, yaw, roll và rotation order; tám vertex thay đổi còn mười hai cặp index được giữ nguyên.",
    },
    "cube-depth": {
      title: "Depth ordering giúp wireframe dễ đọc đến đâu?",
      description:
        "So sánh màu phẳng với depth cue, xem average camera Z và thứ tự far-to-near của các edge đang visible.",
    },
    "cube-validation": {
      title: "Làm sao biết cube vẫn là cube khi đang chuyển động?",
      description:
        "Kéo, chạy, pause hoặc single-step rồi theo dõi visible edges, projection count, edge error và rotation round trip.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
