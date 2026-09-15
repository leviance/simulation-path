import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 22 — state, Explicit Euler, fixed timestep, analytic reference và integration error",
    "Project 07 — radian, angular speed, sin/cos và đồ thị theo thời gian",
    "Project 09 — hiểu rằng thứ tự cập nhật có thể làm kết quả thay đổi",
  ],
  summary:
    "Cho Explicit Euler, Velocity Verlet và RK4 tích phân cùng một harmonic oscillator trong lockstep, rồi so position, phase, energy drift, convergence và số lần tính lực thay vì chọn thuật toán chỉ bằng cảm giác.",
  challenge: {
    timebox: "450–570 phút",
    mission:
      "Tự xây dựng một cuộc đua integrator bằng C++20 và SDL3. Ba khối có cùng mass, spring, initial position và fixed timestep phải được cập nhật song song bằng Explicit Euler, Velocity Verlet và RK4; nghiệm giải tích đóng vai trò trọng tài độc lập.",
    outcome:
      "Một cửa sổ có ba lane oscillator, exact ghost, graph position/energy và bảng số liệu trên title bar. Người dùng có thể kéo mass để chọn amplitude, đổi stiffness cùng fixed dt, pause, single-step, chạy nhanh một khoảng thời gian và quan sát sai số/chi phí của từng integrator.",
    requirements: [
      "Mô hình harmonic oscillator bằng `x'' = -(k/m)x`, kiểm `mass > 0`, `stiffness >= 0` và giữ đơn vị nhất quán.",
      "Cài nghiệm giải tích cho cả position và velocity từ cùng initial state để làm reference không phụ thuộc integrator.",
      "Cài Explicit Euler với một lần acceleration evaluation mỗi step và giữ rõ velocity đầu bước.",
      "Cài Velocity Verlet: dùng acceleration đầu bước để tìm position mới, tính acceleration mới rồi lấy trung bình hai acceleration để cập nhật velocity.",
      "Cài classical RK4 trên first-order phase state `(x,v)` với bốn derivative evaluation và weights 1-2-2-1.",
      "Cho ba integrator chạy lockstep: cùng fixed dt, cùng số step, cùng initial state và cùng oscillator parameters.",
      "Đo position error, phase-space error đã chuẩn hóa theo angular frequency và relative energy drift tại cùng elapsed time.",
      "Theo dõi số acceleration/force evaluation để so accuracy với computational cost thay vì chỉ so error.",
      "Có nhiều mức fixed dt để thử từ nhẹ đến khắc nghiệt; reset toàn bộ race khi đổi initial condition, stiffness hoặc dt để thí nghiệm chỉ thay một biến.",
      "Kèm starter, bảy checkpoint chạy độc lập, final, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng thư viện ODE, physics engine hoặc solver có sẵn.",
      "Không dùng analytic solution để sửa state của bất kỳ integrator nào.",
      "Không gọi ba integrator với ba `dt` hoặc số step khác nhau trong cùng một race.",
      "Không gọi Velocity Verlet là position Verlet; project này lưu cả position lẫn velocity và dùng hai acceleration evaluation.",
      "Không gộp bốn stage RK4 thành một biểu thức không tên; mỗi `k1`–`k4` phải đọc và kiểm tra được.",
      "Không kết luận integrator tốt hơn chỉ từ một ảnh hoặc một ngưỡng error; phải xét stability, convergence và evaluation cost.",
    ],
    definitionOfDone: [
      "Analytic state đúng initial condition tại t=0, có angular frequency `sqrt(k/m)` và bảo toàn total energy trong tolerance.",
      "Euler, Verlet và RK4 nhận cùng initial state; sau N lockstep, cả ba có elapsed đúng `N*dt`.",
      "Force-evaluation counts lần lượt tăng 1, 2 và 4 cho mỗi step.",
      "Với dt đủ nhỏ, cả ba tiến gần analytic state; giảm dt làm error của từng phương pháp giảm.",
      "Trong bài toán oscillator dài hạn, Euler thể hiện energy growth, Velocity Verlet giữ energy bị chặn và RK4 có phase/state error nhỏ hơn tại cùng dt hợp lý.",
      "Phase-space error chỉ được tính khi angular frequency dương; velocity difference được chia cho angular frequency trước khi ghép với position difference.",
      "Canvas xử lý DPR, pointer capture, reduced motion và controls bằng bàn phím; graph có giải thích văn bản thay thế.",
      "Starter, bảy checkpoint và final build sạch warning ở Debug/Release; CTest cùng Canvas math tests đều vượt qua.",
    ],
  },
  duration: "14–16 giờ",
  objectives: [
    "Hiểu từng integrator như một quy tắc lấy mẫu derivative, không phải tên gọi để học thuộc",
    "Đánh giá numerical method bằng accuracy, stability, energy behavior và computational cost",
    "Thiết kế một thí nghiệm lockstep công bằng có analytic reference và convergence test",
  ],
  lessons: [
    {
      id: "p23-l01",
      slug: "01-dung-duong-dua-harmonic-oscillator",
      title: "Dựng đường đua harmonic oscillator",
      summary:
        "Tạo mass-spring state, acceleration, angular frequency, total energy và exact ghost trước khi bất kỳ integrator nào xuất hiện.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "integrator-race",
    },
    {
      id: "p23-l02",
      slug: "02-explicit-euler-thi-sinh-dau-tien",
      title: "Explicit Euler — thí sinh đầu tiên",
      summary:
        "Đưa Euler lên lane thứ nhất, ghi rõ derivative ở đầu bước và quan sát amplitude cùng energy tăng dần.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "integrator-race",
    },
    {
      id: "p23-l03",
      slug: "03-velocity-verlet-va-hai-lan-tinh-luc",
      title: "Velocity Verlet và hai lần tính lực",
      summary:
        "Dự đoán position bằng acceleration cũ, tính lực ở vị trí mới rồi hoàn thiện velocity bằng trung bình hai acceleration.",
      order: 3,
      estimatedMinutes: 95,
      demoId: "integrator-race",
    },
    {
      id: "p23-l04",
      slug: "04-rk4-va-bon-lan-tham-slope",
      title: "RK4: đánh giá đạo hàm tại bốn trạng thái",
      summary:
        "Viết oscillator thành first-order phase derivative, lấy bốn stage k1–k4 và ghép chúng bằng weights 1-2-2-1.",
      order: 4,
      estimatedMinutes: 110,
      demoId: "integrator-race",
    },
    {
      id: "p23-l05",
      slug: "05-cho-ba-integrator-chay-lockstep",
      title: "Cho ba integrator chạy lockstep",
      summary:
        "Đóng gói RaceState, fixed-step accumulator và evaluation counters để cả ba lane nhận cùng một thí nghiệm.",
      order: 5,
      estimatedMinutes: 95,
      demoId: "integrator-race",
    },
    {
      id: "p23-l06",
      slug: "06-do-phase-error-va-energy-drift",
      title: "Đo sai số trong phase space và energy drift",
      summary:
        "So numerical state với exact state trong phase space, chuẩn hóa velocity và vẽ energy drift theo thời gian.",
      order: 6,
      estimatedMinutes: 100,
      demoId: "integrator-race",
    },
    {
      id: "p23-l07",
      slug: "07-stress-test-convergence-va-nghiem-thu",
      title: "Stress test, convergence và nghiệm thu",
      summary:
        "Thử nhiều dt, đo error per evaluation, kiểm convergence order cùng long-run stability và hoàn thiện controls.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "integrator-race",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
