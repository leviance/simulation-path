import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PROJECTILE LAB",
    title: "Một cú kéo chuột trở thành quỹ đạo như thế nào?",
    description:
      "Chọn góc, tốc độ và fixed dt rồi theo dõi vận tốc đầu, nghiệm giải tích, từng bước Explicit Euler, impact cùng sai số bằng đúng biến trong source C++.",
  },
  modes: {
    "projectile-aim": {
      title: "Vector kéo chuột được đổi sang world velocity ra sao?",
      description:
        "Kéo đầu mũi tên quanh nòng pháo; Canvas đảo trục Y, clamp góc/tốc độ và báo trạng thái pointer capture.",
    },
    "projectile-components": {
      title: "Speed-angle tạo vx và vy như thế nào?",
      description:
        "Đổi góc hoặc tốc độ để xem hai component vuông góc cộng lại thành đúng vector vận tốc đầu.",
    },
    "projectile-analytic": {
      title: "Công thức giải tích dự đoán đường bay nào?",
      description:
        "Đường vàng lấy mẫu p(t); marker apex và impact đến từ nghiệm theo thời gian, chưa chạy integrator.",
    },
    "projectile-euler": {
      title: "Explicit Euler lệch khỏi parabol ra sao?",
      description:
        "Tiến từng bước để thấy position dùng velocity cũ, velocity mới nhận gravity và sai số tích lũy dần.",
    },
    "projectile-timestep": {
      title: "Accumulator tách physics step khỏi render frame thế nào?",
      description:
        "Đổi fixed dt và mô phỏng frame chậm; readout cho biết accumulator, substep và phần thời gian bị giới hạn.",
    },
    "projectile-impact": {
      title: "Viên đạn chạm đất ở đâu giữa hai sample?",
      description:
        "So vị trí xuyên ground với điểm được nội suy, đồng thời đọc exact impact time từ phương trình bậc hai.",
    },
    "projectile-validation": {
      title: "Sai số có giảm khi fixed dt nhỏ đi không?",
      description:
        "Bắn lại với nhiều dt, overlay analytic/numerical và kiểm position error, impact cùng controls trong một mô phỏng hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
