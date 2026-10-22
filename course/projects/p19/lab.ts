import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "CPU LAMBERT LIGHTING",
    title: "Xoay đèn, nhìn mặt sáng lên",
    description:
      "Cube đặc với perspective, depth và flat shading tính trên CPU. Xoay mô hình và đổi góc nhìn là hai thao tác riêng.",
  },
  modes: {
    "lambert-mesh": {
      title: "Dựng cube đặc trước khi bật đèn",
      description:
        "Kế thừa Z-buffer và near clip để có cube tám đỉnh, mười hai tam giác chạy được ngay từ checkpoint đầu.",
    },
    "lambert-normal": {
      title: "Từ hai cạnh đến normal hướng ra ngoài",
      description:
        "Tính normal từ world-space vertex; kiểm winding và hai tam giác trên cùng một mặt.",
    },
    "lambert-light": {
      title: "Đặt đèn trong không gian và cho đèn orbit",
      description:
        "Thống nhất surfaceToLight, đặt hướng bằng hai góc và cập nhật quỹ đạo theo thời gian.",
    },
    "lambert-dot": {
      title: "Mặt hướng về đèn sáng hơn như thế nào?",
      description:
        "Dùng dot product của hai vector đơn vị, thử ba góc 0°, 90°, 180° rồi tô từng mặt trên CPU.",
    },
    "lambert-material": {
      title: "Giữ màu vật liệu, thêm ambient",
      description:
        "Tách baseColor khỏi cường độ sáng; thêm ambient, strength và thí nghiệm một màu/sáu màu.",
    },
    "lambert-culling": {
      title: "Xoay mô hình khác với đổi góc nhìn",
      description:
        "Tách model rotation khỏi camera orbit; giữ đèn trong world space và culling độc lập với lighting.",
    },
    "lambert-validation": {
      title: "Hoàn thiện renderer và kiểm chứng độc lập",
      description:
        "Giữ một màu cho cả face sau clipping; đối chiếu renderer với ray/AABB và bàn giao source hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
