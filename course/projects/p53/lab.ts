import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "SCALAR / SLICE WORKBENCH",
    title: "Lần theo dữ liệu bên trong khối mẫu",
    description:
      "Cùng một volume 3D, ba mặt cắt và một điểm đo. Khối 3D giúp định hướng; inspector chỉ đọc scalar gốc.",
  },
  modes: {
    "slice53-1": {
      title: "Lát cắt đầu tiên",
      description: "Dời z để dự đoán bán kính giao giữa sphere và mặt XY.",
    },
    "slice53-2": {
      title: "Lưu volume thật",
      description: "Đổi dataset và 64³/128³; xem số mẫu và bộ nhớ thực sự được cấp phát.",
    },
    "slice53-3": {
      title: "Ba hướng của cùng một điểm",
      description: "Giữ đúng trục và aspect theo mm khi dời XY/XZ/YZ.",
    },
    "slice53-4": {
      title: "Tám voxel quanh điểm đo",
      description: "So nearest/trilinear và kiểm tổng trọng số, không nội suy byte màu.",
    },
    "slice53-5": {
      title: "Đổi cách nhìn, giữ nguyên dữ liệu",
      description: "Window/level, palette và histogram trên scalar tổng hợp.",
    },
    "slice53-6": {
      title: "Khối mẫu cắt mở",
      description: "Orbit/zoom chỉ đổi camera; vỏ tham chiếu không thay ảnh lát cắt.",
    },
    "slice53-7": {
      title: "Một probe liên kết ba view",
      description: "Chọn một điểm bằng chuột/phím và xem nó trên cả ba ảnh.",
    },
    "slice53-8": {
      title: "Quét và dừng có kiểm soát",
      description: "Quét đến biên, pause/reset, cache và reduced motion.",
    },
    "slice53-9": {
      title: "Bản hoàn chỉnh và phép kiểm",
      description: "128³ thật, kiểm affine độc lập và phân biệt Canvas CPU với executable C++.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
