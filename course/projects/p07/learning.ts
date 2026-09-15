import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p07-l01": {
      focus:
        "Bắt đầu từ cửa sổ và framebuffer đã chạy được, vẽ một đường tròn cố định rồi dùng radian làm đơn vị duy nhất cho góc bên trong chương trình.",
      expected:
        "Checkpoint hiển thị unit circle, hai trục và một bán kính hướng sang phải. Các hàm đổi degree/radian cùng normalizeAngle cho kết quả ổn định với góc âm hoặc lớn hơn một vòng.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Hiểu radian bằng độ dài cung",
          explanation:
            "Một radian là góc chắn một cung dài đúng bằng bán kính. Vì chu vi bằng 2πr, một vòng có 2π radian.",
        },
        {
          title: "Đổi đơn vị ở ranh giới",
          explanation:
            "UI có thể hiển thị degree, nhưng dữ liệu angle và các hàm lượng giác luôn nhận radian.",
        },
        {
          title: "Giữ góc trong một vòng",
          explanation:
            "normalizeAngle dùng fmod rồi cộng 2π cho phần dư âm, đưa mọi góc hữu hạn về [0,2π).",
        },
      ],
    },
    "p07-l02": {
      focus:
        "Dùng cùng một angle để tính vector đơn vị `(cos(angle), sin(angle))`, sau đó scale theo bán kính và cộng với tâm đường tròn.",
      expected:
        "Đầu kim nằm đúng trên đường tròn. Thanh tiêu đề cho thấy tọa độ đầu kim ở 0°, 90°, 180° và 270° khớp bốn hướng phải, trên, trái, dưới.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc cos và sin như hai thành phần",
          explanation:
            "Cosine cho độ dời theo X, sine cho độ dời theo Y; đẳng thức cos²+sin²=1 giữ vector trên unit circle.",
        },
        {
          title: "Từ unit circle tới đường tròn bất kỳ",
          explanation:
            "Nhân direction với radius rồi cộng center; không đưa tọa độ pixel vào hàm lượng giác.",
        },
        {
          title: "Đảo Y đúng một lần khi vẽ",
          explanation:
            "Trục Y toán học hướng lên nhưng Y màn hình hướng xuống, nên point.y được trừ khỏi centerY khi đổi sang pixel.",
        },
      ],
    },
    "p07-l03": {
      focus:
        "Cập nhật góc bằng angularSpeed × deltaTime, chuẩn hóa sau mỗi lần cập nhật và suy chu kỳ từ thời gian cần để đi hết 2π radian.",
      expected:
        "Kim quay cùng tốc độ theo thời gian dù FPS thay đổi. Space tạm dừng; phím lên/xuống thay đổi tốc độ và có thể làm kim quay ngược chiều.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Phân biệt góc với vận tốc góc",
          explanation:
            "angle có đơn vị radian; angularSpeed có đơn vị radian/giây. Chỉ tích angularSpeed × deltaTime mới có đơn vị radian.",
        },
        {
          title: "Đo thời gian giữa hai frame",
          explanation:
            "Hiệu SDL_GetTicks được đổi từ millisecond sang giây và chặn ở 0,1 giây để một lần dừng tại breakpoint không tạo bước nhảy quá lớn.",
        },
        {
          title: "Tính chu kỳ",
          explanation:
            "Một vòng dài 2π radian, nên period = 2π/|angularSpeed|. Khi tốc độ bằng zero, chu kỳ là vô hạn.",
        },
      ],
    },
    "p07-l04": {
      focus:
        "Tách đầu kim thành hai vector thành phần: cosine nằm trên trục X và sine nằm trên trục Y; dùng đường dóng trung tính để nối các điểm chiếu với đầu kim.",
      expected:
        "Đoạn xanh dương đi từ tâm trên trục X và có độ dài có dấu cos(angle) × radius; đoạn xanh lá đi từ tâm trên trục Y và có độ dài có dấu sin(angle) × radius.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Giữ một thành phần, đưa thành phần kia về 0",
          explanation:
            "projectOntoXAxis trả (x,0), còn projectOntoYAxis trả (0,y). Hai hàm thuần này chưa phụ thuộc vào pixel.",
        },
        {
          title: "Phân biệt vector thành phần và đường dóng",
          explanation:
            "Vector màu đi từ tâm dọc theo trục và mang độ dài cosine/sine; đường từ đầu kim về trục chỉ là đường dóng phụ.",
        },
        {
          title: "Kiểm tra dấu theo góc phần tư",
          explanation:
            "Bên trái tâm cho cosine âm; phía dưới màn hình tương ứng sine âm vì screen Y đã đảo.",
        },
      ],
    },
    "p07-l05": {
      focus:
        "Lấy tối đa khoảng 60 mẫu sine/cosine mỗi giây, giữ lịch sử hữu hạn rồi đặt X theo timestamp trong một cửa sổ 6 giây.",
      expected:
        "Đồ thị xanh lá và xanh dương dùng cùng trục thời gian 6 giây, lệch pha một phần tư chu kỳ và không để lịch sử vượt quá 360 mẫu.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lưu dữ liệu, không lưu pixel",
          explanation:
            "WaveSample giữ time, sine và cosine. Tọa độ màn hình được tính lại khi vẽ hoặc resize.",
        },
        {
          title: "Giới hạn nhịp lấy mẫu và kích thước lịch sử",
          explanation:
            "sampleAccumulator tránh lấy nhiều hơn khoảng 60 mẫu mỗi giây; maximumSamples bảo đảm vector không tăng mãi.",
        },
        {
          title: "Đặt X bằng timestamp",
          explanation:
            "mapSampleTimeToX đưa thời điểm của mẫu vào cửa sổ 6 giây; sine/cosine trong [-1,1] quyết định Y.",
        },
      ],
    },
    "p07-l06": {
      focus:
        "Đổi độ dời từ tâm tới chuột về world direction, gọi atan2(y,x), chuẩn hóa kết quả và kiểm chứng toàn bộ phần toán bằng CTest.",
      expected:
        "Kéo điểm vàng đặt đúng góc ở cả bốn góc phần tư; thả chuột ngoài cửa sổ không để trạng thái kéo bị kẹt; Debug và Release đều vượt qua CTest.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Dùng atan2 thay vì atan(y/x)",
          explanation:
            "atan2 nhận riêng Y và X nên phân biệt được bên trái/bên phải và không chia cho zero trên trục dọc.",
        },
        {
          title: "Đổi chiều Y trước khi suy góc",
          explanation:
            "Vector hướng trong hệ tọa độ toán học dùng centerY − mouseY. Nếu dùng mouseY − centerY, góc sẽ tăng theo chiều kim đồng hồ.",
        },
        {
          title: "Kiểm tra phép đổi đi-về",
          explanation:
            "Với nhiều góc trên một vòng, angleFromDirection(unitDirection(angle)) phải khôi phục angle trong sai số 10⁻⁹.",
        },
        {
          title: "Kiểm tra theo thời gian",
          explanation:
            "Hai chuỗi deltaTime có cùng tổng thời gian phải đưa kim tới cùng góc cuối, giống nguyên tắc của Project 02.",
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
      {
        label: "Unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l02": [
      {
        label: "Unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
      {
        label: "Vector 2D",
        href: "/glossary#vector-2d",
        kind: "Thuật ngữ",
      },
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l03": [
      {
        label: "SDL_GetTicks",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicks",
        kind: "SDL API",
      },
      {
        label: "Angular velocity",
        href: "/glossary#angular-velocity",
        kind: "Thuật ngữ",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l04": [
      {
        label: "Unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l05": [
      {
        label: "Unit circle",
        href: "/glossary#unit-circle",
        kind: "Thuật ngữ",
      },
      {
        label: "Angular velocity",
        href: "/glossary#angular-velocity",
        kind: "Thuật ngữ",
      },
    ],
    "p07-l06": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      {
        label: "SDL_MouseMotionEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent",
        kind: "SDL API",
      },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "atan2",
        href: "/glossary#atan2",
        kind: "Thuật ngữ",
      },
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
