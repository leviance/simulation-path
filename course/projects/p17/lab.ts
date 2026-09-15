import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "Z-BUFFER LAB",
    title: "Mỗi pixel chọn bề mặt gần camera bằng cách nào?",
    description:
      "Xoay cube, đảo draw order và chọn một pixel để theo dõi từng fragment. Lab dùng cùng NDC depth, barycentric interpolation và phép compare/write như source C++.",
  },
  modes: {
    "depth-cube": {
      title: "Mười hai triangle ghép thành cube đặc ra sao?",
      description:
        "Quan sát tám vertex, sáu mặt màu và draw list trước khi thêm bất kỳ phép thử che khuất nào.",
    },
    "depth-order": {
      title: "Tại sao triangle vẽ sau chưa chắc nằm trước?",
      description:
        "Tắt depth test rồi đảo draw order; cùng một scene cho hai color buffer khác nhau dù geometry không đổi.",
    },
    "depth-storage": {
      title: "Depth buffer phải đi cùng color buffer thế nào?",
      description:
        "Chọn pixel để đọc row-major index, kích thước hai buffer và giá trị clear 1.0 của frame hiện tại.",
    },
    "depth-interpolate": {
      title: "Depth ở giữa triangle đến từ đâu?",
      description:
        "Đọc ba barycentric weights và phép tổ hợp z=wA·zA+wB·zB+wC·zC tại sample đã chọn.",
    },
    "depth-test": {
      title: "Một fragment pass hay fail ở đúng bước nào?",
      description:
        "Tiến từng fragment tại sample để so newDepth với storedDepth và xem color/depth chỉ đổi khi phép thử pass.",
    },
    "depth-mesh": {
      title: "Mọi mặt có thực sự dùng chung một fragment path?",
      description:
        "Xoay cube và xem thống kê covered, passed, rejected của đủ mười hai triangle trong cùng pipeline.",
    },
    "depth-validate": {
      title: "Làm sao chứng minh kết quả không phụ thuộc draw order?",
      description:
        "So checksum của color/depth buffer khi vẽ xuôi và ngược; depth test đúng phải cho difference bằng zero.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
