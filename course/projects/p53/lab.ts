import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOLUME SLICE LAB",
    title: "Cắt một khối scalar theo ba hướng",
    description:
      "Dời mặt phẳng, chỉnh tương phản và đồng bộ crosshair; dữ liệu tổng hợp không phải CT/HU.",
  },
  modes: {
    "slice53-1": {
      title: "Vẽ lát cắt đầu tiên trước khi dựng volume",
      description: "Từ phantom scalar đến ảnh mức xám và streaming texture SDL3.",
    },
    "slice53-2": {
      title: "Lưu khối 3D bằng voxel và kiểm đúng địa chỉ",
      description: "Grid không lập phương, spacing khác nhau và row-major x nhanh nhất.",
    },
    "slice53-3": {
      title: "Đọc cùng khối dữ liệu theo ba hướng cắt",
      description: "XY/XZ/YZ, trục giữ cố định và tỉ lệ hình theo physical spacing.",
    },
    "slice53-4": {
      title: "Chỉnh tương phản mà không sửa dữ liệu volume",
      description: "Tách scalar, window/level, brightness và byte màu.",
    },
    "slice53-5": {
      title: "Dời mặt cắt liên tục bằng trilinear",
      description: "World→grid có −0.5; tám mẫu, trọng số và chính sách mép.",
    },
    "slice53-6": {
      title: "Ghép ba lát cắt qua cùng một điểm trong world",
      description: "Crosshair đồng bộ, pointer input, keyboard và quét có thể dừng.",
    },
    "slice53-7": {
      title: "Kiểm volume bằng oracle rồi chạy project hoàn chỉnh",
      description: "Phím V, affine-field oracle, CTest Debug/Release và source tải về.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
