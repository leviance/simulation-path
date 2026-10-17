import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "PROCEDURAL TERRAIN",
    title: "Một hàm độ cao cho cả world",
    description:
      "Thử seed, scale và octave; xem mesh resident, bản đồ độ cao và mặt cắt để phân biệt bậc voxel với lỗi reset tọa độ ở biên.",
  },
  modes: {
    "terrain63-1": {
      title: "Chạy world phẳng và tìm đúng chỗ tạo địa hình",
      description:
        "Chạy starter có streaming và mesh; theo một cột từ world X/Z tới Block ID rồi lên ảnh.",
    },
    "terrain63-2": {
      title: "Cho mặt đất nhấp nhô bằng một hàm độ cao",
      description:
        "Dùng một hàm trơn dễ đoán trước khi thêm noise; tách số block khỏi tọa độ block trên cùng.",
    },
    "terrain63-3": {
      title: "Tạo giá trị giả ngẫu nhiên mà không phụ thuộc thứ tự tải",
      description:
        "Viết hash uint32_t theo địa chỉ lattice, thử seed và thấy vì sao hash riêng lẻ chưa tạo được đồi.",
    },
    "terrain63-4": {
      title: "Nối bốn giá trị thành một mặt địa hình êm",
      description:
        "Floor ở miền âm, smoothstep và nội suy hai chiều; phân biệt value noise với gradient noise.",
    },
    "terrain63-5": {
      title: "Thêm chi tiết bằng nhiều octave",
      description:
        "Cộng các lớp có tần số tăng, biên độ giảm, chuẩn hóa tổng và giới hạn tần số lấy mẫu.",
    },
    "terrain63-6": {
      title: "Biến độ cao thành cỏ, đất và đá",
      description:
        "Lấp đầy cột không off-by-one, chọn vật liệu theo độ cao và kiểm mặt chung của hai chunk.",
    },
    "terrain63-7": {
      title: "Đổi seed và cấu hình mà không trộn hai world",
      description:
        "Chụp cấu hình bất biến, khởi tạo thế hệ mới hữu hạn rồi để streaming tải phần còn lại.",
    },
    "terrain63-8": {
      title: "Đọc địa hình bằng bản đồ và mặt cắt",
      description:
        "Đối chiếu tín hiệu liên tục với cột voxel, thử lỗi dùng local và quan sát cả biên âm.",
    },
    "terrain63-9": {
      title: "Kiểm chứng địa hình và chạy source hoàn chỉnh",
      description:
        "Golden hash C++/TypeScript, oracle cột/bề mặt, regeneration và kiểm thử có deadline.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
