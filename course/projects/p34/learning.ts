import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p34-l01": {
      focus:
        "Khởi động bộ khung SDL/OpenGL đã biết, đặt camera, mô hình và tùy chọn hiển thị vào một ViewerScene không chứa tài nguyên backend.",
      expected:
        "RendererKind là biến riêng. Cả CPU lẫn GPU chỉ đọc const ViewerScene&, không tự cập nhật camera.",
      files: [
        "include/viewer-bootstrap.hpp",
        "include/viewer-scene.hpp",
        "include/pipeline.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy bộ khung trước",
          explanation:
            "Starter giữ context/loader từ Project 33. Chạy --smoke để kiểm đường khởi tạo/thoát trước khi thêm geometry.",
        },
        {
          title: "Một nơi giữ tư thế",
          explanation:
            "ViewerState giữ cách điều khiển đã quen ở Project 21; ViewerScene thêm projection, pan target, ánh sáng và model.",
        },
        {
          title: "Tách backend khỏi scene",
          explanation:
            "RendererKind là biến riêng. Cả CPU lẫn GPU chỉ đọc const ViewerScene&, không tự cập nhật camera.",
        },
      ],
    },
    "p34-l02": {
      focus:
        "Dùng nguyên loader và dataset Project 21; chuẩn hóa mesh, tạo normal phẳng và tách vertex tại cạnh cứng để CPU/GPU đọc cùng dữ liệu.",
      expected:
        "Khóa position+normal xác định vertex. Hai mặt có normal khác nhau không thể dùng chung một vertex dù cùng vị trí.",
      files: [
        "include/viewer-mesh.hpp",
        "include/obj21/obj-parser.hpp",
        "include/obj21/normalize.hpp",
      ],
      steps: [
        {
          title: "Nạp dữ liệu đã biết",
          explanation:
            "Bốn header obj21 và ba dataset được giữ nguyên ngữ nghĩa từ Project 21. Lỗi có chẩn đoán, không biến thành index không hợp lệ.",
        },
        {
          title: "Chuẩn hóa và tạo normal",
          explanation:
            "Giữ đúng tỉ lệ, đưa tâm về gốc và cạnh dài nhất về 2. Mỗi triangle tạo normal bằng cross product.",
        },
        {
          title: "Chia sẻ vertex đúng chỗ",
          explanation:
            "Khóa position+normal xác định vertex. Hai mặt có normal khác nhau không thể dùng chung một vertex dù cùng vị trí.",
        },
      ],
    },
    "p34-l03": {
      focus:
        "Nối indexed mesh với transform, clipping sáu mặt, rasterizer và Z-buffer; texture presenter chỉ mang ảnh đã vẽ lên cửa sổ.",
      expected:
        "Texture upload nằm sau CPU render. Presenter không nhận mesh và không quyết định mặt nào che mặt nào.",
      files: ["include/viewer-cpu.hpp", "include/pipeline.hpp", "include/gpu_renderer.hpp"],
      steps: [
        {
          title: "Transform rồi clip",
          explanation:
            "Tính clip coordinates một lần mỗi vertex; cắt tam giác theo sáu mặt trước khi chia w.",
        },
        {
          title: "Ghi pixel và depth",
          explanation:
            "Lấy mẫu ở tâm pixel, dùng top-left coverage và LESS; depth tắt cũng không ghi vào depth array.",
        },
        {
          title: "Present ảnh hoàn chỉnh",
          explanation:
            "Texture upload nằm sau CPU render. Presenter không nhận mesh và không quyết định mặt nào che mặt nào.",
        },
      ],
    },
    "p34-l04": {
      focus:
        "Định nghĩa position/normal attributes, upload VBO/EBO một lần, giữ EBO trong VAO và vẽ đủ cả mesh 2.976 tam giác.",
      expected:
        "DrawElements nhận số index, không phải số triangle. Mesh lớn đi qua đúng nhánh của rocket và cube.",
      files: ["include/viewer-gpu.hpp", "include/gl_api.hpp", "include/viewer-backends.hpp"],
      steps: [
        {
          title: "Upload một lần",
          explanation:
            "VBO chứa MeshVertex, EBO chứa uint32_t indices; init không được đặt trong vòng lặp frame.",
        },
        {
          title: "Giải thích layout",
          explanation:
            "Location 0 đọc position, location 1 đọc normal. sizeof và offsetof thay cho offset đoán bằng mắt.",
        },
        {
          title: "Draw theo indices",
          explanation:
            "DrawElements nhận số index, không phải số triangle. Mesh lớn đi qua đúng nhánh của rocket và cube.",
        },
      ],
    },
    "p34-l05": {
      focus:
        "Quy định hệ trục, thứ tự xoay, camera orbit/pan/zoom và projection; truyền đúng 16 float cho C++ lẫn GLSL.",
      expected:
        "Theo một vertex qua clip/NDC/screen/depth để phân biệt lỗi matrix, divide và viewport.",
      files: ["include/viewer-scene.hpp", "include/pipeline.hpp", "include/viewer-gpu.hpp"],
      steps: [
        {
          title: "Công bố hệ trục",
          explanation:
            "Camera tay phải từ +Z nhìn về -Z; project này dùng OpenGL clip-depth chứ không giữ quy ước camera +Z của viewer cũ.",
        },
        {
          title: "Một bộ matrix",
          explanation:
            "Model xoay Y rồi X, camera nhìn vào pan target; cả hai backend nhận cùng P×V×M.",
        },
        {
          title: "Kiểm trước khi nhìn ảnh",
          explanation:
            "Theo một vertex qua clip/NDC/screen/depth để phân biệt lỗi matrix, divide và viewport.",
        },
      ],
    },
    "p34-l06": {
      focus:
        "Cắt trước perspective divide, ánh xạ depth về [0,1], thống nhất LESS và CCW; chủ động tắt depth/culling để tìm lỗi.",
      expected:
        "CCW ở NDC thành area âm khi CPU screen đảo Y. Fixture hai winding cho biết culling có đúng không.",
      files: ["include/viewer-cpu.hpp", "include/viewer-fixtures.hpp", "include/viewer-gpu.hpp"],
      steps: [
        {
          title: "Cắt trước chia w",
          explanation:
            "Tam giác chạm near plane không được bị bỏ nguyên chiếc hoặc kéo dài ra vô hạn.",
        },
        {
          title: "Cùng clear và compare",
          explanation:
            "Depth clear 1, LESS, window depth [0,1] ở hai phía. Đảo thứ tự triangle giúp kiểm depth thực sự hoạt động.",
        },
        {
          title: "Phân biệt winding với depth",
          explanation:
            "CCW ở NDC thành area âm khi CPU screen đảo Y. Fixture hai winding cho biết culling có đúng không.",
        },
      ],
    },
    "p34-l07": {
      focus:
        "Dùng cùng normal và ánh sáng Lambert, thêm wireframe, normal vectors và lưới; phân biệt chế độ debug với ảnh dùng để đối chiếu.",
      expected:
        "Line rasterization có thể khác phần cứng; phép đối chiếu ảnh cơ sở tắt grid/wire/normals, không lờ đi sai khác trong ảnh solid.",
      files: ["include/viewer-cpu.hpp", "include/viewer-gpu.hpp"],
      steps: [
        {
          title: "Dùng cùng ánh sáng",
          explanation:
            "Normal phẳng và world-space light tạo Lambert với ambient 0,22/diffuse 0,78 ở C++ và GLSL.",
        },
        {
          title: "Giữ debug như một chế độ xem",
          explanation:
            "Wireframe và normal vectors không phải vật trang trí: chúng giúp tìm index, mặt lộn và normal sai.",
        },
        {
          title: "Biết giới hạn phép so",
          explanation:
            "Line rasterization có thể khác phần cứng; phép đối chiếu ảnh cơ sở tắt grid/wire/normals, không lờ đi sai khác trong ảnh solid.",
        },
      ],
    },
    "p34-l08": {
      focus:
        "Đặt input/update trước render, giữ nguyên scene khi F1/F2, xử lý capture/focus/resize và cache tài nguyên qua nhiều lần đổi backend.",
      expected:
        "Input dùng logical size, framebuffer dùng physical pixels. Viewport model chừa vùng stats phía dưới và có aspect riêng.",
      files: ["include/viewer-application.hpp", "include/viewer-backends.hpp"],
      steps: [
        {
          title: "Đọc input một lần",
          explanation:
            "Sửa scene trước render; F1/F2 chỉ thay enum. Pause/step và đổi mesh không tạo application thứ hai.",
        },
        {
          title: "Giữ thao tác an toàn",
          explanation:
            "Capture có mouse ID/nút bắt đầu; Escape hủy kéo, mất focus nhả capture và pause.",
        },
        {
          title: "Resize đúng chỗ",
          explanation:
            "Input dùng logical size, framebuffer dùng physical pixels. Viewport model chừa vùng stats phía dưới và có aspect riêng.",
        },
      ],
    },
    "p34-l09": {
      focus:
        "Dùng CPU tests, transform feedback, so ảnh/depth và benchmark hữu hạn; đọc đúng các cột thời gian và tải toàn bộ source chạy độc lập.",
      expected:
        "Warm-up, scene, resolution, VSync và glFinish được ghi công khai. Thiếu GPU timer thì ghi unavailable, không suy từ CPU submit.",
      files: [
        "include/viewer-validation.hpp",
        "include/viewer-comparison.hpp",
        "include/viewer-benchmark.hpp",
        "include/viewer-timing.hpp",
        "include/viewer-hud.hpp",
        "tests/tests.cpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tách các lớp bằng chứng",
          explanation:
            "CTest chỉ CPU; --verify cần context/driver; thao tác desktop và benchmark phải ghi riêng.",
        },
        {
          title: "So có giới hạn rõ",
          explanation:
            "Transform feedback đọc gl_Position thực; so coverage/color/depth ngoài dải cạnh cố định và kiểm vòng đời các tài nguyên.",
        },
        {
          title: "Đọc đúng số đo",
          explanation:
            "Warm-up, scene, resolution, VSync và glFinish được ghi công khai. Thiếu GPU timer thì ghi unavailable, không suy từ CPU submit.",
        },
      ],
    },
  },
  references: {
    "p34-l01": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Renderer backend",
        href: "/glossary#renderer-backend",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l02": [
      {
        label: "Indexed draw",
        href: "/glossary#indexed-draw",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l03": [
      {
        label: "Z-buffer",
        href: "/glossary#depth-buffer",
        kind: "Thuật ngữ",
      },
      {
        label: "Texture upload",
        href: "/glossary#texture-upload",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l04": [
      {
        label: "glDrawElements",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawElements.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p34-l05": [
      {
        label: "glUniformMatrix",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glUniform.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "NDC",
        href: "/glossary#ndc",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l06": [
      {
        label: "glDepthFunc",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDepthFunc.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "glFrontFace",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glFrontFace.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p34-l07": [
      {
        label: "Face culling",
        href: "/glossary#face-culling",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l08": [
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p34-l09": [
      {
        label: "glBeginQuery",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glBeginQuery.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "glTransformFeedbackVaryings",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTransformFeedbackVaryings.xhtml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
