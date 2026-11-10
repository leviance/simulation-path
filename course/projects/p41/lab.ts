import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "XƯỞNG HÌNH HỌC 3D",
    title: "Đổi u/v, nhìn mô hình đổi hình",
    description:
      "Canvas dựng lưới nhỏ từ cùng công thức với C++. Dùng nó để nhìn tangent, từng ô, đường nối và frame; mốc 66.049 đỉnh, buffer OpenGL và OBJ thuộc bản chạy C++.",
  },
  modes: {
    patch: {
      title: "Một điểm, hai tangent, một normal",
      description:
        "Kéo độ cao của tấm và đổi điểm đang đọc. Theo hai mũi tên tangent để đoán hướng normal.",
    },
    topology: {
      title: "Bốn góc, hai tam giác",
      description:
        "Đổi ô đang chọn để đọc bốn ID. Đảo winding để thấy hướng mặt khác gì với vị trí.",
    },
    torus: {
      title: "Cùng vị trí, khác UV",
      description: "Đổi bán kính và nhìn hai mép tuần hoàn. Bật UV rồi so các bản ghi đầu/cuối.",
    },
    mobius: {
      title: "Đi hết vòng, gặp cột đối diện",
      description:
        "Đổi số nửa vòng và cột đang đọc. Hai dấu ở seam trùng chỗ nhưng tangent ngang đổi hướng.",
    },
    shell: {
      title: "Một lát cắt đi từ chóp tới miệng",
      description:
        "Chọn vị trí lát cắt. Đổi Growth, số vòng và độ xoắn để phân biệt đường tâm với tiết diện.",
    },
    knot: {
      title: "Góc còn dư ở chỗ khép ống",
      description:
        "Đổi nút ba/năm múi và bật tắt bù frame. Quan sát vòng cuối khi mép không còn cùng hướng.",
    },
    preview: {
      title: "Dựng xem trước, rồi làm mịn",
      description:
        "Thử đổi resolution khi đang kéo, tiến từng batch hoặc hủy. So yêu cầu với mesh đang hiển thị.",
    },
    export: {
      title: "Một tam giác thành dòng f",
      description:
        "Chọn tam giác và thử đổi cách đếm chỉ số. Canvas không ghi file OBJ thay ứng dụng C++.",
    },
    showcase: {
      title: "So bốn bề mặt trong cùng xưởng",
      description:
        "Đổi preset, tham số và góc nhìn. Bật/tắt các lớp kiểm rồi quan sát hình hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
