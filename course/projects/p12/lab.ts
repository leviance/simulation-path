import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "ROTATION LAB",
    title: "Tam giác và normal quay cùng nhau thế nào?",
    description:
      "Perspective thật, rotation trực tiếp sin/cos, pivot, hai order và chuột/keyboard.",
  },
  modes: {
    "rotation-triangle": {
      title: "Nối ba điểm thành tam giác 3D",
      description: "Từ framebuffer và phép chiếu P11, vẽ ba cạnh, các đỉnh và nền 3D.",
    },
    "rotation-pivot": {
      title: "Đặt pivot bằng local space",
      description: "Tách local vertex khỏi vị trí model để chuẩn bị xoay quanh centroid.",
    },
    "rotation-x": {
      title: "Quay quanh X bằng sin và cos",
      description: "Suy phép quay cặp Y/Z, rồi ghép local → rotated → world.",
    },
    "rotation-euler": {
      title: "Ghép X/Y/Z và thử hai thứ tự",
      description: "Tự viết quay Y/Z, so XYZ với ZYX và phân biệt trục cố định với trục local.",
    },
    "rotation-normal": {
      title: "Cho normal quay cùng tam giác",
      description: "Suy normal từ cạnh đã quay, vẽ mũi tên 3D và kiểm hướng độc lập.",
    },
    "rotation-mouse": {
      title: "Kéo chuột để xoay, Q/E để roll",
      description:
        "Giữ chỗ nắm, pointer owner và mẫu thả cuối; object không bị khóa pitch như FPS camera.",
    },
    "rotation-motion": {
      title: "Tự quay và xem cảnh không có debug",
      description: "Cập nhật góc bằng dt, pause/step/reset và tách hình chính khỏi overlay.",
    },
    "rotation-full": {
      title: "Kiểm chứng và chạy bản hoàn chỉnh",
      description: "Dùng đáp án tính tay, invariant, inverse và toàn bộ source để nghiệm thu.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
