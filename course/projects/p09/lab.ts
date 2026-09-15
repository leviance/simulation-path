import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "TRANSFORM LAB",
    title: "Một điểm đi qua các phép biến đổi như thế nào?",
    description:
      "Điều chỉnh hình vuông và theo dõi local point, các bước trung gian, vector cơ sở, ma trận ghép cùng determinant trên một hệ trục.",
  },
  modes: {
    "transform-local": {
      title: "Local space giúp hình vuông giữ dữ liệu gốc ra sao?",
      description:
        "Kéo gốc của vật thể nhưng giữ nguyên bốn local point; world point chỉ được tính khi chuẩn bị vẽ.",
    },
    "transform-scale": {
      title: "Scale thay đổi từng trục và hướng của hình thế nào?",
      description:
        "Đổi scale X/Y, thử giá trị 0 và số âm rồi quan sát kích thước, phép phản chiếu cùng determinant.",
    },
    "transform-rotation": {
      title: "Sin và cos xoay hai vector cơ sở thế nào?",
      description:
        "Điều chỉnh góc để theo dõi trục X, trục Y và bốn đỉnh cùng quay mà độ dài cạnh không đổi.",
    },
    "transform-shear": {
      title: "Shear làm nghiêng hình nhưng vẫn giữ các cạnh song song ra sao?",
      description:
        "Điều chỉnh shear X/Y và quan sát một tọa độ nhận thêm một phần của tọa độ còn lại.",
    },
    "transform-matrix": {
      title: "Ma trận ghép thay thế chuỗi hàm như thế nào?",
      description:
        "Theo dõi một đỉnh qua từng bước và so kết quả tuần tự với kết quả từ một ma trận 3×3 duy nhất.",
    },
    "transform-order": {
      title: "Vì sao đổi thứ tự lại tạo ra một hình khác?",
      description:
        "Chuyển giữa hai thứ tự ghép, so vị trí các đỉnh và dùng determinant để kiểm tra tỉ lệ diện tích.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
