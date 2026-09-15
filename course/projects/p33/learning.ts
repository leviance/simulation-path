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
    "p33-l01": {
      focus:
        "Tạo OpenGL context đúng lifecycle, lấy framebuffer pixel size và cho người học thấy hai viewport trước khi thêm shader.",
      expected:
        "Window dùng `SDL_WINDOW_OPENGL`, context là 3.3 Core, function pointers được load sau khi context current và hai nửa framebuffer clear khác màu.",
      files,
      steps: [
        {
          title: "Giữ event-loop skeleton quen thuộc",
          explanation:
            "Starter vẫn có SDL_Init, window, event polling và cleanup. Checkpoint đầu chỉ thay render backend nên người học biết phần nào cũ, phần nào mới.",
        },
        {
          title: "Khóa context attributes trước khi tạo window",
          explanation:
            "Major/minor/profile là yêu cầu đầu vào cho context. Window cần OPENGL flag trước khi `SDL_GL_CreateContext` có thể thành công.",
        },
        {
          title: "Đọc pixels thật thay vì logical size",
          explanation:
            "OpenGL viewport nhận framebuffer pixels. Trên high-DPI display, con số này có thể khác kích thước window mà input API báo.",
        },
      ],
    },
    "p33-l02": {
      focus:
        "Biến GLSL source thành program có diagnostics rõ ràng và giữ mọi function pointer trong context lifetime.",
      expected:
        "Vertex/fragment shader compile riêng, program link thành công; lỗi có stage name cùng info log và program 0 không được dùng.",
      files,
      steps: [
        {
          title: "Load function sau context",
          explanation:
            "Trên Windows, function pointers phụ thuộc context hiện tại. Loader là một phần resource lifecycle chứ không phải global khởi tạo tùy lúc.",
        },
        {
          title: "Tách compile khỏi link",
          explanation:
            "Compile kiểm cú pháp từng stage; link kiểm interface giữa stages. Hai loại lỗi cần thông điệp khác nhau.",
        },
        {
          title: "Không bỏ info log khi build Release",
          explanation:
            "Shader chạy ở runtime nên compiler C++ không thể bắt lỗi GLSL. Log phải tồn tại ở mọi build mode.",
        },
      ],
    },
    "p33-l03": {
      focus:
        "Nối `GpuVertex` C++ với `layout(location=...)` GLSL bằng VBO data và VAO interpretation.",
      expected:
        "Ba vertex được upload một lần; location 0 đọc vec2 position, location 1 đọc vec3 color bằng đúng stride/offset.",
      files,
      steps: [
        {
          title: "Khóa struct trước khi gọi OpenGL",
          explanation:
            "`static_assert` và `offsetof` biến giả định memory layout thành contract. Không chép magic offset 8/20 rải rác trong setup.",
        },
        {
          title: "Phân biệt VBO và VAO",
          explanation:
            "VBO giữ bytes; VAO nhớ cách attributes đọc bytes đó. Bind đúng buffer nhưng sai VAO vẫn cho dữ liệu sai.",
        },
        {
          title: "Draw call chỉ nói topology và count",
          explanation:
            "`glDrawArrays(GL_TRIANGLES, 0, 3)` không truyền vertex data lại. Nó dùng program, VAO và viewport đang active.",
        },
      ],
    },
    "p33-l04": {
      focus:
        "Dựng CPU reference độc lập rồi chỉ dùng OpenGL như một presenter cho framebuffer RGBA8 ở panel trái.",
      expected:
        "CPU rasterizer tạo coverage/color từ barycentric weights, texture upload đúng row order và quad presenter không can thiệp geometry.",
      files,
      steps: [
        {
          title: "Giữ CPU path là oracle đọc được",
          explanation:
            "Mỗi pixel center được đổi về NDC, kiểm coverage rồi ghi bốn bytes. Không gọi OpenGL trong hàm rasterize.",
        },
        {
          title: "Upload sau khi CPU hoàn thành frame",
          explanation:
            "`glTexSubImage2D` chỉ chuyển kết quả. Nó không biến rasterization thành GPU work và không nằm trong unit tests.",
        },
        {
          title: "Flip texture có chủ đích",
          explanation:
            "CPU row 0 là phía trên; OpenGL texture convention đi từ dưới. Quad shader đổi V để hình không bị lật.",
        },
      ],
    },
    "p33-l05": {
      focus:
        "Viết transform một lần theo contract toán học rồi triển khai tương đương trong C++ và GLSL.",
      expected:
        "Rotate → scale → translate cho cùng NDC vertex; reset và fixed step không làm CPU/GPU trôi khác nhau.",
      files,
      steps: [
        {
          title: "Đặt tên thứ tự transform",
          explanation:
            "Scale trước rotate không luôn cho cùng kết quả khi transform mở rộng. Cả hai phía dùng đúng intermediate rotatedX/rotatedY.",
        },
        {
          title: "Uniform là input của draw",
          explanation:
            "Angle/scale/translation thay đổi mỗi frame nhưng vertex buffer không đổi. Uniform giữ state per-draw thay vì upload lại VBO.",
        },
        {
          title: "Trace từng vertex trước khi nhìn pixels",
          explanation:
            "Nếu NDC đã khác, lỗi nằm trước rasterizer. So stage output giúp tránh chỉnh fragment shader để che lỗi vertex shader.",
        },
      ],
    },
    "p33-l06": {
      focus: "Đối chiếu hai viewport transforms và xử lý resize/high-DPI từ framebuffer pixels.",
      expected:
        "Cùng NDC round-trip qua CPU top-left và GPU bottom-left; viewport trái/phải phủ đúng toàn bộ framebuffer sau resize.",
      files,
      steps: [
        {
          title: "Tách width của hai panel",
          explanation:
            "Nếu framebuffer width lẻ, panel phải nhận phần pixel còn lại. Không để một cột trống hoặc viewport overlap.",
        },
        {
          title: "Giữ hai công thức Y rõ ràng",
          explanation:
            "CPU screen Y đảo dấu; GPU window Y không đảo. Texture presenter chịu trách nhiệm flip ảnh CPU khi hiển thị.",
        },
        {
          title: "Resize cả storage lẫn viewport",
          explanation:
            "CPU framebuffer, texture allocation và glViewport phải cùng nhận pixel size mới; chỉ sửa CSS/window size không đủ.",
        },
      ],
    },
    "p33-l07": {
      focus:
        "Nối barycentric interpolation CPU với varying interpolation GPU và tách nó khỏi coverage.",
      expected:
        "Centroid có ba weights gần 1/3; smooth mode trộn ba colors, solid mode giữ màu cố định nhưng coverage không đổi.",
      files,
      steps: [
        {
          title: "Coverage trả weights trước",
          explanation:
            "Pixel chỉ có color khi nằm trong triangle. Barycentric weights vừa trả lời inside, vừa là hệ số nội suy attributes.",
        },
        {
          title: "Varying nối hai shader stages",
          explanation:
            "Vertex shader ghi `vColor` ở ba vertices; rasterizer phần cứng nội suy rồi fragment shader nhận một color cho mỗi fragment.",
        },
        {
          title: "So màu sau cùng precision contract",
          explanation:
            "CPU tính float rồi ghi RGBA8; GPU framebuffer cũng quantize. Validation so output sau bước này, không đòi double bit-identical.",
        },
      ],
    },
    "p33-l08": {
      focus:
        "Thiết kế readback probes đủ mạnh để bắt pipeline mismatch nhưng không phụ thuộc edge coverage khác implementation.",
      expected:
        "Probe centroid/inside map đúng GPU pixel, glReadPixels trả color trong tolerance và outside probe trả background.",
      files,
      steps: [
        {
          title: "Chọn probe trong NDC trước",
          explanation:
            "Một point hình học được dùng ở cả CPU và GPU; từng phía tự đổi nó sang hệ tọa độ pixel của mình.",
        },
        {
          title: "Tránh edge làm pass/fail",
          explanation:
            "Coverage rule và sample convention có thể khác đúng một pixel quanh biên. Centroid tạo probe ổn định hơn.",
        },
        {
          title: "Tách readback khỏi render loop thường xuyên",
          explanation:
            "glReadPixels có thể đồng bộ CPU/GPU. Final chỉ đọc khi người dùng yêu cầu hoặc ở probe report hữu hạn.",
        },
      ],
    },
    "p33-l09": {
      focus:
        "Ghép pipeline thành ứng dụng có controls, diagnostics, named validation và cleanup theo context lifetime.",
      expected:
        "App pause mặc định, resize/reset được, probe report hữu hạn và destroy mọi GPU object trước context/window.",
      files,
      steps: [
        {
          title: "Giữ event, update và render tách nhau",
          explanation:
            "Input chỉ đổi state; fixed step đổi angle; render dùng snapshot state cho cả hai panel trong cùng frame.",
        },
        {
          title: "Không gọi readback mỗi frame",
          explanation:
            "Phím P chạy report chủ động. Title giữ trace CPU thuần nên window vẫn phản hồi bình thường.",
        },
        {
          title: "Destroy theo dependency",
          explanation:
            "VAO/VBO/texture/program cần context còn sống. Sau đó mới destroy context, window và SDL.",
        },
      ],
    },
  },
  references: {
    "p33-l01": [
      {
        label: "SDL_GL_CreateContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
      { label: "OpenGL context", href: "/glossary#opengl-context", kind: "Thuật ngữ" },
    ],
    "p33-l02": [
      {
        label: "SDL_GL_GetProcAddress",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_GetProcAddress",
        kind: "SDL API",
      },
      { label: "Shader program", href: "/glossary#shader-program", kind: "Thuật ngữ" },
    ],
    "p33-l03": [
      {
        label: "glVertexAttribPointer",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glVertexAttribPointer.xhtml",
        kind: "OpenGL API",
      },
      { label: "Vertex Array Object", href: "/glossary#vertex-array-object", kind: "Thuật ngữ" },
    ],
    "p33-l04": [
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Texture upload", href: "/glossary#texture-upload", kind: "Thuật ngữ" },
    ],
    "p33-l05": [
      { label: "Vertex shader", href: "/glossary#vertex-shader", kind: "Thuật ngữ" },
      { label: "Non-commutative", href: "/glossary#non-commutative", kind: "Thuật ngữ" },
    ],
    "p33-l06": [
      { label: "NDC", href: "/glossary#ndc", kind: "Thuật ngữ" },
      { label: "Viewport transform", href: "/glossary#viewport-transform", kind: "Thuật ngữ" },
    ],
    "p33-l07": [
      { label: "Fragment shader", href: "/glossary#fragment-shader", kind: "Thuật ngữ" },
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
    ],
    "p33-l08": [
      {
        label: "glReadPixels",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glReadPixels.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU readback", href: "/glossary#gpu-readback", kind: "Thuật ngữ" },
    ],
    "p33-l09": [
      {
        label: "SDL_GL_DestroyContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_DestroyContext",
        kind: "SDL API",
      },
      { label: "Core profile", href: "/glossary#opengl-core-profile", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
