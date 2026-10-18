import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p02-l01": {
      focus:
        "Từ starter có nền trống, tự tô một ô vuông trong framebuffer rồi dùng màu để kiểm tra WASD. Chưa di chuyển và chưa chuẩn hóa hướng.",
      expected:
        "Ô vuông xám 34×34 ở (120,220); giữ WASD thì xanh, A+D hoặc W+S triệt tiêu. Resize giữ nguyên tỉ lệ ảnh 960×540.",
      files: [
        "include/framebuffer.hpp",
        "include/lab.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy nền trống trước",
          explanation:
            "Starter mang theo phần framebuffer và upload texture từ Project 01. Xác nhận nền hiện ra rồi mới thêm hàm tô hình.",
        },
        {
          title: "Tô đúng từng hàng",
          explanation:
            "Hai vòng lặp chọn các pixel trong hình chữ nhật, cắt ở biên ảnh trước khi ghi; cạnh phải và dưới không thuộc hình.",
        },
        {
          title: "Đọc trạng thái sau event",
          explanation:
            "Dùng từng nhánh A/D/W/S rõ ràng; kiểm tra kết quả bằng màu trước khi thay đổi vị trí.",
        },
      ],
    },
    "p02-l02": {
      focus:
        "Thêm chuyển động sau khi hình và bàn phím đã chạy. Tách vị trí, hướng và vận tốc; chưa dùng toán tử tự định nghĩa.",
      expected:
        "WASD di chuyển liên tục, hướng chéo được chuẩn hóa và player nằm trong ảnh. Công thức tạm /60 còn sai theo FPS để bài sau đo.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ phần lẻ của vị trí",
          explanation:
            "Lưu position bằng double, chỉ floor ở bước vẽ để các dịch chuyển dưới một pixel vẫn được cộng dồn.",
        },
        {
          title: "Sửa tốc độ chéo",
          explanation: "Giải thích độ dài √2 rồi mới chia cho độ dài, không chia vector bằng 0.",
        },
        {
          title: "Cập nhật rồi giữ trong biên",
          explanation:
            "Hai phép cộng x/y diễn đạt công thức trực tiếp; giới hạn phải trừ cả kích thước player.",
        },
      ],
    },
    "p02-l03": {
      focus:
        "Giữ công thức sai, thêm đồng hồ và đo một chuyển động tham chiếu năm giây không có biên.",
      expected:
        "1/2/3 đổi delay 33/16/8 ms, B bắt đầu đo. WASD vẫn do người học điều khiển; FPS cao hơn làm tham chiếu đi xa hơn.",
      files: ["include/measurement.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lấy hiệu thời điểm trước khi đổi sang giây",
          explanation:
            "Đo rawDt bằng SDL_GetTicksNS; FPS tính từ thời gian thực, bao gồm cả lúc nghỉ.",
        },
        {
          title: "Đo riêng để tránh mép cửa sổ",
          explanation:
            "Measurement gọi cùng hàm cập nhật với player nhưng không clamp vị trí; frame cuối chỉ lấy phần thuộc cửa sổ năm giây.",
        },
        {
          title: "Ghi số trước khi sửa",
          explanation:
            "Chọn một mức, bấm B, chờ DONE rồi ghi FPS và quãng đường; không đổi mức giữa phép đo.",
        },
      ],
    },
    "p02-l04": {
      focus:
        "Thay /60 bằng update dùng dt và giải thích chính xác thời gian bị cắt khi dt quá lớn.",
      expected:
        "Ba mức 30/60/120 FPS đều cho gần 900 px trong năm giây nếu không có frame vượt 0,05 s. dropped cho biết thời gian đã bỏ.",
      files: ["include/lab.hpp", "include/measurement.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết update thuần C++",
          explanation:
            "Vận tốc pixel/giây nhân dt giây thành độ dời pixel; reject dt không hữu hạn rồi clamp.",
        },
        {
          title: "Dùng chung công thức",
          explanation:
            "Player, Measurement và simulate đều gọi update; chỉ player bị giữ trong biên cửa sổ.",
        },
        {
          title: "Không giấu thời gian bị bỏ",
          explanation:
            "Frame dài 0,2 s chỉ mô phỏng 0,05 s, bỏ 0,15 s. Mất focus/minimize tạm ngưng và đặt lại mốc đồng hồ.",
        },
      ],
    },
    "p02-l05": {
      focus:
        "Thay delay cố định bằng bộ giới hạn đo toàn bộ công việc của một frame; giữ nguyên cách đo dt.",
      expected:
        "1/2/3 chọn 30/60/120 FPS, 0 uncapped, F1 bật/tắt mức gần nhất; B vẫn đo được quãng đường và R đặt lại.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách phần tính khỏi SDL",
          explanation:
            "remainingFrameNs nhận mức FPS và thời gian làm việc, trả 0 nếu uncapped hoặc đã quá hạn.",
        },
        {
          title: "Nghỉ sau present",
          explanation:
            "Mốc frameStart được lấy trước xử lý sự kiện; dt của vòng sau bao gồm cả phần nghỉ vòng trước.",
        },
        {
          title: "Đọc FPS thay vì tin con số cap",
          explanation:
            "SDL_DelayNS có thể nghỉ lâu hơn yêu cầu; renderer hoặc hệ thống cũng có thể giới hạn FPS thực.",
        },
      ],
    },
    "p02-l06": {
      focus:
        "Kiểm tra đúng các hàm ứng dụng dùng: input, hình chữ nhật, dt, limiter và phép đo tham chiếu.",
      expected:
        "CTest chạy Debug/Release, starter và sáu checkpoint build độc lập. Native smoke 12 frame kiểm tra resize/present, không thay thế thử WASD bằng tay.",
      files: ["tests/tests.cpp", "src/main.cpp", "include/lab.hpp", "include/measurement.hpp"],
      steps: [
        {
          title: "Test có đáp án cụ thể",
          explanation:
            "30/60/120 FPS cùng năm giây cho 900 px; dãy 0,1 s không đều cho 18 px; hình 34×34 đúng 1.156 pixel.",
        },
        {
          title: "Test đường vào thật",
          explanation:
            "Hướng chéo trong test đi qua directionFromKeys giống readDirection của app, không chỉ gọi normalize riêng.",
        },
        {
          title: "Chạy và đọc kết quả",
          explanation:
            "Build cả Debug/Release, chạy CTest có timeout rồi kiểm tra riêng bàn phím, focus, resize và FPS trên máy.",
        },
      ],
    },
  },
  references: {
    "p02-l01": [
      {
        label: "SDL_GetKeyboardState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState",
        kind: "SDL API",
      },
      {
        label: "SDL_PollEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_PollEvent",
        kind: "SDL API",
      },
      {
        label: "SDL_SetRenderLogicalPresentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p02-l02": [{ label: "Normalize", href: "/glossary#normalization", kind: "Thuật ngữ" }],
    "p02-l03": [
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
      { label: "SDL_Delay", href: "https://wiki.libsdl.org/SDL3/SDL_Delay", kind: "SDL API" },
    ],
    "p02-l04": [
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
      { label: "Variable timestep", href: "/glossary#variable-timestep", kind: "Thuật ngữ" },
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
    ],
    "p02-l05": [
      { label: "SDL_DelayNS", href: "https://wiki.libsdl.org/SDL3/SDL_DelayNS", kind: "SDL API" },
      {
        label: "SDL_SetRenderVSync",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderVSync",
        kind: "SDL API",
      },
    ],
    "p02-l06": [
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
