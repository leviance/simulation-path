import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p25-l01": {
      focus: "Tạo dữ liệu chuỗi trong Starter, dùng lại window/renderer/framebuffer có sẵn.",
      expected:
        "32 khối và 31 lò xo nằm đúng trong world space; điểm neo là dữ liệu vật lý, không phải hình vẽ đặc biệt.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc khung chạy trước",
          explanation:
            "Starter đã có SDL resources, event loop, phép đổi tọa độ và cách vẽ. Bạn chỉ thêm dữ liệu vào Scene; không viết một đàn khối khác trong renderer.",
        },
        {
          title: "Nối khối bằng index",
          explanation:
            "Particle giữ trạng thái của khối; Spring chỉ giữ hai index và tham số vật liệu. Với N khối, nối 0–1, 1–2,… sẽ có N−1 spring.",
        },
        {
          title: "Tạo trạng thái dễ kiểm",
          explanation:
            "Ban đầu khoảng cách bằng restLength. Đầu trên có inverseMass=0; các khối còn lại có inverseMass=1/m.",
        },
      ],
    },
    "p25-l02": {
      focus: "Tạm dùng hai khối để xác nhận dấu và hướng lực trước khi nhân lên cả dây.",
      expected:
        "Kéo giãn 0,2 m với k=100 N/m cho lực 20 N; nén đổi dấu và xoay lò xo làm vector lực xoay theo.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đo chiều dài hiện tại",
          explanation:
            "Lấy pB−pA rồi đo độ dài d. L₀ là chiều dài tự nhiên lưu trong Spring, không được cập nhật theo d.",
        },
        {
          title: "Suy ra chiều lực",
          explanation:
            "Chọn n hướng từ A sang B. Khi d>L₀, lực trên A cùng chiều n; B nhận lực đối dấu. Đây là lý do không đặt dấu trừ vào công thức một cách máy móc.",
        },
        {
          title: "Xử lý hình học suy biến",
          explanation:
            "Hai đầu trùng nhau không xác định được hướng lực. Trả sample không hợp lệ và dừng bước tính, không chia cho zero hoặc bí mật bỏ spring.",
        },
      ],
    },
    "p25-l03": {
      focus: "Cộng tất cả lực trên cùng một trạng thái rồi mới đổi vận tốc.",
      expected:
        "Mỗi khối có một force accumulator; tổng hai lực nội bộ bằng zero, trọng lực là m·g và neo không tự chuyển động.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Xóa lực cũ đúng một lần",
          explanation:
            "Force thuộc lần tính hiện tại. Xóa ở đầu substep, không xóa lại mỗi khi xử lý một spring.",
        },
        {
          title: "Cộng lực nội bộ theo cặp",
          explanation:
            "Spring A–B cộng +F vào A và −F vào B. Khối giữa nhận đóng góp từ cả hai hàng xóm.",
        },
        {
          title: "Tách tải trọng và phản lực neo",
          explanation:
            "Các khối động nhận m·g. Lực spring lên neo vẫn được tính, nhưng neo không được tích phân; giá treo cung cấp phản lực giữ nó đứng yên.",
        },
      ],
    },
    "p25-l04": {
      focus: "Biến lực đã tính thành một bước chuyển động, sau đó nối vào vòng lặp SDL.",
      expected:
        "Velocity được cập nhật trước position; N chạy đúng một dt, còn frame time chỉ quyết định số substep.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết một bước cho một khối",
          explanation:
            "Tính a=F/m, v mới, rồi p mới từ chính v ấy. Giữ các biến trung gian để nhìn rõ thứ tự và kiểm được bằng số.",
        },
        {
          title: "Tính xong lực của toàn chuỗi",
          explanation:
            "Không vừa cộng lực một spring vừa cập nhật hai endpoint. Những spring sau phải đọc cùng trạng thái cũ.",
        },
        {
          title: "Nối vào frame scheduler",
          explanation:
            "Giới hạn 32 substep/frame và 0,05 s frame time được nhận. Chỉ bước chấp nhận mới tăng steps và elapsed; pause không tích lũy thời gian chờ.",
        },
      ],
    },
    "p25-l05": {
      focus: "Thêm lực cản phụ thuộc tốc độ thay đổi chiều dài lò xo.",
      expected:
        "Damping làm mất cơ năng; vận tốc tiếp tuyến không tự bị giảm. Tắt/bật damping giữ state nhưng bắt đầu mốc đo mới.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đo vận tốc tương đối dọc trục",
          explanation:
            "Chiếu vB−vA lên n. Nếu hai khối cùng trượt ngang, spring không dài/ngắn thêm nên không có lực cản dọc trục.",
        },
        {
          title: "Cộng damping vào lực Hooke",
          explanation:
            "F_A=(k·stretch+c·relativeSpeed)n; B nhận lực đối dấu. c có đơn vị kg/s, khác k có đơn vị N/m.",
        },
        {
          title: "Kiểm bằng công suất",
          explanation:
            "Riêng damping phải cho tổng công suất −c·relativeSpeed². Đây là đáp án độc lập để phát hiện dấu sai hoặc cách giảm toàn bộ velocity.",
        },
      ],
    },
    "p25-l06": {
      focus: "Đưa thao tác kéo vào mô hình, giữ đúng owner và mẫu thả cuối.",
      expected:
        "Khối không nhảy khi cầm lệch; hàng xóm phản ứng với target, release velocity tối đa 6 m/s, cancel không bơm thêm vận tốc.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chọn đúng khối, giữ grab offset",
          explanation:
            "Bỏ qua neo và chỉ nhận hit gần khối động. Lưu khoảng lệch giữa tâm khối và con trỏ để không snap tâm tới điểm cầm.",
        },
        {
          title: "Giữ target trong lúc tích phân",
          explanation:
            "Khối đang kéo là kinematic. Spring vẫn đọc vị trí của nó để tạo lực lên hàng xóm; không tích phân chính khối ấy.",
        },
        {
          title: "Kết thúc thao tác rõ ràng",
          explanation:
            "Owner mới được move/up. Đọc mẫu up cuối, tính vận tốc thả có giới hạn; hủy thì bỏ vận tốc ấy. Sau can thiệp, bắt đầu lại mốc đo năng lượng.",
        },
      ],
    },
    "p25-l07": {
      focus:
        "Mở điều khiển k/m/dt và 20–100 khối, rồi chủ động quan sát giới hạn của phương pháp số.",
      expected:
        "Có số đo K/Us/Ug, q và sai số neo; preset sai dừng có thông báo, không làm treo UI hoặc clamp state để giả ổn định.",
      files: [
        "include/metrics.hpp",
        "include/scene.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đọc thang thời gian của dao động",
          explanation:
            "Một mass–spring có ω=√(k/m). Cứng hơn hoặc nhẹ hơn nghĩa là cần bước thời gian nhỏ hơn.",
        },
        {
          title: "Không dùng một ngưỡng q cho mọi hệ",
          explanation:
            "q=dt·ω chỉ là thang so sánh. Nhiều mode của cả chuỗi và damping cũng ảnh hưởng ổn định.",
        },
        {
          title: "Đo lỗi bằng một thí nghiệm lặp lại được",
          explanation:
            "Dùng hai preset chung state ban đầu, giảm dt một nửa rồi đo max |ΔE|. Tách lỗi tích phân khỏi năng lượng mất do damping.",
        },
      ],
    },
    "p25-l08": {
      focus: "Ghép graph và vòng kiểm chứng với cùng source mà người học tải xuống.",
      expected:
        "Graph E/K/Us/Ug có trục thời gian và mốc zero; job 20 giây dừng/hủy được, Starter có thể được kiểm bằng chính tests.",
      files: [
        "include/metrics.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
        "tests/extra-cases.hpp",
      ],
      steps: [
        {
          title: "Đặt mốc và đơn vị trước khi vẽ",
          explanation:
            "E=K+Us+Ug, Ug tính từ anchor nên có thể âm. Graph năng lượng không dùng chung trục với độ lệch x.",
        },
        {
          title: "Lấy mẫu từ physics",
          explanation:
            "Ghi t=0 khi bắt đầu đo, lấy định kỳ tối đa 60 mẫu/giây và thêm mẫu sau bước đơn/cuối job. Giữ 1201 mẫu gần nhất; mỗi frame xử lý tối đa 32 bước.",
        },
        {
          title: "Kiểm bài làm, không chỉ bản mẫu",
          explanation:
            "Đổi include path của target tests sang starter/include. Kiểm nghiệm giải tích, tải trọng treo, damping power, drift, input và graph rồi mới nghiệm thu.",
        },
      ],
    },
  },
  references: {
    "p25-l01": [
      {
        label: "Mass–spring system",
        href: "/glossary#mass-spring-system",
        kind: "Thuật ngữ",
      },
      {
        label: "Inverse mass",
        href: "/glossary#inverse-mass",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l02": [
      {
        label: "Hooke’s law",
        href: "/glossary#hookes-law",
        kind: "Thuật ngữ",
      },
      {
        label: "Spring rest length",
        href: "/glossary#spring-rest-length",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l03": [
      {
        label: "Force accumulation",
        href: "/glossary#force-accumulation",
        kind: "Thuật ngữ",
      },
      {
        label: "Gravity acceleration",
        href: "/glossary#gravity-acceleration",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l04": [
      {
        label: "Semi-implicit Euler",
        href: "/glossary#semi-implicit-euler",
        kind: "Thuật ngữ",
      },
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l05": [
      {
        label: "Axial spring damping",
        href: "/glossary#axial-spring-damping",
        kind: "Thuật ngữ",
      },
      {
        label: "Dot product",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l06": [
      {
        label: "Kinematic drag",
        href: "/glossary#kinematic-drag",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p25-l07": [
      {
        label: "Spring stability index",
        href: "/glossary#spring-stability-index",
        kind: "Thuật ngữ",
      },
      {
        label: "Energy drift",
        href: "/glossary#energy-drift",
        kind: "Thuật ngữ",
      },
    ],
    "p25-l08": [
      {
        label: "Mechanical energy",
        href: "/glossary#mechanical-energy",
        kind: "Thuật ngữ",
      },
      {
        label: "Kinetic energy",
        href: "/glossary#kinetic-energy",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
