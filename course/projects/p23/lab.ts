import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "INTEGRATOR RACE LAB",
    title: "Ba integrator nhìn cùng một lực sẽ đi khác nhau ra sao?",
    description:
      "Kéo initial position, đổi stiffness cùng fixed dt rồi theo dõi exact ghost, phase-space error, energy drift và force-evaluation count của Euler, Velocity Verlet, RK4.",
  },
  modes: {
    "integrator-system": {
      title: "Một harmonic oscillator được mô tả bằng state nào?",
      description:
        "Kéo mass để đổi initial position và quan sát acceleration, angular frequency, exact state cùng total energy trước khi tích phân số.",
    },
    "integrator-euler": {
      title: "Euler lấy đạo hàm ở đâu và làm energy trôi ra sao?",
      description:
        "Tiến từng bước lane Euler; position dùng velocity đầu bước, velocity dùng acceleration tại position đầu bước.",
    },
    "integrator-verlet": {
      title: "Velocity Verlet dùng hai acceleration thế nào?",
      description:
        "Theo dõi a0, position mới, a1 và velocity mới; so energy drift với Euler ở cùng dt.",
    },
    "integrator-rk4": {
      title: "Bốn stage RK4 đánh giá phase space ở đâu?",
      description:
        "Xem k1–k4, weights 1-2-2-1 và số derivative evaluation được trả cho độ chính xác cao hơn.",
    },
    "integrator-lockstep": {
      title: "Một race công bằng cần khóa những gì?",
      description:
        "Ba lane dùng cùng initial state, parameters, fixed dt và step count; evaluation counter là khác biệt được phép.",
    },
    "integrator-energy": {
      title: "State error và energy drift kể hai câu chuyện nào?",
      description:
        "Chuyển graph giữa position và relative energy drift, đọc exact ghost cùng phase-space error đã chuẩn hóa.",
    },
    "integrator-validation": {
      title: "Integrator nào thắng khi đổi dt và thời lượng?",
      description:
        "Đổi giữa các mức fixed dt, chạy nhanh 20 giây và so convergence, stability cùng error per force evaluation.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
