import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "DOUBLE PENDULUM CHAOS LAB",
    title: "Một sai khác ban đầu rất nhỏ sẽ lớn lên như thế nào?",
    description:
      "Cho hai double pendulum chạy lockstep, đổi initial angles, epsilon và fixed dt; quan sát trail, phase-space separation, second-bob distance, energy drift và numerical shadow error.",
  },
  modes: {
    "chaos-geometry": {
      title: "Hai góc quyết định vị trí hai bob như thế nào?",
      description:
        "Kéo theta1/theta2 và đọc pivot, bob1, bob2; rod length phải giữ nguyên vì position được suy ra từ generalized coordinates.",
    },
    "chaos-derivative": {
      title: "Cùng một state tạo ra alpha1 và alpha2 nào?",
      description:
        "Đổi angle và angular velocity rồi đọc angle difference, shared denominator cùng hai angular acceleration trước khi state bị tích phân.",
    },
    "chaos-rk4": {
      title: "RK4 giữ energy ra sao khi fixed dt thay đổi?",
      description:
        "Tiến từng step hoặc chạy một pendulum; theo dõi mechanical energy và relative drift ở nhiều fixed dt.",
    },
    "chaos-twins": {
      title: "Hai state chỉ lệch epsilon còn trùng nhau được bao lâu?",
      description:
        "Đổi perturbation, tiến lockstep và theo dõi hai trail; elapsed cùng step count phải luôn giống nhau.",
    },
    "chaos-separation": {
      title: "Đo divergence thế nào khi angle đi qua biên ±pi?",
      description:
        "So raw angle difference với wrapped difference, đọc phase-space distance và logarithmic separation graph.",
    },
    "chaos-shadow": {
      title: "Đường tách ra vì chaos hay vì dt quá lớn?",
      description:
        "So intentional twin separation với numerical shadow separation từ cùng initial state chạy hai half-step.",
    },
    "chaos-validation": {
      title: "Kết luận chaos cần những bằng chứng nào?",
      description:
        "Chạy Calm, Chaotic, Near upright trong thời lượng hữu hạn; kiểm energy, finite state, shadow error, reset và pointer interaction.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
