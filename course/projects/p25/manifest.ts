import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 06 — vector, độ dài, normalize và dot product",
    "Project 22–23 — fixed timestep, tích phân số và cách đo sai số",
    "Project 24 — inverse mass, can thiệp từ bên ngoài và kiểm chứng mô phỏng",
  ],
  summary:
    "Tự xây chuỗi 32 khối nối bằng 31 lò xo, mở rộng tới 100 khối. Kéo một khối để quan sát dao động lan qua hàng xóm, tắt/bật damping và đối chiếu động năng, thế năng cùng sai số của phép tích phân.",
  duration: "18–24 giờ",
  objectives: [
    "Viết lực Hooke và damping dọc trục, rồi cộng chúng vào một hệ nhiều khối",
    "Giữ đúng điểm neo và thứ tự tính lực → tích phân cho toàn bộ chuỗi",
    "Xử lý kéo/thả như tác động từ bên ngoài, không nhầm nó với lỗi bảo toàn",
    "Đo sai số năng lượng, so hai độ phân giải thời gian và kiểm bằng nghiệm độc lập",
  ],
  challenge: {
    timebox: "10–12 giờ tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng 2D bằng C++20/SDL3 gồm nhiều khối nối với nhau bằng lò xo. Giữ đầu trên cố định, dùng chuột kéo một khối rồi thả và quan sát dao động lan truyền dọc chuỗi. Không dùng physics engine hoặc animation sin/cos đặt sẵn.",
    outcome:
      "Ứng dụng độc lập có cảnh chính 32 khối và lựa chọn 20, 64, 100 khối; lò xo đổi màu khi giãn/nén, có chế độ trình diễn sạch, damping toggle, graph cơ năng theo thời gian và graph độ lệch theo index tách biệt.",
    requirements: [
      "Tự biểu diễn Particle, Spring và topology N−1 liên kết giữa các index liền kề. Cảnh chính là 32 mass; các cấu hình 20/32/64/100 đều chạy được.",
      "Tự tính F_A=k(d−L₀)n và F_B=−F_A; trọng lực là m·g. Tính xong mọi lực trên cùng trạng thái trước khi tích phân khối đầu tiên.",
      "Đầu trên có inverseMass=0, không được tích phân hoặc kéo bằng chuột. Không cần ghim lại toàn chuỗi bằng constraint chiều dài cứng.",
      "Tích phân semi-implicit Euler trong fixed dt; giới hạn tối đa 32 substep/frame và báo thời gian bị bỏ.",
      "Damping dựa trên dot(v_B−v_A,n); bỏ qua thành phần tiếp tuyến. Có thể tắt damping mà vẫn giữ cùng vị trí và vận tốc.",
      "Kéo khối bằng pointer capture, không nhảy tâm khi cầm lệch, chỉ nhận đúng pointer và dùng mẫu thả cuối. Vận tốc thả tối đa 6 m/s; hủy thao tác không được áp vận tốc ấy.",
      "Đo K, Us, Ug và E=K+Us+Ug; đặt mốc Ug tại anchor, cho phép Ug âm. Vẽ đúng trục thời gian/đơn vị, không ghép năng lượng vào trục độ lệch.",
      "Khi kéo hoặc đổi hệ vật lý, bắt đầu lại mốc đo; không gọi năng lượng do chuột đưa vào là solver tạo năng lượng.",
      "Có pause, single-step, reset, điều khiển bàn phím, lựa chọn k/m/dt và preset cố ý mất ổn định có thông báo dừng.",
      "Job tua 20 giây chạy từng batch hữu hạn, có thể hủy. History giữ 1201 mẫu gần nhất: lấy định kỳ tối đa 60 Hz, thêm mốc bắt đầu đo, bước đơn và mẫu cuối job.",
      "Thử cả chuỗi không damping và có damping từ cùng trạng thái ban đầu; công bố drift và so khi giảm dt một nửa.",
      "Cung cấp Starter, 8 checkpoint chạy độc lập, final, tests và ZIP. Canvas minh họa cùng mô hình, không thay ứng dụng C++.",
    ],
    constraints: [
      "Không dùng physics engine, spring library, OpenGL hoặc GLM làm thay phần cốt lõi.",
      "Không nối mọi khối trực tiếp về anchor; mỗi spring chỉ đọc hai đầu của chính nó.",
      "Không dùng một hệ số nhân toàn bộ velocity để giả làm axial damping.",
      "Không clamp position/velocity trong solver để giấu mất ổn định. Guard chỉ dừng thí nghiệm và báo lỗi, không chữa kết quả.",
      "Đây là point-mass spring chain, không có self-collision hoặc bending/rotation của thanh. Màu và bán kính vẽ không tham gia lực.",
      "Không xem q=dt√(k/m) là chứng chỉ ổn định cho mọi chuỗi và mọi damping.",
      "Không lấy CTest đang include final làm bằng chứng cho Starter của người học; hướng dẫn phải chỉ rõ cách kiểm bài làm.",
      "Không dùng job đồng bộ dài hoặc test không có hard timeout.",
    ],
    definitionOfDone: [
      "Default có 32 khối/31 spring, một đầu cố định; cả 20/32/64/100 khối chạy đủ 20 giây hữu hạn và giữ anchor chính xác.",
      "Spring giãn 0,2 m với k=100 N/m cho lực 20 N; nén đổi dấu; hai lực nội bộ đối nhau.",
      "Đáp án oscillator một mass khớp sin/cos; trạng thái treo cân bằng được kiểm bằng tải trọng phía dưới mỗi spring.",
      "Trong cùng preset 32 khối không gravity/damping, đo max |ΔE|/E₀ trong 2 giây: dưới 9% ở dt=1/480 và dưới 5% ở dt=1/960; sai số mịn dưới 60% bản thô.",
      "Với cùng trạng thái ban đầu và damping=0,24 kg/s, cơ năng sau 10 giây dưới 15% ban đầu. Không yêu cầu từng bước rời rạc giảm tuyệt đối đơn điệu.",
      "Test công suất damping khớp −c·v_rel,axial², không tạo lực cản tiếp tuyến.",
      "Chỉ các bước được chấp nhận mới tăng elapsed; preset mất ổn định dừng có thông báo và không tạo vòng lặp vô hạn.",
      "Capture failure, pointer owner, mẫu up cuối, cancel, blur/resize/reset và focus nội bộ đều được kiểm.",
      "Graph lấy từ physics: trục ngang là giây, trục dọc là Joule; ghi mẫu đầu/cuối đoạn đo và giữ 1201 mẫu gần nhất. Renderer không sửa state; chế độ sạch vẫn giữ chuỗi và graph.",
      "Starter, 8 checkpoint và final build Debug/Release; CTest kiểm thật ở Release; code block khớp source, ZIP khớp từng byte.",
    ],
  },
  lessons: [
    {
      id: "p25-l01",
      slug: "01-dung-chuoi-khoi-luong-va-lo-xo",
      title: "Dựng chuỗi khối lượng và lò xo",
      summary:
        "Từ khung SDL có sẵn, tạo 32 khối nối bằng 31 lò xo; tách dữ liệu vật lý khỏi tọa độ màn hình.",
      order: 1,
      estimatedMinutes: 95,
      demoId: "spring-chain",
    },
    {
      id: "p25-l02",
      slug: "02-tinh-luc-hooke-tren-mot-lo-xo",
      title: "Tính lực Hooke trên một lò xo",
      summary: "Dùng một cặp khối để hiểu chiều lực khi kéo giãn, nén và xoay cả lò xo.",
      order: 2,
      estimatedMinutes: 110,
      demoId: "spring-chain",
    },
    {
      id: "p25-l03",
      slug: "03-cong-luc-gravity-va-neo-co-dinh",
      title: "Cộng lực, trọng lực và giữ điểm neo",
      summary:
        "Xóa lực cũ, cộng từng cặp lực nội bộ và trọng lực; tính xong toàn hệ rồi mới đổi vận tốc.",
      order: 3,
      estimatedMinutes: 110,
      demoId: "spring-chain",
    },
    {
      id: "p25-l04",
      slug: "04-cho-chuoi-chuyen-dong-semi-implicit-euler",
      title: "Cho chuỗi chuyển động bằng semi-implicit Euler",
      summary:
        "Nối lực với gia tốc, vận tốc và vị trí bằng bước thời gian cố định; đọc một bước tính cụ thể.",
      order: 4,
      estimatedMinutes: 120,
      demoId: "spring-chain",
    },
    {
      id: "p25-l05",
      slug: "05-them-damping-doc-truc-lo-xo",
      title: "Làm dao động tắt dần bằng damping dọc trục",
      summary:
        "Lực cản phụ thuộc tốc độ đổi chiều dài lò xo, không tùy tiện giảm mọi thành phần vận tốc.",
      order: 5,
      estimatedMinutes: 105,
      demoId: "spring-chain",
    },
    {
      id: "p25-l06",
      slug: "06-keo-tha-mot-khoi-va-truyen-dao-dong",
      title: "Kéo một khối và quan sát dao động lan truyền",
      summary:
        "Giữ độ lệch lúc cầm, xử lý đúng pointer owner và mẫu thả cuối; phân biệt lực lò xo với công của chuột.",
      order: 6,
      estimatedMinutes: 130,
      demoId: "spring-chain",
    },
    {
      id: "p25-l07",
      slug: "07-thi-nghiem-stiffness-mass-va-delta-time",
      title: "Thí nghiệm độ cứng, khối lượng và bước thời gian",
      summary: "Mở chuỗi 20–100 khối, đo năng lượng và dùng preset sai để hiểu giới hạn ổn định.",
      order: 7,
      estimatedMinutes: 125,
      demoId: "spring-chain",
    },
    {
      id: "p25-l08",
      slug: "08-do-energy-stress-test-va-nghiem-thu",
      title: "Vẽ đồ thị năng lượng và nghiệm thu ứng dụng",
      summary:
        "Ghép graph đúng đơn vị, job 20 giây có thể dừng, đáp án độc lập và mã C++ hoàn chỉnh.",
      order: 8,
      estimatedMinutes: 150,
      demoId: "spring-chain",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
