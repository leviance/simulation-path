import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "CPU TEXTURE LAB",
    title: "Cùng một mặt phẳng, hai cách dán bàn cờ",
    description:
      "Quay mặt phẳng để thấy affine méo ở đâu; bật corrected rồi kiểm UV bằng giao ray–plane độc lập.",
  },
  modes: {
    "texture-quad": {
      title: "Mặt phẳng quay, UV vẫn nằm ở bốn góc",
      description: "Chưa tô texture: kiểm hình học, chiều sâu và UV trước.",
    },
    "texture-sampling": {
      title: "UV này chọn texel nào?",
      description:
        "Chọn UV, thử clamp/repeat và quan sát ô texel được đánh dấu trên ảnh nguồn 64 × 64.",
    },
    "texture-affine": {
      title: "Tô bàn cờ bằng affine trước",
      description:
        "So tư thế chính diện với nghiêng mạnh; đây là bản đối chứng chưa sửa perspective.",
    },
    "texture-error": {
      title: "Đo UV đúng tại tâm pixel",
      description:
        "Chọn pixel trong quad, so affine UV với giao ray–plane; click ngoài quad không tạo số liệu giả.",
    },
    "texture-reciprocal": {
      title: "Mang theo 1/z, u/z và v/z",
      description: "Ảnh chưa đổi; kiểm denominator dương và tìm hiểu dữ liệu sẽ dùng để sửa UV.",
    },
    "texture-correct": {
      title: "Chia lại tại pixel, bàn cờ hết gãy theo diagonal",
      description: "M đổi affine/corrected, C bật so sánh; hai ảnh dùng cùng geometry và sampler.",
    },
    "texture-clip": {
      title: "Mặt phẳng đi xuyên near plane",
      description: "Preset 4 cắt một phần quad; UV phải liên tục sau clipping và projection.",
    },
    "texture-validation": {
      title: "Texture mapper hoàn chỉnh",
      description:
        "So sánh A/B, xoay quad, chạy/dừng, tiến từng bước và bật debug để kiểm công thức.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
