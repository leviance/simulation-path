import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 06 và 10 — phép toán vector, dot product và normal trong 2D/3D",
    "Project 17–19 — phối cảnh, depth buffer và tô sáng bề mặt trên CPU",
    "Project 22–23 — fixed timestep, số đo vật lý và kiểm chứng độc lập",
  ],
  summary:
    "Xây bể 256 bóng trong 2D rồi mở rộng thành 256 sphere có tọa độ và vận tốc X/Y/Z thật. Vật thể khác khối lượng, bán kính và restitution; tự viết detection, impulse, sửa chồng lấn, contact debug và renderer CPU có camera.",
  duration: "21–27 giờ",
  objectives: [
    "Giải thích và kiểm được va chạm giữa hai vật có khối lượng khác nhau",
    "Tách detection, impulse và sửa vị trí để tìm đúng nguồn sai",
    "Mở rộng công thức từ 2D sang 3D mà không biến 3D thành hình vẽ phẳng",
    "Đối chiếu động năng, động lượng và chi phí brute force bằng dữ liệu đo được",
  ],
  challenge: {
    timebox: "10–14 giờ tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một collision playground bằng C++20/SDL3: trước hết là bể 2D hàng trăm circle, sau đó là bể sphere–sphere 3D thật. Không dùng physics engine, không chỉ phản xạ bóng với tường.",
    outcome:
      "Ứng dụng độc lập có cảnh chính 256 vật thể trong mỗi không gian, tô màu và kích thước khác nhau, camera orbit ở 3D, đồ thị động năng/độ xuyên và debug normal/impulse có thể tắt. Người dùng spawn, reset và thay restitution khi ứng dụng đang mở.",
    requirements: [
      "Cảnh chính có 256 vật thể chuyển động; bán kính, khối lượng và restitution thay đổi theo vật liệu. Có preset đàn hồi để kiểm riêng trường hợp e=1.",
      "Tạo cảnh lặp lại được bằng seed cố định, không chồng lấn ban đầu. Position, velocity và radius lưu bằng đơn vị vật lý.",
      "Viết detection circle–circle rồi sphere–sphere với normal từ A sang B, độ xuyên và quy ước rõ khi hai tâm trùng nhau.",
      "Tính impulse từ vận tốc tương đối, inverse mass và restitution. Chỉ tác động dọc normal; không thêm impulse khi hai vật đang tách nhau.",
      "Sửa chồng lấn theo inverse mass, slop và phần trăm hiệu chỉnh; không đổi velocity để che sai số vị trí.",
      "Giải tường có xét radius và hướng vận tốc; ghi tổng xung lực từ tường để kiểm cân bằng động lượng.",
      "Duyệt từng cặp i<j và số lượt solver hữu hạn. Hiển thị pair checks của solver riêng với lượt quét số đo sau bước.",
      "3D dùng X/Y/Z thật, sáu mặt tường, camera phối cảnh và che khuất bằng depth buffer; không phải đổi màu hoặc nghiêng bể 2D.",
      "Spawn hữu hạn tối đa 16 vật thể mỗi lần, tránh chỗ đang bị chiếm, giới hạn 512. Reset trả đúng cảnh mặc định; có pause, bước đơn và chỉnh restitution.",
      "Kéo đúng bóng trong 2D để kick; kéo ở 3D chỉ orbit camera. Xử lý pointer owner, mẫu thả cuối, capture failure, blur/resize và reduced motion.",
      "Normal màu vàng, vector impulse màu đỏ chỉ hiện khi debug. Chế độ sạch giữ đàn bóng, không gian và đồ thị định lượng.",
      "Kèm Starter, 11 checkpoint độc lập, final, tests, README và ZIP có đủ source để build ngoài trình duyệt.",
    ],
    constraints: [
      "Không dùng physics engine, collision library, OpenGL hoặc GLM để làm thay phần cốt lõi. Brute force là baseline của project này.",
      "Không gọi mọi cặp chồng lấn là đã được giải; đo lại độ xuyên còn lại trên state sau solver và lần khóa tường cuối.",
      "Không khẳng định động lượng của riêng đàn bóng được giữ nguyên khi tường đang tác dụng lực. Kiểm P−P₀=ΣJwall.",
      "Không dùng positional correction thay cho impulse; không gọi solver này là CCD hoặc hứa không tunneling ở mọi vận tốc/dt.",
      "Không lấy code Canvas làm ứng dụng C++; hai bản cài cùng công thức nhưng chạy độc lập.",
      "Mọi vòng lặp, spawn, catch-up, history và stress test phải có giới hạn; không dùng bước test không thể hủy.",
    ],
    definitionOfDone: [
      "Hai preset chính 2D/3D đều có 256 vật thể hữu hạn, không chồng lấn ban đầu; cùng seed tái tạo cùng dữ liệu.",
      "Ca hai vật đàn hồi khác khối lượng khớp đáp án tính tay, giữ động lượng và động năng; e<1 giảm động năng.",
      "Sphere test kiểm đủ cả ba thành phần vận tốc, không thể qua nếu bỏ trục Z.",
      "Vật đang tách nhau không nhận impulse mới; correction chia theo inverse mass và không đổi velocity.",
      "Mỗi bước ghi đúng I×N×(N−1)/2 pair checks của solver. Contact visits có thể lặp qua các lượt và được ghi rõ.",
      "Stress 2D/3D giữ vật trong radius-aware bounds, động năng đàn hồi gần giữ nguyên và residual |P−P₀−ΣJwall| nhỏ.",
      "Đồ thị dùng các mẫu physics, gồm t=0 và mẫu cuối job; history tối đa 601. Spawn/kick bắt đầu lại mốc đo vì đó là tác động bên ngoài.",
      "Renderer sphere có kiểm độc lập ray hit/miss và draw-order independence; thay camera không đổi vị trí/vận tốc vật lý.",
      "Build Starter, 11 checkpoint và final ở Debug/Release; CTest vẫn chạy check khi có NDEBUG. ZIP khớp source từng byte.",
      "Kiểm trực tiếp Canvas desktop: stage controls, 2D/3D, pause, step, spawn, camera, kick, reset, bàn phím và lifecycle.",
    ],
  },
  lessons: [
    {
      id: "p24-l01",
      slug: "01-dung-be-va-dan-bong-deterministic",
      title: "Dựng bể và tạo đàn bóng lặp lại được",
      summary:
        "Tạo 256 quả bóng theo lưới, giữ vị trí trong world space và thay đổi bán kính, khối lượng, vật liệu.",
      order: 1,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l02",
      slug: "02-cho-bong-chuyen-dong-fixed-timestep",
      title: "Cho cả đàn bóng chuyển động bằng fixed timestep",
      summary:
        "Nối vận tốc với vị trí, tách physics khỏi render và công khai thời gian bị bỏ khi chạm giới hạn công việc.",
      order: 2,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l03",
      slug: "03-xu-ly-va-cham-voi-tuong",
      title: "Xử lý va chạm với bốn bức tường",
      summary:
        "Xét bán kính, hướng chuyển động và restitution; ghi xung lực tường tác dụng lên bóng.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l04",
      slug: "04-phat-hien-hai-hinh-tron-cham-nhau",
      title: "Phát hiện hai hình tròn chạm nhau",
      summary: "Tìm contact normal và độ xuyên mà chưa thay đổi vị trí hay vận tốc của hai bóng.",
      order: 4,
      estimatedMinutes: 95,
      demoId: "collision-tank",
    },
    {
      id: "p24-l05",
      slug: "05-doi-van-toc-bang-collision-impulse",
      title: "Đổi vận tốc bằng collision impulse",
      summary:
        "Từ vận tốc tương đối và khối lượng khác nhau, suy ra xung lực dọc normal rồi kiểm bằng đáp án tính tay.",
      order: 5,
      estimatedMinutes: 110,
      demoId: "collision-tank",
    },
    {
      id: "p24-l06",
      slug: "06-day-hai-bong-ra-khoi-penetration",
      title: "Sửa chồng lấn mà không đổi vận tốc",
      summary:
        "Chia phần sửa vị trí theo inverse mass, thêm slop và phân biệt cách này với continuous collision detection.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "collision-tank",
    },
    {
      id: "p24-l07",
      slug: "07-duyet-moi-cap-va-giai-toan-bo-be",
      title: "Cho 256 bóng thật sự va vào nhau",
      summary:
        "Duyệt i<j, giải vài lượt hữu hạn, khóa lại tường sau lượt cuối và đếm đúng lượng công việc.",
      order: 7,
      estimatedMinutes: 105,
      demoId: "collision-tank",
    },
    {
      id: "p24-l08",
      slug: "08-stress-test-bao-toan-va-nghiem-thu",
      title: "Kiểm chứng bể 2D trước khi sang 3D",
      summary:
        "Kiểm bảo toàn theo đúng hệ đang xét, ghi mẫu sau từng bước và đo độ xuyên còn lại bằng lượt quét độc lập.",
      order: 8,
      estimatedMinutes: 120,
      demoId: "collision-tank",
    },
    {
      id: "p24-l09",
      slug: "09-mo-rong-tu-circle-sang-sphere",
      title: "Từ va chạm circle đến sphere trong 3D",
      summary:
        "Mở rộng normal và vận tốc sang ba thành phần, giữ nguyên phương trình impulse và kiểm bằng ca va chạm xiên.",
      order: 9,
      estimatedMinutes: 150,
      demoId: "collision-tank",
    },
    {
      id: "p24-l10",
      slug: "10-ve-be-3d-va-dieu-khien-camera",
      title: "Dựng góc nhìn cho bể 3D",
      summary:
        "Chiếu phối cảnh, tìm mặt trước sphere bằng ray và dùng depth buffer; camera thay đổi góc nhìn chứ không xoay state.",
      order: 10,
      estimatedMinutes: 140,
      demoId: "collision-tank",
    },
    {
      id: "p24-l11",
      slug: "11-hoan-thien-spawn-debug-va-nghiem-thu",
      title: "Hoàn thiện spawn, input và nghiệm thu",
      summary:
        "Ghép hai không gian, thêm vật thể có kiểm tra chỗ trống, xử lý capture và kiểm toàn bộ mã tải về.",
      order: 11,
      estimatedMinutes: 120,
      demoId: "collision-tank",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
