import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "INTEGRATOR RACE LAB",
    title: "Ba integrator nhìn cùng một lực sẽ đi khác nhau ra sao?",
    description:
      "Ba làn dùng cùng hệ lò xo và thời gian. Kéo khối để đặt x₀, đổi solver mỗi làn, xem sai số rồi đo runtime riêng với workload hữu hạn.",
  },
  modes: {
    "integrator-system": {
      title: "Một harmonic oscillator được mô tả bằng state nào?",
      description:
        "Kéo khối để chọn vị trí đầu, đọc gia tốc và tần số góc. Khung trắng cho thấy nghiệm giải tích trước khi ta viết các phương pháp tích phân.",
    },
    "integrator-euler": {
      title: "Euler lấy đạo hàm ở đâu, và vì sao năng lượng tăng?",
      description:
        "Tiến làn Euler từng bước: vị trí mới dùng vận tốc cũ, vận tốc mới dùng gia tốc tính tại vị trí đầu bước.",
    },
    "integrator-verlet": {
      title: "Velocity Verlet dùng gia tốc ở hai đầu bước thế nào?",
      description:
        "Theo dõi a₀, vị trí mới, a₁ và vận tốc mới; so độ lệch năng lượng với Euler ở cùng dt.",
    },
    "integrator-rk4": {
      title: "RK4 lấy mẫu tại bốn trạng thái nào?",
      description:
        "Xem k₁–k₄, cách ghép theo trọng số 1-2-2-1 và bốn lần tính đạo hàm trong mỗi bước.",
    },
    "integrator-lockstep": {
      title: "Muốn so ba phương pháp công bằng, cần giữ nguyên những gì?",
      description:
        "Ba làn có cùng điều kiện đầu, tham số, dt và số bước. Đổi solver của từng làn rồi quan sát số lần tính lực khác nhau.",
    },
    "integrator-energy": {
      title: "Sai số trạng thái khác độ lệch năng lượng thế nào?",
      description:
        "Xem đồ thị vị trí, sai số trạng thái và độ lệch năng lượng; mỗi mẫu được ghi sau một bước physics, không phải sau mỗi frame.",
    },
    "integrator-validation": {
      title: "Giảm dt có đưa kết quả lại gần đáp án đúng không?",
      description:
        "Giữ cùng thời điểm khi đổi dt, dùng công thức năng lượng độc lập và phân biệt lượng công việc với thời gian chạy.",
    },
    "integrator-benchmark": {
      title: "Thêm độ chính xác phải trả bao nhiêu thời gian?",
      description:
        "Đo runtime thật bằng các batch hữu hạn có thể hủy. Số đo ở đây là JavaScript của trình duyệt; ứng dụng SDL3 đo riêng bằng C++.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
