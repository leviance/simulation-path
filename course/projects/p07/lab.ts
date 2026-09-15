import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "UNIT CIRCLE LAB",
    title: "Một góc tạo ra chuyển động và đồ thị như thế nào?",
    description:
      "Đổi góc, vận tốc hoặc kéo đầu kim để đối chiếu radian, sin, cos, projection và atan2.",
  },
  modes: {
    "angle-radians": {
      title: "Một vòng có bao nhiêu radian?",
      description:
        "Chọn các góc quen thuộc và quan sát cung góc trước khi dùng sin hoặc cos để tính tọa độ.",
    },
    "angle-sincos": {
      title: "Cosine và sine đặt đầu kim ở đâu?",
      description: "Đổi angle để xem trực tiếp endpoint=(cos(angle), sin(angle)) trên unit circle.",
    },
    "angle-motion": {
      title: "Vận tốc góc quyết định chu kỳ ra sao?",
      description:
        "Cho kim chạy theo delta time, đổi radian/giây và đối chiếu thời gian cần để hoàn thành một vòng.",
    },
    "angle-projections": {
      title: "Hai hình chiếu có đúng bằng cos và sin?",
      description:
        "Hai đoạn chiếu tách endpoint thành thành phần X màu xanh dương và thành phần Y màu xanh lá.",
    },
    "angle-graphs": {
      title: "Chuyển động tròn trở thành hai đồ thị nào?",
      description:
        "Theo dõi cùng một angle trên unit circle và hai đường sin/cos lệch pha một phần tư chu kỳ.",
    },
    "angle-atan2": {
      title: "Kéo một điểm rồi khôi phục angle bằng atan2",
      description:
        "Kéo đầu kim qua bốn góc phần tư và so góc suy ra với endpoint được tạo lại từ sin/cos.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
