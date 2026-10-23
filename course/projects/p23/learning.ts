import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p23-l01": {
      focus:
        "Dựng ba làn lò xo, xác định trạng thái và đơn vị, rồi viết nghiệm giải tích để làm đối chứng độc lập.",
      expected:
        "Kéo khối để đổi x₀. Gia tốc luôn hướng về vị trí cân bằng; khung trắng đi theo nghiệm giải tích và giữ nguyên tổng năng lượng.",
      files: ["include/lab.hpp", "include/view.hpp", "include/scene.hpp", "src/main.cpp"],
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
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chụp acceleration ở state hiện tại",
          explanation:
            "Euler chỉ đánh giá đạo hàm một lần. Position mới dùng velocity cũ, velocity mới dùng acceleration cũ.",
        },
        {
          title: "Trả cả trạng thái mới và số lần tính lực",
          explanation:
            "IntegratorStepResult mang next state cùng số lần tính lực để UI và tests không tự đoán chi phí.",
        },
        {
          title: "Đọc lỗi như hành vi của thuật toán",
          explanation:
            "Năng lượng tăng không phải do vẽ sai. Bước Euler đi theo tiếp tuyến, nên điểm mới nằm ngoài quỹ đạo đúng trên mặt phẳng trạng thái.",
        },
      ],
    },
    "p23-l03": {
      focus:
        "Viết Velocity Verlet theo thứ tự a₀ → x₁ → a₁ → v₁, làm rõ vai trò của lực ở hai đầu bước.",
      expected:
        "Mỗi bước tính gia tốc hai lần. Trong vùng ổn định, năng lượng của làn xanh dao động quanh giá trị ban đầu thay vì tăng mãi như Euler.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
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
        "Viết phương trình lò xo thành hệ bậc nhất cho (x,v), rồi tính rõ bốn đạo hàm của RK4.",
      expected:
        "k1–k4 có tên, weights 1-2-2-1; mỗi step dùng bốn evaluation và sai số nhỏ hơn rõ rệt tại cùng dt.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Xem phase state như một vector",
          explanation:
            "Derivative của (x,v) là (v,a(x)); RK4 phải tích phân hai thành phần cùng lúc.",
        },
        {
          title: "Lấy mẫu ở đầu, hai điểm giữa và cuối bước",
          explanation:
            "k2 dùng state lệch theo k1; k3 dùng k2; k4 dùng k3. Không stage nào được lấy từ state đã commit.",
        },
        {
          title: "Ghép các đạo hàm rồi mới cập nhật state",
          explanation:
            "Lấy trung bình đạo hàm theo trọng số 1-2-2-1, rồi nhân dt đúng một lần. Đồng hồ cũng chỉ tăng một dt, không tăng theo từng k.",
        },
      ],
    },
    "p23-l05": {
      focus:
        "Đóng gói ba lane vào IntegratorRace và dùng một fixed-step accumulator để giữ thí nghiệm công bằng.",
      expected:
        "Sau N step, ba elapsed bằng N·dt; counters đúng N, 2N, 4N dù render frame được chia khác nhau.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
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
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "So nghiệm số với nghiệm giải tích tại cùng thời điểm",
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
      focus: "Kiểm solver bằng đáp án tính độc lập và bậc hội tụ trước khi bắt đầu đo tốc độ.",
      expected:
        "Giảm dt một nửa cho tỉ lệ sai số gần 2/4/16; phép kiểm năng lượng Euler dùng công thức đóng, không gọi lại solver để tạo expected.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ nguyên thời lượng và điều kiện đầu",
          explanation:
            "Mỗi convergence run chỉ thay dt; duration chia hết cho dt để các solver kết thúc ở cùng thời điểm.",
        },
        {
          title: "Đọc tỉ lệ sai số khi giảm dt một nửa",
          explanation:
            "Tỉ lệ gần 2, 4 và 16 giúp nhận ra bậc hội tụ của ba phương pháp, không đủ để kết luận phương pháp nào luôn tốt nhất.",
        },
        {
          title: "Giữ chi phí đếm được khác với thời gian đo được",
          explanation:
            "1/2/4 lần tính lực là lượng công việc, chưa phải runtime. Chỉ bắt đầu benchmark ở bài 8 sau khi đã kiểm được tính đúng.",
        },
      ],
    },
    "p23-l08": {
      focus:
        "Đo runtime bằng workload hữu hạn, tách khỏi vẽ và ghi history; hoàn thiện ứng dụng độc lập.",
      expected:
        "Ba solver có số đo median, checksum và sai số tại cùng thời điểm. Đổi cấu hình hủy job cũ; bản final có chế độ sạch và đầy đủ mã chạy được.",
      files: [
        "include/benchmark.hpp",
        "include/scene.hpp",
        "include/presentation.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Chốt cùng một workload",
          explanation:
            "Mỗi batch chạy lại 16 trajectory từ cùng initial state, mỗi trajectory có N=floor(2/dt) bước. Không nối Euler qua hàng nghìn giây để lấp thời gian đo.",
        },
        {
          title: "Warmup rồi đo từng batch",
          explanation:
            "Dùng steady_clock trong C++ và performance.now trong Canvas; bỏ warmup, lấy median 5 batch, giữ checksum. Mỗi frame chỉ chạy một batch và job có deadline.",
        },
        {
          title: "Đặt accuracy cạnh runtime",
          explanation:
            "Không chia error cho force evaluations để xếp hạng. Kiểm Starter hoàn chỉnh bằng chính bộ tests cuối, thử input và tải ZIP đã đồng bộ.",
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
    "p23-l08": [
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
