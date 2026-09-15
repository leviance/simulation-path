import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 23 — fixed timestep, symplectic Euler và phép đo energy drift",
    "Project 27 — direct baseline, deterministic workload và work count",
    "Project 30 — Octree index storage, topology inspector và benchmark có kiểm chứng",
  ],
  summary:
    "Biến Octree từ cấu trúc truy vấn thành bộ xấp xỉ lực hấp dẫn. Bạn sẽ dựng một thiên hà N-body 3D, giữ direct O(N²) làm oracle, thêm tổng khối lượng và tâm khối lượng cho mỗi node, rồi đo rõ opening angle đổi sai số lấy lượng công việc như thế nào.",
  challenge: {
    timebox: "900–1.200 phút",
    mission:
      "Tự xây dựng một mô phỏng 3D gồm hàng nghìn body hút nhau bằng lực hấp dẫn. Chương trình phải chạy được bằng direct summation và Barnes–Hut, cho phép chọn một body để xem vector gia tốc, thay đổi theta/softening và đối chiếu kết quả thay vì chỉ quan sát quỹ đạo đẹp.",
    outcome:
      "Một chương trình SDL3 render thiên hà bằng framebuffer CPU, chạy physics bằng fixed timestep và dựng lại Mass Octree khi body di chuyển. Terminal cùng title bar báo topology, root mass/center of mass, force error, số node tổng hợp, exact pairs, energy, momentum và scaling table từ 256 tới 2.048 bodies.",
    requirements: [
      "Sinh cùng thiên hà từ deterministic seed; body 0 là central mass, các body còn lại có mass, position và velocity riêng.",
      "Cân lại velocity của central body để tổng momentum ban đầu gần 0; camera chỉ dùng để quan sát, không tham gia phép tính lực.",
      "Cài softened inverse-square acceleration bằng một epsilon có đơn vị độ dài; target không bao giờ tác dụng lực lên chính nó.",
      "Giữ direct O(N²) implementation thật đơn giản: mỗi target đọc N−1 sources và tạo đúng N×(N−1) interactions cho một full pass.",
      "Dùng accumulator, fixed dt=1/240 s và maximum-step guard; integrator cập nhật velocity trước position theo symplectic Euler.",
      "Dựng cubic root bounds từ toàn bộ bodies ở mỗi physics step; node lưu body indices, tám child indices, totalMass và centerOfMass.",
      "Aggregate leaf từ bodies thật, rồi aggregate internal node từ tám children theo mass-weighted average; root mass phải bằng tổng mass hệ.",
      "Barnes–Hut chỉ thay subtree bằng một nguồn khi node không chứa target và s/d < theta; leaf vẫn cộng từng body thật.",
      "Topology inspector phải kiểm body storage, child bounds, internal storage, aggregate mass/center of mass và statistics.",
      "Theta sweep dùng cùng bodies, softening và target indices cho direct/Barnes–Hut; báo mean/max relative force error cùng work counters.",
      "Scaling study đo full-system acceleration pass cho cả hai algorithm, báo thời gian cạnh direct pairs và Barnes–Hut work.",
      "Kèm starter, mười checkpoint độc lập, final có comment, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng thư viện physics, thư viện Barnes–Hut, OpenGL, WebGL, multithreading hoặc GPU compute.",
      "Không thay direct oracle bằng Octree candidates hoặc aggregate nodes; oracle phải đọc từng source body thật.",
      "Không dùng theta để né softening hoặc fixed timestep; ba tham số giải quyết ba vấn đề khác nhau.",
      "Không xấp xỉ node đang chứa target, kể cả khi s/d nhỏ; làm vậy sẽ đưa mass của target vào nguồn tổng hợp và tạo self-force.",
      "Không tính center of mass bằng trung bình position không trọng số khi body có mass khác nhau.",
      "Không giữ reference tới node qua lúc vector thêm tám children; reallocation có thể làm reference mất hiệu lực.",
      "Không kết luận từ FPS hoặc microseconds đơn lẻ; luôn báo force error và lượng công việc cạnh timing.",
      "Không tính energy bằng lực xấp xỉ rồi dùng nó làm oracle; diagnostics dùng công thức cặp trực tiếp trên một workload có giới hạn.",
    ],
    definitionOfDone: [
      "Starter vẽ được deterministic galaxy và orbit camera; body state không phụ thuộc screen projection.",
      "Softened pair acceleration hữu hạn khi hai position trùng nhau và tỉ lệ tuyến tính với source mass.",
      "Direct full pass thực hiện đúng N×(N−1) interactions và one-body case trả gia tốc 0.",
      "Fixed-step plan cho kết quả giống nhau trước các cách chia frame time tương đương và không chạy quá maximum steps.",
      "Mỗi body index xuất hiện đúng một leaf; root totalMass/centerOfMass khớp tính trực tiếp.",
      "One-body Barnes–Hut không approximate root và không sinh self-force; theta gần 0 khớp direct oracle.",
      "Theta 0.25, 0.5, 0.8, 1.1 cho thấy error tăng và work giảm theo trade-off có thể đo được.",
      "Barnes–Hut giảm tổng exact/aggregate sources so với N×(N−1) khi N đủ lớn.",
      "Energy, momentum, center-of-mass drift và finite-state được báo riêng; timing không được dùng làm correctness test.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/reset và có mô tả thay thế bằng văn bản.",
      "Starter, mười checkpoints và final build ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "26–34 giờ",
  objectives: [
    "Xây direct N-body baseline có softening, fixed timestep và diagnostics đủ rõ để làm oracle",
    "Mở rộng Octree bằng aggregate mass/center of mass rồi cài Barnes–Hut traversal không sinh self-force",
    "Đo trade-off accuracy/work theo theta và scaling theo N bằng cùng deterministic workload",
  ],
  lessons: [
    {
      id: "p31-l01",
      slug: "01-thien-ha-va-trang-thai-body",
      title: "Thiên hà và trạng thái của một body",
      summary:
        "Bắt đầu từ chương trình SDL3 chạy được, sinh thiên hà deterministic và phân biệt position, velocity, mass trong world space với pixel dùng để quan sát.",
      order: 1,
      estimatedMinutes: 120,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l02",
      slug: "02-luc-hap-dan-va-softening",
      title: "Lực hấp dẫn và softening",
      summary:
        "Viết gia tốc do một source body gây ra, đọc đúng hướng vector, vai trò source mass và lý do epsilon phải nằm trong mẫu số trước lũy thừa 3/2.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l03",
      slug: "03-direct-n-body-o-n-binh-phuong",
      title: "Direct N-body O(N²)",
      summary:
        "Cộng N−1 nguồn cho từng target, đếm đúng N×(N−1) interactions và giữ implementation này làm oracle độc lập.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l04",
      slug: "04-fixed-step-va-symplectic-euler",
      title: "Fixed step và symplectic Euler",
      summary:
        "Đưa direct acceleration vào accumulator 240 Hz, dùng step guard và cập nhật velocity trước position để có baseline chuyển động tái lập.",
      order: 4,
      estimatedMinutes: 125,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l05",
      slug: "05-mass-octree-va-center-of-mass",
      title: "Mass Octree và center of mass",
      summary:
        "Dựng lại Octree từ body positions, rồi aggregate totalMass và centerOfMass từ leaf lên root bằng trung bình có trọng số.",
      order: 5,
      estimatedMinutes: 150,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l06",
      slug: "06-barnes-hut-opening-criterion",
      title: "Barnes–Hut opening criterion",
      summary:
        "Duyệt Mass Octree, dùng s/d < theta để chọn aggregate source hoặc mở node, đồng thời đếm visited, approximated và exact work.",
      order: 6,
      estimatedMinutes: 145,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l07",
      slug: "07-self-force-va-topology-inspector",
      title: "Self-force và topology inspector",
      summary:
        "Buộc node chứa target phải mở tiếp, rồi dùng inspector độc lập để kiểm storage, child bounds, mass và center of mass.",
      order: 7,
      estimatedMinutes: 130,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l08",
      slug: "08-theta-accuracy-sweep",
      title: "Theta accuracy sweep",
      summary:
        "So Barnes–Hut với direct oracle trên cùng target set, báo mean/max relative error cạnh số aggregate và exact interactions.",
      order: 8,
      estimatedMinutes: 130,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l09",
      slug: "09-scaling-study",
      title: "Scaling study: O(N²) và Barnes–Hut",
      summary:
        "Đo full acceleration pass từ 256 tới 2.048 bodies, giữ output observable và đọc timing cùng work count thay vì chỉ nhìn FPS.",
      order: 9,
      estimatedMinutes: 125,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l10",
      slug: "10-hoan-thien-barnes-hut-n-body",
      title: "Hoàn thiện Barnes–Hut N-body",
      summary:
        "Ghép controls, fixed simulation, rebuild, force inspector, theta/scaling tables và diagnostics thành bản final có validation report.",
      order: 10,
      estimatedMinutes: 155,
      demoId: "barnes-hut-nbody",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
