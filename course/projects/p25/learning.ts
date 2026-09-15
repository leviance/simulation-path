import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p25-l01": {
      focus:
        "Bắt đầu từ cửa sổ SDL3 đã vẽ một chuỗi placeholder, rồi thay bằng topology Particle/Spring thật trong world space.",
      expected:
        "Checkpoint 1 hiện 18 particles, 17 springs; các đoạn nối đúng index liên tiếp và particle đầu có inverseMass bằng zero.",
      files,
      steps: [
        {
          title: "Tách node khỏi edge",
          explanation:
            "Particle giữ state chuyển động; Spring chỉ giữ hai index cùng tham số vật liệu. Renderer đọc topology thay vì sao chép position.",
        },
        {
          title: "Dựng initial state có thể chứng minh",
          explanation:
            "Mỗi particle thấp hơn particle trước đúng restLength nên mọi spring bắt đầu với stretch zero.",
        },
        {
          title: "Biểu diễn anchor bằng inverse mass",
          explanation:
            "InverseMass zero cho biết particle không phản ứng với force; dữ liệu này được integration và drag dùng chung.",
        },
      ],
    },
    "p25-l02": {
      focus: "Tính Hooke force trên đúng một spring trước khi nhân logic lên cả chuỗi.",
      expected:
        "Kéo giãn cho stretch dương và lực hút; nén cho stretch âm và lực đẩy; coincident endpoints không sinh NaN.",
      files,
      steps: [
        {
          title: "Đo delta và distance",
          explanation:
            "Delta đi từ endpoint A sang B; distance là độ dài hiện tại, hoàn toàn khác restLength lưu trong Spring.",
        },
        {
          title: "Đổi distance thành stretch có dấu",
          explanation:
            "stretch=distance−restLength; dấu dương kéo hai đầu lại, dấu âm đẩy hai đầu ra.",
        },
        {
          title: "Đưa scalar force lên direction",
          explanation:
            "forceOnA=direction·k·stretch; endpoint B sẽ nhận vector đối của nó ở bài force accumulation.",
        },
      ],
    },
    "p25-l03": {
      focus: "Cộng gravity và mọi cặp spring force vào accumulator trước khi state thay đổi.",
      expected:
        "Mỗi substep xóa force cũ; internal spring pair có tổng zero, gravity chỉ tác động dynamic mass và anchor vẫn cố định.",
      files,
      steps: [
        {
          title: "Xóa accumulator một lần",
          explanation:
            "Force thuộc substep hiện tại; quên clear làm cùng một lực bị cộng dồn qua frame như một bug tích phân.",
        },
        {
          title: "Cộng external gravity bằng m·g",
          explanation:
            "Particle lưu inverse mass nên mass được khôi phục bằng 1/inverseMass; fixed particle không nhận gravity.",
        },
        {
          title: "Cộng spring pair đối nhau",
          explanation:
            "A nhận +F, B nhận −F. Đây là lực nội bộ nên tổng trên cặp bằng zero dù từng endpoint gia tốc khác nhau.",
        },
      ],
    },
    "p25-l04": {
      focus:
        "Đưa force accumulation qua semi-implicit Euler và fixed-step accumulator để chuỗi bắt đầu chuyển động.",
      expected:
        "Một step cập nhật acceleration, velocity rồi position; anchor không tích phân và các cách chia render frame cho cùng số substep.",
      files,
      steps: [
        {
          title: "Đổi force thành acceleration",
          explanation:
            "a=F·inverseMass. Công thức chung tự bỏ qua fixed particle khi inverse mass zero.",
        },
        {
          title: "Cập nhật velocity trước position",
          explanation:
            "Semi-implicit Euler dùng velocity mới cho position, thường giữ oscillator bounded tốt hơn explicit Euler ở cùng dt.",
        },
        {
          title: "Chạy đúng fixed dt",
          explanation:
            "Render time chỉ nạp accumulator; maximum frame và maximum substeps giữ ứng dụng có thể lấy lại điều khiển.",
        },
      ],
    },
    "p25-l05": {
      focus:
        "Thêm damping dựa trên tốc độ thay đổi chiều dài spring, không giảm toàn bộ velocity của particle.",
      expected:
        "Relative motion dọc trục tạo damping force; hai endpoint trượt ngang cùng nhau hoặc chuyển động tiếp tuyến không bị cản.",
      files,
      steps: [
        {
          title: "Tính relative velocity",
          explanation:
            "vRelative=vB−vA; chỉ relative motion mới thay đổi khoảng cách hai endpoint.",
        },
        {
          title: "Chiếu lên spring direction",
          explanation:
            "dot(vRelative,direction) bỏ tangent component và cho dấu đang dài ra hay ngắn lại.",
        },
        {
          title: "Cộng elastic và damping scalar",
          explanation:
            "forceMagnitude=k·stretch+c·relativeSpeed; cùng một direction phân phối force đối nhau lên hai đầu.",
        },
      ],
    },
    "p25-l06": {
      focus:
        "Biến một mass thành kinematic trong lúc kéo, rồi trả nó về dynamics với release velocity hữu hạn.",
      expected:
        "Pointer không chọn anchor; mass đi theo target, capture giữ drag ngoài Canvas và wave xuất hiện sau khi thả.",
      files,
      steps: [
        {
          title: "Hit-test dynamic particle",
          explanation:
            "Tìm particle gần nhất trong bán kính nhưng bỏ qua inverseMass zero để anchor không bị phá.",
        },
        {
          title: "Giữ particle kinematic trong substep",
          explanation:
            "Spring vẫn đọc target position để tạo force cho hàng xóm, nhưng selected particle không được integrator kéo khỏi pointer.",
        },
        {
          title: "Ước lượng và clamp release velocity",
          explanation:
            "Lấy displacement giữa hai pointer sample chia sample time; clamp speed tránh một event gap tạo năng lượng vô hạn.",
        },
      ],
    },
    "p25-l07": {
      focus:
        "Đo ảnh hưởng đồng thời của stiffness, mass và dt bằng stability index không thứ nguyên.",
      expected:
        "Tăng k hoặc dt làm q tăng; preset cố ý xấu tạo energy growth/large stretch, reset luôn khôi phục state hữu hạn.",
      files,
      steps: [
        {
          title: "Nhận ra time scale sqrt(m/k)",
          explanation:
            "Spring cứng hoặc mass nhẹ dao động nhanh hơn; integrator phải lấy mẫu nhanh hơn để theo kịp.",
        },
        {
          title: "Dùng q=dt·sqrt(k/m)",
          explanation:
            "q không phải lời đảm bảo tuyệt đối cho cả chain, nhưng là chỉ báo so sánh cấu hình minh bạch hơn FPS.",
        },
        {
          title: "Để lỗi lộ ra có kiểm soát",
          explanation:
            "Không clamp physics state. Canvas dừng fast-run khi state không finite và nút reset luôn sẵn sàng.",
        },
      ],
    },
    "p25-l08": {
      focus:
        "Nghiệm thu bằng topology, force pair, damping projection, drag, energy metrics và long-run stress test.",
      expected:
        "Debug/Release CTest pass; stress run không NaN, anchor error gần zero và stretch/speed nằm trong safety envelope.",
      files,
      steps: [
        {
          title: "Đo từng thành phần energy",
          explanation:
            "Kinetic, spring và gravitational potential có ý nghĩa khác nhau; damping cố ý làm mechanical energy giảm.",
        },
        {
          title: "Kiểm invariant cục bộ trước stress",
          explanation:
            "Lực 20 N, force pair tổng zero và one-step integrator có expected value rõ hơn một ảnh động trông hợp lý.",
        },
        {
          title: "Chạy stress có ngưỡng",
          explanation:
            "Finite, anchor error, maximum stretch và maximum speed biến 'không nổ' thành Definition of Done đo được.",
        },
      ],
    },
  },
  references: {
    "p25-l01": [
      { label: "Mass–spring system", href: "/glossary#mass-spring-system", kind: "Thuật ngữ" },
      { label: "Inverse mass", href: "/glossary#inverse-mass", kind: "Thuật ngữ" },
    ],
    "p25-l02": [
      { label: "Hooke's law", href: "/glossary#hookes-law", kind: "Thuật ngữ" },
      { label: "Spring rest length", href: "/glossary#spring-rest-length", kind: "Thuật ngữ" },
    ],
    "p25-l03": [
      { label: "Force accumulation", href: "/glossary#force-accumulation", kind: "Thuật ngữ" },
      { label: "Gravity acceleration", href: "/glossary#gravity-acceleration", kind: "Thuật ngữ" },
    ],
    "p25-l04": [
      { label: "Semi-implicit Euler", href: "/glossary#semi-implicit-euler", kind: "Thuật ngữ" },
      { label: "Physics accumulator", href: "/glossary#physics-accumulator", kind: "Thuật ngữ" },
    ],
    "p25-l05": [
      { label: "Axial spring damping", href: "/glossary#axial-spring-damping", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
    ],
    "p25-l06": [
      { label: "Kinematic drag", href: "/glossary#kinematic-drag", kind: "Thuật ngữ" },
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
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
    ],
    "p25-l08": [
      { label: "Mechanical energy", href: "/glossary#mechanical-energy", kind: "Thuật ngữ" },
      { label: "CTest", href: "/getting-started#final-build", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
