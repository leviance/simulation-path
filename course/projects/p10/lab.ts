import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "NORMAL LAB",
    title: "Ba đỉnh quyết định vector pháp tuyến như thế nào?",
    description:
      "Di chuyển tam giác trong la bàn X/Y/Z và theo dõi hai vector cạnh, cross product, unit normal, diện tích cùng winding trên một sơ đồ.",
  },
  modes: {
    "normal-axes": {
      title: "Ba thành phần X/Y/Z được vẽ lên màn hình ra sao?",
      description:
        "Thay đổi một điểm 3D và quan sát ba đoạn thành phần trước khi nó được chiếu bằng sơ đồ axonometric cố định.",
    },
    "normal-edges": {
      title: "Hai cạnh xuất phát từ A được tạo như thế nào?",
      description: "Kéo A, B hoặc C và theo dõi AB=B−A, AC=C−A thay đổi cùng tam giác.",
    },
    "normal-cross": {
      title: "Cross product tìm hướng vuông góc ra sao?",
      description:
        "Theo dõi raw normal AB×AC và hai dot product dùng để kiểm tra nó vuông góc với cả AB lẫn AC.",
    },
    "normal-unit-area": {
      title: "Một vector chứa cả hướng normal lẫn diện tích như thế nào?",
      description:
        "So raw normal với unit normal và kiểm tra diện tích tam giác bằng một nửa độ dài cross product.",
    },
    "normal-winding": {
      title: "Vì sao đổi thứ tự đỉnh làm normal quay ngược?",
      description:
        "Đảo B và C, quan sát normal đổi dấu nhưng diện tích giữ nguyên, rồi đọc front/back bằng dot product.",
    },
    "normal-degenerate": {
      title: "Điều gì xảy ra khi ba đỉnh nằm trên một đường thẳng?",
      description:
        "Kéo tam giác về gần trạng thái suy biến, theo dõi độ dài cross và kiểm tra chương trình không normalize vector zero.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
