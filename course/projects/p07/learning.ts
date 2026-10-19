import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p07-l01": {
      focus: "Chạy bộ khung, đo góc bằng độ dài cung và đưa góc về một vòng.",
      expected: "Chạy checkpoint 01 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/lab.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy trước, sửa sau",
          explanation:
            "Starter đã vẽ trục và đường tròn trên ảnh CPU. Xác nhận cửa sổ chạy trước khi thêm phép toán góc.",
        },
        {
          title: "Đo góc bằng cung",
          explanation:
            "Một radian chắn cung dài bằng bán kính; toàn vòng dài 2πr nên góc là 2π rad.",
        },
        {
          title: "Đổi đơn vị và normalize",
          explanation: "Degree chỉ để nhập/hiển thị. Số âm hoặc nhiều vòng vẫn phải đưa về [0,2π).",
        },
      ],
    },
    "p07-l02": {
      focus: "Viết tọa độ từ góc, rồi đưa điểm toán học lên màn hình.",
      expected: "Chạy checkpoint 02 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Tính vị trí trong hệ toán",
          explanation:
            "unitDirection trả (cos(angle),sin(angle)); pointOnCircle áp dụng tâm và bán kính.",
        },
        {
          title: "Đổi sang screen",
          explanation:
            "Bán kính logic 185 pixel ứng với một world unit; đảo Y đúng một lần ở worldToScreen.",
        },
        {
          title: "Vẽ kim và endpoint",
          explanation: "Dùng drawLine/disc đã có trong starter, chưa cần chuyển động.",
        },
      ],
    },
    "p07-l03": {
      focus: "Đổi vận tốc góc, quay ngược, tạm dừng và kiểm tra chu kỳ.",
      expected: "Chạy checkpoint 03 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt đơn vị cạnh biến",
          explanation: "angle đo rad, angularSpeed đo rad/s; nhân với deltaTime mới ra rad.",
        },
        {
          title: "Cập nhật state",
          explanation:
            "advanceScene chấp nhận bước (0,0.1] giây; vòng ứng dụng chặn hitch trước khi gọi.",
        },
        {
          title: "Đo chu kỳ",
          explanation: "2π/|angularSpeed|; tốc độ 0 là đứng yên, không phải chu kỳ 0.",
        },
      ],
    },
    "p07-l04": {
      focus: "Vẽ đường dóng, hai thành phần có dấu và nhãn giá trị.",
      expected: "Chạy checkpoint 04 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/lab.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Lấy hai thành phần",
          explanation: "projectOntoXAxis/YAxis làm việc trên direction, không phải screen point.",
        },
        {
          title: "Đường dóng và hình chiếu khác nhau",
          explanation: "Đường dóng chỉ nối vị trí; đoạn màu từ gốc mới mang thành phần có dấu.",
        },
        {
          title: "Thử các góc phần tư",
          explanation: "X âm ở bên trái, Y âm ở phía dưới; màu nhất quán giữa vòng tròn và graph.",
        },
      ],
    },
    "p07-l05": {
      focus: "Lấy mẫu 60 Hz đúng timestamp và tự vẽ cửa sổ lịch sử 6 giây.",
      expected: "Chạy checkpoint 05 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Lưu time/sine/cosine",
          explanation: "WaveSample không chứa pixel; resize không làm mất lịch sử.",
        },
        {
          title: "Sinh mẫu theo nhịp riêng",
          explanation:
            "nextSampleIndex đặt timestamp n/60; nội suy thời điểm bằng phương trình góc, không nhân bản mẫu cuối frame.",
        },
        {
          title: "Tự vẽ cửa sổ 6 giây",
          explanation: "Giữ 361 mẫu gồm hai đầu; X theo timestamp, Y từ giá trị [-1,1].",
        },
      ],
    },
    "p07-l06": {
      focus: "Xử lý bốn góc phần tư, vùng tâm, grab offset và capture.",
      expected: "Chạy checkpoint 06 rồi đối chiếu kết quả và thí nghiệm mô tả trong bài.",
      files: ["include/scene.hpp", "include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "atan2 cần Y rồi X",
          explanation: "Hướng chuột được đổi qua screenToDirection trước khi suy góc.",
        },
        {
          title: "Giữ chỗ nắm và tránh tâm",
          explanation:
            "angularGrabOffset tránh giật lúc nhấn; vùng 8 pixel quanh tâm giữ góc trước.",
        },
        {
          title: "Quản lý một lần kéo",
          explanation:
            "Mouse/pointer owner, mẫu cuối lúc thả và các đường hủy capture đều có vai trò riêng.",
        },
      ],
    },
    "p07-l07": {
      focus: "Đối chiếu hình, số, lịch sử và kiểm thử độc lập ở Debug/Release.",
      expected:
        "Bản hoàn chỉnh hiển thị đồng thời mọi hình học và đồ thị, có full source và các kiểm chứng chạy được.",
      files: ["tests/tests.cpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm tra bằng dữ kiện độc lập",
          explanation:
            "Mốc góc và nghiệm sin(theta0+omega*t) giúp phát hiện sai, không so hàm với chính nó.",
        },
        {
          title: "So cả góc lẫn mẫu",
          explanation:
            "Cùng tổng thời gian ở FPS khác nhau phải cho cùng timestamp và các giá trị graph.",
        },
        {
          title: "Build đầy đủ",
          explanation:
            "CMake target độc lập, CTest Debug/Release và smoke 12 frame; QA desktop vẫn làm riêng.",
        },
      ],
    },
  },
  references: {
    "p07-l01": [
      {
        label: "Radian",
        href: "/glossary#radian",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l02": [
      {
        label: "Unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l03": [
      {
        label: "Angular velocity",
        href: "/glossary#angular-velocity",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l04": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l05": [
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l06": [
      {
        label: "atan2",
        href: "/glossary#atan2",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p07-l07": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
