import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time, FPS cap và khác biệt giữa tốc độ theo frame/theo giây",
    "Project 05 — đổi qua lại giữa world space và screen space",
    "Project 08 — vector hướng, atan2 và thao tác kéo chuột",
  ],
  summary:
    "Kéo nòng pháo để chọn hướng cùng vận tốc đầu, bắn một viên đạn chịu trọng lực rồi đặt quỹ đạo do Explicit Euler tính cạnh nghiệm giải tích để nhìn thấy sai số tích phân thay vì chỉ đọc một con số.",
  challenge: {
    timebox: "420–540 phút",
    mission:
      "Tự xây dựng một mô phỏng pháo 2D bằng C++20 và SDL3. Người dùng kéo chuột để chọn góc bắn cùng tốc độ, bấm phím để khai hỏa, sau đó quan sát viên đạn được cập nhật bằng Explicit Euler và so trực tiếp với quỹ đạo giải tích trong cùng hệ tọa độ.",
    outcome:
      "Một bãi thử có pháo, vector vận tốc đầu, đường dự đoán giải tích, trail số, viên đạn tham chiếu và đoạn nối biểu diễn sai số. Người dùng có thể đổi góc, tốc độ, fixed dt, bắn lại, pause, tiến từng bước và đọc thời gian bay, tầm xa cùng sai số hiện tại.",
    requirements: [
      "Dựng một WorldView đổi world point có trục Y hướng lên thành screen point có trục Y hướng xuống và dùng cùng phép đổi cho pháo, quỹ đạo lẫn con trỏ.",
      "Biến vector kéo chuột thành speed và angle có giới hạn rõ ràng; kéo gần như bằng 0 không được sinh NaN hoặc hướng rác.",
      "Tách vận tốc đầu theo `vx = speed * cos(angle)` và `vy = speed * sin(angle)`; hiển thị hai component trên hình.",
      "Cài nghiệm giải tích `p(t) = p0 + v0*t + 0.5*a*t*t` và lấy mẫu thành đường dự đoán tới lúc chạm đất.",
      "Cài Explicit Euler bằng state position/velocity/elapsed; update position bằng velocity cũ rồi mới cộng acceleration vào velocity.",
      "Dùng accumulator và fixed timestep để số bước vật lý không phụ thuộc nhịp render; giới hạn frame time cùng số substep để tránh spiral of death.",
      "Giải phương trình bậc hai để tìm thời điểm chạm đất giải tích; ở đường số phải nội suy đoạn cuối để viên đạn dừng đúng mặt đất.",
      "Vẽ đồng thời analytic trajectory, numerical trail và exact reference tại cùng elapsed time; hiện Euclidean position error bằng mét.",
      "Có controls bằng chuột và bàn phím cho fire, pause/resume, single-step, reset, angle, speed và fixed dt.",
      "Kèm starter, bảy checkpoint chạy độc lập, final, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng Box2D, Chipmunk, engine vật lý hoặc thư viện tích phân có sẵn.",
      "Không cập nhật position theo số pixel mỗi frame; đại lượng vật lý dùng mét, giây và mét trên giây.",
      "Không dùng công thức giải tích để bí mật điều khiển viên đạn số; hai đường phải được tính độc lập.",
      "Không dùng frame delta trực tiếp làm physics step sau khi accumulator đã xuất hiện.",
      "Không clamp viên đạn xuống ground rồi coi đó là impact chính xác; phải tìm giao điểm trên bước cuối.",
      "Project này chỉ có trọng lực đều, chưa có drag, gió, spin hoặc va chạm với địa hình phức tạp.",
    ],
    definitionOfDone: [
      "Kéo sang phải và lên trên tạo `vx > 0`, `vy > 0`; speed/angle nằm đúng giới hạn và round-trip qua polar components trong sai số số thực.",
      "Nghiệm giải tích trả đúng position ban đầu tại t=0, đúng acceleration qua finite difference và đúng ground impact root dương.",
      "Một chuỗi frame time khác nhau nhưng có cùng tổng thời gian tạo cùng số fixed step và cùng state số.",
      "Giảm fixed dt làm sai số Explicit Euler tại cùng thời điểm giảm rõ ràng.",
      "Numerical impact nằm trên ground trong epsilon, không xuyên xuống dưới và elapsed chỉ nhận phần thời gian thật của bước cuối.",
      "Pause không làm mất accumulator; single-step tiến đúng một fixed dt; reset phục hồi toàn bộ cấu hình ban đầu.",
      "Canvas xử lý DPR, pointer capture, reduced motion và controls bằng bàn phím; readout văn bản giải thích được trạng thái hiện tại.",
      "Starter, bảy checkpoint và final build sạch warning ở Debug/Release; CTest cùng test Canvas đều vượt qua.",
    ],
  },
  duration: "13–15 giờ",
  objectives: [
    "Đổi thao tác kéo chuột thành một vận tốc đầu có đơn vị và component rõ ràng",
    "Phân biệt nghiệm giải tích với mô phỏng số của cùng một hệ động lực học",
    "Dùng fixed timestep, impact interpolation và phép đo sai số để kiểm chứng một mô phỏng",
  ],
  lessons: [
    {
      id: "p22-l01",
      slug: "01-dung-bai-ban-va-vector-ngam",
      title: "Dựng bãi bắn và kéo vector ngắm",
      summary:
        "Bắt đầu từ window/framebuffer có sẵn, vẽ pháo cùng mặt đất rồi đổi thao tác kéo chuột thành một vector vận tốc trong world space.",
      order: 1,
      estimatedMinutes: 75,
      demoId: "projectile",
    },
    {
      id: "p22-l02",
      slug: "02-tach-van-toc-dau-theo-hai-truc",
      title: "Tách vận tốc đầu theo hai trục",
      summary:
        "Dùng sin, cos và atan2 để đi qua lại giữa speed-angle với vx-vy, rồi vẽ hai component ngay trên nòng pháo.",
      order: 2,
      estimatedMinutes: 75,
      demoId: "projectile",
    },
    {
      id: "p22-l03",
      slug: "03-ve-quy-dao-giai-tich",
      title: "Vẽ quỹ đạo giải tích",
      summary:
        "Từ acceleration không đổi, xây công thức position theo thời gian và lấy mẫu đường parabol tới thời điểm chạm đất.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "projectile",
    },
    {
      id: "p22-l04",
      slug: "04-cho-vien-dan-chay-bang-explicit-euler",
      title: "Cho viên đạn chạy bằng Explicit Euler",
      summary:
        "Tạo state position-velocity-elapsed, cập nhật từng bước và đặt trail số cạnh đường giải tích để thấy sai số xuất hiện.",
      order: 4,
      estimatedMinutes: 90,
      demoId: "projectile",
    },
    {
      id: "p22-l05",
      slug: "05-fixed-timestep-va-accumulator",
      title: "Giữ bước vật lý cố định bằng accumulator",
      summary:
        "Tách render frame khỏi physics step, tiêu thụ accumulator có giới hạn và chứng minh hai chuỗi frame time cho cùng kết quả.",
      order: 5,
      estimatedMinutes: 95,
      demoId: "projectile",
    },
    {
      id: "p22-l06",
      slug: "06-tim-thoi-diem-cham-dat",
      title: "Tìm đúng thời điểm viên đạn chạm đất",
      summary:
        "Giải quadratic cho nghiệm giải tích và nội suy bước Euler cuối để projectile dừng đúng ground thay vì xuyên qua rồi bị clamp.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "projectile",
    },
    {
      id: "p22-l07",
      slug: "07-do-sai-so-va-nghiem-thu",
      title: "Đo sai số và nghiệm thu mô phỏng",
      summary:
        "Hoàn thiện controls, overlay hai quỹ đạo, đo position error, thử nhiều fixed dt và khóa các invariant bằng CTest.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "projectile",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
