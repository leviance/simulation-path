import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOLUME SLICE LAB",
    title: "Khối vật liệu cắt mở",
    description:
      "Bỏ một góc khối để nhìn lõi xoắn, dời ba lát và đọc scalar thật. Xoay camera không đổi điểm đo; đây không phải CT/HU.",
  },
  modes: {
    "slice53-1": {
      title: "Nhìn thấy lát cắt đầu tiên",
      description: "Từ phantom scalar đến ảnh mức xám và streaming texture SDL3.",
    },
    "slice53-2": {
      title: "Lưu cả khối, không chỉ tính một ảnh",
      description: "Khối 64³/128³ thật, tâm mẫu, spacing và địa chỉ x nhanh nhất.",
    },
    "slice53-3": {
      title: "Ba mặt cắt của cùng một khối",
      description: "XY/XZ/YZ, trục giữ cố định và tỉ lệ hình theo physical spacing.",
    },
    "slice53-4": {
      title: "Làm rõ chi tiết mà không sửa dữ liệu",
      description: "Tách scalar, window/level, brightness và byte màu.",
    },
    "slice53-5": {
      title: "Đi giữa hai lát bằng trilinear",
      description: "Tâm mẫu, tám voxel, bảy lerp và cách xử lý nửa voxel sát mép.",
    },
    "slice53-6": {
      title: "Chọn một điểm, hiểu cả ba mặt cắt",
      description: "Crosshair đồng bộ, pointer input, keyboard và quét có thể dừng.",
    },
    "slice53-7": {
      title: "Chứng minh trình xem đang đọc đúng dữ liệu",
      description: "Phím V, affine-field oracle, CTest Debug/Release và source tải về.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
