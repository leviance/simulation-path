import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "PROJECTION LAB",
    title: "Điểm 3D đi tới pixel nào?",
    description: "Điều khiển điểm sáng, so độ sâu, FOV/aspect và từng trạng thái bị loại.",
  },
  modes: {
    "projection-point": {
      title: "Vẽ điểm sáng và điều khiển ba tọa độ",
      description: "Dựng marker trên framebuffer, rồi nối WASD/QE với world point bằng delta time.",
    },
    "projection-camera": {
      title: "Đặt camera vào không gian",
      description: "Giữ world point riêng và đổi gốc tọa độ bằng vị trí camera.",
    },
    "projection-divide": {
      title: "Vì sao điểm ở xa tiến về tâm?",
      description: "Nhìn hai tam giác đồng dạng, tự viết x/z, y/z rồi kiểm vị trí điểm sáng.",
    },
    "projection-fov": {
      title: "Chọn FOV và hình dạng viewport",
      description: "Tự tính focal scale, NDC và pixel; đổi aspect mà không kéo méo cảnh.",
    },
    "projection-visibility": {
      title: "Chặn điểm không thể nhìn thấy",
      description: "Kiểm vùng nhìn, cắt đoạn ở near/far rồi dựng lưới sàn và bốn khung 3D.",
    },
    "projection-motion": {
      title: "Cho điểm bay, dừng và bước từng nhịp",
      description:
        "Tách điều khiển tay khỏi quỹ đạo thời gian, không để hai nguồn input tranh nhau.",
    },
    "projection-drag": {
      title: "Kéo điểm mà không làm mất depth",
      description:
        "Đảo phép chiếu tại một độ sâu đã biết và quản lý pointer capture đúng chủ sở hữu.",
    },
    "projection-full": {
      title: "Hoàn thiện demo và kiểm chứng",
      description:
        "Tắt debug để xem cảnh sạch; kiểm tra bằng nghiệm tính tay, biên và mã hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
