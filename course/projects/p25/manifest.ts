import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 06 — Vec2, normalize, dot product và lực theo phương",
    "Project 22 — fixed timestep, accumulator và world/screen transform",
    "Project 23 — integrator, energy drift và numerical stability",
    "Project 24 — inverse mass, deterministic reset và stress test vật lý",
  ],
  summary:
    "Nối 18 khối lượng bằng 17 lò xo, neo đầu trên rồi cho chuỗi chịu gravity. Người học tự cài Hooke force, force accumulation, semi-implicit Euler và axial damping; sau đó kéo một khối để quan sát biến dạng lan qua các phần tử lân cận.",
  challenge: {
    timebox: "540–720 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D gồm nhiều mass nối thành chuỗi bằng spring. Đầu trên phải cố định; người dùng kéo một mass sang vị trí mới rồi thả để dao động truyền qua cả chuỗi, không dùng physics engine hoặc constraint solver có sẵn.",
    outcome:
      "Một cửa sổ SDL3 hiển thị 18 particles, 17 springs đổi màu theo stretch/compression, force vector, energy, maximum stretch, maximum speed và stability index. Chương trình hỗ trợ pause, single-step, reset, đổi stiffness/damping/dt, bật tắt gravity và kéo thả một mass bằng chuột.",
    requirements: [
      "Biểu diễn `Particle`, `Spring` và `SpringChain` bằng world unit; topology phải có N particles và N−1 springs nối các index liên tiếp.",
      "Particle đầu có `inverseMass = 0` và giữ đúng anchor position qua mọi physics step.",
      "Tính Hooke force từ `stretch = distance - restLength`; force trên hai endpoint phải cùng độ lớn và ngược chiều.",
      "Cộng gravity cùng mọi spring force vào force accumulator trước khi tích phân; xóa accumulator đúng một lần ở đầu substep.",
      "Cập nhật dynamic particle bằng semi-implicit Euler trong fixed timestep có frame/substep guard.",
      "Spring damping chỉ dùng relative velocity chiếu lên trục spring; tangent velocity không được giảm vô cớ.",
      "Kéo mass bằng pointer capture; trong lúc kéo mass là kinematic, khi thả nhận release velocity có clamp.",
      "Đo kinetic, spring và gravitational potential energy, maximum stretch, maximum speed, anchor error cùng finite state.",
      "Hiển thị dimensionless stability index `dt*sqrt(k/m)` và cho phép tạo cả preset ổn định lẫn cố ý mất ổn định.",
      "Kèm starter, tám checkpoint chạy độc lập, final, README và CTest không cần mở SDL window.",
    ],
    constraints: [
      "Không dùng Box2D, Chipmunk, physics engine hoặc mass–spring library.",
      "Không dùng một lực kéo trực tiếp từ particle về anchor; mỗi spring chỉ được đọc đúng hai endpoint của nó.",
      "Không nhân toàn bộ velocity với một damping factor tùy ý rồi gọi đó là spring damping.",
      "Không tích phân anchor rồi clamp lại sau nhiều frame; fixed particle phải được bỏ qua trong integration và phục hồi chính xác.",
      "Không dùng render frame time trực tiếp làm integration dt.",
      "Không che instability bằng clamp position/velocity trong physics path; preset sai phải được quan sát và reset rõ ràng.",
      "Không đánh giá correctness chỉ bằng hình ảnh; CTest phải kiểm force pair, integrator, anchor, drag và long-run finite state.",
    ],
    definitionOfDone: [
      "Scene mặc định tạo đúng 18 particles, 17 springs; mọi spring bắt đầu đúng rest length và particle đầu cố định.",
      "Spring kéo giãn 0.2 m với k=100 N/m tạo lực 20 N; spring nén đổi đúng dấu.",
      "Tổng hai spring force nội bộ bằng zero và gravity force của mỗi mass bằng m·g.",
      "Semi-implicit Euler cập nhật velocity trước position; cách chia render frame không đổi số fixed step.",
      "Axial damping phản ứng với relative speed dọc spring nhưng bỏ qua chuyển động tiếp tuyến.",
      "Kéo không chọn anchor, giữ mass đúng dưới pointer và release velocity không vượt giới hạn.",
      "Stress run 18 particles trong 20 giây không tạo NaN, anchor error gần zero, maximum stretch dưới 0.40 m và speed dưới 4 m/s.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion và có mô tả văn bản về wave/energy hiện tại.",
      "Starter, tám checkpoint và final build sạch warning ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "16–20 giờ",
  objectives: [
    "Chuyển một định luật lực cục bộ trên một spring thành hệ nhiều phần tử bằng force accumulation",
    "Phân biệt elastic force, axial damping, gravity, fixed constraint và numerical integration",
    "Dùng energy, stretch, anchor error và stability index để đánh giá mô phỏng thay vì chỉ nhìn chuyển động",
  ],
  lessons: [
    {
      id: "p25-l01",
      slug: "01-dung-chuoi-khoi-luong-va-lo-xo",
      title: "Dựng chuỗi khối lượng và lò xo",
      summary:
        "Mở starter SDL3 có chuỗi placeholder, rồi định nghĩa Particle, Spring, topology N−1 và anchor bằng inverse mass zero.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "spring-chain",
    },
    {
      id: "p25-l02",
      slug: "02-tinh-luc-hooke-tren-mot-lo-xo",
      title: "Tính lực Hooke trên một lò xo",
      summary:
        "Tách distance, direction, stretch và force; kiểm riêng trường hợp kéo giãn, nén và hai đầu trùng nhau.",
      order: 2,
      estimatedMinutes: 100,
      demoId: "spring-chain",
    },
    {
      id: "p25-l03",
      slug: "03-cong-luc-gravity-va-neo-co-dinh",
      title: "Cộng lực, gravity và neo cố định",
      summary:
        "Xóa force accumulator, cộng m·g cùng cặp lực spring đối nhau và giữ anchor ngoài integration path.",
      order: 3,
      estimatedMinutes: 100,
      demoId: "spring-chain",
    },
    {
      id: "p25-l04",
      slug: "04-cho-chuoi-chuyen-dong-semi-implicit-euler",
      title: "Cho chuỗi chuyển động bằng semi-implicit Euler",
      summary:
        "Đổi force thành acceleration, cập nhật velocity trước position và chạy toàn hệ bằng fixed timestep.",
      order: 4,
      estimatedMinutes: 105,
      demoId: "spring-chain",
    },
    {
      id: "p25-l05",
      slug: "05-them-damping-doc-truc-lo-xo",
      title: "Thêm damping dọc trục lò xo",
      summary:
        "Chiếu relative velocity lên spring direction để giảm dao động mà không làm mất chuyển động tiếp tuyến.",
      order: 5,
      estimatedMinutes: 95,
      demoId: "spring-chain",
    },
    {
      id: "p25-l06",
      slug: "06-keo-tha-mot-khoi-va-truyen-dao-dong",
      title: "Kéo thả một khối và truyền dao động",
      summary:
        "Chọn mass gần pointer, áp kinematic drag, ước lượng release velocity và quan sát tín hiệu truyền qua hàng xóm.",
      order: 6,
      estimatedMinutes: 110,
      demoId: "spring-chain",
    },
    {
      id: "p25-l07",
      slug: "07-thi-nghiem-stiffness-mass-va-delta-time",
      title: "Thí nghiệm stiffness, mass và delta time",
      summary:
        "Dùng q=dt·sqrt(k/m) để so preset, cố ý tạo instability và hiểu vì sao spring cứng cần bước nhỏ hơn.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "spring-chain",
    },
    {
      id: "p25-l08",
      slug: "08-do-energy-stress-test-va-nghiem-thu",
      title: "Đo energy, stress test và nghiệm thu",
      summary:
        "Hoàn thiện controls, đo ba thành phần energy, stretch/speed/anchor error và chạy CTest Debug/Release.",
      order: 8,
      estimatedMinutes: 125,
      demoId: "spring-chain",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
