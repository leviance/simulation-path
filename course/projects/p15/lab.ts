import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "3D PIPELINE LAB",
    title: "Cùng một vertex, sáu hệ tọa độ",
    description:
      "Chọn điểm trên mô hình và thay đổi transform/lens; đọc giá trị trung gian bên cạnh cảnh 3D.",
  },
  modes: {
    "pipeline-local": {
      title: "Dựng cảnh 3D và bảng theo dõi vertex",
      description:
        "Từ bộ khung CPU của P13/P14, chọn vertex và hiện Local thật; các stage chưa viết để trống có giải thích.",
    },
    "pipeline-homogeneous": {
      title: "Thêm w để tịnh tiến bằng ma trận",
      description:
        "Tự viết Mat4 và phép nhân; dùng cùng xyz để kiểm sự khác nhau giữa point w=1 và direction w=0.",
    },
    "pipeline-model": {
      title: "Đưa mô hình từ local ra world",
      description:
        "Scale, xoay rồi tịnh tiến bằng M=T×Ry×S; nối cả bảng số lẫn renderer sang model matrix.",
    },
    "pipeline-view": {
      title: "Viết lại camera bằng view matrix",
      description:
        "Đổi công thức camera của P14 thành V, giữ world đứng yên và kiểm bằng inverse yaw/pitch tường minh.",
    },
    "pipeline-projection": {
      title: "Giữ mẫu số trong clip.w",
      description:
        "Suy từng hàng của perspective matrix từ FOV, aspect và hai điều kiện near/far; matrix chưa chia cho w.",
    },
    "pipeline-viewport": {
      title: "Chia cho w và tìm pixel trên màn hình",
      description:
        "Giữ stage không tồn tại dưới dạng optional, phân loại clip và thay đường tham chiếu bằng renderer dùng P.",
    },
    "pipeline-validation": {
      title: "Ghép MVP và kiểm chứng bản hoàn chỉnh",
      description:
        "Theo ví dụ tính tay qua đủ sáu stage, thêm pause/step/clean và chạy source độc lập cùng CTest.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
