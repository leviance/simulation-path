import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p18-l01": {
      focus:
        "Dựng một cảnh chẩn đoán có hai góc nhìn và cho cùng Triangle3 đi qua near plane trước khi đưa bất kỳ công thức clipping nào vào code.",
      expected:
        "Mặt cắt bên trái cho thấy ba depth và near plane; viewport bên phải có thể so discard-whole với kết quả sẽ clip. A/D, drag, preset và reset đều sửa cùng một depthOffset.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ triangle trong camera space",
          explanation:
            "ClipVertex mang position XYZ và color. Z là khoảng cách theo hướng nhìn; chưa vertex nào được chia cho Z ở checkpoint đầu.",
        },
        {
          title: "Vẽ mặt cắt để nhìn thấy dữ liệu gây lỗi",
          explanation:
            "Mặt cắt dùng trục ngang là Z và trục dọc là X. Near plane thành một đường đứng nên ta nhìn ngay cạnh nào đang cắt qua half-space.",
        },
        {
          title: "Tạo một đối chứng sai nhưng an toàn",
          explanation:
            "Chế độ discard-whole không thực hiện phép chia nguy hiểm; nó bỏ cả triangle nếu có vertex lỗi. Hình biến mất sớm là bằng chứng ta cần clip primitive, không phải clamp kết quả.",
        },
      ],
    },
    "p18-l02": {
      focus:
        "Biểu diễn near plane bằng signed distance d=z−near và dùng một quy ước epsilon duy nhất cho inside, outside và on-plane.",
      expected:
        "A/B/C được tô theo phân loại; title bar báo inside/outside/onPlane. Preset on-plane giữ vertex nằm đúng biên thay vì lúc nhận lúc loại.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Biến phép so sánh thành một đại lượng có dấu",
          explanation:
            "d âm nghĩa là vertex nằm giữa camera và near plane; d dương là vùng được giữ. Giá trị d còn dùng để giải giao điểm ở bài sau.",
        },
        {
          title: "Xem on-plane là inside",
          explanation:
            "Điểm trên biên là geometry hợp lệ. Điều kiện d≥−epsilon tránh mất điểm vì sai số nhỏ sau nhiều phép biến đổi.",
        },
        {
          title: "Đếm để kiểm tra trước khi sửa topology",
          explanation:
            "NearPlaneCounts giúp preset nói rõ trường hợp 0, 1, 2 hay 3 vertex outside. Bước này chưa sinh vertex mới.",
        },
      ],
    },
    "p18-l03": {
      focus:
        "Giải điểm cắt giữa một segment có hai đầu khác phía và near plane, sau đó nội suy mọi thuộc tính bằng cùng tham số t.",
      expected:
        "Mỗi cạnh crossing có marker trắng đúng trên plane. Lab hiển thị t trong [0,1], position và RGB của giao điểm; di chuyển triangle không tạo NaN.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giải t từ riêng thành phần Z",
          explanation:
            "Trên segment start→end, z(t)=start.z+t(end.z−start.z). Đặt z(t)=near cho công thức trực tiếp và dễ test.",
        },
        {
          title: "Dùng lại t cho toàn bộ ClipVertex",
          explanation:
            "X, Y và ba channel màu phải nằm cùng một vị trí trên cạnh. Nội suy màu bằng t khác sẽ tạo một đường gãy màu ngay tại biên clip.",
        },
        {
          title: "Ghim Z về đúng plane",
          explanation:
            "Sau nội suy, code đặt result.position.z=near để loại phần dư số học rất nhỏ và tạo invariant rõ cho projection.",
        },
      ],
    },
    "p18-l04": {
      focus:
        "Duyệt ba cạnh có hướng bằng một bước Sutherland–Hodgman và xây output list có tối đa bốn ClipVertex theo đúng thứ tự biên.",
      expected:
        "All-inside giữ ba vertex; one-outside tạo bốn; two-outside tạo ba; all-outside tạo zero. Tiến từng cạnh cho thấy vertex nào được giữ hoặc giao điểm nào được thêm.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Bắt đầu cạnh đầu bằng previous=input.back",
          explanation:
            "Triangle là một vòng kín, nên cạnh C→A phải được xử lý như A→B và B→C. Khởi tạo previous bằng phần tử cuối tránh bỏ quên cạnh đóng vòng.",
        },
        {
          title: "Viết bốn chuyển trạng thái bằng ba nhánh",
          explanation:
            "Out→in thêm intersection rồi current; in→out chỉ thêm intersection; in→in thêm current; out→out không thêm gì.",
        },
        {
          title: "Giữ capacity bốn như một invariant",
          explanation:
            "Một triangle bị cắt bởi một plane chỉ có thể tăng từ ba lên tối đa bốn vertex. std::array làm giới hạn đó lộ rõ trong kiểu dữ liệu.",
        },
      ],
    },
    "p18-l05": {
      focus:
        "Chuyển output polygon lồi về định dạng triangle mà rasterizer đã hiểu bằng triangle fan neo tại vertex zero.",
      expected:
        "Polygon ba vertex tạo một triangle; polygon bốn vertex tạo hai triangle dùng chung đường chéo; polygon dưới ba vertex không tạo draw call.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ nguyên thứ tự polygon",
          explanation:
            "Clipper đã phát vertex theo thứ tự quanh biên. Fan (0,i,i+1) giữ winding đó và không cần sort theo góc.",
        },
        {
          title: "Tách topology khỏi rasterization",
          explanation:
            "TriangleBatch chỉ chứa tối đa hai Triangle3. Bước này chưa project và chưa tô pixel, nên count được test độc lập.",
        },
        {
          title: "Kiểm đường chéo chung",
          explanation:
            "Hai triangle của quad dùng chung cạnh 0→2. Top-left rule Project 16 sẽ giao pixel biên cho đúng một triangle khi rasterize.",
        },
      ],
    },
    "p18-l06": {
      focus:
        "Đưa từng output triangle qua projection guard, viewport transform và rasterizer top-left; giữ màu giao điểm đi xuyên suốt tới framebuffer.",
      expected:
        "Viewport chỉ nhận vertex z≥near và hiển thị liên tục phần polygon còn lại. coveredCount bằng callback count; không tọa độ screen nào trở thành NaN hoặc infinity.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Guard trước phép chia",
          explanation:
            "projectVertex trả optional rỗng nếu z<near. Đây là dây an toàn cuối; thuật toán đúng vẫn phải đưa toàn bộ output qua guard này.",
        },
        {
          title: "Project từng ClipVertex mới",
          explanation:
            "Giao điểm nằm trên near plane được project như vertex thật. Không dùng screen-space intersection vì đường thẳng sau perspective divide không còn nội suy theo cùng t camera-space.",
        },
        {
          title: "Tái dùng coverage và top-left rule",
          explanation:
            "Mỗi ScreenTriangle đi qua edge function tại pixel center. Hai triangle fan không tô đè đường chéo và callback nhận màu barycentric.",
        },
      ],
    },
    "p18-l07": {
      focus:
        "Ghép controls, sweep và telemetry, rồi khóa mọi trường hợp topology cùng giới hạn số học bằng CTest không mở SDL window.",
      expected:
        "Năm preset, A/D, drag, Space, N, V và R hoạt động sau resize. Sweep qua plane không nổ hình; CTest pass ở Debug lẫn Release.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Gom kết quả của một frame",
          explanation:
            "ClipResult giữ input counts, polygon và triangle batch. Title bar lấy số liệu từ chính output thuật toán thay vì tự suy đoán lại.",
        },
        {
          title: "Đo violation thay vì chỉ nhìn hình",
          explanation:
            "maximumNearPlaneViolation phải không vượt 10⁻⁹. isFinite kiểm cả position lẫn color trước khi projection nhận dữ liệu.",
        },
        {
          title: "Chạy đủ bốn topology và trường hợp grazing",
          explanation:
            "CTest kiểm 3/4/3/0 polygon vertex, 1/2/1/0 triangle, vertex on-plane không bị nhân đôi và projection từ chối input chưa clip.",
        },
        {
          title: "So trực tiếp với discard-whole",
          explanation:
            "Phím V giữ nguyên scene và chỉ đổi cách xử lý primitive. Sự khác nhau trên viewport giải thích rõ lợi ích của clipping hơn một hình chụp tĩnh.",
        },
      ],
    },
  },
  references: {
    "p18-l01": [
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
    ],
    "p18-l02": [
      { label: "Half-space", href: "/glossary#half-space", kind: "Thuật ngữ" },
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Epsilon", href: "/glossary#epsilon", kind: "Thuật ngữ" },
    ],
    "p18-l03": [
      {
        label: "Linear interpolation",
        href: "/glossary#linear-interpolation",
        kind: "Thuật ngữ",
      },
      {
        label: "Segment–plane intersection",
        href: "/glossary#segment-plane-intersection",
        kind: "Thuật ngữ",
      },
      { label: "Vertex attribute", href: "/glossary#vertex-attribute", kind: "Thuật ngữ" },
    ],
    "p18-l04": [
      {
        label: "Sutherland–Hodgman clipping",
        href: "/glossary#sutherland-hodgman",
        kind: "Thuật ngữ",
      },
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
      { label: "Half-space", href: "/glossary#half-space", kind: "Thuật ngữ" },
    ],
    "p18-l05": [
      { label: "Triangle fan", href: "/glossary#triangle-fan", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
    ],
    "p18-l06": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
    ],
    "p18-l07": [
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
