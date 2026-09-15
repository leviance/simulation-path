import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p06-l01": {
      focus:
        "Bắt đầu từ chương trình SDL3 đã có window, framebuffer và hệ trục tọa độ; thêm Vec2 rồi dùng nó để biểu diễn hai vector A và B có cùng gốc.",
      expected:
        "Vector A(3,1.5) hướng lên bên phải, vector B(-1,2.5) hướng lên bên trái. Khi thay đổi kích thước cửa sổ, gốc tọa độ vẫn nằm ở giữa và dữ liệu A/B không thay đổi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ dữ liệu vector ở dạng số thực",
          explanation:
            "Các thành phần của Vec2 được lưu bằng double để không làm mất phần thập phân. Chỉ khi chuẩn bị vẽ pixel, chương trình mới làm tròn tọa độ sang int.",
        },
        {
          title: "Phân biệt tọa độ mô phỏng và tọa độ màn hình",
          explanation:
            "A và B là dữ liệu trong world space. origin, endpointA và endpointB chỉ là kết quả tạm thời sau khi chuyển sang screen space để vẽ.",
        },
        {
          title: "Tận dụng những phần đã hoàn thành",
          explanation:
            "Starter đã xử lý việc khởi tạo SDL, quản lý framebuffer, vẽ đoạn thẳng bằng Bresenham và resize. Bài này chỉ bổ sung phần biểu diễn vector.",
        },
      ],
    },
    "p06-l02": {
      focus:
        "Tính độ lớn và hướng đơn vị của vector, sau đó dùng hướng đơn vị cùng một vector vuông góc để dựng đầu mũi tên.",
      expected:
        "A và B được vẽ thành hai mũi tên hoàn chỉnh. Đầu mũi tên dài 14 pixel, rộng 12 pixel và không thay đổi kích thước khi độ lớn của vector thay đổi; zero vector chỉ hiện thành một chấm.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tính độ lớn bằng định lý Pythagoras",
          explanation:
            "lengthSquared trả về x²+y²; length gọi lại hàm này rồi lấy căn bậc hai, nhờ vậy công thức không bị viết lặp.",
        },
        {
          title: "Không chia cho độ dài bằng zero",
          explanation:
            "normalize trả về zero vector khi độ lớn quá nhỏ hoặc không phải một số hữu hạn. Nhờ đó, các bước vẽ phía sau không nhận NaN hay infinity.",
        },
        {
          title: "Dựng đầu mũi tên trong screen space",
          explanation:
            "Chương trình chuẩn hóa end−start sau khi đã đổi sang screen space, vì vậy đầu mũi tên luôn giữ cùng kích thước tính bằng pixel.",
        },
      ],
    },
    "p06-l03": {
      focus:
        "Xác định điểm cuối gần con trỏ nhất, ghi nhớ vector đang được kéo và đổi tọa độ chuột về world space trước khi cập nhật A hoặc B.",
      expected:
        "Chỉ điểm cuối được nhấn mới di chuyển. Nhấn vào vùng trống không làm thay đổi A/B; thả chuột ngoài cửa sổ hoặc chuyển sang ứng dụng khác đều kết thúc thao tác kéo.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "So sánh các điểm trong cùng một hệ tọa độ",
          explanation:
            "Tọa độ chuột và hai điểm cuối đều được biểu diễn bằng pixel trước khi so với handleRadius.",
        },
        {
          title: "Ưu tiên điểm cuối gần con trỏ hơn",
          explanation:
            "Nếu vùng chọn của A và B chồng lên nhau, chương trình so distanceToA với distanceToB để chọn điểm gần hơn.",
        },
        {
          title: "Lưu A và B bằng world unit",
          explanation:
            "Mỗi sự kiện SDL_EVENT_MOUSE_MOTION phải đi qua screenToWorld. Nếu gán tọa độ pixel trực tiếp cho A/B, mọi phép toán vector phía sau sẽ sai đơn vị.",
        },
      ],
    },
    "p06-l04": {
      focus:
        "Tính A+B và A−B trong world space, sau đó dùng hình bình hành và một bản sao của A−B để giải thích ý nghĩa hình học của hai phép toán.",
      expected:
        "Khi kéo A hoặc B, điểm cuối của A+B luôn nằm ở góc đối diện của hình bình hành. Mũi tên A−B từ gốc và mũi tên từ B tới A luôn song song, cùng chiều và cùng độ dài.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Thực hiện phép toán trước khi đổi hệ tọa độ",
          explanation:
            "A và B phải được cộng theo từng thành phần trong world space. Nếu cộng hai endpoint trong screen space, tâm viewport cũng bị cộng thêm một lần.",
        },
        {
          title: "Dựng hình bình hành",
          explanation:
            "Đoạn từ A tới A+B là một bản sao của B; đoạn từ B tới A+B là một bản sao của A.",
        },
        {
          title: "Hiểu A−B là độ dời từ B tới A",
          explanation:
            "Vẽ A−B từ gốc rồi vẽ thêm một bản sao từ B tới A giúp người học thấy hai mũi tên biểu diễn cùng một độ dời.",
        },
      ],
    },
    "p06-l05": {
      focus:
        "Cho phép thay đổi scalar của A, đồng thời vẽ đoạn nối A–B để phân biệt độ dài của từng vector với khoảng cách giữa hai điểm cuối.",
      expected:
        "Phím lên/xuống thay đổi scalar trong khoảng [-2,2]. Mũi tên tím co, giãn hoặc đảo hướng; độ dài của đoạn xám A–B bằng đúng distance(A,B) trên thanh tiêu đề.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Nhân cả hai thành phần với cùng một scalar",
          explanation:
            "Khi scalar dương, phép nhân phải giữ nguyên hướng của A. Nếu chỉ nhân thành phần x, vector sẽ quay sang một hướng khác.",
        },
        {
          title: "Tính lại kết quả trong mỗi frame",
          explanation:
            "scaledA phụ thuộc vào A và scalar hiện tại, nên đây là dữ liệu được suy ra chứ không phải một trạng thái cần lưu riêng.",
        },
        {
          title: "Phân biệt length và distance",
          explanation:
            "length(A) đo đoạn từ gốc tới điểm cuối A. distance(A,B) đo đoạn nối hai điểm cuối và được tính bằng length(B−A).",
        },
      ],
    },
    "p06-l06": {
      focus:
        "Tách các nhóm kết quả thành bốn chế độ hiển thị, vẽ normalize(A), nội suy một điểm trên đoạn A–B và kiểm tra phần toán bằng CTest.",
      expected:
        "Phím 1–4 chuyển giữa bốn chế độ. Khi A khác zero, vector trắng dài đúng một world unit; điểm vàng luôn nằm trên đoạn A–B với t trong [0,1]; toàn bộ phép kiểm tra của Project 06 đều vượt qua.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Xây dựng lerp từ các phép toán đã có",
          explanation:
            "Công thức start + (end−start)×t dùng lại phép trừ, phép nhân scalar và phép cộng thay vì tính lại từng thành phần.",
        },
        {
          title: "Kiểm tra cả dữ liệu thông thường lẫn dữ liệu đặc biệt",
          explanation:
            "Bộ tests bao phủ zero vector, vector rất nhỏ, infinity, NaN, tính đối xứng của distance, nội suy và ngoại suy.",
        },
        {
          title: "Kiểm chứng hình học bằng đẳng thức",
          explanation:
            "Nếu (A+B)−A cho lại B và (A+B)−B cho lại A, góc đối diện của hình bình hành đã được tính đúng.",
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
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
    ],
    "p06-l02": [
      {
        label: "Magnitude",
        href: "/glossary#magnitude",
        kind: "Thuật ngữ",
      },
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
      {
        label: "Zero vector",
        href: "/glossary#zero-vector",
        kind: "Thuật ngữ",
      },
    ],
    "p06-l03": [
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
        label: "Distance",
        href: "/glossary#distance",
        kind: "Thuật ngữ",
      },
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
    ],
    "p06-l04": [
      {
        label: "Vector addition",
        href: "/glossary#vector-addition",
        kind: "Thuật ngữ",
      },
      {
        label: "Vector subtraction",
        href: "/glossary#vector-subtraction",
        kind: "Thuật ngữ",
      },
    ],
    "p06-l05": [
      {
        label: "Scalar multiplication",
        href: "/glossary#scalar-multiplication",
        kind: "Thuật ngữ",
      },
      {
        label: "Magnitude",
        href: "/glossary#magnitude",
        kind: "Thuật ngữ",
      },
      {
        label: "Distance",
        href: "/glossary#distance",
        kind: "Thuật ngữ",
      },
    ],
    "p06-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
      {
        label: "Linear interpolation",
        href: "/glossary#linear-interpolation",
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
