import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/raymarch_math.hpp",
  "include/gl_api.hpp",
  "include/raymarch_renderer.hpp",
  "shaders/raymarch.vert",
  "shaders/raymarch.frag",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p36-l01": {
      focus:
        "Tạo một draw path chỉ phát fragments: fullscreen triangle từ gl_VertexID, framebuffer resolution và coordinate visualization.",
      expected:
        "Checkpoint 1 phủ kín viewport bằng một triangle không VBO/EBO; grid/UV không méo khi resize hoặc high-DPI.",
      files,
      steps: [
        {
          title: "Sinh ba clip-space vertices",
          explanation:
            "Vertex shader tra ba vị trí bằng gl_VertexID. Triangle lớn vượt viewport để không tạo đường chéo precision seam giữa hai triangles.",
        },
        {
          title: "Chỉ giữ một VAO rỗng",
          explanation:
            "OpenGL Core cần VAO bound, nhưng project không upload object vertex. glDrawArrays phát đúng ba vertex.",
        },
        {
          title: "Kiểm coordinate trước ray",
          explanation:
            "Fragment shader dùng gl_FragCoord/uResolution để vẽ lưới. Nếu bước này sai, mọi camera ray sau đều sai theo.",
        },
      ],
    },
    "p36-l02": {
      focus:
        "Đổi pixel thành ray chuẩn hóa bằng camera forward/right/up, aspect ratio và vertical field of view.",
      expected:
        "Center ray đi qua target; corner rays hữu hạn, khác hướng và giữ length gần một ở mọi framebuffer size.",
      files,
      steps: [
        {
          title: "Đưa pixel về plane có đơn vị theo chiều cao",
          explanation:
            "Công thức `(2*fragCoord-resolution)/resolution.y` giữ aspect trong trục X thay vì kéo giãn scene theo cửa sổ.",
        },
        {
          title: "Dựng basis có handedness rõ",
          explanation:
            "Forward nhìn target; right là cross(forward, worldUp); up được tính lại từ right và forward để basis trực giao.",
        },
        {
          title: "Normalize sau khi cộng offset",
          explanation:
            "Ray direction phải là vector đơn vị vì sphere tracing cộng distance theo world units.",
        },
      ],
    },
    "p36-l03": {
      focus:
        "Hiểu Signed Distance Function qua sdSphere và kiểm dấu/độ lớn bằng lát cắt trước khi viết vòng march.",
      expected:
        "Center âm radius, surface gần zero, outside dương và Canvas cho phép kéo sample point đọc đúng ba vùng.",
      files,
      steps: [
        {
          title: "Bắt đầu từ khoảng cách tới tâm",
          explanation:
            "`length(point-center)` là bán kính của sample; trừ radius dịch zero-set về đúng bề mặt sphere.",
        },
        {
          title: "Giữ giá trị thay vì đổi thành bool",
          explanation:
            "Dấu dùng cho inside/outside, còn độ lớn là bước an toàn mà sphere tracing cần ở bài sau.",
        },
        {
          title: "Khóa ba probe có tên",
          explanation:
            "CTest kiểm ba điểm ở tâm, trên bề mặt và bên ngoài. Hình gradient giúp quan sát nhanh, nhưng kết quả số từ các điểm kiểm tra mới là căn cứ xác nhận hàm SDF đúng.",
        },
      ],
    },
    "p36-l04": {
      focus:
        "Xây sphere-tracing loop có result rõ và ba guard: hit epsilon, maximum distance, maximum steps.",
      expected:
        "Ray chính diện hit sphere, ray đi qua room opening miss hữu hạn và title/debug báo đúng step budget.",
      files,
      steps: [
        {
          title: "Tích lũy traveled",
          explanation:
            "Mỗi vòng sample tại origin + direction*traveled rồi cộng scene distance; không dùng fixed step tùy ý.",
        },
        {
          title: "Trả một result đủ dữ liệu",
          explanation:
            "Hit, traveled, steps, materialId và position đi cùng nhau để shading/debug không chạy lại một loop khác.",
        },
        {
          title: "Để miss là kết quả hợp lệ",
          explanation:
            "Vượt distance hoặc step budget trả hit=false. Miss không phải exception và không được đổi thành hit nền giả.",
        },
      ],
    },
    "p36-l05": {
      focus:
        "Ước lượng gradient của scene SDF bằng central differences rồi dùng normal đó trong Lambert lighting.",
      expected:
        "Sphere normal hướng ra ngoài, dài gần một; beauty view có ambient/diffuse nhưng không đổi hit result.",
      files,
      steps: [
        {
          title: "Lấy hai sample cho mỗi trục",
          explanation:
            "Hiệu `d(p+e)-d(p-e)` xấp xỉ đạo hàm và giảm bias so với chỉ sample một phía.",
        },
        {
          title: "Normalize gradient",
          explanation:
            "Độ lớn gradient số phụ thuộc epsilon; Lambert chỉ cần hướng nên normal phải được normalize.",
        },
        {
          title: "Giữ ambient tách diffuse",
          explanation:
            "Ambient nhỏ giúp đọc mặt quay khỏi đèn; diffuse dùng max(dot(normal,lightDirection),0).",
        },
      ],
    },
    "p36-l06": {
      focus:
        "Thêm sdBox và sdTorus bằng phép giảm bài toán, không thêm geometry resource hoặc draw call.",
      expected:
        "Box face và torus outer ring có distance gần zero; scene hiển thị đủ ba primitive từ cùng fullscreen pass.",
      files,
      steps: [
        {
          title: "Tách phần ngoài và trong box",
          explanation:
            "`q=abs(local)-halfSize`; length(max(q,0)) đo góc ngoài, min(maxComponent(q),0) giữ dấu âm bên trong.",
        },
        {
          title: "Thu torus về một vòng tròn 2D",
          explanation:
            "Khoảng cách trong mặt XZ tới major radius trở thành một trục; Y là trục còn lại, rồi trừ minor radius.",
        },
        {
          title: "Đo đúng zero-set",
          explanation:
            "CTest dùng điểm trên box face và torus outer ring, không chỉ kiểm một ảnh có hình giống box/torus.",
        },
      ],
    },
    "p36-l07": {
      focus:
        "Ghép primitive bằng nearest sample giữ distance/materialId cùng nhau và thêm room planes có ID riêng.",
      expected:
        "Sphere/box/torus/room giữ ID 1–4; checker chỉ áp dụng room và không ảnh hưởng distance winner.",
      files,
      steps: [
        {
          title: "Đóng cặp distance và material",
          explanation:
            "SceneSample tránh hai lần min tách biệt. Candidate thắng về distance mang materialId của chính nó.",
        },
        {
          title: "Thêm room bằng năm plane",
          explanation:
            "Sàn, trần, tường sau, tường trái và tường phải tạo thành căn phòng mở về phía camera. Mọi khoảng cách vẫn dùng cùng đơn vị trong world space.",
        },
        {
          title: "Tô màu sau hit",
          explanation:
            "Material mapping chỉ đọc ID đã chốt. Nó không gọi lại primitive tests hoặc dùng màu để đoán object.",
        },
      ],
    },
    "p36-l08": {
      focus:
        "Bắn shadow ray từ điểm vừa tìm được, tránh self-shadow bằng normal bias, rồi điều khiển hướng ray bằng orbit camera.",
      expected:
        "Visibility luôn trong [0,1], camera drag/zoom không self-shadow hoặc rời preset an toàn, reduced motion dừng đèn.",
      files,
      steps: [
        {
          title: "Bắt đầu ngoài bề mặt",
          explanation:
            "Origin dịch theo normal vài epsilon để shadow ray không lập tức hit chính bề mặt vừa tìm được.",
        },
        {
          title: "Giữ shadow loop hữu hạn",
          explanation:
            "Shadow có maximum steps và light distance riêng; clamp step nhỏ/lớn giữ tiến triển ổn định gần bề mặt.",
        },
        {
          title: "Camera chỉ đổi ray origin/basis",
          explanation:
            "Yaw, pitch, distance cập nhật uniforms; primitive centers và SDF không bị biến đổi theo camera.",
        },
      ],
    },
    "p36-l09": {
      focus:
        "Hoàn thiện các chế độ xem chẩn đoán, kiểm tra từng điều kiện có tên, hot reload an toàn và thứ tự giải phóng tài nguyên.",
      expected:
        "Bản final báo rõ từng phép kiểm tra đạt hay không, mọi chế độ debug dùng chung MarchResult, còn shader lỗi không thay thế program đang chạy tốt.",
      files,
      steps: [
        {
          title: "Debug cùng một result",
          explanation:
            "Steps/Hit/Normal đọc MarchResult của beauty path; không viết loop phụ chỉ để tạo ảnh chẩn đoán đẹp.",
        },
        {
          title: "Dùng bản CPU nhỏ để đối chiếu",
          explanation:
            "CTest kiểm camera ray, SDF, các điều kiện dừng, normal, material và miền shadow mà không cần mở OpenGL context.",
        },
        {
          title: "Dọn GL trước context",
          explanation:
            "Active/candidate program và fullscreen VAO bị xóa khi context còn current; pointer capture cũng được nhả khi reset/thoát.",
        },
      ],
    },
  },
  references: {
    "p36-l01": [
      {
        label: "gl_VertexID",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "glDrawArrays",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawArrays.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p36-l02": [
      {
        label: "GLSL cross",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/cross.xhtml",
        kind: "OpenGL API",
      },
      { label: "Camera ray", href: "/glossary#camera-ray", kind: "Thuật ngữ" },
    ],
    "p36-l03": [
      {
        label: "GLSL length",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/length.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "Signed Distance Function",
        href: "/glossary#signed-distance-function",
        kind: "Thuật ngữ",
      },
    ],
    "p36-l04": [
      { label: "Sphere tracing", href: "/glossary#sphere-tracing", kind: "Thuật ngữ" },
      { label: "Ray marching", href: "/glossary#ray-marching", kind: "Thuật ngữ" },
    ],
    "p36-l05": [
      { label: "SDF normal", href: "/glossary#sdf-normal", kind: "Thuật ngữ" },
      { label: "Lambert diffuse", href: "/glossary#lambert-diffuse", kind: "Thuật ngữ" },
    ],
    "p36-l06": [
      {
        label: "GLSL abs",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/abs.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "Signed Distance Function",
        href: "/glossary#signed-distance-function",
        kind: "Thuật ngữ",
      },
    ],
    "p36-l07": [
      { label: "Material ID", href: "/glossary#ray-march-material-id", kind: "Thuật ngữ" },
      { label: "Ray marching", href: "/glossary#ray-marching", kind: "Thuật ngữ" },
    ],
    "p36-l08": [
      { label: "Shadow ray", href: "/glossary#shadow-ray", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p36-l09": [
      { label: "GPU debug view", href: "/glossary#ray-march-debug-view", kind: "Thuật ngữ" },
      {
        label: "glDeleteProgram",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteProgram.xhtml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
