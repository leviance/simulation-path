import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOXEL SANDBOX",
    title: "Xây một góc world của riêng bạn",
    description:
      "Ngắm, phá/đặt, đi xa rồi quay về; quan sát delta, mesh và lịch sử, sau đó xuất bản lưu text để khôi phục.",
  },
  modes: {
    "sandbox64-1": {
      title: "Chạy world đang có và thêm tâm ngắm",
      description:
        "Chạy terrain/streaming trước, đặt tâm ngắm vào ảnh CPU và phân biệt thao tác xem với sửa dữ liệu.",
    },
    "sandbox64-2": {
      title: "Đưa tia từ camera về đúng world",
      description:
        "Bù offset player, đi qua tâm pixel và giữ t là khoảng cách từ mặt phẳng origin của camera trực giao.",
    },
    "sandbox64-3": {
      title: "Chọn block đầu tiên qua nhiều chunk",
      description:
        "DDA world có giới hạn; xử lý tọa độ âm, tie và vùng chưa tải mà không chọn xuyên qua dữ liệu chưa biết.",
    },
    "sandbox64-4": {
      title: "Phá, đặt và chọn vật liệu",
      description:
        "Mỗi action truy vấn lại ray rồi sửa tối đa một cell; không ghi đè, không đặt vượt tầng hoặc vào chunk chưa tải.",
    },
    "sandbox64-5": {
      title: "Giữ thay đổi khi chunk bị gỡ khỏi RAM",
      description:
        "Tách terrain nền với delta world, lưu cả Air khi phá và phủ lại delta sau regeneration.",
    },
    "sandbox64-6": {
      title: "Cập nhật mesh và preview đúng lúc",
      description:
        "Gộp dirty Key sau edit, xử lý mặt biên và tách bộ đếm mesh edit khỏi batch streaming.",
    },
    "sandbox64-7": {
      title: "Undo và redo bằng địa chỉ world",
      description:
        "Command giữ cell/before/after, lịch sử hữu hạn và có thể hoàn tác cả khi chunk đã gỡ.",
    },
    "sandbox64-8": {
      title: "Xuất và nhập một bản lưu có thể kiểm tra",
      description:
        "Định dạng VXL1 dùng chung C++/Canvas; parse toàn bộ, kiểm giới hạn rồi mới thay world.",
    },
    "sandbox64-9": {
      title: "Hoàn thiện điều khiển và vòng đời tương tác",
      description:
        "Thêm preset di chuyển giữ edit, ngắm bằng phím, pause/reset, capture/blur và thao tác không auto-repeat.",
    },
    "sandbox64-10": {
      title: "Kiểm chứng và nghiệm thu sandbox",
      description:
        "Đối chiếu picking bằng oracle AABB, kiểm surface, session delta, bản lưu và source hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
