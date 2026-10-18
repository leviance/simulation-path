import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "VECTOR LAB",
    title: "Hai vector cùng gốc, nhiều cách quan sát",
    description:
      "Kéo đầu mũi tên và đối chiếu công thức với hình học; mọi kết quả được tính lại từ A/B.",
  },
  modes: {
    "vector-spaces": {
      title: "Từ hai tọa độ tới hai đoạn thẳng",
      description:
        "Chọn preset và đối chiếu world coordinate; chưa bật kéo thả hay phép toán bổ sung.",
    },
    "vector-magnitude": {
      title: "Độ dài khác với chiều dài đầu mũi tên",
      description:
        "Quan sát các preset, kể cả zero; đầu tên được dựng theo screen pixel, không phải world unit.",
    },
    "vector-drag": {
      title: "Chọn đúng endpoint và giữ chỗ đang nắm",
      description:
        "Kéo A/B, đọc vùng hit-test cùng screen/world coordinate; trùng điểm thì ưu tiên vector đang chọn.",
    },
    "vector-addition": {
      title: "Vì sao A+B nằm ở góc đối diện của hình bình hành?",
      description: "Hai cạnh phụ là các bản sao của A và B, chỉ đổi vị trí đặt.",
    },
    "vector-subtraction": {
      title: "A−B là độ dời từ B tới A",
      description: "So vector hiệu tại gốc, bản sao B→A và vector −B.",
    },
    "vector-scalar-distance": {
      title: "Scalar thay đổi A thế nào, distance(A,B) đo đoạn nào?",
      description: "Thay scalar, so độ dài từ gốc với đoạn nối hai endpoint.",
    },
    "vector-normalize": {
      title: "Normalize giữ hướng và đưa độ dài về một",
      description: "Đối chiếu mũi tên trắng với vòng tròn bán kính một; zero không có hướng.",
    },
    "vector-full": {
      title: "Mô phỏng vector hoàn chỉnh",
      description:
        "A/B, tổng và hiệu luôn có mặt; chọn lớp bổ sung để thử scalar, normalize hoặc lerp.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
