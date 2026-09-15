import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/pipeline.hpp",
  "include/gl_api.hpp",
  "include/gpu_renderer.hpp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p34-l01": {
      focus:
        "Tách scene state khỏi backend state trước khi thêm cube, đồng thời giữ starter SDL/OpenGL có thể build và chạy.",
      expected:
        "`CubeScene` chỉ chứa angle/depth/culling; `RendererKind` là lựa chọn độc lập và đổi renderer không sửa scene.",
      files,
      steps: [
        {
          title: "Giữ foundation đã biết",
          explanation:
            "Context, function loader, error path và swap thuộc starter vì Project 33 đã giải thích chúng. Bài vẫn chỉ rõ file nào được giữ lại thay vì giấu trong framework.",
        },
        {
          title: "Đặt scene ở phía trên renderer",
          explanation:
            "CPU/GPU nhận `const CubeScene&`; không backend nào sở hữu angle hoặc tự cập nhật transform.",
        },
        {
          title: "Cho lựa chọn backend một kiểu riêng",
          explanation:
            "`RendererKind` không phải bool mơ hồ. Label F1/F2 và nhánh render đọc cùng enum.",
        },
      ],
    },
    "p34-l02": {
      focus:
        "Tạo một indexed cube có memory layout, index bounds và winding nhìn thấy được trước VBO/EBO.",
      expected:
        "Mesh có 24 vertices, 36 valid indices; mỗi mặt dùng bốn vertices cùng màu và hai CCW triangles.",
      files,
      steps: [
        {
          title: "Chọn 24 vertices có lý do",
          explanation:
            "Tám vị trí hình học không đủ khi mỗi mặt cần màu riêng. Tách vertex tại face seam nhưng vẫn tái sử dụng bốn vertices trong hai triangles của mặt.",
        },
        {
          title: "Khóa struct bằng compile-time checks",
          explanation:
            "Sáu float và `offsetof(red)` là contract chung cho CPU array, VBO và VAO attributes.",
        },
        {
          title: "Kiểm index trước OpenGL",
          explanation:
            "CTest bắt out-of-range và count sai bằng CPU; không đợi driver đọc nhầm memory trong draw call.",
        },
      ],
    },
    "p34-l03": {
      focus:
        "Nối shared mesh với CPU transform/raster/depth path và giữ OpenGL texture chỉ là presenter.",
      expected:
        "CPU framebuffer dùng cùng MVP/index order, tạo deterministic RGBA8 và được upload nguyên vẹn lên full-window quad.",
      files,
      steps: [
        {
          title: "Transform mỗi vertex một lần",
          explanation:
            "MVP tạo clip coordinate, perspective divide tạo NDC, rồi CPU screen mapping đảo Y có tên rõ ràng.",
        },
        {
          title: "Raster theo indices",
          explanation:
            "Mỗi ba index chọn một triangle; coverage/depth không biết face được lưu liên tục hay lấy từ EBO.",
        },
        {
          title: "Tách presenter khỏi renderer",
          explanation:
            "CPU hoàn thành color/depth trước upload. Quad shader không biến CPU path thành GPU geometry renderer.",
        },
      ],
    },
    "p34-l04": {
      focus:
        "Upload cùng vertex/index arrays vào VBO/EBO, giữ binding đúng VAO và vẽ bằng glDrawElements.",
      expected:
        "VAO đọc position/color đúng stride; EBO giữ 36 uint32 indices; one draw call tạo 12 triangles.",
      files,
      steps: [
        {
          title: "Phân biệt vertex data và element data",
          explanation:
            "VBO trả lời vertex nào có bytes gì; EBO trả lời triangle tham chiếu vertex nào và theo thứ tự nào.",
        },
        {
          title: "Nhớ EBO thuộc VAO state",
          explanation:
            "Bind EBO khi VAO active và không vô tình detach trước draw. Đây là lỗi phổ biến khiến glDrawElements không có indices.",
        },
        {
          title: "Đọc đủ bốn đối số draw",
          explanation:
            "Topology, count, index type và byte offset phải khớp buffer; `nullptr` nghĩa là offset zero trong EBO, không phải CPU pointer.",
        },
      ],
    },
    "p34-l05": {
      focus:
        "Chứng minh C++ và GLSL cùng column-major MVP bằng trace thay vì sửa transpose theo cảm giác.",
      expected:
        "Cùng vertex cho cùng clip/NDC; `glUniformMatrix4fv` nhận GL_FALSE và array 16 floats được truyền không đổi.",
      files,
      steps: [
        {
          title: "Đặt rõ thứ tự P × V × M",
          explanation:
            "Vector cột được transform bởi model trước, view sau và projection cuối dù biểu thức matrix được đọc từ trái sang phải.",
        },
        {
          title: "Upload đúng storage convention",
          explanation:
            "C++ lưu column-major nên không transpose khi upload. GLSL nhân `uMvp * vec4` đúng contract đó.",
        },
        {
          title: "Trace một vertex qua bốn space",
          explanation:
            "Clip w, NDC và window depth cho biết lỗi nằm ở matrix, perspective divide hay viewport trước khi xét rasterization.",
        },
      ],
    },
    "p34-l06": {
      focus:
        "Đối chiếu CPU depth array với OpenGL depth buffer bằng cùng clear value, compare function và depth range.",
      expected:
        "Depth bật làm output độc lập triangle order; depth tắt lộ painter-order artifact ở cả hai backend.",
      files,
      steps: [
        {
          title: "Đổi NDC depth về window depth",
          explanation:
            "OpenGL NDC z [-1,1] được map về [0,1]. CPU lưu đúng giá trị mà fixed-function depth stage so sánh.",
        },
        {
          title: "Clear và compare phải đi thành cặp",
          explanation:
            "Clear 1.0 cùng `LESS` cho phép fragment gần hơn ghi đè. Đổi một phía sẽ làm visibility lệch dù MVP đúng.",
        },
        {
          title: "Tắt depth như một thí nghiệm",
          explanation:
            "Đảo triangle order chỉ được kỳ vọng làm hình khác khi depth tắt; test dùng điều này để chứng minh Z-buffer đang có tác dụng.",
        },
      ],
    },
    "p34-l07": {
      focus: "Giữ một CCW index buffer và nối CPU front-face test với GL_CCW/GL_BACK.",
      expected:
        "CPU/GPU cùng loại back faces; CPU chỉ đảo b/c sau quyết định culling để rasterizer làm việc trong top-left screen space.",
      files,
      steps: [
        {
          title: "Định nghĩa winding ở object space",
          explanation:
            "Nhìn từng mặt từ bên ngoài, indices chạy CCW. Một nguồn indices tránh lỗi sửa riêng backend.",
        },
        {
          title: "Nhận ra screen Y làm đổi dấu area",
          explanation:
            "CPU top-left screen đảo trục Y so với NDC. Front-face test diễn ra trước bước normalize winding cho coverage.",
        },
        {
          title: "Cấu hình GPU bằng cùng quy ước",
          explanation:
            "GL_CCW và GL_BACK diễn đạt đúng source winding; phím C chỉ enable/disable state, không đổi mesh.",
        },
      ],
    },
    "p34-l08": {
      focus:
        "Đặt input/update trước nhánh render để F1/F2 dùng cùng snapshot scene và cùng framebuffer size.",
      expected:
        "Pause, fixed step, drag và resize giữ liên tục khi đổi backend; F1/F2 không tạo lại mesh hoặc context.",
      files,
      steps: [
        {
          title: "Input chỉ sửa scene hoặc renderer enum",
          explanation:
            "F1/F2 không gọi init/destroy. Drag và N cập nhật angle một lần trước khi render frame.",
        },
        {
          title: "Render từ một snapshot",
          explanation:
            "CPU/GPU nhận cùng scene values và aspect trong frame. Không có cpuAngle/gpuAngle riêng để trôi khác nhau.",
        },
        {
          title: "Resize mọi resource liên quan",
          explanation:
            "CPU framebuffer/texture, glViewport và projection aspect cùng dùng pixel size mới từ SDL.",
        },
      ],
    },
    "p34-l09": {
      focus:
        "Hoàn thiện controls, named validation, build matrix và cleanup để toàn source chạy độc lập.",
      expected:
        "Final reset được, chuyển backend liên tục, báo contract valid và destroy GPU objects trước context/window.",
      files,
      steps: [
        {
          title: "Giữ validation có tên",
          explanation:
            "Mesh, MVP, depth, culling, deterministic frame và renderer switch được báo riêng để lỗi không bị gộp thành một bool khó đọc.",
        },
        {
          title: "Build cả Debug lẫn Release",
          explanation:
            "C++ compile và GLSL runtime diagnostics đều cần được giữ ở hai cấu hình; CTest không phụ thuộc GPU.",
        },
        {
          title: "Destroy theo dependency",
          explanation:
            "EBO/VBO/VAO/program/texture cần context còn sống. Context, window và SDL được đóng sau cùng.",
        },
      ],
    },
  },
  references: {
    "p34-l01": [
      { label: "Renderer backend", href: "/glossary#renderer-backend", kind: "Thuật ngữ" },
      { label: "OpenGL context", href: "/glossary#opengl-context", kind: "Thuật ngữ" },
    ],
    "p34-l02": [
      { label: "Indexed draw", href: "/glossary#indexed-draw", kind: "Thuật ngữ" },
      { label: "Vertex Buffer Object", href: "/glossary#vertex-buffer-object", kind: "Thuật ngữ" },
    ],
    "p34-l03": [
      { label: "Z-buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Texture upload", href: "/glossary#texture-upload", kind: "Thuật ngữ" },
    ],
    "p34-l04": [
      {
        label: "glDrawElements",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawElements.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "Element Buffer Object",
        href: "/glossary#element-buffer-object",
        kind: "Thuật ngữ",
      },
    ],
    "p34-l05": [
      {
        label: "glUniformMatrix",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glUniform.xhtml",
        kind: "OpenGL API",
      },
      { label: "NDC", href: "/glossary#ndc", kind: "Thuật ngữ" },
    ],
    "p34-l06": [
      {
        label: "glDepthFunc",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDepthFunc.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU depth test", href: "/glossary#gpu-depth-test", kind: "Thuật ngữ" },
    ],
    "p34-l07": [
      {
        label: "glFrontFace",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glFrontFace.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "glCullFace",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCullFace.xhtml",
        kind: "OpenGL API",
      },
      { label: "Face culling", href: "/glossary#face-culling", kind: "Thuật ngữ" },
    ],
    "p34-l08": [
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
      { label: "Renderer backend", href: "/glossary#renderer-backend", kind: "Thuật ngữ" },
    ],
    "p34-l09": [
      {
        label: "SDL_GL_DestroyContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_DestroyContext",
        kind: "SDL API",
      },
      { label: "OpenGL Core Profile", href: "/glossary#opengl-core-profile", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
