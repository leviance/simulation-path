import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "3D COMPASS",
    title: "Hai vector quyết định normal trong không gian thế nào?",
    description:
      "Sửa từng đỉnh để thấy hai vector cạnh và pháp tuyến đổi theo. Xoay camera chỉ đổi góc nhìn; kiểm dot và diện tích để phân biệt hình chiếu với quan hệ hình học trong không gian.",
  },
  modes: {
    "normal-axes": {
      title: "Dựng ba trục trong một cảnh perspective",
      description: "Tạo Vec3, chiếu điểm theo độ sâu và vẽ la bàn X/Y/Z.",
    },
    "normal-edges": {
      title: "Vẽ tam giác và hai vector cạnh",
      description: "Tạo P0/P1/P2, suy vector A và B rồi chỉnh từng tọa độ.",
    },
    "normal-cross": {
      title: "Tự tính và vẽ cross product",
      description: "Dự đoán hướng bằng tay phải, viết ba thành phần và vẽ mũi tên 3D.",
    },
    "normal-unit-area": {
      title: "Tách hướng normal khỏi diện tích",
      description: "So raw cross với unit normal và kiểm bằng tam giác 3–4.",
    },
    "normal-winding": {
      title: "Đảo winding và đọc mặt theo camera",
      description: "Đổi P1/P2, giữ diện tích và phân biệt front/back/edge-on.",
    },
    "normal-camera": {
      title: "Xoay camera và xử lý input an toàn",
      description: "Orbit giữ điểm nắm, letterbox/HiDPI, near/far clipping và pause.",
    },
    "normal-full": {
      title: "Hoàn thiện la bàn và kiểm chứng",
      description: "Phân biệt zero/gần thẳng hàng, kiểm hình học độc lập và chạy bản đầy đủ.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
