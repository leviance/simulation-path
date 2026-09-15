import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer, putPixel và streaming texture",
    "Project 05 — world/screen transform và pointer interaction",
    "Project 24 — deterministic scene, pair count và bounded benchmark",
  ],
  summary:
    "Tạo 100.000 hạt có thể sinh lại từ cùng một `seed`, rồi tìm mọi hạt nằm trong bán kính quanh con trỏ bằng cách quét toàn bộ mảng. Bạn sẽ bắt đầu với phép tính khoảng cách dễ đọc, tối ưu sang khoảng cách bình phương và bộ đệm dùng lại, sau đó đo để thấy chi phí tăng tuyến tính theo N.",
  challenge: {
    timebox: "420–600 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D gồm 100.000 particles và một chiếc kính lúp đi theo con trỏ. Ở mỗi query, chương trình phải trả về toàn bộ particles nằm trong vòng tròn cùng particle gần tâm nhất bằng brute force; chưa được dùng grid, tree hoặc spatial index.",
    outcome:
      "Một cửa sổ SDL3 hiển thị đám hạt, vòng tròn truy vấn, các hit, hạt gần tâm nhất và số phần tử đã quét. Người dùng có thể đổi N, bán kính, `seed`, chạy truy vấn tự động, benchmark và phép thử tăng trưởng từ 1.000 đến 100.000 hạt.",
    requirements: [
      "Sinh tối đa 100.000 `Particle` trong world bounds bằng PRNG có seed; cùng seed phải tạo đúng cùng thứ tự position.",
      "Đổi pointer từ screen space sang world space trước khi tạo `CircleQuery`; resize không được làm đổi query center trong world.",
      "Viết phiên bản brute force dễ đọc: duyệt index từ 0 tới N−1, kiểm từng distance, lưu mọi hit và nearest stable index.",
      "Giữ boundary inclusive: particle có distance đúng bằng radius phải được tính là hit.",
      "Tạo phiên bản dùng `distanceSquared <= radiusSquared` và chứng minh hit indices/nearest index khớp phiên bản dùng sqrt.",
      "Tái sử dụng `QueryWorkspace`; reserve trước benchmark và không tạo vector mới bên trong hot loop.",
      "Benchmark một tập query deterministic, chạy warm-up ngoài vùng đo, lặp số lần hữu hạn và giữ checksum để công việc không bị tối ưu bỏ.",
      "Báo riêng `scanned`, `hits`, `queryCount`, elapsed time và time/query; không dùng FPS tổng của renderer làm thời gian query.",
      "Chạy scaling study với 1.000, 10.000 và 100.000 particles; xác nhận total scans bằng N × số query.",
      "Kèm starter, bảy checkpoint độc lập, final, README và CTest không cần mở SDL window.",
    ],
    constraints: [
      "Không dùng Spatial Grid, Quadtree, k-d tree, BVH hoặc thư viện spatial query; đó là baseline để Project 28 so sánh.",
      "Không dừng vòng lặp sau hit đầu tiên vì yêu cầu là tìm mọi particle trong bán kính.",
      "Không đo cả particle generation, rendering hoặc console output vào thời gian query.",
      "Không tạo một `std::vector` mới cho mỗi query trong phiên bản tối ưu.",
      "Không thay đổi particle order giữa hai thuật toán khi đối chiếu correctness.",
      "Không kết luận complexity từ một lần bấm benchmark; phải dùng cùng query set và ghi cả exact scan count.",
      "Không vẽ ít particle rồi báo đó là workload query; nếu Canvas lấy mẫu để render, readout phải nói rõ query vẫn scan bao nhiêu phần tử.",
    ],
    definitionOfDone: [
      "Cloud có đúng 100.000 particles, mọi position nằm trong bounds và reset cùng seed tái tạo đúng dữ liệu.",
      "Pointer ở tâm vùng vẽ tạo đúng world center; resize rồi query lại không đổi kết quả cho cùng world point.",
      "Với một tập dữ liệu nhỏ tính tay được, hit indices giữ thứ tự tăng dần, boundary được nhận và nearest tie chọn index đầu tiên.",
      "Phiên bản sqrt và squared-distance trả cùng hit indices cùng nearest index trên ít nhất 24 query deterministic.",
      "Workspace đã reserve giữ nguyên capacity qua nhiều radius và mỗi full query báo `scanned == N`.",
      "Benchmark có warm-up, số query hữu hạn, checksum lặp lại được và timing finite/non-negative.",
      "Scaling rows báo exact work 1.000×Q, 10.000×Q và 100.000×Q; radius đổi hit count nhưng không đổi scan count.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/reset và mô tả rõ draw sample khác query workload.",
      "Starter, bảy checkpoint và final build sạch warning ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "14–18 giờ",
  objectives: [
    "Xây một truy vấn brute force đúng, có thể lặp lại và có quy ước kết quả rõ ràng",
    "Tối ưu vòng lặp bằng khoảng cách bình phương và bộ đệm dùng lại mà không làm thay đổi kết quả",
    "Đo số lần kiểm cùng thời gian chạy để nhận ra O(N) trước khi học Spatial Grid",
  ],
  lessons: [
    {
      id: "p27-l01",
      slug: "01-tao-cloud-100000-particles",
      title: "Tạo cloud 100.000 particles có thể lặp lại",
      summary:
        "Dựng Particle/Bounds2D, sinh position bằng XorShift32 có seed và đưa 100.000 điểm lên framebuffer mà không trộn generation với query.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l02",
      slug: "02-bien-con-tro-thanh-query-circle",
      title: "Biến con trỏ thành một query circle",
      summary:
        "Đổi pointer sang world space, định nghĩa center/radius và kiểm membership bằng distance dễ đọc trước khi tối ưu.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l03",
      slug: "03-quet-toan-bo-particles-bang-brute-force",
      title: "Quét toàn bộ particles bằng brute force",
      summary:
        "Duyệt mọi index, thu thập toàn bộ hits, chọn nearest stable index và nhìn scan progress để hiểu không có vùng nào được bỏ qua.",
      order: 3,
      estimatedMinutes: 95,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l04",
      slug: "04-bo-sqrt-va-tai-su-dung-bo-dem",
      title: "Bỏ sqrt và tái sử dụng bộ đệm",
      summary:
        "So distance² với radius², reserve QueryWorkspace một lần và đối chiếu output với phiên bản dễ đọc trên cùng dữ liệu.",
      order: 4,
      estimatedMinutes: 100,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l05",
      slug: "05-do-thoi-gian-khong-tu-danh-lua-minh",
      title: "Đo thời gian mà không tự đánh lừa mình",
      summary:
        "Tách generation/render khỏi vùng đo, warm-up query path, dùng query set deterministic và giữ checksum cùng exact scan count.",
      order: 5,
      estimatedMinutes: 105,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l06",
      slug: "06-doc-duong-tang-chi-phi-theo-n",
      title: "Đọc đường tăng chi phí theo số hạt",
      summary:
        "Chạy cùng query set trên ba prefix 1k/10k/100k, tách hit count khỏi scan count và đọc baseline O(N).",
      order: 6,
      estimatedMinutes: 105,
      demoId: "brute-force-particle-query",
    },
    {
      id: "p27-l07",
      slug: "07-hoan-thien-kinh-lup-va-nghiem-thu",
      title: "Hoàn thiện kính lúp và nghiệm thu",
      summary:
        "Ghép preset, pointer capture, auto probe, benchmark/scaling controls và CTest cho deterministic data, correctness, allocation cùng exact work.",
      order: 7,
      estimatedMinutes: 115,
      demoId: "brute-force-particle-query",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
