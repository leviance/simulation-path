import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p21-l01": {
      focus:
        "Mở OBJ như một text stream, đọc riêng record v và biến danh sách position thành point cloud có thể xoay trên framebuffer.",
      expected:
        "Rocket xuất hiện dưới dạng các điểm. Title bar báo đúng số dòng và vertex; comment, dòng trống hoặc record chưa hỗ trợ không tạo position rác.",
      files: ["include/lab.hpp", "src/main.cpp", "assets/low-poly-rocket.obj"],
      steps: [
        {
          title: "Đọc theo dòng thay vì theo token toàn file",
          explanation:
            "Mỗi vòng getline giữ lại line number để diagnostic sau này trỏ đúng nơi. istringstream chỉ xử lý nội dung của một record.",
        },
        {
          title: "Chỉ nhận record v hoàn chỉnh",
          explanation:
            "Ba tọa độ X/Y/Z phải đọc thành công và hữu hạn trước khi push vào positions; dòng sai được ghi diagnostic, không tạo Vec3 mặc định.",
        },
        {
          title: "Tạo output nhìn thấy ngay",
          explanation:
            "Point cloud dùng phép quay và projection quen thuộc, nhờ vậy người học biết file đã được đọc đúng trước khi parser face xuất hiện.",
        },
      ],
    },
    "p21-l02": {
      focus:
        "Đọc face triangle với position index dương, đổi từ quy ước 1-based của OBJ sang 0-based của std::vector và vẽ wireframe.",
      expected:
        "Các điểm rời được nối thành rocket wireframe. Index 1 trỏ positions[0]; index 0 hoặc lớn hơn số vertex tạo diagnostic theo dòng.",
      files: ["include/lab.hpp", "src/main.cpp", "assets/low-poly-rocket.obj"],
      steps: [
        {
          title: "Thu đủ corner của một face",
          explanation:
            "Parser đọc token tới hết dòng thay vì giả định luôn có đúng ba giá trị. Checkpoint này chỉ chấp nhận ba corner nhưng đã giữ cấu trúc để mở rộng.",
        },
        {
          title: "Đổi index tại biên parser",
          explanation:
            "Hàm resolve trả std::optional<size_t>; code phía sau chỉ nhìn 0-based index hợp lệ và không cần nhớ quy ước của file.",
        },
        {
          title: "Dựng indexed wireframe",
          explanation:
            "Mỗi ObjTriangle tham chiếu ba position đã tồn tại. Vòng render project position một lần rồi nối ba cạnh theo index.",
        },
      ],
    },
    "p21-l03": {
      focus:
        "Tách position field khỏi face token có slash và giải negative index tương đối với số position tại chính dòng face.",
      expected:
        "Các preset v/vt/vn, v//vn và negative đều tạo cùng geometry; token thiếu position, index 0 hoặc index ngoài mảng bị từ chối rõ ràng.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Cắt token tại slash đầu tiên",
          explanation:
            "Project 21 chưa dùng UV/normal trong file, nhưng vẫn chấp nhận cú pháp chứa chúng bằng cách parse riêng phần position trước slash.",
        },
        {
          title: "Tách hai công thức index",
          explanation:
            "Index dương dùng raw−1; index âm dùng positionCount+raw. Hai nhánh đều kiểm phạm vi trước khi đổi sang size_t.",
        },
        {
          title: "Khóa case khó bằng test nhỏ",
          explanation:
            "CTest đưa nhiều token khác nhau vào cùng resolver và kiểm index kết quả, thay vì chỉ hy vọng asset mẫu vô tình bao phủ đủ cú pháp.",
        },
      ],
    },
    "p21-l04": {
      focus:
        "Triangulate polygon lồi bằng fan (v0, vi, vi+1), giữ winding, source face và source line trên mọi triangle sinh ra.",
      expected:
        "Triangle tạo 1 triangle, quad tạo 2 và pentagon tạo 3. Canvas tô lần lượt từng fan triangle mà không đổi anchor v0.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Parse toàn bộ corner trước",
          explanation:
            "Một face chỉ được triangulate sau khi mọi token đã resolve. Nếu một corner sai, cả face bị bỏ để không sinh nửa geometry hợp lệ nửa geometry lỗi.",
        },
        {
          title: "Giữ corner đầu làm anchor",
          explanation:
            "Vòng lặp i=1..N−2 sinh (0,i,i+1). Công thức tạo đúng N−2 triangle và giữ thứ tự corner ban đầu.",
        },
        {
          title: "Mang metadata sang triangle",
          explanation:
            "sourceFace và sourceLine giúp inspector/test quay ngược từ fragment về đúng record f đã sinh ra nó.",
        },
      ],
    },
    "p21-l05": {
      focus:
        "Tính axis-aligned bounds, lấy center và uniform scale rồi biến đổi toàn bộ position sang không gian model chuẩn.",
      expected:
        "Dù preset rất nhỏ, rất lớn hoặc lệch khỏi origin, model sau normalize vẫn nằm quanh origin với cạnh bounds lớn nhất bằng 2.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Khởi tạo bounds từ vertex thật",
          explanation:
            "Min/max bắt đầu bằng position đầu tiên, tránh giá trị 0 giả làm bounds sai khi toàn bộ model nằm cùng một phía origin.",
        },
        {
          title: "Dùng một scale cho cả ba trục",
          explanation:
            "Scale 2/maxExtent áp dụng lên X/Y/Z như nhau. Model vừa khung mà tỷ lệ hình học không bị kéo méo.",
        },
        {
          title: "Xử lý mesh rỗng hoặc phẳng thành điểm",
          explanation:
            "normalizeMesh trả false khi không có position hoặc maxExtent gần zero, thay vì chia cho zero rồi đưa NaN vào renderer.",
        },
      ],
    },
    "p21-l06": {
      focus:
        "Tính face normal từ hai cạnh sau model transform, dùng nó cho back-face culling và Lambert intensity trước khi rasterize.",
      expected:
        "Mặt quay về nguồn sáng sáng hơn; đảo winding làm normal đổi hướng và trạng thái culling đổi theo. Triangle suy biến bị đếm rồi bỏ qua.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Cross product theo đúng winding",
          explanation:
            "normal=normalize(cross(B−A,C−A)). Đổi B và C đảo dấu normal, vì vậy parser không được tự sắp lại corner.",
        },
        {
          title: "Cull trong camera space",
          explanation:
            "Dot giữa normal và vector từ camera tới centroid quyết định mặt quay lưng trước projection; không dùng screen area để đoán lighting.",
        },
        {
          title: "Tách ambient và diffuse",
          explanation:
            "Intensity=ambient+(1−ambient)·max(0,dot(N,L)); clamp trước khi đổi sang byte màu.",
        },
      ],
    },
    "p21-l07": {
      focus:
        "Đưa mọi source triangle qua camera transform, culling, near clipping, projection, top-left rasterization và Z-buffer trong một renderMesh.",
      expected:
        "Solid rocket không nổ hình khi tiến sát camera; fragment xa bị reject và đảo triangle order không đổi toàn bộ color/depth output.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Clip trước khi project",
          explanation:
            "Sutherland–Hodgman giữ mọi output z≥near rồi triangle fan có thể tạo 0, 1 hoặc 2 triangle an toàn để project.",
        },
        {
          title: "Nội suy NDC depth tại pixel",
          explanation:
            "Rasterizer dùng cùng barycentric weights cho coverage và depth; fragment chỉ ghi color sau khi newDepth nhỏ hơn storedDepth.",
        },
        {
          title: "Đếm tại từng tầng pipeline",
          explanation:
            "Stats tách source, culled, clipped, rasterized, passed và rejected để một màn hình trống không còn là lỗi mơ hồ.",
        },
      ],
    },
    "p21-l08": {
      focus:
        "Hoàn thiện asset lookup, diagnostic, controls, resize và một bộ validation chạy parser lẫn renderer không cần SDL window.",
      expected:
        "Rocket OBJ load từ thư mục assets, title bar báo path và counts; CTest pass ở Debug/Release, còn preset lỗi trên Canvas chỉ báo lỗi chứ không crash.",
      files: ["include/lab.hpp", "src/main.cpp", "assets/low-poly-rocket.obj", "tests/tests.cpp"],
      steps: [
        {
          title: "Thử các asset path có giải thích",
          explanation:
            "Loader thử path cạnh executable và path khi chạy từ project root; nếu thất bại, thông báo liệt kê path thay vì thay mesh ngầm.",
        },
        {
          title: "Một state điều khiển, một renderer",
          explanation:
            "Drag, pause, step, wireframe, culling và reset chỉ đổi RenderOptions rồi gọi lại cùng pipeline; resize cấp phát lại cả color/depth.",
        },
        {
          title: "Validation có đối chứng âm",
          explanation:
            "Ngoài happy path, tests còn dùng index 0, out-of-range, face thiếu corner, mesh suy biến và render không Z-buffer để chứng minh phép kiểm thật sự bắt lỗi.",
        },
      ],
    },
  },
  references: {
    "p21-l01": [
      { label: "Wavefront OBJ", href: "/glossary#wavefront-obj", kind: "Thuật ngữ" },
      { label: "Point cloud", href: "/glossary#point-cloud", kind: "Thuật ngữ" },
      { label: "Input stream", href: "/glossary#input-stream", kind: "Thuật ngữ" },
    ],
    "p21-l02": [
      { label: "OBJ face index", href: "/glossary#obj-face-index", kind: "Thuật ngữ" },
      { label: "Indexed mesh", href: "/glossary#indexed-mesh", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p21-l03": [
      { label: "OBJ face token", href: "/glossary#obj-face-token", kind: "Thuật ngữ" },
      { label: "OBJ face index", href: "/glossary#obj-face-index", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p21-l04": [
      { label: "Triangle fan", href: "/glossary#triangle-fan", kind: "Thuật ngữ" },
      { label: "Winding", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Polygon", href: "/glossary#polygon", kind: "Thuật ngữ" },
    ],
    "p21-l05": [
      { label: "Mesh normalization", href: "/glossary#mesh-normalization", kind: "Thuật ngữ" },
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Uniform scale", href: "/glossary#uniform-scale", kind: "Thuật ngữ" },
    ],
    "p21-l06": [
      { label: "Face normal", href: "/glossary#face-normal", kind: "Thuật ngữ" },
      { label: "Lambert diffuse", href: "/glossary#lambert-diffuse", kind: "Thuật ngữ" },
      { label: "Back-face culling", href: "/glossary#back-face-culling", kind: "Thuật ngữ" },
    ],
    "p21-l07": [
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
    ],
    "p21-l08": [
      { label: "Diagnostic", href: "/glossary#diagnostic", kind: "Thuật ngữ" },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Wavefront OBJ", href: "/glossary#wavefront-obj", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
