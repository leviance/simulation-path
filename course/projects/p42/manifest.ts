import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 23 — Velocity Verlet, fixed timestep và energy drift",
    "Project 27 — vòng lặp vét cạn, workload hữu hạn và phép đo có thể tái lập",
    "Project 41 — thế Lennard–Jones, lực trên một cặp và hệ đơn vị rút gọn",
  ],
  summary:
    "Mở rộng cặp nguyên tử của Project 41 thành một hộp Molecular Dynamics gồm 1.000 hạt chạy hoàn toàn trên CPU. Người học tự xếp hạt lên lattice không chồng lấn, gán vận tốc theo nhiệt độ, quét đúng mọi cặp i<j, cộng lực Lennard–Jones đã làm mượt tại cutoff, phản xạ hạt ở thành hộp và theo dõi năng lượng cùng nhiệt độ qua từng bước Velocity Verlet.",
  challenge: {
    timebox: "900–1.200 phút",
    mission:
      "Tự xây dựng một hộp khí 2D gồm đúng 1.000 hạt Lennard–Jones. Mọi lực phải được tính trên CPU bằng vòng lặp mọi cặp, hạt bật lại khi chạm thành hộp và mô phỏng tiếp tục bằng fixed timestep mà không dùng periodic boundary, spatial grid, neighbor list hay physics engine.",
    outcome:
      "Một CPU Molecular Dynamics Lab hiển thị hộp hạt, màu theo tốc độ, vector vận tốc, trạng thái hạt được chọn, số cặp trong và ngoài cutoff, nhiệt độ, động lượng và đồ thị K/U/E. Người dùng đổi được số hạt, nhiệt độ, mật độ, seed và dt; preset 1.000 hạt báo 499.500 cặp mỗi lần tính lực, tương ứng 999.000 lượt xét trong một bước Verlet gồm hai lần tính lực.",
    requirements: [
      "Starter tạo cửa sổ SDL3, renderer, streaming texture và framebuffer đổi kích thước được; chưa có mô hình vật lý nhưng đã vẽ rõ vùng hộp.",
      "Trạng thái mỗi hạt chỉ chứa position, velocity và mass theo world space; màu, bán kính và pixel không được chen vào dữ liệu vật lý.",
      "Tạo đúng N hạt từ seed trên lattice 2D có jitter nhỏ, mọi vị trí nằm trong hộp và không có hai hạt gần như trùng nhau.",
      "Gán vận tốc có thể tái lập, trừ vận tốc tâm khối lượng có trọng số mass rồi rescale để đạt nhiệt độ mục tiêu. Mỗi lần đo dùng T=2K_thermal/(2N-2), với K_thermal tính từ v-vCOM; K trong E=K+U vẫn là động năng toàn phần.",
      "Dùng thế Lennard–Jones từ Project 41 nhưng chuyển sang force-shifted form để cả U(r) và dU/dr bằng zero tại cutoff; ngoài cutoff, cặp không đóng góp lực hoặc thế năng.",
      "Vòng lặp lực chỉ xét unordered pair bằng điều kiện i<j; mỗi cặp tạo một lực trên i và lực đối trên j từ cùng một kết quả tính.",
      "Với 1.000 hạt, evaluatedPairs phải đúng N(N-1)/2 = 499.500 dù chỉ một phần cặp nằm trong cutoff.",
      "Velocity Verlet dùng kick–drift–kick: nửa bước vận tốc, cập nhật vị trí, phản xạ ở tường, tính lại lực rồi hoàn tất nửa bước vận tốc còn lại.",
      "Phản xạ tường phải mirror phần overshoot trở lại hộp và chỉ đảo thành phần vận tốc vuông góc với tường; không clamp vị trí rồi giữ nguyên vận tốc.",
      "Render time đi qua accumulator có giới hạn frame time và số bước con; preset 1.000 hạt được phép chậm hơn nhưng không được làm vòng lặp catch-up chạy vô hạn.",
      "Lịch sử K, U, E và T có kích thước cố định; reset hoặc đổi preset phải xóa lịch sử và đo lại initialEnergy từ đúng trạng thái mới.",
      "Phép kiểm chứng hữu hạn kiểm tra khởi tạo deterministic, bounds, nhiệt độ, pair count, tổng lực nội bộ, cutoff, phản xạ, trạng thái hữu hạn và energy drift.",
      "Kèm starter, tám checkpoint độc lập, final có comment, README, CTest thuần CPU và ZIP khớp với nội dung trên web.",
    ],
    constraints: [
      "Không dùng periodic boundary trong Project 42; đó là nội dung của Project 43.",
      "Không dùng spatial grid, neighbor list hoặc bỏ qua trước các cặp ở xa trong vòng lặp; Project 44 mới tối ưu việc tìm cặp.",
      "Không tính ordered pair i→j rồi lại j→i và không chia tổng lực cho hai để che việc cộng đôi.",
      "Không dùng thermostat liên tục để ép nhiệt độ về target; target chỉ dùng khi tạo vận tốc ban đầu.",
      "Không clamp lực Lennard–Jones ở khoảng cách quá gần. Nếu trạng thái không hữu hạn, bước mới phải bị từ chối và trạng thái hợp lệ cuối cùng được giữ lại.",
      "Không dùng frame delta trực tiếp làm physics dt, không chạy benchmark vô hạn và không để CTest mở cửa sổ SDL.",
      "Canvas được phép dùng preset nhỏ hơn để minh họa mượt, nhưng phải có preset 1.000 và phải ghi rõ khi giới hạn số bước mỗi frame.",
    ],
    definitionOfDone: [
      "Cùng particleCount, density và seed tạo cùng vị trí; đổi seed làm trạng thái khác nhưng vẫn giữ mọi hạt trong hộp.",
      "Sau khi khởi tạo vận tốc, |total momentum| < 1e-9 và nhiệt độ đo được khớp target trong sai số số thực.",
      "Force-shifted U(rc)=0 và dU/dr(rc)=0; mẫu ngay phía trong cutoff tiến liên tục về hai giá trị này.",
      "Với N=1.000, vòng lặp xét đúng 499.500 cặp; với mọi trạng thái hợp lệ, tổng các lực nội bộ gần (0,0).",
      "Một hạt vượt tường trái 0,25 đơn vị quay lại vị trí 0,25 và đổi vx từ âm sang dương; vy không đổi.",
      "Một bước Velocity Verlet chỉ commit khi cả hai lần tính lực và toàn bộ state đều hữu hạn.",
      "Cùng initial state và fixed dt tạo cùng final state; cách chia frame time không đổi số bước khi chưa chạm guard.",
      "Phép kiểm chuẩn theo dõi sai số năng lượng lớn nhất trong 400 bước của 36 hạt ở dt=1/1000; thêm ca hai hạt chạy 200 bước dt=1/2000 có va chạm tường thật. Cả hai phải dưới 1%; cấu hình người dùng chọn được đánh giá riêng.",
      "History không vượt quá giới hạn; đổi count, temperature, density, seed hoặc dt đưa mô phỏng về trạng thái đầu mới rõ ràng.",
      "Space chạy/tạm dừng, N tiến một bước khi dừng, R đặt lại, 1–4 đổi count, D đổi mật độ, V kiểm chứng mô hình chuẩn và click chọn hạt đều hoạt động; bảng SDL luôn hiển thị x/v của hạt cùng số đo hệ.",
      "Canvas hỗ trợ pointer capture, bàn phím, DPR, reduced motion và có phần mô tả văn bản tương ứng.",
      "Starter, tám checkpoint, final, CTest, math tests, content contracts, ZIP check và production build đều kết thúc trong timeout hữu hạn.",
    ],
  },
  duration: "18–24 giờ",
  objectives: [
    "Khởi tạo một hệ nhiều hạt có mật độ, nhiệt độ và tổng động lượng được kiểm soát",
    "Mở rộng lực của một cặp thành vòng lặp mọi cặp không cộng đôi và hiểu chi phí O(N²)",
    "Tích phân, phản xạ biên và kiểm chứng một mô phỏng Molecular Dynamics CPU bằng đại lượng bảo toàn",
  ],
  lessons: [
    {
      id: "p42-l01",
      slug: "01-xep-1000-hat-vao-hop",
      title: "Xếp 1.000 hạt vào hộp mà không chồng lấn",
      summary:
        "Dựng `MolecularSystem`, chọn kích thước hộp từ mật độ và đặt hạt lên lattice có jitter deterministic trước khi tính bất kỳ lực nào.",
      order: 1,
      estimatedMinutes: 115,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l02",
      slug: "02-gan-van-toc-theo-nhiet-do",
      title: "Gán vận tốc theo nhiệt độ và bỏ chuyển động khối",
      summary:
        "Tạo vận tốc từ seed, trừ vận tốc trung bình rồi rescale động năng để đạt nhiệt độ mục tiêu với 2N-2 degrees of freedom.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l03",
      slug: "03-lam-muot-luc-tai-cutoff",
      title: "Đưa thế năng và lực về 0 tại cutoff",
      summary:
        "Chuyển Lennard–Jones sang force-shifted form để một cặp ra khỏi cutoff không tạo bước nhảy ở thế năng hoặc lực.",
      order: 3,
      estimatedMinutes: 130,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l04",
      slug: "04-quet-moi-cap-va-cong-luc",
      title: "Quét mọi cặp i < j và cộng lực cho toàn hệ",
      summary:
        "Dùng một vòng lặp tam giác để xét mỗi unordered pair đúng một lần, cộng hai lực đối nhau và đếm riêng evaluatedPairs với activePairs.",
      order: 4,
      estimatedMinutes: 145,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l05",
      slug: "05-tich-phan-va-phan-xa-o-thanh-hop",
      title: "Tích phân nhiều hạt và phản xạ ở thành hộp",
      summary:
        "Ghép lực toàn hệ vào Velocity Verlet dạng kick–drift–kick rồi mirror phần overshoot khi hạt vượt một thành hộp.",
      order: 5,
      estimatedMinutes: 155,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l06",
      slug: "06-do-nhiet-do-va-nang-luong",
      title: "Đo nhiệt độ, động lượng và năng lượng",
      summary:
        "Đo K, U, E, T và momentum tại cùng một state, lưu history có giới hạn rồi dùng energy drift để đánh giá fixed dt.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l07",
      slug: "07-do-chi-phi-o-n-binh-phuong",
      title: "Đo chi phí của vòng lặp mọi cặp",
      summary:
        "Đối chiếu số cặp với thời gian bước, giới hạn catch-up và chuẩn bị lý do định lượng cho periodic boundary cùng neighbor list ở hai project tiếp theo.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "molecular-dynamics-cpu",
    },
    {
      id: "p42-l08",
      slug: "08-hoan-thien-cpu-molecular-dynamics-lab",
      title: "Hoàn thiện CPU Molecular Dynamics Lab",
      summary:
        "Ghép preset, inspector, điều khiển, đồ thị, validation, cleanup và toàn bộ source chạy độc lập thành hộp khí 1.000 hạt hoàn chỉnh.",
      order: 8,
      estimatedMinutes: 160,
      demoId: "molecular-dynamics-cpu",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
