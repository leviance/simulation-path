import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 14 — camera bay tự do, basis forward/right/up và relative mouse mode",
    "Project 33 — OpenGL 3.3 Core, framebuffer pixels và GLSL",
    "Project 35 — nạp shader từ file, compile/link, uniform reflection và last-good reload",
    "Vector 3D, lượng giác và phương trình bậc hai; bài 10 ôn nghiệm giao ray–sphere trước khi dùng",
  ],
  summary:
    "Xây một căn phòng 3D có sphere, box và torus bằng các hàm khoảng cách, không tạo mesh cho từng vật thể. Mỗi fragment phát một tia nhìn, tìm bề mặt rồi tính normal, ánh sáng và bóng. Bạn có thể bay vào phòng, đổi tham số và xem tia đã tốn bao nhiêu bước; bản đối chiếu CPU cùng nghiệm ray–sphere giúp kiểm tra những gì mắt thường khó nhận ra.",
  duration:
    "26–35 giờ; đọc 6–8, tự viết 14–19, kiểm chứng 6–8 giờ. Không tính cài đặt/build lần đầu.",
  objectives: [
    "Tự viết SDF, sphere tracing và normal estimate rồi ghép chúng thành một scene GPU tương tác",
    "Giải thích được kết quả hit, miss, hết budget, tiếp tuyến và camera bên trong vật thể",
    "Đối chiếu khoảng cách với nghiệm giải tích và phân biệt hit epsilon với normal epsilon",
    "Giữ viewport, controls, debug và shader reload hoạt động trong cùng ứng dụng C++/SDL3 hoàn chỉnh",
  ],
  challenge: {
    timebox:
      "Thử tự thiết kế trong 60–90 phút trước khi đọc; không cần hoàn thành cả ứng dụng trong thời gian này.",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL cho phép khám phá căn phòng 3D có một sphere, một box và một torus. Người xem phải nhận ra hình khối, khoảng sâu, ánh sáng và bóng; có thể di chuyển camera, nhìn quanh và thay đổi kích thước vật thể ngay khi ứng dụng đang chạy.",
    outcome:
      "Một cửa sổ lớn hiển thị căn phòng, có chế độ Showcase sạch và Debug để đọc thông số, số bước, hit mask và normal. Đèn có thể chạy/dừng, nhưng Pause không khóa camera. Shader sửa sai được báo rõ và ảnh từ bản tốt gần nhất vẫn còn; sửa đúng rồi F5 để tiếp tục.",
    requirements: [
      "Scene đồng thời có sphere, box, torus và căn phòng làm bối cảnh; lỗ của torus cùng các mặt box phải đọc được.",
      "WASD và Q/E di chuyển camera; giữ chuột phải để nhìn, con lăn đổi FOV. Resize không làm sphere biến thành ellipse.",
      "Có controls cho step budget, khoảng cách tối đa, hit epsilon, normal epsilon và bán kính vật thể; tìm được controls cả khi đang xem Showcase.",
      "Beauty, Steps, Hit và Normal dùng cùng kết quả tìm bề mặt, không thay thuật toán giữa các view.",
      "Ray miss, tiếp tuyến, gần bề mặt và camera ở trong vật thể đều có hành vi được công bố và kiểm tra.",
      "So hit distance với nghiệm ray–sphere độc lập; báo đại lượng, đơn vị và tolerance thay vì chỉ một nhãn PASS.",
      "Mỗi checkpoint và final có source chạy độc lập; ZIP kèm README, GLSL và CTest CPU, không cần ghép ZIP khác.",
    ],
    constraints: [
      "C++20, CMake >=3.24, SDL 3.4.8 và OpenGL 3.3 Core; kiểm context thật, không âm thầm đổi sang renderer CPU.",
      "Tự viết SDF sphere/box/torus, ray marcher và normal estimate. Mỗi pixel ray-march trong fragment shader; không dùng mesh thay ba primitive.",
      "Fullscreen triangle chỉ tạo fragment; overlay là UI, không phải hình học thay cho scene.",
      "Bước tiến lấy từ abs(distance) của SDF. Có hard cap 256 primary samples, 64 shadow samples và max distance; không dùng vòng lặp vô hạn.",
      "Các slab của phòng hữu hạn; camera ra ngoài phòng không bị coi là nằm bên trong tất cả tường.",
      "Canvas 2D là minh họa có ngân sách tia hữu hạn, không chạy GLSL hoặc thay executable GPU.",
      "Không dùng FPS, ảnh đẹp hoặc cùng một hàm gọi hai lần làm bằng chứng thuật toán đúng.",
    ],
    definitionOfDone: [
      "Một fullscreen scene pass hiển thị đủ ba primitive với material, normal, lighting và bóng; không có object VBO/EBO.",
      "Camera move/look, resize, pause/reset, thay tham số và debug view hoạt động; nhả relative mouse khi mất focus, reset hoặc Escape.",
      "Các giới hạn, đơn vị và stop reason được công bố; origin trong sphere tìm mặt thoát thay vì hit giả ở t=0.",
      "Oracle bậc hai kiểm ray trúng/trượt; tiếp tuyến dùng giới hạn sai số t phụ thuộc epsilon, không áp sai tolerance của khoảng cách tới mặt.",
      "Normal được so với normal giải tích của sphere và khảo sát riêng normal epsilon; không hứa sai số giảm đơn điệu với float32.",
      "Lỗi compile/link/interface giữ program, locations, generation và ảnh tốt; sửa đúng phục hồi, resource được nhả trước context.",
      "Starter, 11 checkpoint và final build Debug/Release; CTest không mở window, kiểm GPU hữu hạn chạy riêng và có watchdog.",
      "Canvas có preset, pause/reset, keyboard, pointer capture, DPR, reduced-motion và mô tả thay thế; source/snippet/ZIP đồng bộ.",
      "Phân biệt tìm bề mặt SDF với general ray tracing và tích lũy mật độ thể tích ở Project 54.",
    ],
  },
  lessons: [
    {
      id: "p36-l01",
      slug: "01-fullscreen-triangle-va-fragment-coordinates",
      title: "Bắt đầu từ một cửa sổ phủ kín bằng shader",
      summary:
        "Chạy starter kế thừa Project 35, xác định draw path và kiểm framebuffer pixels bằng lưới 32 pixel.",
      order: 1,
      estimatedMinutes: 100,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l02",
      slug: "02-dung-camera-ray-tu-moi-pixel",
      title: "Từ mỗi pixel dựng một tia nhìn",
      summary:
        "Dùng basis camera, FOV và aspect để biến fragment coordinate thành ray đơn vị trong world space.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l03",
      slug: "03-signed-distance-cua-sphere",
      title: "Hỏi một điểm đang cách mặt cầu bao xa",
      summary: "Viết Sphere SDF và đọc dấu, độ lớn trên một lát cắt phẳng trước khi tìm giao điểm.",
      order: 3,
      estimatedMinutes: 105,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l04",
      slug: "04-sphere-tracing-co-guard",
      title: "Tiến dọc tia và biết vì sao phải dừng",
      summary:
        "Xây marcher có result, abs(distance), epsilon band và giới hạn công việc; thử cả origin ở trong sphere.",
      order: 4,
      estimatedMinutes: 180,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l05",
      slug: "05-uoc-luong-normal-va-lambert",
      title: "Lấy normal từ SDF rồi bật đèn",
      summary:
        "Ước lượng gradient bằng sáu mẫu, normalize và tô Lambert; tách sai số normal khỏi sai số tìm bề mặt.",
      order: 5,
      estimatedMinutes: 135,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l06",
      slug: "06-sdf-box-va-torus",
      title: "Thêm box và một torus nghiêng",
      summary:
        "Tách khoảng cách trong/ngoài box và đổi world point sang local space của torus; vẫn không tạo mesh.",
      order: 6,
      estimatedMinutes: 160,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l07",
      slug: "07-ghep-scene-va-material-id",
      title: "Dựng căn phòng và giữ đúng vật liệu",
      summary:
        "Ghép slab hữu hạn với ba primitive; distance và materialId luôn thuộc cùng một winner.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l08",
      slug: "08-bong-mem-va-den-chuyen-dong",
      title: "Thêm bóng để nhìn rõ chiều sâu",
      summary:
        "Từ điểm chạm hỏi đường tới đèn có bị chắn không; giải thích bias, shadow budget và Pause của đèn.",
      order: 8,
      estimatedMinutes: 150,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l09",
      slug: "09-bay-camera-va-thay-doi-scene",
      title: "Bay vào phòng và thay đổi vật thể",
      summary:
        "Kết nối SDL input với camera local, FOV và bán kính; không trộn camera với chuyển động của đèn.",
      order: 9,
      estimatedMinutes: 145,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l10",
      slug: "10-nghiem-giai-tich-va-sai-so",
      title: "Kiểm khoảng cách bằng nghiệm giải tích",
      summary:
        "Giải ray–sphere, khảo sát tiếp tuyến và normal epsilon; dùng debug để phân biệt sai số với lỗi chương trình.",
      order: 10,
      estimatedMinutes: 190,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l11",
      slug: "11-hoan-thien-can-phong-ray-march",
      title: "Hoàn thiện ứng dụng và bộ kiểm chứng",
      summary:
        "Tích hợp source đầy đủ, GPU readback, last-good reload, cleanup và nghiệm thu bản tải về.",
      order: 11,
      estimatedMinutes: 180,
      demoId: "ray-marched-shape-room",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
