import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 06 — Vec2, magnitude, normalize và dot product",
    "Project 22 — fixed timestep, accumulator và state vật lý",
    "Project 23 — numerical error, energy behavior và validation có số đo",
  ],
  summary:
    "Cho 144 quả bóng chuyển động trong một bể 2D, phát hiện mọi cặp hình tròn chồng lấn rồi giải va chạm bằng normal impulse, restitution và positional correction; đồng thời đo momentum, kinetic energy, penetration cùng chi phí O(N²).",
  challenge: {
    timebox: "540–690 phút",
    mission:
      "Tự xây dựng một bể va chạm 2D bằng C++20 và SDL3. Hàng trăm quả bóng phải nảy vào bốn tường và vào nhau trong fixed timestep, không dùng physics engine; cùng một seed phải tạo lại đúng cùng một thí nghiệm.",
    outcome:
      "Một cửa sổ hiển thị 144 quả bóng, contact normal gần nhất, số pair check/contact/impulse, maximum penetration, momentum và kinetic-energy drift. Người dùng có thể pause, single-step, reset, đổi restitution, solver iterations, fixed dt và kéo chuột để truyền một velocity impulse cho bóng gần con trỏ.",
    requirements: [
      "Định nghĩa `Vec2`, `Ball`, `TankBounds` bằng world unit; radius, position và velocity không được lưu bằng pixel.",
      "Tạo scene từ lattice không chồng lấn và PRNG có seed cố định để reset cho kết quả lặp lại được.",
      "Tích phân position bằng fixed timestep; render frame chỉ đi qua accumulator có frame/substep guard.",
      "Giải va chạm với bốn tường có xét radius, chỉ đảo component velocity khi bóng đang đi vào tường và áp dụng coefficient of restitution.",
      "Phát hiện circle-circle bằng squared distance; contact phải có unit normal ổn định và penetration depth không âm, kể cả khi hai tâm trùng nhau.",
      "Tính normal impulse từ relative velocity, inverse mass và restitution; không tạo impulse mới khi hai bóng đã tách nhau.",
      "Sửa penetration bằng slop, correction percentage và inverse-mass weighting để giảm rung/kẹt mà không giả vờ đây là velocity impulse.",
      "Duyệt mỗi unordered pair đúng một lần bằng `i < j`; lặp solver hữu hạn và báo chính xác pair-check count.",
      "Đo total linear momentum, kinetic energy, overlap count và maximum penetration; có elastic two-ball test cùng long-run stress test.",
      "Kèm starter, tám checkpoint chạy độc lập, final, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng physics engine, collision library, spatial grid, quadtree hoặc sweep-and-prune trong Project 24.",
      "Không dùng khoảng cách giữa hai tâm mà quên cộng hai radius; không dùng `sqrt` trước bước broad rejection bằng squared distance.",
      "Không phản xạ từng velocity độc lập như va vào tường khi đang giải ball-ball collision.",
      "Không áp impulse nếu relative velocity dọc normal lớn hơn hoặc bằng zero.",
      "Không teleport mỗi bóng một nửa penetration khi mass khác nhau; correction phải theo inverse mass.",
      "Không spawn ngẫu nhiên bằng clock hoặc `std::random_device`; validation phải tái lập được.",
      "Không tăng solver iterations không giới hạn để che một contact formula sai.",
    ],
    definitionOfDone: [
      "Scene mặc định có 144 bóng nằm hoàn toàn trong bounds, không chồng lấn và cùng seed tạo cùng state.",
      "Wall collision đặt tâm cách tường đúng radius; restitution 1 giữ speed component, restitution 0 loại component hướng vào tường.",
      "Contact của hai circle cho normal từ A sang B, penetration đúng và fallback hữu hạn khi hai tâm trùng nhau.",
      "Va chạm đàn hồi head-on giữa hai bóng bằng mass đổi velocity đúng; tổng momentum và kinetic energy được bảo toàn trong tolerance.",
      "Hai bóng đang tách nhau không nhận impulse; positional correction giảm penetration mà không đổi velocity.",
      "Với N bóng và I solver iterations, pair checks đúng `I*N*(N-1)/2`.",
      "Stress run không tạo NaN, mọi bóng vẫn nằm trong bể sau wall solve và maximum penetration nằm dưới ngưỡng nghiệm thu.",
      "Canvas xử lý DPR, pointer capture, keyboard và reduced motion; có phần mô tả thay thế cho contact/cost visualization.",
      "Starter, tám checkpoint và final build sạch warning ở Debug/Release; CTest cùng Canvas math tests đều vượt qua.",
    ],
  },
  duration: "16–19 giờ",
  objectives: [
    "Tách collision detection, velocity response và positional correction thành ba trách nhiệm kiểm thử độc lập",
    "Dùng impulse, restitution và inverse mass để giải va chạm circle-circle có cơ sở vật lý",
    "Đo correctness lẫn chi phí pairwise O(N²) trước khi học spatial acceleration structure",
  ],
  lessons: [
    {
      id: "p24-l01",
      slug: "01-dung-be-va-dan-bong-deterministic",
      title: "Dựng bể và đàn bóng deterministic",
      summary:
        "Tạo Vec2, Ball, TankBounds và một lattice 144 bóng không chồng lấn; seed cố định sinh velocity lặp lại được.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "collision-tank",
    },
    {
      id: "p24-l02",
      slug: "02-cho-bong-chuyen-dong-fixed-timestep",
      title: "Cho cả đàn bóng chuyển động bằng fixed timestep",
      summary:
        "Tích phân position, đưa frame time qua accumulator và giữ physics độc lập với tốc độ render.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "collision-tank",
    },
    {
      id: "p24-l03",
      slug: "03-xu-ly-va-cham-voi-tuong",
      title: "Xử lý va chạm với bốn bức tường",
      summary:
        "Clamp tâm theo radius, kiểm hướng velocity và áp restitution riêng cho từng wall normal.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l04",
      slug: "04-phat-hien-hai-hinh-tron-cham-nhau",
      title: "Phát hiện hai hình tròn chạm nhau",
      summary:
        "Từ center delta và radius sum, tạo contact normal cùng penetration mà vẫn xử lý được coincident centers.",
      order: 4,
      estimatedMinutes: 100,
      demoId: "collision-tank",
    },
    {
      id: "p24-l05",
      slug: "05-doi-van-toc-bang-collision-impulse",
      title: "Đổi vận tốc bằng collision impulse",
      summary:
        "Chiếu relative velocity lên normal, tính impulse scalar bằng restitution và phân phối theo inverse mass.",
      order: 5,
      estimatedMinutes: 110,
      demoId: "collision-tank",
    },
    {
      id: "p24-l06",
      slug: "06-day-hai-bong-ra-khoi-penetration",
      title: "Đẩy hai bóng ra khỏi penetration",
      summary:
        "Tách sửa position khỏi impulse, thêm slop/percentage và cân correction theo inverse mass.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l07",
      slug: "07-duyet-moi-cap-va-giai-toan-bo-be",
      title: "Duyệt mọi cặp và giải toàn bộ bể",
      summary:
        "Dùng vòng lặp i<j, solver iterations hữu hạn và stats để 144 bóng thật sự va vào nhau trong lockstep.",
      order: 7,
      estimatedMinutes: 105,
      demoId: "collision-tank",
    },
    {
      id: "p24-l08",
      slug: "08-stress-test-bao-toan-va-nghiem-thu",
      title: "Stress test, bảo toàn và nghiệm thu",
      summary:
        "Đo momentum, kinetic energy, overlap, penetration và pair cost; hoàn thiện controls cùng bộ CTest Debug/Release.",
      order: 8,
      estimatedMinutes: 120,
      demoId: "collision-tank",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
