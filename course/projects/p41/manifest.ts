import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 06 — vector, độ dài, normalize và cộng/trừ vector",
    "Project 22 — fixed timestep, accumulator và world/screen transform",
    "Project 23 — Velocity Verlet, energy drift và kiểm tra hội tụ",
    "Project 25 — cộng lực theo cặp và đổi lực thành gia tốc",
  ],
  summary:
    "Xây một phòng thí nghiệm 2D cho hai nguyên tử tương tác bằng thế Lennard–Jones. Người học tự dựng đường cong thế năng, suy ra lực hút–đẩy từ độ dốc, tạo hai lực bằng nhau và ngược chiều, rồi cho cặp hạt dao động bằng Velocity Verlet. Đồ thị năng lượng, động lượng và tâm khối lượng giúp phân biệt chuyển động đúng với lỗi dấu hoặc bước thời gian quá lớn.",
  challenge: {
    timebox: "600–780 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó hai nguyên tử có cùng khối lượng chỉ tương tác bằng lực Lennard–Jones. Người dùng phải kéo được một nguyên tử để chọn khoảng cách ban đầu, xem thế năng và lực tại khoảng cách đó, rồi cho hệ chuyển động với bước thời gian cố định mà không dùng lò xo, xung lực va chạm hay lực cản giả.",
    outcome:
      "Một Lennard–Jones Pair Lab gồm vùng mô phỏng, đồ thị U(r), đồ thị lực trên A theo hướng A→B và đồ thị năng lượng theo thời gian. Hai nguyên tử có thể bắt đầu ở vùng đẩy, đáy thế hoặc vùng hút; hai mũi tên lực luôn đối nhau. Thanh trạng thái hiển thị r/σ, thế năng, động năng, tổng năng lượng, độ lệch năng lượng tương đối, động lượng và độ trôi của tâm khối lượng.",
    requirements: [
      "Bản khởi đầu tạo cửa sổ SDL3, renderer, streaming texture và framebuffer có thể đổi kích thước; hai nguyên tử tĩnh được vẽ rõ trước khi thêm công thức vật lý.",
      "Trạng thái lưu `position`, `velocity` và `mass` của hai nguyên tử; khoảng cách được tính từ vector `delta` thay vì chỉ lấy hiệu tọa độ x.",
      "Mặc định dùng hệ đơn vị rút gọn σ=1, ε=1 và mass=1; giao diện vẫn cho đổi σ, ε và mass trong các khoảng hữu hạn.",
      "Thế năng dùng U(r)=4ε[(σ/r)^12-(σ/r)^6], báo lỗi khi r quá nhỏ thay vì âm thầm chia cho 0.",
      "Đánh dấu đúng ba mốc: U(σ)=0, r0=2^(1/6)σ, U(r0)=-ε; không gọi σ là khoảng cách cân bằng.",
      "Đặt d̂=(xB-xA)/r và tính potentialSlope=dU/dr. Vì đạo hàm của r theo xA bằng -d̂ nên lực trên A là forceOnA=potentialSlope·d̂; ở r<r0 lực đẩy A ra xa B, còn ở r>r0 lực hút A về B.",
      "Mỗi lần tính tương tác trả về `forceOnA` và `forceOnB` bằng nhau, ngược chiều; tổng lực nội bộ phải gần 0.",
      "Velocity Verlet tính gia tốc đầu bước, cập nhật `position` của cả hai nguyên tử, tính lại lực ở vị trí mới rồi mới cập nhật `velocity`.",
      "Mỗi khung hình đi qua accumulator có giới hạn thời gian và số bước con; phím N tiến đúng một bước vật lý khi mô phỏng đang tạm dừng.",
      "Dữ liệu lịch sử có giới hạn số mẫu cho khoảng cách, thế năng, động năng, tổng năng lượng và độ lệch năng lượng; bộ nhớ không tăng mãi theo thời gian.",
      "Kéo một nguyên tử sẽ tạm dừng mô phỏng, đặt lại vận tốc và giữ tâm khối lượng ở giữa vùng vẽ để thí nghiệm bắt đầu trong điều kiện có kiểm soát.",
      "Phép kiểm chứng kiểm tra các mốc thế năng, hướng lực, định luật III Newton, trạng thái hữu hạn, động lượng, tâm khối lượng và độ lệch năng lượng trong một lần chạy hữu hạn.",
      "Kèm bản khởi đầu, bảy checkpoint độc lập, bản hoàn chỉnh có chú thích, README, CTest thuần CPU và gói ZIP khớp với nội dung trên web.",
    ],
    constraints: [
      "Không dùng physics engine, thư viện động lực học phân tử hoặc bảng tra cứu thay cho công thức Lennard–Jones.",
      "Không clamp thế năng/lực về một con số đẹp rồi coi đó là kết quả vật lý; vùng quá gần phải được báo là không an toàn cho timestep hiện tại.",
      "Không cộng cùng một cặp hai lần và không tính riêng lực của nguyên tử B theo cách có thể làm lệch dấu.",
      "Không dùng thời gian dựng hình trực tiếp làm `dt` vật lý và không chạy vòng lặp bù bước không giới hạn.",
      "Không thêm lực cản để che độ lệch năng lượng; hệ hai nguyên tử mặc định là một hệ bảo toàn.",
      "Không dùng khoảng cách màn hình làm đầu vào cho công thức; mọi phép tính diễn ra trong hệ đơn vị thế giới và hệ đơn vị rút gọn.",
      "Không để CTest mở cửa sổ hoặc chạy mô phỏng vô hạn.",
    ],
    definitionOfDone: [
      "Với ε=σ=1: U(1)=0, r0≈1.122462, U(r0)≈-1 và `potentialSlope = dU/dr` tại r0 gần 0.",
      "Ở r=0.95σ hai mũi tên lực hướng ra xa nhau; ở r=1.5σ chúng hướng vào nhau.",
      "`forceOnA + forceOnB` gần (0,0) với mọi mẫu hợp lệ; lực luôn song song với đường nối hai tâm.",
      "Cùng trạng thái ban đầu và `fixed dt` tạo cùng trạng thái cuối; cách chia thời gian giữa các khung hình không làm đổi số bước vật lý khi chưa chạm giới hạn an toàn.",
      "Velocity Verlet giữ độ trôi tâm khối lượng và động lượng gần 0 trong cấu hình đối xứng.",
      "Chạy 20 đơn vị thời gian với dt=1/1000 vẫn giữ trạng thái hữu hạn và độ lệch năng lượng tương đối tuyệt đối dưới 0,2% ở cấu hình hút mặc định.",
      "Lịch sử bị chặn ở số mẫu cố định; đặt lại sẽ xóa dữ liệu cũ và đo lại đúng năng lượng ban đầu.",
      "Space chạy/tạm dừng, N tiến một bước, R đặt lại, 1–3 chọn khoảng cách, [/] đổi dt và chuột kéo nguyên tử đều hoạt động.",
      "Canvas có tạm dừng/đặt lại, pointer capture, điều khiển bàn phím, DPR, reduced motion và phần mô tả văn bản tương ứng.",
      "Bản khởi đầu, bảy checkpoint, bản hoàn chỉnh, CTest, phép kiểm tra toán của lab, hợp đồng nội dung và bản build production đều kết thúc trong thời gian hữu hạn.",
    ],
  },
  duration: "13–17 giờ",
  objectives: [
    "Đọc hình dạng của thế Lennard–Jones và nối từng vùng của đường cong với lực hút hoặc lực đẩy",
    "Chuyển đạo hàm theo khoảng cách thành hai vector lực bằng nhau, ngược chiều trên một cặp hạt",
    "Tích phân một cặp hạt bảo toàn bằng Velocity Verlet và dùng năng lượng, động lượng, tâm khối lượng để kiểm chứng",
  ],
  lessons: [
    {
      id: "p41-l01",
      slug: "01-dung-cap-nguyen-tu-va-khoang-cach",
      title: "Dựng hai nguyên tử và đo khoảng cách",
      summary:
        "Bắt đầu từ framebuffer SDL3, tạo `PairState` trong world space và đo `delta`, khoảng cách, tâm khối lượng trước khi có lực.",
      order: 1,
      estimatedMinutes: 90,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l02",
      slug: "02-doc-duong-cong-the-lennard-jones",
      title: "Đọc đường cong thế Lennard–Jones",
      summary:
        "Cài U(r), phân biệt σ với khoảng cách cân bằng và đánh dấu vùng đẩy, giếng thế cùng đuôi hút.",
      order: 2,
      estimatedMinutes: 110,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l03",
      slug: "03-tu-do-doc-the-nang-den-luc",
      title: "Từ độ dốc thế năng đến lực hút–đẩy",
      summary:
        "Tính potentialSlope=dU/dr, kiểm dấu ở hai phía của r0 rồi đổi độ dốc này thành vector forceOnA.",
      order: 3,
      estimatedMinutes: 125,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l04",
      slug: "04-cong-cap-luc-va-giu-tam-khoi-luong",
      title: "Cộng cặp lực và theo dõi tâm khối lượng",
      summary:
        "Dùng cùng một kết quả tính tương tác cho hai nguyên tử, kiểm tổng lực, động lượng và chuyển động của tâm khối lượng.",
      order: 4,
      estimatedMinutes: 100,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l05",
      slug: "05-cho-hai-nguyen-tu-chay-bang-velocity-verlet",
      title: "Cho hai nguyên tử chuyển động bằng Velocity Verlet",
      summary:
        "Tính lực ở đầu và cuối mỗi bước, rồi dùng accumulator cùng giới hạn bước con để cặp nguyên tử dao động ổn định theo bước thời gian cố định.",
      order: 5,
      estimatedMinutes: 135,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l06",
      slug: "06-do-nang-luong-va-chon-buoc-thoi-gian",
      title: "Đo năng lượng và chọn bước thời gian",
      summary:
        "Vẽ thế năng, động năng và tổng năng lượng; đo độ lệch rồi chạy thí nghiệm dt có giới hạn để tìm cấu hình đáng tin cậy.",
      order: 6,
      estimatedMinutes: 120,
      demoId: "lennard-jones-pair",
    },
    {
      id: "p41-l07",
      slug: "07-hoan-thien-lennard-jones-pair-lab",
      title: "Hoàn thiện Lennard–Jones Pair Lab",
      summary:
        "Ghép thao tác kéo chuột, các cấu hình sẵn có, đồ thị, số đo chẩn đoán, phép kiểm chứng, dọn tài nguyên và toàn bộ mã nguồn chạy độc lập.",
      order: 7,
      estimatedMinutes: 125,
      demoId: "lennard-jones-pair",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
