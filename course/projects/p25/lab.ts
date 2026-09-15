import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "SPRING CHAIN LAB",
    title: "Một dao động truyền qua chuỗi mass–spring như thế nào?",
    description:
      "Kéo một mass rồi thả, đổi stiffness, damping, gravity và fixed dt; theo dõi stretch, velocity, energy cùng độ lệch ngang của từng particle.",
  },
  modes: {
    "spring-scene": {
      title: "Chuỗi được biểu diễn bằng dữ liệu nào?",
      description:
        "Đọc topology 18 particles–17 springs, rest length và inverse mass; anchor có inverse mass zero nên không phải một ngoại lệ giấu trong renderer.",
    },
    "spring-hooke": {
      title: "Kéo giãn và nén đổi lực Hooke ra sao?",
      description:
        "Chọn một spring, thay distance và đọc direction, stretch cùng hai force vector bằng nhau nhưng ngược chiều.",
    },
    "spring-forces": {
      title: "Nhiều lực được cộng vào mỗi mass theo thứ tự nào?",
      description:
        "Bật gravity và force arrows để phân biệt external force, internal spring pair và reaction tại anchor.",
    },
    "spring-integration": {
      title: "Force trở thành chuyển động qua một substep thế nào?",
      description:
        "Single-step semi-implicit Euler và xem force → acceleration → velocity → position trong fixed dt.",
    },
    "spring-damping": {
      title: "Damping nào làm dao động tắt mà không dính ngang?",
      description:
        "So zero/medium/high axial damping; tangent relative velocity được giữ vì không làm spring dài hoặc ngắn.",
    },
    "spring-drag": {
      title: "Một lần kéo tạo wave chạy qua chuỗi ra sao?",
      description:
        "Kéo một mass bằng pointer capture rồi thả; biểu đồ displacement theo index cho thấy tín hiệu đến từng hàng xóm.",
    },
    "spring-stability": {
      title: "Khi nào spring cứng làm integrator mất ổn định?",
      description:
        "Đổi k, mass và dt để quan sát q=dt·sqrt(k/m), energy growth và finite-state guard thay vì đoán bằng mắt.",
    },
    "spring-validation": {
      title: "Chuỗi trông mượt có vượt qua stress test không?",
      description:
        "Chạy nhanh 20 giây, đo kinetic/spring/gravity energy, maximum stretch, speed, anchor error và finite state.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
