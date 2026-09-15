import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p23-l01": {
      focus:
        "Dựng ba lane mass-spring nhìn thấy ngay, chốt state/đơn vị và cài exact solution làm trọng tài độc lập.",
      expected:
        "Kéo mass đổi x0; omega bằng sqrt(k/m), acceleration luôn kéo về equilibrium và exact ghost bảo toàn total energy.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Bắt đầu từ hệ vật lý tối thiểu",
          explanation:
            "State chỉ cần position, velocity, elapsed; parameters chỉ cần mass và stiffness. Pixel chỉ xuất hiện trong hàm vẽ.",
        },
        {
          title: "Viết acceleration từ định luật Hooke",
          explanation: "F=-kx và a=F/m cho a=-(k/m)x. Dấu trừ khiến lực luôn hướng về x=0.",
        },
        {
          title: "Dùng exact solution như thước đo",
          explanation:
            "Nghiệm sin/cos nhận initial state và elapsed, nhưng tuyệt đối không được dùng để sửa state của integrator.",
        },
      ],
    },
    "p23-l02": {
      focus:
        "Cài Explicit Euler thành hai phép gán dễ lần theo và chứng minh nó lấy đúng derivative ở đầu bước.",
      expected:
        "Mỗi step tăng đúng một force evaluation; ở dt lớn khối đỏ đi lệch exact ghost và total energy tăng dần.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chụp acceleration ở state hiện tại",
          explanation:
            "Euler chỉ đánh giá đạo hàm một lần. Position mới dùng velocity cũ, velocity mới dùng acceleration cũ.",
        },
        {
          title: "Trả state và cost cùng nhau",
          explanation:
            "IntegratorStepResult mang next state cùng số lần tính lực để UI và tests không tự đoán chi phí.",
        },
        {
          title: "Đọc lỗi như hành vi của thuật toán",
          explanation:
            "Energy growth trong oscillator không phải lỗi vẽ; nó đến từ cách Euler bước tiếp tuyến ra ngoài quỹ đạo phase.",
        },
      ],
    },
    "p23-l03": {
      focus:
        "Cài Velocity Verlet theo đúng chuỗi a0, x1, a1, v1 và phân biệt nó với một update velocity viết tắt.",
      expected:
        "Mỗi step dùng hai acceleration evaluation; lane xanh giữ amplitude và energy bị chặn tốt hơn Euler ở cùng dt.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Dự đoán position bằng a0",
          explanation:
            "x1=x0+v0·dt+0.5·a0·dt² dùng đủ state đầu bước, không cập nhật velocity sớm.",
        },
        {
          title: "Tính lực tại position mới",
          explanation:
            "a1 phải lấy từ x1; tái dùng a0 lần hai sẽ làm mất điểm cốt lõi của Velocity Verlet.",
        },
        {
          title: "Hoàn thiện velocity bằng trung bình",
          explanation: "v1=v0+0.5·(a0+a1)·dt dùng thông tin ở cả hai đầu của step.",
        },
      ],
    },
    "p23-l04": {
      focus:
        "Đưa oscillator bậc hai về phase derivative bậc nhất rồi viết rõ bốn stage của classical RK4.",
      expected:
        "k1–k4 có tên, weights 1-2-2-1; mỗi step dùng bốn evaluation và sai số nhỏ hơn rõ rệt tại cùng dt.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Xem phase state như một vector",
          explanation:
            "Derivative của (x,v) là (v,a(x)); RK4 phải tích phân hai thành phần cùng lúc.",
        },
        {
          title: "Thăm đầu, giữa, giữa và cuối step",
          explanation:
            "k2 dùng state lệch theo k1; k3 dùng k2; k4 dùng k3. Không stage nào được lấy từ state đã commit.",
        },
        {
          title: "Ghép các đạo hàm rồi mới cập nhật state",
          explanation:
            "Weighted derivative được nhân dt đúng một lần để tạo next state; elapsed chỉ tăng một dt.",
        },
      ],
    },
    "p23-l05": {
      focus:
        "Đóng gói ba lane vào IntegratorRace và dùng một fixed-step accumulator để giữ thí nghiệm công bằng.",
      expected:
        "Sau N step, ba elapsed bằng N·dt; counters đúng N, 2N, 4N dù render frame được chia khác nhau.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Nhân bản cùng một initial state",
          explanation:
            "makeIntegratorRace tạo ba lane từ cùng một snapshot, không để integrator chạy sau nhận state của integrator trước.",
        },
        {
          title: "Commit ba kết quả trong một race step",
          explanation:
            "Mỗi solver đọc lane riêng nhưng nhận cùng parameters và dt; stepCount chỉ tăng khi cả ba update hợp lệ.",
        },
        {
          title: "Tách render frame khỏi physics step",
          explanation:
            "Accumulator gom frame time và sinh số fixed step hữu hạn; guard tránh spiral of death sau frame bị treo.",
        },
      ],
    },
    "p23-l06": {
      focus:
        "Định nghĩa position error, phase-space error có đơn vị nhất quán và relative energy drift rồi lấy mẫu graph.",
      expected:
        "Mọi error so ở cùng elapsed; velocity difference được chia omega; graph cho thấy Euler tăng energy còn Verlet dao động bị chặn.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So numerical với exact ở cùng đồng hồ",
          explanation:
            "Exact state nhận numerical.elapsed. So khác thời điểm sẽ trộn phase lag vào một phép đo không kiểm soát.",
        },
        {
          title: "Chuẩn hóa phase space",
          explanation:
            "dx mang mét còn dv mang m/s; chia dv cho omega biến nó thành mét trước khi dùng hypot.",
        },
        {
          title: "Đo energy tương đối",
          explanation:
            "(E-E0)/E0 cho phép so các amplitude khác nhau và giữ dấu tăng/giảm năng lượng.",
        },
      ],
    },
    "p23-l07": {
      focus:
        "Chạy convergence và long-run stress test, cân error với evaluation cost rồi nghiệm thu toàn bộ source.",
      expected:
        "Halve dt làm Euler, Verlet, RK4 giảm error theo bậc gần 1, 2, 4; Debug/Release cùng Canvas math tests đều pass.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ duration và initial state cố định",
          explanation:
            "Mỗi convergence run chỉ thay dt; duration chia hết cho dt để các solver kết thúc ở cùng thời điểm.",
        },
        {
          title: "Đọc tỷ lệ sai số khi halve dt",
          explanation:
            "Error ratio xấp xỉ 2, 4, 16 là dấu vết của method order, không phải bảng xếp hạng tuyệt đối.",
        },
        {
          title: "Đặt accuracy cạnh cost và stability",
          explanation:
            "RK4 tốn bốn evaluation; Verlet tốn hai nhưng có energy behavior tốt. Kết luận phụ thuộc mục tiêu mô phỏng.",
        },
      ],
    },
  },
  references: {
    "p23-l01": [
      { label: "Harmonic oscillator", href: "/glossary#harmonic-oscillator", kind: "Thuật ngữ" },
      { label: "Angular frequency", href: "/glossary#angular-frequency", kind: "Thuật ngữ" },
      { label: "Analytic solution", href: "/glossary#analytic-solution", kind: "Thuật ngữ" },
    ],
    "p23-l02": [
      { label: "Explicit Euler", href: "/glossary#explicit-euler", kind: "Thuật ngữ" },
      { label: "Force evaluation", href: "/glossary#force-evaluation", kind: "Thuật ngữ" },
      { label: "Integration error", href: "/glossary#integration-error", kind: "Thuật ngữ" },
    ],
    "p23-l03": [
      { label: "Velocity Verlet", href: "/glossary#velocity-verlet", kind: "Thuật ngữ" },
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
    ],
    "p23-l04": [
      { label: "Runge–Kutta 4", href: "/glossary#runge-kutta-4", kind: "Thuật ngữ" },
      { label: "Phase space", href: "/glossary#phase-space", kind: "Thuật ngữ" },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
    "p23-l05": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Physics accumulator", href: "/glossary#physics-accumulator", kind: "Thuật ngữ" },
      { label: "Force evaluation", href: "/glossary#force-evaluation", kind: "Thuật ngữ" },
    ],
    "p23-l06": [
      { label: "Phase space", href: "/glossary#phase-space", kind: "Thuật ngữ" },
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
      { label: "Angular frequency", href: "/glossary#angular-frequency", kind: "Thuật ngữ" },
    ],
    "p23-l07": [
      { label: "Convergence order", href: "/glossary#convergence-order", kind: "Thuật ngữ" },
      { label: "Force evaluation", href: "/glossary#force-evaluation", kind: "Thuật ngữ" },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
