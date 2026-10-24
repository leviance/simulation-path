import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer và SDL streaming texture",
    "Project 05 — đổi giữa world space và screen space",
    "Project 24 — dữ liệu lặp lại được và cách đo công việc",
  ],
  summary:
    "Tự xây một ứng dụng SDL3 hiển thị 100.000 hạt và vòng tròn chọn điểm theo con trỏ. Bạn sẽ đi từ cách vẽ dữ liệu, kiểm một hạt, tìm mọi hit đến một baseline brute force có bảng thời gian và phép kiểm độc lập.",
  challenge: {
    timebox: "8–12 giờ tự thử trước khi đọc",
    mission:
      "Tự xây dựng một ứng dụng 2D với 100.000 hạt đứng yên trong world [0,1]². Khi rê con trỏ, tô màu mọi hạt trong vòng tròn bán kính R bằng cách quét toàn bộ mảng, chưa dùng grid hoặc tree.",
    outcome:
      "Một executable C++/SDL3 có viewport đủ 100.000 hạt, vòng tròn theo chuột, màu hit rõ ràng, bộ đếm so sánh, query time và bảng đo 1.000 / 10.000 / 100.000 hạt ngay trong UI.",
    requirements: [
      "Sinh đúng 100.000 Particle theo seed; cùng seed tái tạo đúng từng vị trí và thứ tự index.",
      "Vẽ toàn bộ số hạt đã chọn, không dùng draw stride để giảm quy mô; nhiều hạt được phép chồng pixel.",
      "Đổi con trỏ từ window sang logical board rồi sang world; resize không làm đổi dữ liệu hoặc tâm world.",
      "Query trả mọi hit theo thứ tự index, nhận cả biên và chọn nearest trong toàn bộ phần đã quét; tie giữ index đầu.",
      "Viết bản reference dùng độ dài dễ đọc rồi bản squared distance dùng lại QueryWorkspace đã reserve.",
      "Cho đổi N theo ladder 1.000 / 10.000 / 100.000, bán kính R và seed; rê chuột và bàn phím đều đặt được tâm.",
      "Đo riêng query, không tính generation, reserve, render, thời gian chờ frame hoặc checksum vào timer.",
      "Benchmark dùng 24 probes có seed, warm-up riêng rồi đo 48 query; giữ totalScanned, totalHits và checksum dùng toàn hit list.",
      "Study dùng cùng probes cho ba prefix; hiển thị N, Q, scans và time/query thành bảng trong UI.",
      "Job làm tối đa một query benchmark mỗi frame; có hủy/reset/blur/resize và không để capture kẹt.",
      "Đóng gói Starter, bảy checkpoint, final, README và tests thuần không cần cửa sổ.",
    ],
    constraints: [
      "Không dùng Spatial Grid, Quadtree, k-d tree, BVH hoặc spatial-query library.",
      "Không dừng ở hit đầu tiên hoặc dùng renderer để tự tính một hit list khác.",
      "Không dùng FPS tổng thay cho query time; không dựng sẵn thời gian tăng theo N.",
      "Không so checksum thay cho equality khi kiểm correctness; không thêm epsilon tùy ý để che sai khác ở biên.",
      "Canvas hỗ trợ học, không thay ứng dụng C++/SDL3 hoàn chỉnh; không lấy mẫu để giả tải 100.000 hạt.",
    ],
    definitionOfDone: [
      "Mặc định đủ 100.000 hạt; cùng seed tái tạo mọi vị trí, tất cả nằm trong bounds.",
      "Query đúng trên fixture có thể tính tay: empty, zero radius, inclusive boundary, no hits, nearest tie.",
      "Reference, optimized và oracle độc lập khớp toàn hit list trên 24 query ở quy mô 100.000.",
      "Sau reserve(N), capacity của workspace không tăng qua nhiều bán kính; full query luôn scanned=N.",
      "Job benchmark hoàn tất sau 72 tick; scaling sau 216 tick, Q=48 mỗi dòng và scans=48.000 / 480.000 / 4.800.000.",
      "Checksum lặp lại được; timer finite/non-negative, không đòi thời gian phải tăng đúng mười lần.",
      "SDL có bảng đo ngay trong cửa sổ và chế độ sạch; Canvas có cùng dữ liệu/quy ước cùng controls theo bài.",
      "Capture owner, final up, cancel, blur, resize, DPR, keyboard, reduced motion và cleanup có kiểm chứng.",
      "Starter, mọi checkpoint và final build Debug/Release warning-as-error; CTest, web build, links, source và ZIP đều được kiểm.",
    ],
  },
  duration: "16–22 giờ",
  objectives: [
    "Tự viết một truy vấn brute force đầy đủ và kiểm được bằng dữ liệu nhỏ lẫn 100.000 hạt",
    "Tối ưu phép tính và vùng nhớ mà không đổi ý nghĩa kết quả",
    "Đọc bảng exact work và thời gian đo thật trước khi học Spatial Grid",
  ],
  lessons: [
    {
      id: "p27-l01",
      slug: "01-tao-cloud-100000-particles",
      title: "Vẽ 100.000 hạt từ một bộ dữ liệu có thể tạo lại",
      summary: "Đọc khung SDL có sẵn, sinh dữ liệu theo seed rồi vẽ đủ từng hạt lên framebuffer.",
      order: 1,
      estimatedMinutes: 105,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l02",
      slug: "02-bien-con-tro-thanh-query-circle",
      title: "Đặt vòng tròn truy vấn bằng chuột",
      summary: "Đổi tọa độ chuột sang world, vẽ vòng tròn và kiểm một hạt trước khi viết vòng lặp.",
      order: 2,
      estimatedMinutes: 110,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l03",
      slug: "03-quet-toan-bo-particles-bang-brute-force",
      title: "Tìm mọi hạt trong vòng tròn bằng brute force",
      summary:
        "Thu thập mọi hit, giữ nearest ổn định và phân biệt số hạt đã kiểm với số hạt được chọn.",
      order: 3,
      estimatedMinutes: 110,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l04",
      slug: "04-bo-sqrt-va-tai-su-dung-bo-dem",
      title: "Bỏ phép căn và dùng lại bộ đệm",
      summary: "Bỏ phép căn, reserve workspace và đối chiếu toàn bộ kết quả với bản dễ đọc.",
      order: 4,
      estimatedMinutes: 115,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l05",
      slug: "05-do-thoi-gian-khong-tu-danh-lua-minh",
      title: "Đo riêng thời gian truy vấn",
      summary:
        "Tách query time khỏi rendering; warm-up và chạy job hữu hạn, có tiến độ cùng lệnh hủy.",
      order: 5,
      estimatedMinutes: 135,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l06",
      slug: "06-doc-duong-tang-chi-phi-theo-n",
      title: "Đọc chi phí khi tăng từ 1.000 lên 100.000 hạt",
      summary: "Dùng cùng query set trên ba prefix để đọc bảng thời gian và exact work theo N.",
      order: 6,
      estimatedMinutes: 120,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l07",
      slug: "07-hoan-thien-kinh-lup-va-nghiem-thu",
      title: "Hoàn thiện kính lúp và kiểm chứng toàn bộ dự án",
      summary:
        "Hoàn thiện auto probe, chế độ sạch, input lifecycle và tests độc lập cho bản C++ đầy đủ.",
      order: 7,
      estimatedMinutes: 130,
      demoId: "brute-force-particle-query",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
