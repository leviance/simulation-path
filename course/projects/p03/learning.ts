import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p03-l01": {
      focus:
        "Bắt đầu bằng nền trống đã chạy được. Thêm một đầu bút một pixel và ba thao tác nhấn, kéo, thả; chưa dạy hình tròn hoặc nội suy.",
      expected:
        "Click trái tạo chấm. Giữ chuột tạo các mẫu rời; thả nút xử lý endpoint rồi đóng nét. Resize và letterbox không làm lệch tọa độ bút.",
      files: [
        "include/framebuffer.hpp",
        "include/presentation.hpp",
        "include/lab.hpp",
        "include/brush.hpp",
        "include/paint.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giữ dữ liệu tranh",
          explanation:
            "Clear framebuffer một lần khi khởi tạo. SDL_RenderClear chỉ xóa render target, không xóa vector chứa tranh.",
        },
        {
          title: "Đổi tọa độ trước khi dùng",
          explanation:
            "SDL_ConvertEventToRenderCoordinates tính cả scale/letterbox/HiDPI. Điểm ngoài ảnh bị từ chối, không ép vào cạnh.",
        },
        {
          title: "Đóng nét đúng lúc",
          explanation:
            "begin/move/end thuần C++ được app gọi trực tiếp. Up giữ endpoint, cancel không vẽ; rời vùng ảnh hoặc mất focus thì cần nhấn lại.",
        },
      ],
    },
    "p03-l02": {
      focus:
        "Thay dấu một pixel bằng vòng lặp tô hình tròn, không thay cách một nét bắt đầu và kết thúc.",
      expected:
        "Bán kính 2 có 13 pixel ở giữa ảnh và 6 pixel khi tâm ở góc. Sát cạnh không ghi sai vùng nhớ.",
      files: ["include/brush.hpp", "include/paint.hpp"],
      steps: [
        {
          title: "Tính tay trường hợp nhỏ",
          explanation:
            "Duyệt dx/dy từ −r đến r; giữ các ô có bình phương khoảng cách không vượt r².",
        },
        {
          title: "Giữ phép đổi tọa độ an toàn",
          explanation: "Kiểm tâm hữu hạn, nằm trong ảnh và radius hợp lệ trước khi floor sang int.",
        },
        {
          title: "Đổi đúng hàm tạo dấu",
          explanation:
            "applyStamp gọi stampCircle thay stampPoint; begin/move/end và phần upload giữ nguyên.",
        },
      ],
    },
    "p03-l03": {
      focus:
        "Biến lỗi nét đứt thành một phép thử có thể lặp lại bằng S và D, thay vì phụ thuộc tốc độ tay.",
      expected:
        "S đổi mức lấy thưa, D vẽ cùng năm vị trí. Title cho biết số mẫu giữ, số dấu và input gap; chưa nội suy nên khoảng hở vẫn hiện rõ.",
      files: ["include/lab.hpp", "include/paint.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đo khoảng cách mẫu được giữ",
          explanation:
            "Lưu previous đến khi một mẫu được chấp nhận; không gán nó theo những motion đã cố ý bỏ qua.",
        },
        {
          title: "Bảo vệ mẫu đầu và cuối",
          explanation:
            "Down luôn vẽ, up gọi moveStroke với forceEndpoint nên lấy thưa không làm mất vị trí thả chuột.",
        },
        {
          title: "Không nhầm lấy mẫu với FPS",
          explanation:
            "1/N chỉ là thao tác bỏ bớt event để tạo đối chứng, không đo Hz của chuột hoặc FPS renderer.",
        },
      ],
    },
    "p03-l04": {
      focus:
        "Thêm lerp và sampleStroke, sau đó thay việc đặt một dấu ở current bằng nhiều dấu dọc đoạn.",
      expected:
        "Cùng preset D, nét liền hơn mà không đổi brush. Các tâm nội suy không vượt spacing; helper giữ hai đầu và có giới hạn số điểm rõ ràng.",
      files: ["include/lab.hpp", "include/paint.hpp"],
      steps: [
        {
          title: "Từ trung điểm đến lerp",
          explanation: "Cùng t cho X/Y giữ điểm trên đoạn. ceil(17/8) là ba khoảng, bốn điểm.",
        },
        {
          title: "Giữ hợp đồng hai đầu",
          explanation:
            "Thêm start/end trực tiếp, chỉ dùng lerp cho điểm bên trong để không mất endpoint vì sai số làm tròn.",
        },
        {
          title: "Nêu giới hạn thay vì che nó",
          explanation:
            "Spacing lỗi dùng sàn 0,5; đoạn quá 2.048 pixel bị từ chối, tối đa 4.097 điểm mỗi đoạn. Không hạ mật độ âm thầm.",
        },
      ],
    },
    "p03-l05": {
      focus:
        "Bổ sung công cụ vẽ trong khi giữ phần rasterization và nội suy độc lập với sự kiện bàn phím.",
      expected:
        "1–4 chọn bốn màu, [/] đổi radius 2–64, C xóa tranh. Thay công cụ hoặc clear đóng nét hiện tại, không nối từ tọa độ cũ.",
      files: ["include/paint.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn màu cho nét mới",
          explanation: "Pixel của nét cũ không đổi; chỉ state.color được cập nhật.",
        },
        {
          title: "Giữ radius hợp lệ",
          explanation:
            "Giới hạn ở nơi thay đổi bán kính; brush vẫn tự từ chối đầu vào sai trước vòng lặp.",
        },
        {
          title: "Xóa dữ liệu thật",
          explanation:
            "clearPainting fill framebuffer bằng màu nền và cancel nét; không hủy texture hoặc cấp phát lại ảnh.",
        },
      ],
    },
    "p03-l06": {
      focus: "Kiểm cùng hàm app dùng, từ hình học đến ảnh pixel và vòng đời thao tác.",
      expected:
        "CTest Debug/Release xác nhận endpoint, spacing, giới hạn cấp phát, brush, nhiều nét và công cụ. SDL smoke 12 frame kiểm resize/upload/present, không thay desktop QA.",
      files: ["tests/tests.cpp", "include/paint.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Có đáp án độc lập",
          explanation: "Đoạn 17/8 cho bốn điểm; radius 2 cho 13 pixel; góc ảnh còn 6 pixel.",
        },
        {
          title: "Test đủ đường vào",
          explanation:
            "begin/move/end kiểm click, endpoint chỉ có ở up, cancel, reentry và nét rời; không chỉ gọi lerp riêng.",
        },
        {
          title: "Tách ba lớp kiểm thử",
          explanation:
            "CTest kiểm dữ liệu, smoke kiểm SDL hữu hạn, còn chuột vật lý/focus/HiDPI phải thao tác trên desktop.",
        },
      ],
    },
  },
  references: {
    "p03-l01": [
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      { label: "Input sampling", href: "/glossary#input-sampling", kind: "Thuật ngữ" },
    ],
    "p03-l02": [
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Bounds check", href: "/glossary#bounds-check", kind: "Thuật ngữ" },
    ],
    "p03-l03": [
      {
        label: "SDL_MouseMotionEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent",
        kind: "SDL API",
      },
      { label: "Input sampling", href: "/glossary#input-sampling", kind: "Thuật ngữ" },
    ],
    "p03-l04": [
      { label: "Linear interpolation", href: "/glossary#linear-interpolation", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p03-l05": [
      {
        label: "SDL keyboard events",
        href: "https://wiki.libsdl.org/SDL3/SDL_KeyboardEvent",
        kind: "SDL API",
      },
    ],
    "p03-l06": [
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
