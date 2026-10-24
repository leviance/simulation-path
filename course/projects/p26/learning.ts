import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p26-l01": {
      focus: "Tính tư thế từ góc trước khi thêm chuyển động.",
      expected: "Một con lắc đứng yên trong A; các góc đổi được, chiều dài không đổi.",
      files: ["include/lab.hpp", "include/view.hpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt quy ước góc",
          explanation:
            "Cả theta1 và theta2 đo từ phương thẳng đứng hướng xuống; theta2 không phải góc tương đối giữa hai thanh.",
        },
        {
          title: "Viết geometry rồi nối vào renderer",
          explanation:
            "Tính bob1, sau đó cộng vector thanh 2 để được bob2. Scene giữ góc; renderer chỉ đọc kết quả suy ra.",
        },
        {
          title: "Kiểm các tư thế có đáp án",
          explanation:
            "Góc 0 và π/2 cho các tọa độ dễ tính. Resize chỉ thay phép đổi sang pixel, không sửa mô hình.",
        },
      ],
    },
    "p26-l02": {
      focus: "Lập và giải hai phương trình tại cùng một trạng thái.",
      expected:
        "Ca thẳng xuống cho hai alpha bằng 0; ca ngang đơn vị cho alpha1=-9,81, alpha2=0 rad/s².",
      files: ["include/lab.hpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Loại lực dọc thanh bằng phép chiếu",
          explanation:
            "Từ gia tốc hai quả, chiếu Newton lên các tiếp tuyến để có hai phương trình theo alpha1/alpha2.",
        },
        {
          title: "Giải hệ 2×2 có kiểm tra",
          explanation:
            "Đặt tên a11…a22 và rhs1/rhs2 theo công thức; kiểm determinant và output hữu hạn, không sửa mẫu số để giấu lỗi.",
        },
        {
          title: "Đối chiếu với lực thật",
          explanation:
            "Kiểm thêm mass/length khác nhau bằng residual lực tiếp tuyến; đừng chỉ nhìn hình chạy.",
        },
      ],
    },
    "p26-l03": {
      focus: "Ghép một bước RK4 vào lịch frame và đo cơ năng độc lập.",
      expected:
        "Single-step tăng đúng h; graph ΔE có trục giây/Joule và max error tính ở mọi bước.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Viết bốn mẫu đạo hàm",
          explanation:
            "Mỗi state tạm bắt đầu từ cùng input; chỉ kết quả cuối tăng elapsed. Lỗi ở một mẫu phải từ chối cả bước.",
        },
        {
          title: "Tách lịch, phép tính và hiển thị",
          explanation:
            "Scene dùng candidate trước commit; main gọi advanceFrame trước render. Giới hạn 32 substep/frame và báo thời gian bị bỏ.",
        },
        {
          title: "Đo đúng năng lượng của quả dưới",
          explanation:
            "Vận tốc quả 2 gồm đóng góp cả hai thanh. History lấy theo physics, còn max |ΔE| theo mọi bước chấp nhận.",
        },
      ],
    },
    "p26-l04": {
      focus: "Tạo một cặp chỉ khác theta2 ban đầu và giữ lịch chung.",
      expected: "Epsilon=0 giữ hai state trùng nhau; thay epsilon/reset tái tạo đúng cặp.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Sao chép rồi chỉ sửa một góc",
          explanation:
            "Giữ riêng initialPrimary/initialPerturbed. Cả hai dùng chung tham số, solver và h.",
        },
        {
          title: "Commit cả cặp",
          explanation:
            "Tính đủ hai candidate rồi mới cập nhật. Không để một con lắc tiến nếu con còn lại lỗi.",
        },
        {
          title: "Vẽ hai khung, đo trong một world",
          explanation:
            "Pivot màn hình khác nhau chỉ để trình bày. E0 của A/B đo riêng, trails lưu world positions.",
        },
      ],
    },
    "p26-l05": {
      focus: "Đo độ tách có tính tới góc tuần hoàn và đơn vị.",
      expected:
        "Độ tách phase space và khoảng cách quả cuối là hai số khác nhau; trục X lấy thời gian mẫu.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Wrap hiệu, không wrap quỹ đạo",
          explanation:
            "Hai hướng +179°/−179° chỉ cách nhau 2°. Giữ góc RK4 liên tục qua nhiều vòng.",
        },
        {
          title: "Chọn norm và công bố quy ước",
          explanation:
            "Nhân chênh lệch omega với sqrt(meanLength/g) trước khi ghép với góc; so các run với cùng norm.",
        },
        {
          title: "Giữ sàn log ở renderer",
          explanation:
            "Dữ liệu d=0 phải còn nguyên. Timestamp không đều không được trải đều theo index; exponent chưa xác định phải được báo đúng.",
        },
      ],
    },
    "p26-l06": {
      focus: "Đối chiếu bước thời gian trước khi diễn giải divergence.",
      expected:
        "Ở 10 s mặc định, độ tách A/B ổn định khi giảm h còn sai khác h/h2 giảm; không suy rộng sang mọi run.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Cho reference tự chạy từ initial A",
          explanation:
            "Mỗi bước h tương ứng đủ hai bước h/2. Reference không nhận epsilon và không bị reset về A ở mỗi frame.",
        },
        {
          title: "Theo dõi cả năng lượng lẫn phase error",
          explanation:
            "Năng lượng giữ tốt không bảo đảm pha đúng. Ở thời gian dài, sai số số học cũng có thể bị khuếch đại.",
        },
        {
          title: "Chạy thử bằng batch có thể hủy",
          explanation:
            "Yêu cầu +10 s rồi xử lý tối đa 32 bước/frame; Space/Backspace dừng job, đổi h reset phép đo.",
        },
      ],
    },
    "p26-l07": {
      focus: "Hoàn thiện tương tác và chứng minh ứng dụng C++ đúng phạm vi.",
      expected:
        "Ba preset, job 30 s, kéo góc mới, chế độ sạch và tests Debug/Release đều dùng cùng lõi.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
        "tests/extra-cases.hpp",
      ],
      steps: [
        {
          title: "Giữ preset là dữ liệu",
          explanation:
            "Góc nhỏ/năng lượng cao/gần đỉnh chỉ đổi điều kiện đầu, không tạo thuật toán hay animation riêng.",
        },
        {
          title: "Quản lý capture và reset rõ ràng",
          explanation:
            "Chọn đúng bob2 A, giữ offset, chỉ commit sau capture thành công; final up/cancel/focus/resize đều có chính sách.",
        },
        {
          title: "Kiểm đúng bài làm",
          explanation:
            "Tests mặc định include final. Chỉ sang starter/include trong bản ZIP nếu muốn kiểm phần mình viết; đọc full source và README khi đối chiếu.",
        },
      ],
    },
  },
  references: {
    "p26-l01": [
      {
        label: "double pendulum",
        href: "/glossary#double-pendulum",
        kind: "Thuật ngữ",
      },
      {
        label: "unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l02": [
      {
        label: "double pendulum",
        href: "/glossary#double-pendulum",
        kind: "Thuật ngữ",
      },
      {
        label: "numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l03": [
      {
        label: "runge kutta 4",
        href: "/glossary#runge-kutta-4",
        kind: "Thuật ngữ",
      },
      {
        label: "energy drift",
        href: "/glossary#energy-drift",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l04": [
      {
        label: "sensitive dependence",
        href: "/glossary#sensitive-dependence",
        kind: "Thuật ngữ",
      },
      {
        label: "deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l05": [
      {
        label: "phase space",
        href: "/glossary#phase-space",
        kind: "Thuật ngữ",
      },
      {
        label: "wrapped angle",
        href: "/glossary#wrapped-angle",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l06": [
      {
        label: "numerical shadow",
        href: "/glossary#numerical-shadow",
        kind: "Thuật ngữ",
      },
      {
        label: "finite time exponent",
        href: "/glossary#finite-time-exponent",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l07": [
      {
        label: "energy drift",
        href: "/glossary#energy-drift",
        kind: "Thuật ngữ",
      },
      {
        label: "double pendulum",
        href: "/glossary#double-pendulum",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
