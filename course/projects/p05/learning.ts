import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p05-l01": {
      focus:
        "Đặt quy ước rõ cho screen space và world space trong Camera2D; mọi thao tác sau đó đều đi qua hai hàm chuyển đổi.",
      expected:
        "Bạn xác định được gốc tọa độ, chiều dương của Y và đơn vị trong từng hệ. Điểm (2,1) xuất hiện đúng ở phía trên bên phải tâm màn hình.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Quy ước screen space",
          explanation: "Gốc nằm ở góc trên bên trái, X sang phải, Y đi xuống và đơn vị là pixel.",
        },
        {
          title: "Quy ước world space",
          explanation:
            "Gốc do thế giới định nghĩa, X sang phải, Y đi lên và đơn vị độc lập với độ phân giải.",
        },
        {
          title: "Camera nối hai hệ",
          explanation:
            "`centerWorld`, `pixelsPerUnit` và `viewportPixels` đủ để mô tả quan hệ giữa hai hệ tọa độ.",
        },
      ],
    },
    "p05-l02": {
      focus:
        "Viết `worldToScreen` bằng ba bước: tính vị trí tương đối với camera, đổi sang pixel, rồi đưa gốc tới tâm viewport và đảo Y.",
      expected:
        "centerWorld luôn được ánh xạ tới giữa viewport. Tăng world.x làm điểm đi sang phải; tăng world.y làm điểm đi lên màn hình.",
      files: ["include/lab.hpp"],
      steps: [
        {
          title: "Tính vị trí tương đối",
          explanation:
            "`relative = world - centerWorld` biến tọa độ tuyệt đối thành độ lệch so với tâm camera.",
        },
        {
          title: "Đổi sang pixel",
          explanation:
            "Nhân với `pixelsPerUnit` để đổi đơn vị world thành pixel; tỉ lệ dương được bảo vệ bởi `scale()`.",
        },
        {
          title: "Chỉ đảo Y một lần",
          explanation:
            "`screenY = halfHeight - relative.y × scale` vì trục Y màn hình ngược chiều world; phần vẽ không được đảo thêm lần nữa.",
        },
      ],
    },
    "p05-l03": {
      focus:
        "Suy ra `screenToWorld` bằng cách hoàn tác từng bước theo thứ tự ngược; đây là nền tảng để chọn vật thể và đọc tọa độ con trỏ.",
      expected:
        "Với nhiều điểm khác nhau, screenToWorld(worldToScreen(p)) phục hồi p với sai số dưới 1e−9.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Bỏ độ dời tới tâm viewport",
          explanation:
            "Trừ nửa kích thước viewport khỏi tọa độ screen để trở lại độ lệch pixel quanh tâm.",
        },
        {
          title: "Chia cho tỉ lệ",
          explanation:
            "Chia `pixelsPerUnit` để đổi pixel trở lại đơn vị world; Y vẫn có dấu trừ đối xứng với chiều thuận.",
        },
        {
          title: "Cộng tâm camera",
          explanation: "Bước cuối đưa độ lệch tương đối trở lại tọa độ world tuyệt đối.",
        },
      ],
    },
    "p05-l04": {
      focus:
        "Vẽ lưới từ khoảng world đang nhìn thấy và pan camera bằng độ dời chuột sau khi đổi qua tỉ lệ.",
      expected:
        "Khi kéo chuột, lưới bám theo tay. Điểm đánh dấu giữ nguyên tọa độ trong world space và khoảng cách đường lưới phản ánh đúng mức zoom.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Tính vùng world đang thấy",
          explanation:
            "Đổi hai góc screen về world rồi dùng `floor`/`ceil` để chỉ lặp qua các đường lưới trong viewport.",
        },
        {
          title: "Camera đi ngược cảnh",
          explanation:
            "Kéo nội dung sang phải tương đương `centerWorld` đi sang trái `deltaX / scale`; Y đổi dấu theo quy ước hai hệ.",
        },
        {
          title: "Dùng độ dời của từng sự kiện",
          explanation:
            "Mỗi MOUSE_MOTION dùng `current - previous` rồi cập nhật `previous`, tránh cộng lại toàn bộ quãng kéo ở mọi sự kiện.",
        },
      ],
    },
    "p05-l05": {
      focus:
        "Zoom quanh con trỏ bằng một điều kiện rõ ràng: điểm world dưới con trỏ trước khi zoom phải vẫn nằm ở đó sau khi đổi tỉ lệ.",
      expected:
        "Cuộn để zoom không làm điểm dưới con trỏ bị trôi; pixelsPerUnit luôn nằm trong khoảng 20…160.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Ghi điểm trước khi zoom",
          explanation:
            "`before = screenToWorld(cursor)` dùng camera cũ để biết điểm world người dùng đang trỏ tới.",
        },
        {
          title: "Đổi tỉ lệ trong giới hạn",
          explanation:
            "Nhân với `factor` rồi clamp để tỉ lệ luôn hữu hạn, dương và lưới không quá dày hoặc quá thưa.",
        },
        {
          title: "Bù tâm camera",
          explanation:
            "Tính `after` bằng camera mới rồi cộng `before - after` vào `centerWorld` để triệt tiêu độ trôi.",
        },
      ],
    },
    "p05-l06": {
      focus:
        "Kiểm tra round trip, pan theo tỉ lệ và zoom quanh con trỏ bằng code thuần; sau đó chạy ứng dụng hoàn chỉnh có lưới, pan, zoom và điểm world.",
      expected:
        "Toàn bộ CTest đều đạt. `project_5_final` giữ đúng điểm dưới con trỏ khi zoom, pan đúng chiều và đặt lại camera bằng phím R.",
      files: ["tests/tests.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Round trip trên nhiều vùng",
          explanation:
            "Kiểm tra gốc, số âm và điểm xa để tránh công thức chỉ vô tình đúng gần tâm camera.",
        },
        {
          title: "So sánh với epsilon",
          explanation:
            "Phép chuyển đổi dùng `double`, nên kiểm tra `distance < epsilon` thay vì dùng `operator==` sau chuỗi nhân và chia.",
        },
        {
          title: "Kiểm tra đúng hành vi zoom",
          explanation:
            "Test không cần biết tỉ lệ cuối là bao nhiêu; nó xác nhận điểm world dưới con trỏ không thay đổi.",
        },
      ],
    },
  },
  references: {
    "p05-l01": [
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
      {
        label: "Framebuffer",
        href: "/glossary#framebuffer",
        kind: "Thuật ngữ",
      },
    ],
    "p05-l02": [
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
    "p05-l03": [
      {
        label: "SDL_MouseMotionEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent",
        kind: "SDL API",
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
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
    "p05-l04": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
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
    "p05-l05": [
      {
        label: "SDL_MouseWheelEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseWheelEvent",
        kind: "SDL API",
      },
      {
        label: "SDL_GetMouseState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetMouseState",
        kind: "SDL API",
      },
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
    "p05-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
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
