import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p03-l01": {
      focus:
        "Theo dõi lúc một nét bắt đầu, tiếp tục và kết thúc qua các sự kiện chuột; lưu vị trí trước để chuẩn bị nối đoạn ở bài sau.",
      expected:
        "Một cú click trái tạo ngay một chấm. Mouse capture giữ được thao tác kéo ngoài cửa sổ; thả nút hoặc mất focus đều kết thúc nét và không nối sang lần vẽ sau.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Bắt đầu nét",
          explanation:
            "Khi nhấn chuột, đặt `drawing = true`, chép tọa độ vào `previous` và vẽ ngay để cú click không kéo vẫn để lại dấu.",
        },
        {
          title: "Tiếp tục nét",
          explanation:
            "Chỉ xử lý chuyển động khi `drawing` đang bật; lấy tọa độ mới vào `current`, vẽ xong rồi mới cập nhật `previous`.",
        },
        {
          title: "Kết thúc nét",
          explanation:
            "Thả chuột hoặc mất focus đều tắt `drawing` và nhả capture. Lần nhấn tiếp theo gán lại `previous`, nên hai nét không bị nối xuyên qua khoảng trống.",
        },
      ],
    },
    "p03-l02": {
      focus:
        "Biến một hình tròn đặc thành pixel bằng hình vuông bao và điều kiện `dx² + dy² ≤ radius²`, sau đó bỏ an toàn phần nằm ngoài bảng vẽ.",
      expected:
        "Đầu bút tạo một hình tròn đặc, đối xứng. Đặt tâm tại bốn góc không làm chương trình dừng hoặc ghi ra ngoài vector.",
      files: ["src/main.cpp"],
      steps: [
        {
          title: "Chỉ duyệt vùng cần thiết",
          explanation:
            "Hai vòng lặp chạy từ `-radius` đến `radius`, không quét toàn bộ framebuffer cho mỗi vị trí chuột.",
        },
        {
          title: "So sánh bình phương",
          explanation:
            "So `dx² + dy²` với `radius²` cho cùng kết quả hình học mà không phải gọi căn bậc hai cho từng pixel.",
        },
        {
          title: "Kiểm tra sau khi cộng tâm",
          explanation:
            "Tính X/Y thật bằng tâm cộng độ lệch, rồi kiểm tra biên trước khi dùng chúng làm chỉ số.",
        },
      ],
    },
    "p03-l03": {
      focus:
        "Cố ý chỉ đặt đầu bút ở vị trí mới để quan sát dữ liệu chuột rời rạc: con trỏ đi một quãng dài nhưng chương trình chỉ nhận được hai đầu.",
      expected:
        "Khi kéo nhanh, phiên bản chưa nội suy để lộ khoảng hở. Giảm tần suất lấy mẫu trong Stroke Lab làm khoảng hở tăng rõ rệt.",
      files: ["src/main.cpp"],
      steps: [
        {
          title: "Sự kiện không phải quỹ đạo",
          explanation:
            "MOUSE_MOTION chỉ cung cấp các vị trí rời rạc; SDL không đảm bảo hai vị trí luôn gần hơn đường kính đầu bút.",
        },
        {
          title: "FPS cao chưa chắc có thêm điểm",
          explanation:
            "Nếu chỉ hỏi vị trí một lần mỗi khung hình, nhiều chuyển động có thể bị gộp thành một đoạn dài; tăng tốc độ vẽ không sửa được dữ liệu bị thiếu.",
        },
        {
          title: "Đo trước khi sửa",
          explanation:
            "Hiển thị tâm các dấu và đo `distance(previous, current)` giúp xác định lỗi nằm ở việc lấy mẫu chuột, không phải công thức hình tròn.",
        },
      ],
    },
    "p03-l04": {
      focus:
        "Chia đoạn thành đủ số bước để khoảng cách giữa hai lần đặt đầu bút không vượt quá `spacing`, đồng thời giữ cả điểm đầu và điểm cuối.",
      expected:
        "Nét vẫn liền khi kéo nhanh. `sampleStroke` giữ đúng hai đầu và xử lý được trường hợp hai điểm trùng nhau.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn đủ số bước",
          explanation:
            "`steps = ceil(distance / spacing)` bảo đảm mỗi đoạn nhỏ không dài hơn `spacing` đã chọn.",
        },
        {
          title: "Giữ cả hai đầu",
          explanation:
            "Chỉ số chạy từ 0 đến `steps`, nên `t = index / steps` có cả 0 và 1; `lerp` vì vậy trả đúng điểm đầu và điểm cuối.",
        },
        {
          title: "Xử lý đầu vào đặc biệt",
          explanation:
            "Hai điểm trùng nhau trả về một điểm trước phép chia; `spacing` bằng 0, số âm hoặc NaN được thay bằng 0,5 pixel để tránh chia lỗi và cấp phát quá lớn.",
        },
      ],
    },
    "p03-l05": {
      focus:
        "Thêm bảng màu, giới hạn `radius` và lệnh xóa bảng vẽ mà không trộn phần điều khiển vào thuật toán nội suy.",
      expected:
        "Phím 1/2 đổi màu, [/] thay đổi bán kính trong khoảng 2…64 và C xóa bảng vẽ. Nét đang vẽ luôn dùng trạng thái hiện tại.",
      files: ["src/main.cpp"],
      steps: [
        {
          title: "Phím chỉ cập nhật trạng thái",
          explanation:
            "Phần xử lý phím chỉ đổi `color`, `radius` hoặc tô lại `pixels`; `stampCircle` đọc các giá trị hiện tại khi cần vẽ.",
        },
        {
          title: "Giữ bán kính trong giới hạn",
          explanation:
            "`std::max` và `std::min` giữ bán kính từ 2 đến 64, tránh đầu bút biến mất hoặc mỗi dấu trở nên quá tốn kém.",
        },
        {
          title: "Xóa bằng cách tô lại vector",
          explanation:
            "Lệnh C dùng `std::fill` để đưa toàn bộ `pixels` về màu nền; không cần hủy texture hay cấp phát lại.",
        },
      ],
    },
    "p03-l06": {
      focus:
        "Kiểm tra hai đầu đoạn, khoảng cách giữa các điểm và trường hợp hai đầu trùng nhau; sau đó chạy ứng dụng hoàn chỉnh với chuột, đầu bút, nội suy và phím điều khiển.",
      expected:
        "Toàn bộ CTest đều đạt. `project_3_final` tạo được nét liền khi rê chuột nhanh và vẫn an toàn ở mọi mép của bảng vẽ.",
      files: ["tests/tests.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Kiểm tra khoảng cách",
          explanation:
            "Mỗi cặp điểm liên tiếp phải cách nhau không quá `spacing` cộng một `epsilon` nhỏ cho sai số số thực.",
        },
        {
          title: "Kiểm tra hai đầu",
          explanation:
            "`front()` bằng `start` và `back()` bằng `end` giúp phát hiện vòng lặp bỏ mất đầu hoặc cuối đoạn.",
        },
        {
          title: "Giữ phần toán độc lập",
          explanation:
            "Hình học thuần nằm trong `lab.hpp`; sự kiện SDL và việc ghi framebuffer nằm trong `main.cpp`.",
        },
      ],
    },
  },
  references: {
    "p03-l01": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      {
        label: "SDL_PollEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_PollEvent",
        kind: "SDL API",
      },
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "Input sampling",
        href: "/glossary#input-sampling",
        kind: "Thuật ngữ",
      },
    ],
    "p03-l02": [
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
    "p03-l03": [
      {
        label: "SDL_MouseMotionEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent",
        kind: "SDL API",
      },
      {
        label: "Input sampling",
        href: "/glossary#input-sampling",
        kind: "Thuật ngữ",
      },
    ],
    "p03-l04": [
      {
        label: "Input sampling",
        href: "/glossary#input-sampling",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p03-l05": [
      {
        label: "SDL_GetKeyboardState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState",
        kind: "SDL API",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p03-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
