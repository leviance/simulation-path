import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "STROKE LAB",
    title: "Vì sao nét chuột bị đứt?",
    description: "Thay sampling rate, xem input samples và bật nội suy để lấp khoảng hở.",
  },
  modes: {
    "stroke-sampling": {
      title: "Các mouse sample để lại khoảng hở bao lớn?",
      description: "Nội suy mở ở trạng thái tắt để quan sát đúng lỗi mà bài đang chẩn đoán.",
    },
    "stroke-interpolation": {
      title: "Nội suy đã giới hạn khoảng cách giữa các stamp chưa?",
      description:
        "Bắt đầu với nội suy được bật, rồi tắt đi để tạo đối chứng trên cùng một stroke.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
