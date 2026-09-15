import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/pipeline.hpp",
  "include/gl_api.hpp",
  "include/shader_renderer.hpp",
  "shaders/lab.vert",
  "shaders/lab.frag",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p35-l01": {
      focus:
        "Đưa GLSL ra khỏi string literal, đọc đúng shader directory của target và giữ cube cũ làm mốc trước hot reload.",
      expected:
        "Checkpoint 1 đọc `lab.vert`/`lab.frag`, báo rõ path lỗi và vẽ cùng cube như starter embedded shader.",
      files,
      steps: [
        {
          title: "Giữ một baseline nhìn thấy được",
          explanation:
            "Starter vẫn vẽ cube bằng embedded source. Nhờ vậy nếu checkpoint 1 mất hình, lỗi nằm ở đường đọc file hoặc nội dung file chứ không phải context/mesh.",
        },
        {
          title: "Đặt shader cạnh snapshot",
          explanation:
            "Mỗi target nhận `COURSE_SHADER_DIRECTORY` trỏ tới chính starter/checkpoint/final của nó. File đang sửa vì thế là file chương trình thực sự đọc.",
        },
        {
          title: "Đọc hai file như một cặp",
          explanation:
            "Vertex và fragment source cùng tạo `ShaderSources`; thiếu một file làm startup dừng với path đầy đủ thay vì link một cặp nửa cũ nửa mới.",
        },
      ],
    },
    "p35-l02": {
      focus:
        "Biến compile failure thành diagnostics có stage, status và driver info log trước khi xóa shader object lỗi.",
      expected:
        "Một token sai trong `lab.frag` báo `lab.frag compile failed` cùng log; vertex shader và program cũ không bị hiểu nhầm là nguyên nhân.",
      files,
      steps: [
        {
          title: "Compile từng stage độc lập",
          explanation:
            "Mỗi shader có type, source và label riêng. Return value chỉ là shader object hợp lệ hoặc 0; diagnostics đi qua tham số riêng.",
        },
        {
          title: "Hỏi status trước log",
          explanation:
            "`GL_COMPILE_STATUS` quyết định thành công. Info log giúp sửa lỗi nhưng log rỗng không được coi là pass.",
        },
        {
          title: "Giữ tên file trong báo lỗi",
          explanation:
            "Driver line number chỉ hữu ích khi người học biết nó thuộc `lab.vert` hay `lab.frag`.",
        },
      ],
    },
    "p35-l03": {
      focus:
        "Link hai stage vào một candidate program và kiểm interface/uniform trước khi program có quyền tham gia render.",
      expected:
        "Compile pass nhưng varying mismatch vẫn bị chặn ở link; candidate thiếu `uMvp` bị xóa và trả diagnostics riêng.",
      files,
      steps: [
        {
          title: "Candidate là resource độc lập",
          explanation:
            "Compile/link không đụng active program. Candidate có program handle và toàn bộ uniform locations của đúng generation đó.",
        },
        {
          title: "Đọc program info log",
          explanation:
            "Link failure khác compile failure: hai stage có thể đúng cú pháp nhưng không khớp varying type/name.",
        },
        {
          title: "Khóa interface sau link",
          explanation:
            "`uMvp` phải có location hợp lệ. Từ bài 6, time/resolution/mouse cũng trở thành contract bắt buộc.",
        },
      ],
    },
    "p35-l04": {
      focus:
        "Thêm manual reload theo thứ tự build candidate → validate → swap → delete previous để source lỗi không làm mất hình.",
      expected:
        "F5 với source lỗi làm attempts tăng nhưng generation/fingerprint active giữ nguyên; source đúng làm generation tăng một.",
      files,
      steps: [
        {
          title: "Không tháo program đang chạy trước",
          explanation:
            "Active program vẫn tồn tại trong suốt compile/link candidate. Failure path chỉ xóa object tạm.",
        },
        {
          title: "Commit bằng một điểm đổi state",
          explanation:
            "Sau khi candidate hợp lệ, renderer thay `activeProgram`, cập nhật generation rồi mới xóa previous handle.",
        },
        {
          title: "Phân biệt candidate và active fingerprint",
          explanation:
            "Khi lỗi, hai fingerprint khác nhau giúp title/test chứng minh người dùng đã thử source mới nhưng hình vẫn đến từ last-good source.",
        },
      ],
    },
    "p35-l05": {
      focus:
        "Theo dõi timestamp không block frame loop và debounce nhiều lần ghi file thành đúng một reload request.",
      expected:
        "Watcher chỉ reload sau 140 ms không có timestamp mới, không retry source lỗi khi file đứng yên và F5 vẫn luôn dùng được.",
      files,
      steps: [
        {
          title: "Poll metadata, không đọc file mỗi frame",
          explanation:
            "`last_write_time` rẻ hơn open/read/compile. Chỉ khi watcher quyết định reload, chương trình mới đọc cả cặp source.",
        },
        {
          title: "Restart debounce khi stamp tiếp tục đổi",
          explanation:
            "Editor có thể truncate rồi ghi nhiều chunk. Mỗi stamp mới dời `changedAt`, tránh compile một file mới viết được nửa chừng.",
        },
        {
          title: "Consume pending đúng một lần",
          explanation:
            "Sau khi phát request, `pending` tắt. Source lỗi không bị compile lại mỗi frame; lần sửa sau tạo stamp mới.",
        },
      ],
    },
    "p35-l06": {
      focus:
        "Upload time/resolution/mouse mỗi frame, đổi window coordinates sang framebuffer pixels và làm mới location sau link.",
      expected:
        "Resize, high-DPI và mouse movement đổi uniform output nhưng không tăng program generation hoặc reload attempts.",
      files,
      steps: [
        {
          title: "Location thuộc về program generation",
          explanation:
            "Sau mỗi link thành công, candidate truy vấn lại bốn locations. Không mang integer location của program cũ sang program mới.",
        },
        {
          title: "Resolution dùng pixel thật",
          explanation:
            "`SDL_GetWindowSizeInPixels` cấp viewport/resolution. Mouse từ logical window được scale và đảo Y trước khi upload cho GLSL.",
        },
        {
          title: "Uniform update không phải reload",
          explanation:
            "Time và mouse thay đổi hàng frame qua `glUniform`; compiler chỉ chạy khi shader source đổi hoặc F5 được nhấn.",
        },
      ],
    },
    "p35-l07": {
      focus:
        "Xây fragment effect từ local position, time, framebuffer coordinate và mouse bằng các bước màu có thể thử riêng.",
      expected:
        "Final shader tạo rings chuyển động, cold/hot palette và mouse glow; mỗi hằng số sửa được khi app đang chạy.",
      files,
      steps: [
        {
          title: "Bắt đầu từ một khoảng cách",
          explanation:
            "`length(p)` tạo các đường đồng tâm; cosine biến khoảng cách thành dải sáng tối và time dịch pha.",
        },
        {
          title: "Tạo palette trước khi thêm tương tác",
          explanation:
            "`mix(cold, hot, rings)` biến scalar thành màu. Vertex color chỉ modulation nhẹ để vẫn đọc được sáu mặt cube.",
        },
        {
          title: "Đưa mouse về cùng hệ UV",
          explanation:
            "Cả `gl_FragCoord` và `uMouse` chia cho safe resolution; distance vì thế có cùng đơn vị bất kể cửa sổ resize.",
        },
      ],
    },
    "p35-l08": {
      focus:
        "Đóng named validation, failure experiments, Debug/Release build và resource cleanup cho source hoàn chỉnh.",
      expected:
        "Final báo contract valid, last-good hoạt động qua nhiều lỗi/sửa, watcher không storm và mọi GL object bị xóa trước context.",
      files,
      steps: [
        {
          title: "Test state machine không cần GPU",
          explanation:
            "Fingerprint, generation, commit/failure và debounce là logic CPU thuần. CTest khóa chúng mà không mở window.",
        },
        {
          title: "Thử lỗi thật với driver",
          explanation:
            "Compile/link log phụ thuộc OpenGL context nên final checklist yêu cầu chèn token sai, varying mismatch rồi sửa lại khi app đang chạy.",
        },
        {
          title: "Xóa candidate và active đúng lifetime",
          explanation:
            "Failure path xóa shader/program tạm. Cleanup cuối xóa active program, EBO/VBO/VAO rồi mới destroy context/window.",
        },
      ],
    },
  },
  references: {
    "p35-l01": [
      {
        label: "SDL_GetBasePath",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetBasePath",
        kind: "SDL API",
      },
      { label: "Shader hot reload", href: "/glossary#shader-hot-reload", kind: "Thuật ngữ" },
    ],
    "p35-l02": [
      {
        label: "glCompileShader",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCompileShader.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "glGetShaderInfoLog",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetShaderInfoLog.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p35-l03": [
      {
        label: "glLinkProgram",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glLinkProgram.xhtml",
        kind: "OpenGL API",
      },
      { label: "Program candidate", href: "/glossary#program-candidate", kind: "Thuật ngữ" },
    ],
    "p35-l04": [
      { label: "Transactional reload", href: "/glossary#transactional-reload", kind: "Thuật ngữ" },
      { label: "Shader program", href: "/glossary#shader-program", kind: "Thuật ngữ" },
    ],
    "p35-l05": [
      { label: "Debounce", href: "/glossary#debounce", kind: "Thuật ngữ" },
      { label: "Shader hot reload", href: "/glossary#shader-hot-reload", kind: "Thuật ngữ" },
    ],
    "p35-l06": [
      {
        label: "glGetUniformLocation",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetUniformLocation.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p35-l07": [
      {
        label: "GLSL length",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/length.xhtml",
        kind: "OpenGL API",
      },
      { label: "Fragment shader", href: "/glossary#fragment-shader", kind: "Thuật ngữ" },
    ],
    "p35-l08": [
      {
        label: "glDeleteProgram",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteProgram.xhtml",
        kind: "OpenGL API",
      },
      { label: "Shader info log", href: "/glossary#shader-info-log", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
