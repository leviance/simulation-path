import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p35-l01": {
      focus:
        "Bỏ mesh/camera không cần thiết, dùng fullscreen triangle và nạp shader từ đúng thư mục của executable/checkpoint.",
      expected:
        "File rỗng/quá lớn/NUL/lỗi đọc có diagnostics; chưa build được candidate thì không thay program đang vẽ.",
      files: [
        "include/shader_defaults.hpp",
        "include/shader_files.hpp",
        "shaders/lab.vert",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Bắt đầu bằng mặt phẳng toàn màn hình",
          explanation:
            "Context/loader đã biết; gl_VertexID tạo triangle lớn phủ viewport mà không mang cube/MVP sang bài không cần geometry.",
        },
        {
          title: "Chỉ rõ file đang sửa",
          explanation:
            "Source directory của target là đường đầu tiên, fallback là thư mục shader riêng theo executable; terminal ghi đường thực.",
        },
        {
          title: "Đọc cặp source trước khi biên dịch",
          explanation:
            "File rỗng/quá lớn/NUL/lỗi đọc có diagnostics; chưa build được candidate thì không thay program đang vẽ.",
        },
      ],
    },
    "p35-l02": {
      focus:
        "Đọc compile status và log thật, ghi rõ file và vertex/fragment stage; không đoán cú pháp bằng tìm token.",
      expected:
        "Shader thất bại và các shader tạm còn lại phải được xóa; active program nằm ngoài giao dịch.",
      files: ["include/shader_renderer.hpp", "include/gl_api.hpp"],
      steps: [
        {
          title: "Compile từng stage riêng",
          explanation:
            "GL_COMPILE_STATUS quyết định thành công; không suy từ việc log có chữ error hay từ hình cũ vẫn còn.",
        },
        {
          title: "Giữ tên file và log",
          explanation:
            "Vertex/fragment có label riêng, giữ driver log và giới hạn kích thước log để tránh cấp phát vô hạn.",
        },
        {
          title: "Dọn object khi lỗi",
          explanation:
            "Shader thất bại và các shader tạm còn lại phải được xóa; active program nằm ngoài giao dịch.",
        },
      ],
    },
    "p35-l03": {
      focus:
        "Phân biệt compile với link; kiểm active uniform, kiểu và array size sau link thay vì chỉ thấy tên trong source.",
      expected: "Candidate sai type/array size bị xóa ngay, không được đưa sang bước commit.",
      files: ["include/shader_renderer.hpp", "include/gl_api.hpp"],
      steps: [
        {
          title: "Link sau compile",
          explanation:
            "Hai stage đúng cú pháp vẫn có thể không ghép được varying; GL_LINK_STATUS và program log là bước riêng.",
        },
        {
          title: "Đọc interface từ driver",
          explanation:
            "GetActiveUniform cho type/size; GetUniformLocation cho vị trí. Uniform trong comment hoặc bị tối ưu mất không đáp ứng contract.",
        },
        {
          title: "Chỉ trả candidate hợp lệ",
          explanation:
            "Candidate sai type/array size bị xóa ngay, không được đưa sang bước commit.",
        },
      ],
    },
    "p35-l04": {
      focus:
        "Build candidate bên cạnh active program, cập nhật locations khi thành công và giữ hình/metadata cũ khi thất bại.",
      expected:
        "attempts đếm thử, generation đếm commit. Lỗi giữ active effect/fingerprint và ảnh ở cùng uniform snapshot.",
      files: ["include/shader_renderer.hpp", "include/pipeline.hpp"],
      steps: [
        {
          title: "Build bên cạnh bản đang chạy",
          explanation: "Tạo program khác, không ghi chồng active handle trước khi biết kết quả.",
        },
        {
          title: "Commit cả handle và locations",
          explanation:
            "Bind bản mới trước khi xóa bản cũ đang bound; lấy locations từ chính candidate mới.",
        },
        {
          title: "Ghi metadata có ý nghĩa",
          explanation:
            "attempts đếm thử, generation đếm commit. Lỗi giữ active effect/fingerprint và ảnh ở cùng uniform snapshot.",
        },
      ],
    },
    "p35-l05": {
      focus:
        "Theo dõi timestamp, size và trạng thái file; debounce không block, coalesce thay đổi và không retry storm.",
      expected:
        "Baseline lấy trước đọc/compile; file đổi trong lúc đó còn được phát hiện ở lượt scan tiếp. F5 coalesce cùng thay đổi.",
      files: ["include/shader_files.hpp", "include/shader_application.hpp"],
      steps: [
        {
          title: "Theo dõi cả hai file",
          explanation:
            "Timestamp, size và trạng thái tồn tại/không đọc được tạo stamp; quan sát fragment đang được yêu cầu, không nhầm với last-good.",
        },
        {
          title: "Đợi trạng thái ổn định",
          explanation:
            "Mỗi thay đổi đặt lại mốc debounce 140 ms; vòng frame vẫn xử lý input/draw, không sleep chờ file.",
        },
        {
          title: "Không bỏ lỡ save khi compile",
          explanation:
            "Baseline lấy trước đọc/compile; file đổi trong lúc đó còn được phát hiện ở lượt scan tiếp. F5 coalesce cùng thay đổi.",
        },
      ],
    },
    "p35-l06": {
      focus:
        "Dùng một uniform snapshot; đổi logical input sang pixel OpenGL, pause/step và resize không compile lại.",
      expected:
        "GetUniformfv trên program hiện tại kiểm time/resolution/mouse/zoom ở các kích thước pixel khác nhau.",
      files: ["include/pipeline.hpp", "include/shader_input.hpp", "include/shader_application.hpp"],
      steps: [
        {
          title: "Giữ tọa độ chuẩn trong state",
          explanation:
            "Mouse normalized top-left giúp resize không làm nhảy parameter. Uniform snapshot đổi sang physical bottom-left.",
        },
        {
          title: "Tách thời gian khỏi reload",
          explanation:
            "Pause/step/reset là thao tác dữ liệu; shader code và program generation không cần đổi.",
        },
        {
          title: "Kiểm dữ liệu thực đã upload",
          explanation:
            "GetUniformfv trên program hiện tại kiểm time/resolution/mouse/zoom ở các kích thước pixel khác nhau.",
        },
      ],
    },
    "p35-l07": {
      focus:
        "Từ UV đến palette chuyển động, signed distance của circle, anti-alias và ánh sáng viền có công thức rõ.",
      expected:
        "Mouse/zoom thay uniform, hằng SPEED đổi source rồi reload; người học phân biệt hai đường cập nhật.",
      files: ["shaders/gradient.frag", "shaders/circle.frag", "include/shader_effects.hpp"],
      steps: [
        {
          title: "Tạo palette từ UV",
          explanation:
            "Mix/cos và time tạo gradient chuyển động; mỗi hằng số đều có tác dụng thấy được.",
        },
        {
          title: "Định nghĩa circle bằng khoảng cách",
          explanation:
            "SDF length(p-center)-radius cho inside/edge; smoothstep theo pixel size tránh viền răng cưa rõ.",
        },
        {
          title: "Tách dữ liệu và source",
          explanation:
            "Mouse/zoom thay uniform, hằng SPEED đổi source rồi reload; người học phân biệt hai đường cập nhật.",
        },
      ],
    },
    "p35-l08": {
      focus:
        "Biểu diễn số phức bằng vec2, lặp z²+c hữu hạn, kiểm escape và tô màu liên tục theo thời gian.",
      expected:
        "Smooth count và time đổi palette; pause giữ ảnh, mouse/zoom đổi vùng complex plane.",
      files: ["shaders/mandelbrot.frag", "include/shader_effects.hpp"],
      steps: [
        {
          title: "Viết phép nhân số phức tường minh",
          explanation:
            "vec2 giữ phần thực/ảo; lưu nextX trước khi cập nhật Y để không dùng trạng thái nửa cũ nửa mới.",
        },
        {
          title: "Giới hạn escape loop",
          explanation:
            "128 bước, ngưỡng |z|>2; test các điểm rõ trong/ngoài trước khi nhìn biên fractal.",
        },
        {
          title: "Tô màu không làm đổi tập",
          explanation:
            "Smooth count và time đổi palette; pause giữ ảnh, mouse/zoom đổi vùng complex plane.",
        },
      ],
    },
    "p35-l09": {
      focus:
        "Nội suy value noise, cộng năm octave fBm và domain warp; hash số nguyên lặp lại được.",
      expected:
        "Time tạo flow, noise tạo độ lệch tọa độ; mỗi tầng được quan sát riêng trước khi ghép.",
      files: ["shaders/noise.frag", "include/shader_effects.hpp"],
      steps: [
        {
          title: "Hash theo ô, không theo frame",
          explanation:
            "Unsigned 32-bit wrap lặp lại được ở CPU/GLSL; không đưa time vào giá trị ngẫu nhiên của mỗi góc.",
        },
        {
          title: "Nội suy rồi cộng octave",
          explanation:
            "Value noise liên tục qua biên ô; năm octave hữu hạn tạo nhiều thang chi tiết.",
        },
        {
          title: "Dịch và warp tọa độ",
          explanation:
            "Time tạo flow, noise tạo độ lệch tọa độ; mỗi tầng được quan sát riêng trước khi ghép.",
        },
      ],
    },
    "p35-l10": {
      focus:
        "Ghép gallery bốn hiệu ứng, error overlay/showcase, kiểm GPU và cleanup, source/ZIP độc lập.",
      expected:
        "Source checkpoint, GLSL, ZIP, CMake khóa SDL và README phải khớp; build/tests có timeout, không có output vào Git.",
      files: [
        "include/shader_overlay.hpp",
        "include/shader_validation.hpp",
        "include/shader_application.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Tách các lớp nghiệm thu",
          explanation:
            "CPU CTest, OpenGL thật, browser và desktop có phạm vi khác nhau; không dùng một test hẹp thay tất cả.",
        },
        {
          title: "Giữ công cụ dùng được khi source hỏng",
          explanation:
            "Showcase sạch vẫn hiện lỗi mới; overlay/cache có lifecycle riêng và không che việc last-good đang chạy.",
        },
        {
          title: "Bàn giao source tái lập",
          explanation:
            "Source checkpoint, GLSL, ZIP, CMake khóa SDL và README phải khớp; build/tests có timeout, không có output vào Git.",
        },
      ],
    },
  },
  references: {
    "p35-l01": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
    ],
    "p35-l02": [
      {
        label: "Shader compile status",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glCompileShader.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p35-l03": [
      {
        label: "Active uniform reflection",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetActiveUniform.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p35-l04": [
      {
        label: "Program lifetime",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteProgram.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p35-l05": [
      {
        label: "Shader program",
        href: "/glossary#shader-program",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l06": [
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p35-l07": [
      {
        label: "gl_FragCoord",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_FragCoord.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p35-l08": [
      {
        label: "Fragment shader",
        href: "/glossary#fragment-shader",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l09": [
      {
        label: "Fragment shader",
        href: "/glossary#fragment-shader",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l10": [
      {
        label: "SDL_RenderDebugText",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderDebugText",
        kind: "SDL API",
      },
      {
        label: "SDL_CreateSoftwareRenderer",
        href: "https://wiki.libsdl.org/SDL3/SDL_CreateSoftwareRenderer",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
