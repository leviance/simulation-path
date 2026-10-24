import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 07 — góc radian, sin/cos và atan2",
    "Project 22–23 — world/screen, fixed timestep, RK4 và cách đo sai số",
    "Project 25 — quản lý trạng thái thí nghiệm, đồ thị và thao tác có thể hủy",
  ],
  summary:
    "Tự xây hai con lắc kép chạy cạnh nhau từ hai điều kiện đầu chỉ lệch một góc rất nhỏ. Bạn sẽ viết phương trình chuyển động, RK4, vệt chuyển động và đồ thị độ tách; sau đó giảm bước thời gian để kiểm tra xem sự khác biệt đến từ độ nhạy của hệ hay từ sai số tính toán.",
  duration: "18–24 giờ",
  objectives: [
    "Dựng hình từ góc và tự giải phương trình của hai thanh liên kết",
    "Chạy hai hệ đồng bộ, đo độ tách đúng đơn vị và xử lý tính tuần hoàn của góc",
    "Kiểm tra hội tụ và cơ năng trước khi nói về tính hỗn loạn",
    "Ghép phép tính, đồ thị và tương tác thành ứng dụng SDL3 hoàn chỉnh",
  ],
  challenge: {
    timebox: "10–12 giờ tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng 2D bằng C++20/SDL3 với hai con lắc kép A và B chạy cạnh nhau. Dùng cùng khối lượng, chiều dài, trọng lực và solver; chỉ cộng epsilon vào theta2 ban đầu của B. Chương trình phải làm hiện rõ quá trình hai chuyển động tách nhau, đồng thời cung cấp bằng chứng để không nhầm sai số số học với chaos.",
    outcome:
      "Một executable có hai khung A/B, vệt chuyển động, đồ thị độ tách theo thời gian và đồ thị sai lệch cơ năng. Người dùng đổi dt/epsilon, bắt đầu, tạm dừng, tiến một bước, đặt lại, chọn preset và kéo quả cuối của A để đặt lại góc ban đầu.",
    requirements: [
      "Thanh cứng không có khối lượng, quả nặng là point mass; bỏ qua ma sát và lực cản không khí. Góc tuyệt đối đo từ phương thẳng đứng hướng xuống, world Y hướng lên.",
      "Tự suy ra vị trí từ theta1/theta2, tự lập hai phương trình và giải gia tốc tại cùng một state. Không dùng physics engine hay quỹ đạo sin/cos đặt sẵn.",
      "Classical RK4 trong fixed timestep; mặc định h=1/240 s, có 1/30 đến 1/960 s. Chỉ các bước thành công mới tăng thời gian/bộ đếm; thất bại ở một trajectory phải từ chối toàn bộ bước.",
      "A và B cùng tham số/cùng h; B chỉ lệch theta2 ban đầu. Khi epsilon=0, hai state phải trùng nhau trong cùng run.",
      "Đo khoảng cách hai quả cuối trong world space, không lấy khoảng cách giữa hai khung vẽ trên màn hình. Độ tách phase space dùng wrapped angle và hệ số thời gian sqrt(meanLength/g) cho chênh lệch omega.",
      "Từ đúng điều kiện đầu của A, chạy thêm reference bằng hai bước h/2 cho mỗi bước h. Reference là phép đối chiếu số, không phải nghiệm chính xác.",
      "Hai đồ thị tách biệt: d(t) trên trục log, ΔE_A/B/reference theo Joule. Mỗi con lắc có E0 riêng; max |ΔE| đo ở mọi bước, không chỉ ở các mẫu được vẽ.",
      "History lấy định kỳ tối đa 25 Hz, thêm mẫu bước đơn/cuối job và giữ 751 mẫu gần nhất. Trục X lấy thời gian của mẫu; sàn log chỉ dùng để vẽ, không sửa d=0.",
      "Job 10/30 giây chia thành tối đa 32 bước/frame, có thể dừng; không có vòng lặp dài đồng bộ trong click handler. Frame dài được giới hạn và báo dropped time.",
      "Ba preset góc nhỏ/năng lượng cao/gần đỉnh; chế độ sạch vẫn giữ hai con lắc, trails và đồ thị. Kéo phải chọn đúng quả cuối A, giữ lệch điểm cầm, nhận mẫu thả cuối và hủy an toàn.",
      "Cung cấp Starter, 7 checkpoint chạy độc lập, final, tests và ZIP. Canvas dùng cùng công thức nhưng không thay executable C++.",
    ],
    constraints: [
      "Không đổi đặc tả thành một con lắc đẹp hoặc hai animation có pha khác nhau.",
      "Không kết luận chaos từ hình rối, một tốc độ tăng trưởng dương hay một lần chạy giữ năng lượng tốt.",
      "Không wrap góc của state đang tích phân, không clamp góc/vận tốc để giấu instability. Khi đặt điều kiện đầu mới bằng UI có thể chọn biểu diễn góc trong một vòng.",
      "Không so các state khác thời điểm; giữ cả ba nhãn thời gian đồng bộ sau khi hai half-step thực sự đã được chấp nhận.",
      "Không gọi reference h/2 là nghiệm đúng tuyệt đối. Ở thời gian dài sai số số học cũng có thể bị khuếch đại mạnh.",
      "Không dùng CTest include final để chứng minh phần Starter người học vừa viết; phải hướng dẫn cách chuyển tests sang bài làm.",
    ],
    definitionOfDone: [
      "Geometry giữ đúng chiều dài; cấu hình thẳng xuống và hai thanh nằm ngang có đáp án gia tốc rõ ràng.",
      "Phương trình qua kiểm tra Newton độc lập với mass/length không bằng nhau; RK4 cho tỷ lệ giảm sai số khoảng bậc 4 ở horizon ngắn.",
      "Với điều kiện đầu (theta1,theta2)=(2,1.1), omega=0, epsilon=1e-4: sau 10 s, d khoảng 0,2123 ở cả h=1/240, 1/480, 1/960; numerical separation giảm khi giảm h và nhỏ hơn 0,1% độ tách A/B.",
      "Trong cùng thí nghiệm 10 s, max relative energy drift của cả A và B dưới 1e-6 ở h=1/240; kiểm cả reference và cải thiện khi giảm h. Ngưỡng này không được quảng bá cho mọi preset/dt/thời lượng.",
      "Cả ba preset hoàn thành 30 s hữu hạn. Đồ thị thể hiện rằng numerical separation có thể lớn ở thời gian dài dù energy drift còn nhỏ.",
      "Góc +179°/−179° được đo cách nhau 2°; epsilon=0 giữ A/B trùng nhau và không bịa ra exponent khi d0=0.",
      "Job dừng được; lỗi trajectory không làm state khác tiến dở; tests kiểm capture failure, pointer owner, final up, cancel, focus, reduced motion và cleanup.",
      "Starter, 7 checkpoint và final build Debug/Release; CTest chạy được không mở window, kể cả Release. Snippet khớp source, ZIP khớp từng byte.",
    ],
  },
  lessons: [
    {
      id: "p26-l01",
      slug: "01-bieu-dien-double-pendulum-bang-goc",
      title: "Dựng một con lắc kép từ hai góc",
      summary:
        "Từ khung SDL có sẵn, tính vị trí hai quả nặng rồi vẽ thanh nối; kiểm tra quy ước góc và chiều dài.",
      order: 1,
      estimatedMinutes: 100,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l02",
      slug: "02-tinh-angular-acceleration-coupled",
      title: "Tính gia tốc: vì sao hai thanh ảnh hưởng lẫn nhau?",
      summary:
        "Lập hai phương trình liên kết, giải hệ 2×2 và kiểm bằng những tư thế có đáp án tính tay.",
      order: 2,
      estimatedMinutes: 130,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l03",
      slug: "03-tich-phan-rk4-va-theo-doi-energy",
      title: "Cho con lắc chuyển động và kiểm tra cơ năng",
      summary:
        "Ghép RK4 với fixed timestep, lấy dữ liệu đồ thị từ physics và theo dõi sai lệch năng lượng.",
      order: 3,
      estimatedMinutes: 150,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l04",
      slug: "04-chay-hai-con-lac-cung-timestep",
      title: "Đặt hai điều kiện đầu gần nhau và chạy đồng bộ",
      summary:
        "Tạo con lắc B chỉ lệch theta2 một lượng epsilon; vẽ hai khung và hai vệt chuyển động mà không lệch thời gian.",
      order: 4,
      estimatedMinutes: 100,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l05",
      slug: "05-do-separation-trong-phase-space",
      title: "Đo độ tách mà không nhầm ở biên góc",
      summary:
        "Phân biệt khoảng cách hai quả nặng với khoảng cách trạng thái, xử lý góc tuần hoàn và vẽ trục log theo thời gian thực của mẫu.",
      order: 5,
      estimatedMinutes: 120,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l06",
      slug: "06-phan-biet-chaos-voi-sai-so-so-hoc",
      title: "Kiểm tra lại bằng bước thời gian nhỏ hơn",
      summary:
        "Thêm quỹ đạo h/2, chạy thử 10 giây có thể hủy và so ba độ phân giải trước khi diễn giải divergence.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l07",
      slug: "07-preset-tuong-tac-va-nghiem-thu",
      title: "Hoàn thiện bàn thí nghiệm và mã nguồn",
      summary:
        "Thêm preset, kéo đặt góc ban đầu, job 30 giây theo batch, chế độ trình diễn và bộ kiểm chứng độc lập.",
      order: 7,
      estimatedMinutes: 130,
      demoId: "double-pendulum-chaos",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
