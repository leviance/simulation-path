import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "VECTOR LAB",
    title: "Điều gì xảy ra khi A hoặc B thay đổi?",
    description:
      "Kéo điểm cuối của A và B để quan sát trực tiếp phép cộng, phép trừ, magnitude, normalize và lerp.",
  },
  modes: {
    "vector-magnitude": {
      title: "Độ lớn và hướng của vector thay đổi như thế nào?",
      description:
        "Kéo điểm cuối của A hoặc B; lab chỉ hiển thị hai vector cùng normalize(A) để tập trung vào cấu tạo của một mũi tên.",
    },
    "vector-drag": {
      title: "Chương trình xác định điểm cuối được kéo như thế nào?",
      description:
        "Lab hiển thị vùng hit-test, tọa độ chuột trong screen/world space và điểm cuối đang được giữ.",
    },
    "vector-addition": {
      title: "Vì sao A+B nằm ở góc đối diện của hình bình hành?",
      description:
        "Kéo A hoặc B để đối chiếu phép cộng theo từng thành phần với hình bình hành trên mặt phẳng.",
    },
    "vector-scalar-distance": {
      title: "Scalar thay đổi A như thế nào và distance(A,B) đang đo đoạn nào?",
      description:
        "So sánh |A|, |B| với distance(A,B), đồng thời thay đổi scalar để quan sát A co, giãn hoặc đảo hướng.",
    },
    "vector-normalize": {
      title: "Normalize giữ lại điều gì và lerp đặt điểm ở đâu?",
      description:
        "So sánh A với vector đơn vị cùng hướng, sau đó thay đổi t để theo dõi điểm nội suy trên đoạn A–B.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
