import type { GlossaryTerm } from "./glossary";

export const millionObjectCityGlossaryTerms: GlossaryTerm[] = [
  {
    id: "city-frustum-culling",
    term: "Bounding-volume frustum culling",
    definition:
      "Phép loại vật thể có bounding volume nằm hoàn toàn ngoài một trong sáu mặt phẳng của vùng nhìn. Vật thể được nhận vẫn có thể bị vật thể khác che. Project 39 dùng sphere bao toàn mesh để tránh làm mất phần hình cắt mép frustum; đây không phải occlusion culling.",
    keywords: "camera six plane sphere bounds vùng nhìn accepted rejected",
  },
  {
    id: "city-stable-compaction",
    term: "Stable visibility compaction",
    definition:
      "Gom record được nhận vào một danh sách liên tục bằng mask và exclusive prefix, không dựa vào thứ tự invocation đến nơi. Trong Project 39, nhóm mesh xếp trước, record index tăng dần trong mỗi nhóm. Visible list chứa record index để đọc object; Object.id là định danh ổn định có thể rời rạc.",
    keywords: "visible IDs scatter gather prefix integer order compact",
  },
  {
    id: "city-indirect-command",
    term: "GPU-generated indirect draw command",
    definition:
      "Record mô tả số index, số instance và vùng index mà lệnh vẽ sẽ dùng. Compute shader có thể ghi record này, sau đó draw đọc trực tiếp từ indirect buffer. OpenGL 4.3 cho phép giữ số command cố định; không cần CPU đọc instanceCount và không mặc định có API draw-count của OpenGL 4.6.",
    keywords: "draw elements indirect instanceCount firstIndex baseVertex command barrier",
  },
  {
    id: "city-render-counts",
    term: "Resident / tested / accepted / submitted",
    definition:
      "Bốn số có phạm vi khác nhau: resident là record đang giữ; tested là record đã xét trong frame; accepted là record qua phép kiểm bounds/frustum; submitted là tổng instance trong lệnh gửi vẽ. Accepted/submitted không phải số vật thể có pixel trên ảnh vì depth test còn có thể che chúng.",
    keywords: "million records scale visibility GPU count telemetry",
  },
];
