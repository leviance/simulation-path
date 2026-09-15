import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 07 — radian, sin/cos, angular velocity và atan2",
    "Project 22 — world/screen transform và fixed timestep có accumulator",
    "Project 23 — RK4, phase space, energy drift và convergence",
    "Project 25 — deterministic reset, energy metric và stress test hữu hạn",
  ],
  summary:
    "Cho hai con lắc kép có cùng tham số chạy từ hai trạng thái ban đầu chỉ lệch nhau một góc rất nhỏ. Bạn sẽ tự xây dựng trạng thái, phương trình liên kết, bộ tích phân RK4 và cách đo độ tách trong phase space; sau đó chạy thêm một quỹ đạo với bước `dt/2` để phân biệt độ nhạy của hệ với sai số tính toán.",
  challenge: {
    timebox: "480–660 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D gồm hai double pendulum gần như giống hệt nhau. Hệ thứ hai chỉ lệch một perturbation nhỏ ở góc ban đầu; chương trình phải cho thấy khi nào hai trajectory còn trùng nhau, khi nào chúng tách ra và vì sao hiện tượng đó chưa đủ để kết luận solver đúng.",
    outcome:
      "Một cửa sổ SDL3 vẽ hai con lắc cùng vệt chuyển động, cho phép tạm dừng, tiến từng bước, reset, đổi trạng thái ban đầu, `epsilon` và `dt`. Phần số liệu hiển thị độ tách trong phase space, khoảng cách giữa hai quả nặng cuối, độ trôi năng lượng và chênh lệch giữa bước `dt` với hai bước `dt/2`.",
    requirements: [
      "Biểu diễn state bằng theta1, omega1, theta2, omega2 và elapsed; angle được đo từ phương thẳng đứng hướng xuống.",
      "Suy ra hai bob position từ generalized coordinates; renderer không được lưu một bản position độc lập.",
      "Tính đồng thời hai angular acceleration của double pendulum từ cùng một state đầu vào và guard mọi denominator.",
      "Tích phân state bằng classical RK4 trong fixed timestep; render frame chỉ nạp accumulator và có maximum substep/dropped-time guard.",
      "Chạy primary và perturbed state lockstep với cùng parameters, dt và step count; reset phải tái tạo chính xác cùng initial pair.",
      "Đo angle difference bằng wrap về [-pi,pi] và scale angular velocity bằng characteristic time trước khi ghép phase-space distance.",
      "Hiển thị separation trên logarithmic graph; không dùng raw theta subtraction qua biên +pi/-pi.",
      "Duy trì half-step reference từ chính primary initial state, chạy hai bước dt/2 cho mỗi bước dt và chỉ so tại cùng elapsed time.",
      "Đo total mechanical energy, relative energy drift, second-bob distance và finite-time exponent có điều kiện hợp lệ rõ ràng.",
      "Kèm starter, bảy checkpoint độc lập, final, README và CTest không cần mở SDL window.",
    ],
    constraints: [
      "Không dùng physics engine, symbolic solver hoặc thư viện double-pendulum có sẵn.",
      "Không gọi hai con lắc là chaotic chỉ vì hình vẽ khác nhau; phải đối chiếu perturbation error với numerical shadow error.",
      "Không chuẩn hóa theta trong state sau mỗi step; chỉ wrap difference khi đo hoặc hiển thị.",
      "Không so trajectory ở hai elapsed time khác nhau và không dùng render frame time trực tiếp làm integration dt.",
      "Không clamp omega hoặc angle để giấu instability; run phải dừng có báo cáo khi state không finite.",
      "Không dùng một vòng while chờ separation đạt ngưỡng; fast run và tests phải dùng số step hữu hạn.",
    ],
    definitionOfDone: [
      "Theta bằng zero đặt cả hai bob thẳng dưới pivot; rod length trong geometry đúng với parameters.",
      "State thẳng xuống đứng yên có hai angular acceleration bằng zero; case hai rod ngang song song khớp giá trị kiểm tra tính tay.",
      "RK4 ở dt=1/480 s giữ relative energy drift dưới 1e-7 trong run 5 giây mặc định.",
      "Primary, perturbed và half-step reference luôn có cùng elapsed time sau mỗi full step.",
      "Hai góc +179° và -179° được đo cách nhau 2°, không phải 358°.",
      "Trong validation horizon 10 giây, intentional phase separation lớn hơn numerical shadow separation và mọi state vẫn finite.",
      "Canvas có preset Calm, Chaotic, Near upright; pause, step, reset, logarithmic graph, pointer capture, DPR, keyboard và reduced motion.",
      "Debug/Release CTest kiểm geometry, derivative, RK4, fixed-step guard, angle seam, twin divergence, shadow run và energy drift.",
    ],
  },
  duration: "15–19 giờ",
  objectives: [
    "Chuyển một hệ phi tuyến liên kết từ các góc và vận tốc góc sang đạo hàm có thể tích phân",
    "Đo độ nhạy với điều kiện ban đầu trong phase space mà không nhầm ở biên tuần hoàn của góc",
    "Phân biệt độ tách do nhiễu ban đầu với độ tách do sai số của bước thời gian",
  ],
  lessons: [
    {
      id: "p26-l01",
      slug: "01-bieu-dien-double-pendulum-bang-goc",
      title: "Biểu diễn double pendulum bằng hai góc",
      summary:
        "Định nghĩa parameters/state, chốt quy ước góc từ phương thẳng đứng hướng xuống và suy ra hai bob position mà không lưu state trùng lặp.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l02",
      slug: "02-tinh-angular-acceleration-coupled",
      title: "Tính hai angular acceleration coupled",
      summary:
        "Đọc phương trình như một hàm derivative thuần, tính alpha1/alpha2 từ cùng state và kiểm các cấu hình có đáp án rõ ràng.",
      order: 2,
      estimatedMinutes: 110,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l03",
      slug: "03-tich-phan-rk4-va-theo-doi-energy",
      title: "Tích phân RK4 và theo dõi energy",
      summary:
        "Dùng bốn derivative sample để cho một con lắc chuyển động trong fixed timestep, rồi đo mechanical energy để phát hiện dt quá lớn.",
      order: 3,
      estimatedMinutes: 105,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l04",
      slug: "04-chay-hai-con-lac-cung-timestep",
      title: "Cho hai con lắc chạy lockstep",
      summary:
        "Tạo perturbed state bằng một epsilon duy nhất, tiến cả hai bằng cùng parameters/dt/step count và vẽ hai trail tách dần.",
      order: 4,
      estimatedMinutes: 90,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l05",
      slug: "05-do-separation-trong-phase-space",
      title: "Đo separation trong phase space",
      summary:
        "Wrap angle difference qua biên ±pi, scale angular velocity có đơn vị nhất quán và đưa separation lên logarithmic graph.",
      order: 5,
      estimatedMinutes: 105,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l06",
      slug: "06-phan-biet-chaos-voi-sai-so-so-hoc",
      title: "Phân biệt chaos với sai số số học",
      summary:
        "Chạy shadow trajectory từ cùng initial state bằng hai half-step, so numerical separation với intentional separation và diễn giải finite-time exponent đúng giới hạn.",
      order: 6,
      estimatedMinutes: 115,
      demoId: "double-pendulum-chaos",
    },
    {
      id: "p26-l07",
      slug: "07-preset-tuong-tac-va-nghiem-thu",
      title: "Hoàn thiện thí nghiệm và nghiệm thu",
      summary:
        "Thêm ba preset, kéo đặt góc ban đầu, fast run hữu hạn, textual metrics và CTest Debug/Release cho toàn bộ invariant.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "double-pendulum-chaos",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
