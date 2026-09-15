import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p08-l01": {
      focus:
        "Bắt đầu từ cửa sổ, framebuffer và hệ trục đã chạy được; thêm kiểu Vec2, thân tháp pháo, nòng súng cố định và mục tiêu lấy vị trí trực tiếp từ chuột.",
      expected:
        "Tháp pháo nằm giữa cửa sổ, nòng súng hướng sang phải và mục tiêu đi theo chuột. Kéo resize vẫn giữ tháp pháo ở tâm và phép đổi trục Y không bị đảo ngược.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ dữ liệu trong world space",
          explanation:
            "targetOffset là độ dời từ tâm tháp pháo tới chuột, với X hướng sang phải và Y hướng lên. Tọa độ pixel chỉ được tạo ra ở bước vẽ.",
        },
        {
          title: "Suy hướng nòng từ một góc",
          explanation:
            "directionFromAngle trả `(cos(angle), sin(angle))`. Nhân hướng đơn vị này với chiều dài nòng rồi mới đổi sang screen space.",
        },
        {
          title: "Vẽ đủ cảnh trước khi thêm toán",
          explanation:
            "Checkpoint đầu phải nhìn thấy được tháp pháo, đường nối và mục tiêu. Nhờ vậy các bài sau chỉ thêm một câu hỏi toán học vào một chương trình đã quan sát được.",
        },
      ],
    },
    "p08-l02": {
      focus:
        "Tự cài đặt dot product và so sánh kết quả thô với kết quả sau khi chuẩn hóa để đo mức độ cùng hướng của nòng súng và mục tiêu.",
      expected:
        "Thanh tiêu đề cho thấy normalized dot gần 1 khi mục tiêu ở phía trước, gần 0 khi nằm vuông góc và gần -1 khi ở phía sau; thay đổi khoảng cách không làm giá trị này đổi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nhân các thành phần tương ứng",
          explanation:
            "dot(left,right) bằng left.x×right.x + left.y×right.y. Kết quả là một số, không phải một vector mới.",
        },
        {
          title: "Nhận ra độ dài có trong dot thô",
          explanation:
            "Hai vector cùng hướng nhưng dài gấp đôi sẽ làm dot thô đổi. Vì bài toán cần so hướng, cả hai vector phải có độ dài 1.",
        },
        {
          title: "Đối chiếu ba mốc",
          explanation:
            "Hai hướng đơn vị cùng chiều, vuông góc và ngược chiều tạo ra các giá trị lần lượt 1, 0 và -1.",
        },
      ],
    },
    "p08-l03": {
      focus:
        "Dùng công thức dot = |a||b|cos(theta) để suy góc không dấu, đồng thời xử lý zero vector và sai số khiến cosine vượt nhẹ khỏi [-1,1].",
      expected:
        "Góc hiển thị nằm trong [0°,180°], đúng tại các preset 0°, 90° và 180°. Đưa mục tiêu vào tâm không làm xuất hiện NaN hay khiến chương trình lỗi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chia bỏ hai độ dài",
          explanation:
            "cosineBetween lấy dot chia cho tích độ dài của hai vector. Khi một vector không có hướng, hàm trả 0 theo quy ước an toàn của project.",
        },
        {
          title: "Chặn trước khi gọi acos",
          explanation:
            "Sai số số thực có thể tạo 1.0000000000000002; clampCosine đưa giá trị về miền hợp lệ của acos.",
        },
        {
          title: "Hiểu giới hạn của góc không dấu",
          explanation:
            "acos chỉ trả góc từ 0 tới π. Nó cho biết lệch bao nhiêu, nhưng chưa cho biết nên quay trái hay quay phải.",
        },
      ],
    },
    "p08-l04": {
      focus:
        "Tách vector từ tháp pháo tới mục tiêu thành phần song song với nòng súng và phần còn lại vuông góc với nòng.",
      expected:
        "Mũi tên xanh nằm trên trục nòng súng; đoạn đỏ nối đầu projection với mục tiêu. Hai phần cộng lại đúng targetOffset và dot của chúng gần bằng 0.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lấy khoảng cách có dấu dọc theo trục",
          explanation:
            "scalarProjection bằng dot(vector, unitAxis). Giá trị âm cho biết mục tiêu nằm phía sau hướng nòng.",
        },
        {
          title: "Biến scalar thành vector",
          explanation:
            "Nhân unitAxis với scalar projection để nhận một vector thực sự nằm trên hướng nòng súng.",
        },
        {
          title: "Lấy phần lệch còn lại",
          explanation:
            "rejection = vector − projection. Độ dài của rejection chính là khoảng cách vuông góc từ mục tiêu tới đường ngắm vô hạn.",
        },
      ],
    },
    "p08-l05": {
      focus:
        "Bổ sung dấu cho góc bằng cross product 2D, rồi viết rotateTowards để nòng súng quay theo tốc độ hữu hạn và delta time mà không vượt qua mục tiêu.",
      expected:
        "Nòng súng chọn đúng chiều quay ngắn nhất, không giật thẳng tới chuột và không rung khi gần chạm hướng đích. Space, phím lên/xuống và R hoạt động đúng.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc dấu của crossZ",
          explanation:
            "crossZ(from,to) dương nghĩa là to nằm ngược chiều kim đồng hồ so với from; âm nghĩa là quay theo chiều kim đồng hồ.",
        },
        {
          title: "Lấy góc có dấu bằng atan2",
          explanation:
            "atan2(cross,dot) kết hợp cả độ lệch và phía của mục tiêu, trả góc ngắn nhất trong [-π,π].",
        },
        {
          title: "Giới hạn bước quay",
          explanation:
            "maximumStep = turnSpeed×deltaTime. Clamp sai số góc vào [-maximumStep,maximumStep] giúp giữ tốc độ và tự dừng đúng tại mục tiêu.",
        },
      ],
    },
    "p08-l06": {
      focus:
        "Dùng normalized dot để kiểm tra vùng khóa, hoàn thiện các điều khiển và xác nhận mọi bất biến toán học bằng CTest cùng bản final.",
      expected:
        "Hai cạnh vùng khóa đi theo nòng súng; mục tiêu đổi xanh đúng khi angleError không vượt halfViewAngle. Tất cả tests qua ở Debug và Release, bản final chạy đủ pause/reset/resize.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So cosine thay vì gọi acos mỗi frame",
          explanation:
            "Trong khoảng [0,π], góc càng nhỏ thì cosine càng lớn. Vì vậy `cosineBetween >= cos(halfAngle)` tương đương mục tiêu nằm trong cone.",
        },
        {
          title: "Chặn tham số vùng nhìn",
          explanation:
            "halfAngle được giữ trong [0,π]; zero vector và giá trị không hữu hạn đều bị từ chối thay vì vô tình khóa mục tiêu.",
        },
        {
          title: "Kiểm tra các đẳng thức cấu trúc",
          explanation:
            "Tests không chỉ so vài ảnh mẫu: projection+rejection phải khôi phục vector, hai phần phải vuông góc và mỗi bước quay phải tuân thủ giới hạn.",
        },
        {
          title: "Chạy lại bản hoàn chỉnh",
          explanation:
            "Sau CTest, build target project_8_final ở cả Debug và Release rồi kiểm tra chuột, phím, pause, reset và resize trực tiếp.",
        },
      ],
    },
  },
  references: {
    "p08-l01": [
      {
        label: "SDL_MouseMotionEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_MouseMotionEvent",
        kind: "SDL API",
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
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l02": [
      {
        label: "Dot product",
        href: "/glossary#dot-product",
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
    "p08-l03": [
      {
        label: "Dot product",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
      {
        label: "Angle between",
        href: "/glossary#angle-between",
        kind: "Thuật ngữ",
      },
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l04": [
      {
        label: "Vector projection",
        href: "/glossary#vector-projection",
        kind: "Thuật ngữ",
      },
      {
        label: "Dot product",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
      {
        label: "Zero vector",
        href: "/glossary#zero-vector",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l05": [
      {
        label: "SDL_GetTicks",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicks",
        kind: "SDL API",
      },
      {
        label: "2D cross product",
        href: "/glossary#cross-product-2d",
        kind: "Thuật ngữ",
      },
      {
        label: "atan2",
        href: "/glossary#atan2",
        kind: "Thuật ngữ",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "View cone",
        href: "/glossary#view-cone",
        kind: "Thuật ngữ",
      },
      {
        label: "Dot product",
        href: "/glossary#dot-product",
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
