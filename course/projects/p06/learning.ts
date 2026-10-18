import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p06-l01": {
      focus: "Chạy bảng tọa độ từ starter rồi thêm Vec2 và trạng thái A/B trước khi học phép toán.",
      expected:
        "Hai đoạn từ gốc tới A(3,1.5) và B(−1,2.5) có màu riêng; resize không đổi các tọa độ đó.",
      files: ["include/lab.hpp", "include/camera.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Bắt đầu từ hình đã chạy",
          explanation:
            "drawBoard, framebuffer, texture và event loop đã sẵn sàng; bạn chỉ thêm dữ liệu vector.",
        },
        {
          title: "Lưu độ dời, không lưu pixel",
          explanation: "A/B ở world space; endpoint screen chỉ là biến tạm dùng để vẽ.",
        },
        {
          title: "Nối đủ đường đi của dữ liệu",
          explanation: "worldToScreen → drawScreenLine → Bresenham → putPixel → SDL_UpdateTexture.",
        },
      ],
    },
    "p06-l02": {
      focus: "Đo độ lớn bằng Pythagoras/hypot và dùng hướng chuẩn hóa để dựng đầu mũi tên.",
      expected: "A/B có đầu tên; đầu tên ngắn lại hợp lý khi vector rất ngắn, zero không tạo NaN.",
      files: ["include/lab.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Phân biệt hai độ dài",
          explanation: "length(A) là world unit; chiều dài đầu tên là screen pixel.",
        },
        {
          title: "Chia cùng tỉ lệ trước",
          explanation:
            "normalize dùng thành phần lớn nhất để không mất hướng ở các số rất lớn/rất nhỏ.",
        },
        {
          title: "Dựng hai cánh",
          explanation:
            "direction cho trục thân; perpendicular cho hai phía; headLength được chặn theo đoạn ngắn.",
        },
      ],
    },
    "p06-l03": {
      focus: "Chọn endpoint bằng screen distance, giữ grab offset và đúng mouse/pointer owner.",
      expected:
        "Kéo A/B không nhảy điểm, chỉ sửa vector đang giữ; mẫu button-up cuối được áp dụng trước khi release capture.",
      files: ["include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Hit-test cùng hệ",
          explanation:
            "Cả chuột lẫn endpoint được đưa về pixel của bảng logic trước phép so khoảng cách.",
        },
        {
          title: "Không kéo vào giữa con trỏ",
          explanation:
            "grabOffset lưu chênh lệch world lúc nhấn; moveEndpoint cộng lại đúng phần đó.",
        },
        {
          title: "Hủy một cách đầy đủ",
          explanation:
            "Nút thả, lost buttons, blur, hidden, resize, pause/reset và preset đều không để drag cũ tồn tại.",
        },
      ],
    },
    "p06-l04": {
      focus: "Vẽ tổng vector bằng phép toán world và hai đường đi nối đuôi nhau.",
      expected:
        "A+B nằm tại góc đối diện; hai cạnh phụ lần lượt bằng B và A, kể cả khi A/B âm hoặc đối hướng.",
      files: ["include/lab.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Cộng dữ liệu world",
          explanation: "operator+ cộng đúng thành phần, không cộng hai screen endpoints.",
        },
        {
          title: "Đặt bản sao của B tại A",
          explanation: "Đi từ A tới sum có độ dời B.",
        },
        {
          title: "Kiểm tra đường đi còn lại",
          explanation: "Đi từ B tới sum có độ dời A; không suy ra correctness chỉ từ một hình đẹp.",
        },
      ],
    },
    "p06-l05": {
      focus: "Đặt phép trừ vào câu hỏi cụ thể: phải đi thế nào từ B để tới A?",
      expected:
        "Mũi tên A−B từ gốc và bản sao B→A cùng chiều, song song, bằng độ dài; −B giúp nhìn phép cộng với hướng ngược.",
      files: ["include/view.hpp", "include/lab.hpp"],
      steps: [
        {
          title: "Tìm độ dời còn thiếu",
          explanation: "B + (A−B) = A quyết định thứ tự phép trừ.",
        },
        {
          title: "So hai bản sao",
          explanation: "Vị trí đặt khác nhau không làm đổi vector.",
        },
        {
          title: "Dùng cả trường hợp đối hướng",
          explanation:
            "Preset đối hướng cho tổng zero nhưng hiệu khác zero; hai phép toán không giống nhau.",
        },
      ],
    },
    "p06-l06": {
      focus: "Co, giãn hoặc đảo hướng A bằng scalar và đo riêng đoạn A–B.",
      expected:
        "Scalar ∈ [−2,2], distance(A,B) không bị nhầm với |A| hoặc |B|; bản checkpoint bật lớp scalar ngay.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Nhân cả X và Y",
          explanation: "Scalar âm đảo hướng, scalar zero mất hướng, scalar dương giữ hướng.",
        },
        {
          title: "Khoảng cách là độ dài hiệu",
          explanation: "distance(A,B)=length(B−A), luôn không âm và đối xứng.",
        },
        {
          title: "Kết quả không phải state riêng",
          explanation:
            "scaledA được tính từ vectorA và scalar mới nhất; không giữ bản sao lỗi thời.",
        },
      ],
    },
    "p06-l07": {
      focus:
        "Đưa vector đơn vị lên vòng tròn bán kính một và giải thích chính xác trường hợp zero.",
      expected:
        "Vector trắng cùng hướng A, dài một world unit khi A khác zero; A=0 ghi rõ không có hướng, fallback không phải vector đơn vị.",
      files: ["include/lab.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Giữ lại hướng",
          explanation: "Normalize không phải clamp từng thành phần hoặc đổi vector sang screen.",
        },
        {
          title: "Đối chiếu đường tròn",
          explanation: "Bán kính kPixelsPerUnit biểu diễn một world unit trên bảng.",
        },
        {
          title: "Tách toán khỏi quy ước chương trình",
          explanation:
            "Hướng của zero không xác định; trả (0,0) chỉ để chương trình tiếp tục an toàn.",
        },
      ],
    },
    "p06-l08": {
      focus:
        "Xây lerp từ phép cộng/trừ/scalar, điều khiển t và nghiệm thu ứng dụng bằng test lẫn desktop checklist.",
      expected:
        "Final mặc định hiển thị A/B/tổng/hiệu; phím 4 hoặc lớp Lerp mở điểm nội suy; CTest Debug/Release kiểm tra toán, input state và raster.",
      files: ["include/lab.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "t là tỉ lệ trên đoạn",
          explanation: "0 ở A, 1 ở B, 0.5 ở trung điểm; không phải giây hay tốc độ.",
        },
        {
          title: "Dùng oracle độc lập",
          explanation:
            "Fixture tọa độ/độ dài, tính các thành phần lerp riêng và kiểm tra hình bình hành qua đẳng thức.",
        },
        {
          title: "Kiểm tra đúng tầng",
          explanation:
            "CPU test không mở window; smoke chỉ 12 frame ẩn; input/HiDPI vẫn cần kiểm tra trực tiếp.",
        },
      ],
    },
  },
  references: {
    "p06-l01": [
      {
        label: "Vector 2D",
        href: "/glossary#vector-2d",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l02": [
      {
        label: "Magnitude",
        href: "/glossary#magnitude",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l03": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l04": [
      {
        label: "Vector addition",
        href: "/glossary#vector-addition",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l05": [
      {
        label: "Vector subtraction",
        href: "/glossary#vector-subtraction",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l06": [
      {
        label: "Distance",
        href: "/glossary#distance",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l07": [
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p06-l08": [
      {
        label: "Linear interpolation",
        href: "/glossary#linear-interpolation",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
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
