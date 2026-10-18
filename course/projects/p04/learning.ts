import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p04-l01": {
      focus: "Bắt đầu với framebuffer trống chạy được, thêm DDA rồi nối kết quả vào phần hiển thị.",
      expected:
        "Checkpoint 1 vẽ được A(220,270) → B(740,150). Danh sách bước giữ tọa độ liên tục để đối chiếu với pixel đã làm tròn.",
      files: [
        "include/framebuffer.hpp",
        "include/presentation.hpp",
        "include/lab.hpp",
        "include/drawing.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy starter trước",
          explanation:
            "Cửa sổ nền trống xác nhận phần SDL/texture hoạt động. Ảnh logic 960 × 540 giữ nguyên khi resize.",
        },
        {
          title: "Nội suy theo trục dài",
          explanation:
            "Dùng max(|dx|,|dy|), tính t bằng số thực và lround; đoạn dài 0 tạo một bản ghi.",
        },
        {
          title: "Đưa pixel lên màn hình",
          explanation:
            "plotSteps gọi putPixel; renderScene xóa hình cũ rồi rasterize lại, upload khi dữ liệu thay đổi.",
        },
      ],
    },
    "p04-l02": {
      focus:
        "Từ lựa chọn hai pixel trên một đường dốc thấp tới Bresenham dùng chung cho mọi hướng.",
      expected:
        "D/B đổi thuật toán trong cùng checkpoint. Pixel vẽ và error/e2 dùng chung vector LineStep, không có vòng trace riêng.",
      files: [
        "include/lab.hpp",
        "include/drawing.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Hiểu phép thử",
          explanation:
            "So vị trí đường lý tưởng với trung điểm giữa hai pixel; sai số ở đây không phải khoảng cách Euclidean.",
        },
        {
          title: "Giữ error trước bước",
          explanation:
            "movesX và movesY cùng đọc doubledError; hai nhánh if độc lập cho phép bước chéo.",
        },
        {
          title: "Giữ nơi hiển thị",
          explanation:
            "Chỉ thay nguồn danh sách bước; framebuffer, texture và cách present không đổi.",
        },
      ],
    },
    "p04-l03": {
      focus: "Biến đường cố định thành công cụ kéo hai đầu, đổi octant và đọc pixel thật.",
      expected:
        "Chuột/HiDPI/letterbox dùng tọa độ logic đúng một lần. Z bật inspector 9 × 9, Left/Right chọn bước; không kẹt kéo khi rời vùng ảnh.",
      files: ["include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ thao tác có chủ",
          explanation:
            "begin/move/end thuần C++; SDL lọc nút trái và MouseID, giữ điểm cuối của sự kiện thả nút.",
        },
        {
          title: "Đổi tọa độ an toàn",
          explanation:
            "Kiểm kết quả SDL_ConvertEventToRenderCoordinates, từ chối vùng ngoài ảnh trước khi floor sang int.",
        },
        {
          title: "Phóng to ảnh thật",
          explanation:
            "Chụp 81 màu trước khi vẽ overlay để inspector không tự đọc dữ liệu vừa ghi.",
        },
        {
          title: "Thử tám phía",
          explanation:
            "O dùng tám độ lệch cố định; hai chiều có thể khác ở trường hợp hòa nhưng vẫn phải liên thông.",
        },
      ],
    },
    "p04-l04": {
      focus: "Dùng đoạn thẳng để ghép viền, dùng hàng ngang để tô hình chữ nhật.",
      expected:
        "1/2 đổi Line/Rectangle, F đổi kiểu tô. Đảo hai góc vẫn đúng; một hàng/cột/điểm không bị mất hoặc đếm lặp.",
      files: [
        "include/lab.hpp",
        "include/drawing.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Thống nhất quy ước",
          explanation: "Hai đầu là chỉ số pixel và đều được lấy: width = right − left + 1.",
        },
        {
          title: "Ghép và loại trùng",
          explanation:
            "Bốn cạnh dùng Bresenham, sortUnique bỏ góc lặp; quy tắc suy biến được kiểm bằng đáp án độc lập.",
        },
        {
          title: "Tô theo hàng",
          explanation:
            "filledRectangle duyệt Y rồi X; giới hạn 1.024 mỗi cạnh bảo vệ cấp phát, putPixel bảo vệ ảnh.",
        },
      ],
    },
    "p04-l05": {
      focus: "Tự viết midpoint circle rồi tô đặc dựa trên chính viền vừa tạo.",
      expected:
        "3 chọn Circle, F đổi kiểu tô, [/] đổi radius 0–256. Bán kính 2 cho viền 12 pixel và hình đặc 21 pixel, không nhầm với brush Project 03.",
      files: [
        "include/lab.hpp",
        "include/drawing.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Suy ra decision",
          explanation:
            "F(x−1/2,y+1) = decision + 1/4; decision < 0 chọn giữ X, còn bằng 0 phải giảm X.",
        },
        {
          title: "Tạo tám điểm",
          explanation:
            "Tính một octant, đổi dấu/hoán vị rồi sortUnique để bỏ điểm trùng trên trục và đường chéo.",
        },
        {
          title: "Tô tới viền",
          explanation:
            "Mỗi hàng lưu độ vươn xa nhất của outline, sau đó ghi một span liên tục. Hình đặc chứa chính viền midpoint.",
        },
      ],
    },
    "p04-l06": {
      focus:
        "Có đáp án độc lập cho hình học, kiểm input và đọc pixel, rồi đo hai thuật toán trên cùng dữ liệu.",
      expected:
        "2.401 trường hợp line, 544 kích thước rect, 129 bán kính; benchmark 20.000 đoạn × 7 lượt có warm-up, checksum tọa độ và deadline.",
      files: ["include/benchmark.hpp", "include/view.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Kiểm trước khi đo",
          explanation:
            "CTest dùng cùng hàm app gọi và vẫn hoạt động ở Release; không chỉ kiểm vài ảnh đẹp.",
        },
        {
          title: "Đọc kết quả thật",
          explanation:
            "consumePixels hash cả tọa độ bên trong, không chỉ size. Không bắt buộc checksum DDA bằng Bresenham.",
        },
        {
          title: "Không khóa event loop",
          explanation:
            "advanceBenchmark xử lý 128 đoạn mỗi thuật toán rồi trả quyền, T hủy; 30 giây thì dừng mà không báo median.",
        },
        {
          title: "Nêu đúng phạm vi",
          explanation:
            "Median cộng thời gian kernel của từng round, gồm allocation/trace/hash; không phải FPS hoặc thời gian thuần phép cộng.",
        },
      ],
    },
  },
  references: {
    "p04-l01": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l02": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l03": [
      {
        label: "Octant",
        href: "/glossary#octant",
        kind: "Thuật ngữ",
      },
      {
        label: "Đổi tọa độ event theo renderer",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "Logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
      {
        label: "Mouse capture",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p04-l04": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l05": [
      {
        label: "Octant",
        href: "/glossary#octant",
        kind: "Thuật ngữ",
      },
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l06": [
      {
        label: "CTest timeout và cấu hình build",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Median của benchmark",
        href: "/glossary#benchmark-median",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
