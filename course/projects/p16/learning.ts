import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p16-l01": {
      focus:
        "Dựng một chương trình nhìn thấy và sửa được ba screen vertex: framebuffer, wireframe, handle A/B/C, drag và reset đều phải chạy trước rasterizer.",
      expected:
        "Cửa sổ hiện đường viền tam giác và ba handle màu. Kéo một handle chỉ đổi vertex tương ứng; chưa có pixel fill nên không lẫn lỗi input với lỗi coverage.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt đầu vào là screen space",
          explanation:
            "Triangle2 chỉ giữ ba Vec2 theo đơn vị pixel. Project 15 đã chịu trách nhiệm đưa vertex 3D tới đây; bài này cố ý tách rasterizer khỏi camera và matrix.",
        },
        {
          title: "Vẽ đường viền bằng primitive đã biết",
          explanation:
            "Ba lời gọi drawLine xác nhận thứ tự A→B→C, framebuffer và phép resize. Wireframe là dụng cụ debug, không phải thuật toán tô kín.",
        },
        {
          title: "Cho người học sửa dữ liệu trực tiếp",
          explanation:
            "nearestVertex chọn handle trong bán kính rõ ràng; mouse capture giữ thao tác kéo; R tạo lại triangle theo kích thước cửa sổ hiện tại.",
        },
      ],
    },
    "p16-l02": {
      focus:
        "Từ min/max liên tục của ba vertex, tạo IntRect candidate theo chỉ số pixel và clamp nó vào framebuffer.",
      expected:
        "Bounding box màu vàng ôm triangle. Title bar báo đúng số candidate; preset hoặc vertex nằm ngoài viewport không gây putPixel vượt biên.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Phân biệt tọa độ vertex và chỉ số pixel",
          explanation:
            "Minimum dùng floor; maximum dùng ceil rồi trừ 1 vì pixel cuối có tâm ở max−0.5. IntRect giữ hai đầu inclusive để vòng for dễ đọc.",
        },
        {
          title: "Clamp trước khi nhân số hàng và cột",
          explanation:
            "Bounds được ép vào [0,width−1] và [0,height−1]. Sau đó candidatePixelCount mới tính columns×rows bằng size_t.",
        },
        {
          title: "Giữ bounds như một phép tối ưu có test",
          explanation:
            "Mọi pixel ngoài bounds chắc chắn ở ngoài triangle; mọi pixel có khả năng được phủ vẫn nằm trong bounds. Test triangle cắt mép khóa cả hai vế.",
        },
      ],
    },
    "p16-l03": {
      focus:
        "Viết orient2D, dùng signed double area để phân loại winding và đổi triangle âm về một quy ước dương trước khi xét bên trong.",
      expected:
        "Click một sample để đọc ba edge sign. Đổi B/C làm area đổi dấu nhưng normalizePositiveWinding phục hồi cùng một coverage ở bài sau; ba điểm thẳng hàng được báo degenerate.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc edge function như diện tích có dấu",
          explanation:
            "orient2D(A,B,P) là cross product 2D của AB và AP. Zero nghĩa là P nằm trên đường AB; dấu cho biết P thuộc half-plane nào.",
        },
        {
          title: "Nhớ rằng trục Y màn hình đi xuống",
          explanation:
            "Với dữ liệu screen space, area số dương nhìn bằng mắt thường giống chiều kim đồng hồ. Code gọi Positive/Negative theo dấu số để tránh gán nhãn hình học sai quy ước.",
        },
        {
          title: "Xử lý degenerate trước mọi phép chia",
          explanation:
            "Khi |area| rất nhỏ, ba đỉnh gần thẳng hàng. Rasterizer dừng với coveredCount=0 thay vì tạo barycentric weight vô hạn.",
        },
      ],
    },
    "p16-l04": {
      focus:
        "Đặt sample ở tâm pixel, tính ba edge value và chỉ nhận khi sample nằm trong cả ba half-plane của triangle đã chuẩn hóa.",
      expected:
        "Marker xanh khi tâm pixel nằm trong triangle và đỏ khi ở ngoài. Title bar cho thấy (x+0.5,y+0.5), ba edge value và quyết định coverage.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn đúng điểm đại diện cho pixel",
          explanation:
            "Pixel có diện tích, nhưng rasterizer một mẫu quy ước điểm quyết định ở giữa ô. Dùng góc (x,y) sẽ dịch biên nửa pixel và gây kết quả bất đối xứng.",
        },
        {
          title: "Yêu cầu đồng thời ba điều kiện",
          explanation:
            "Sau khi winding dương, sample nằm trong khi edgeAB, edgeBC và edgeCA đều không âm. Một cạnh âm là đủ loại pixel.",
        },
        {
          title: "Giữ lại dữ liệu giải thích",
          explanation:
            "CoverageSample không chỉ trả bool. Edge values và barycentric weights giúp lab, title bar và test nói rõ vì sao một pixel được chọn.",
        },
      ],
    },
    "p16-l05": {
      focus:
        "Bọc coverage test trong vòng lặp row-major qua bounding box và gọi shadePixel callback cho từng pixel được phủ.",
      expected:
        "Tam giác được tô kín bằng màu đơn. Title bar tách candidateCount, testedCount và coveredCount; kéo vertex cập nhật fill ngay mà không quét pixel ngoài bounds.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Duyệt y ngoài, x trong",
          explanation:
            "Thứ tự này khớp row-major framebuffer, dễ đọc và có locality tốt. Mỗi vòng tạo đúng pixelCenter rồi gọi sampleTriangle.",
        },
        {
          title: "Tách coverage khỏi shading",
          explanation:
            "rasterizeTriangle không biết màu hay layout framebuffer. Callback nhận x, y và barycentric weights; main quyết định viết pixel nào và bằng màu gì.",
        },
        {
          title: "Trả stats thay vì đoán từ hình",
          explanation:
            "candidateCount là kích thước bounds, testedCount hỗ trợ stepper, coveredCount bằng số lần callback chạy. Ba con số tạo invariant kiểm thử rõ ràng.",
        },
      ],
    },
    "p16-l06": {
      focus:
        "Định nghĩa top-left edge trong hệ Y-down và dùng rule nghiêm/ngang để hai triangle chung cạnh không cùng nhận một sample biên.",
      expected:
        "Preset 5 ghép hai triangle thành quad. Inclusive hiển thị pixel đỏ trên đường chéo và overlap>0; top-left giữ bề mặt kín nhưng overlap trở về 0.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nhìn ra lỗi của dấu ≥",
          explanation:
            "Nếu cả ba cạnh đều dùng >=0, sample nằm đúng cạnh chung được hai triangle nhận cùng lúc. Với màu đục khó thấy, nhưng blending hoặc depth update sẽ lộ overdraw.",
        },
        {
          title: "Giao quyền sở hữu bằng hướng cạnh",
          explanation:
            "Cạnh đi lên, hoặc cạnh ngang đi sang phải, được xem là top-left trong quy ước screen Y-down và winding dương của project. Edge zero chỉ được nhận khi cạnh có nhãn đó.",
        },
        {
          title: "Kiểm bằng cặp triangle thật",
          explanation:
            "Coverage buffer đếm số triangle ghi mỗi pixel. Test chọn một sample đúng đường chéo và yêu cầu inclusive=2, top-left=1.",
        },
      ],
    },
    "p16-l07": {
      focus:
        "Chuẩn hóa ba edge đối diện thành barycentric weights, nội suy RGB và hoàn thiện preset/pause/single-step/validation.",
      expected:
        "Mỗi vertex giữ màu đỏ, xanh lá hoặc xanh dương; màu đổi mượt ở giữa. Space dừng quét, N tiến một candidate, Up/Down đổi 100 bước và C chuyển solid/barycentric.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Ghép đúng weight với vertex đối diện",
          explanation:
            "Weight A lấy edge BC/area, weight B lấy CA/area và weight C lấy AB/area. Tại A, edge BC bằng toàn area nên weight A=1.",
        },
        {
          title: "Nội suy từng channel bằng cùng weights",
          explanation:
            "Color = wA×colorA + wB×colorB + wC×colorC. Clamp và round chỉ xảy ra khi đổi kết quả double về byte framebuffer.",
        },
        {
          title: "Dùng candidateLimit để soi vòng lặp",
          explanation:
            "Pause đặt limit về 0; N tăng một. Rasterizer vẫn biết tổng candidate nhưng dừng sau testedCount, nên người học thấy thứ tự row-major mà không tạo một thuật toán thứ hai.",
        },
        {
          title: "Khóa invariant trước Project 17",
          explanation:
            "CTest kiểm bounds, winding, center sampling, degenerate, callback count, shared-edge ownership, barycentric sum và color. Khi coverage ổn định, Project 17 mới thêm Z-buffer.",
        },
      ],
    },
  },
  references: {
    "p16-l01": [
      { label: "Screen space", href: "/glossary#screen-space", kind: "Thuật ngữ" },
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p16-l02": [
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
    ],
    "p16-l03": [
      { label: "Edge function", href: "/glossary#edge-function", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Degenerate triangle", href: "/glossary#degenerate-triangle", kind: "Thuật ngữ" },
    ],
    "p16-l04": [
      { label: "Pixel center", href: "/glossary#pixel-center", kind: "Thuật ngữ" },
      { label: "Coverage test", href: "/glossary#coverage-test", kind: "Thuật ngữ" },
      { label: "Half-plane", href: "/glossary#half-plane", kind: "Thuật ngữ" },
    ],
    "p16-l05": [
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
    ],
    "p16-l06": [
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
      { label: "Coverage test", href: "/glossary#coverage-test", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
    ],
    "p16-l07": [
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
