import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 22 — state, Explicit Euler, fixed timestep, analytic reference và integration error",
    "Project 07 — radian, angular speed, sin/cos và đồ thị theo thời gian",
    "Project 09 — hiểu rằng thứ tự cập nhật có thể làm kết quả thay đổi",
  ],
  summary:
    "Cho Euler, Velocity Verlet và RK4 giải cùng một hệ lò xo; nhìn chuyển động, đo sai số và năng lượng, rồi benchmark để hiểu cái giá của độ chính xác.",
  challenge: {
    timebox: "450–570 phút",
    mission:
      "Tự xây dựng một cuộc đua integrator bằng C++20 và SDL3. Ba khối có cùng mass, spring, initial position và fixed timestep phải được cập nhật song song bằng Explicit Euler, Velocity Verlet và RK4; nghiệm giải tích đóng vai trò trọng tài độc lập.",
    outcome:
      "Một dashboard SDL3 có ba làn lò xo chuyển động, khung trắng làm đối chứng, đồ thị vị trí/sai số/năng lượng và số đo ngay trong cửa sổ. Kéo khối để chọn x₀, thay dt hoặc integrator của mỗi làn, chạy từng bước và đo runtime bằng đồng hồ thật.",
    requirements: [
      "Mô hình harmonic oscillator bằng `x'' = -(k/m)x`, kiểm `mass > 0`, `stiffness >= 0` và giữ đơn vị nhất quán.",
      "Cài nghiệm giải tích cho cả position và velocity từ cùng initial state để làm reference không phụ thuộc integrator.",
      "Cài Explicit Euler với một lần acceleration evaluation mỗi step và giữ rõ velocity đầu bước.",
      "Cài Velocity Verlet: dùng acceleration đầu bước để tìm position mới, tính acceleration mới rồi lấy trung bình hai acceleration để cập nhật velocity.",
      "Cài classical RK4 trên first-order phase state `(x,v)` với bốn derivative evaluation và weights 1-2-2-1.",
      "Cho ba integrator chạy lockstep: cùng fixed dt, cùng số step, cùng initial state và cùng oscillator parameters.",
      "Đo position error, phase-space error đã chuẩn hóa theo angular frequency và relative energy drift tại cùng elapsed time.",
      "Đếm force evaluation và đo runtime thật bằng benchmark riêng: cùng initial state, cùng N bước mỗi trajectory, warmup và median của 5 batch; không tính vẽ hay ghi history vào thời gian solver.",
      "Có nhiều mức fixed dt để thử từ nhẹ đến khắc nghiệt; reset toàn bộ race khi đổi initial condition, stiffness hoặc dt để thí nghiệm chỉ thay một biến.",
      "Chọn lại integrator cho từng làn khi ứng dụng đang mở; mỗi lần đổi phải reset cả ba làn. Chế độ sạch vẫn giữ các khối, khung đối chứng và đồ thị.",
      "Kèm Starter, tám checkpoint chạy độc lập, final, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng thư viện ODE, physics engine hoặc solver có sẵn.",
      "Không dùng analytic solution để sửa state của bất kỳ integrator nào.",
      "Không gọi ba integrator với ba `dt` hoặc số step khác nhau trong cùng một race.",
      "Không gọi Velocity Verlet là position Verlet; project này lưu cả position lẫn velocity và dùng hai acceleration evaluation.",
      "Không gộp bốn stage RK4 thành một biểu thức không tên; mỗi `k1`–`k4` phải đọc và kiểm tra được.",
      "Không coi số lần tính lực là runtime, không lấy error chia cho số lần tính lực để xếp hạng. Benchmark có giới hạn workload, chạy từng batch ngắn và hủy được khi đổi cấu hình.",
      "Không kết luận một integrator luôn tốt hơn chỉ từ một ảnh: phải xét stability, convergence, năng lượng và chi phí đo được. Số đo JavaScript không đại diện cho C++.",
    ],
    definitionOfDone: [
      "Analytic state đúng initial condition tại t=0, có angular frequency `sqrt(k/m)` và bảo toàn total energy trong tolerance.",
      "Euler, Verlet và RK4 nhận cùng initial state; sau N lockstep, cả ba có elapsed đúng `N*dt`.",
      "Force-evaluation counts lần lượt tăng 1, 2 và 4 cho mỗi step.",
      "Với dt đủ nhỏ, cả ba tiến gần analytic state; giảm dt làm error của từng phương pháp giảm.",
      "Trong bài toán oscillator dài hạn, Euler thể hiện energy growth, Velocity Verlet giữ energy bị chặn và RK4 có phase/state error nhỏ hơn tại cùng dt hợp lý.",
      "Phase-space error chỉ được tính khi angular frequency dương; velocity difference được chia cho angular frequency trước khi ghép với position difference.",
      "History ghi sau từng bước physics, gồm t=0 và bước cuối khi tua nhanh; chỉ giữ 1.201 mẫu gần nhất để bộ nhớ có giới hạn. Không ghi thêm mẫu khi pause hoặc vẽ lại.",
      "Benchmark thật cho ba phương pháp, cùng workload và có checksum; không assert một thứ hạng runtime phụ thuộc phần cứng. Đổi cấu hình hủy số đo cũ.",
      "Canvas và SDL dùng bảng logic 1100×820; input không bị nhân DPR hai lần. Kéo giữ offset, nhận mẫu thả cuối, bỏ pointer khác và nhả capture khi blur/resize/reset.",
      "Starter, tám checkpoint và final build sạch warning ở Debug/Release; CTest, Canvas math tests, kiểm route và ZIP đều đạt.",
    ],
  },
  duration: "14–18 giờ",
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
      title: "Đo sai số trạng thái và độ lệch năng lượng",
      summary:
        "So numerical state với exact state trong phase space, chuẩn hóa velocity và vẽ energy drift theo thời gian.",
      order: 6,
      estimatedMinutes: 100,
      demoId: "integrator-race",
    },
    {
      id: "p23-l07",
      slug: "07-stress-test-convergence-va-nghiem-thu",
      title: "Kiểm chứng solver trước khi đo tốc độ",
      summary:
        "Giữ cùng thời điểm để kiểm bậc hội tụ, dùng công thức năng lượng độc lập và chạy CTest ở Debug/Release.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "integrator-race",
    },
    {
      id: "p23-l08",
      slug: "08-do-runtime-va-hoan-thien-cuoc-dua",
      title: "Đo runtime và hoàn thiện cuộc đua",
      summary:
        "Tách benchmark khỏi render, warmup rồi đo từng batch có thể hủy; đặt sai số cạnh chi phí thực và chạy toàn bộ mã hoàn chỉnh.",
      order: 8,
      estimatedMinutes: 110,
      demoId: "integrator-race",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
