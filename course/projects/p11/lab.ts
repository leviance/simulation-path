import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PROJECTION LAB",
    title: "Một điểm 3D đi qua projection pipeline như thế nào?",
    description:
      "Di chuyển point và camera, rồi theo dõi world space, camera space, perspective divide, NDC, pixel cùng các điều kiện visibility trên hai góc nhìn liên kết.",
  },
  modes: {
    "projection-point": {
      title: "Làm sao biết dữ liệu Vec3 và marker đã hoạt động?",
      description:
        "Điều khiển X/Y/Z của một point; bản xem trước tạm dùng X/Y để xác nhận input và phần vẽ trước khi projection xuất hiện.",
    },
    "projection-camera": {
      title: "Camera di chuyển làm tọa độ của point đổi ra sao?",
      description:
        "So world point với camera point = world point − camera position trên sơ đồ nhìn từ cạnh.",
    },
    "projection-divide": {
      title: "Vì sao chia cho Z làm điểm ở xa tiến về tâm?",
      description:
        "Giữ X/Y cố định, thay đổi depth và quan sát x/z, y/z cùng vị trí marker trên màn hình.",
    },
    "projection-fov": {
      title: "FOV và aspect ratio biến kết quả chia thành NDC thế nào?",
      description:
        "Điều chỉnh vertical FOV và kích thước viewport để theo dõi focal scale, NDC rồi pixel.",
    },
    "projection-visibility": {
      title: "Khi nào một point không được phép ghi pixel?",
      description:
        "Đưa point qua camera, near plane và biên frustum để phân biệt behind, before-near, outside và visible.",
    },
    "projection-motion": {
      title: "Projection có giữ đúng khi point bay qua nhiều depth?",
      description:
        "Chạy, pause hoặc step quỹ đạo; theo dõi round-trip error và mọi trạng thái projection trong thời gian thực.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
