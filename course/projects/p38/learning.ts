import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/particle_math.hpp",
  "include/gl_api.hpp",
  "include/particle_gpu_engine.hpp",
  "shaders/particle_update.comp",
  "shaders/particle.vert",
  "shaders/particle.frag",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p38-l01": {
      focus:
        "Xác định dữ liệu của một Particle, viết bước semi-implicit Euler trên CPU và xử lý vòng đời trước khi chuyển sang compute shader.",
      expected:
        "Checkpoint 1 chạy một preview nhỏ trên CPU: mỗi particle tăng tuổi, chịu trọng lực và được tái sinh khi hết vòng đời hoặc rơi khỏi sàn.",
      files,
      steps: [
        {
          title: "Gom trạng thái thành hai Vec4",
          explanation:
            "positionAge và velocityLife giữ tám float liên quan trong record 32 byte; tên trường nói rõ component w mang nghĩa gì.",
        },
        {
          title: "Cập nhật velocity trước position",
          explanation:
            "Semi-implicit Euler dùng vận tốc vừa chịu gravity để dịch chuyển position, ổn định hơn explicit Euler mà vẫn đủ đơn giản để viết lại trong GLSL.",
        },
        {
          title: "Đặt vòng đời vào cùng step",
          explanation:
            "Age và floor guard quyết định respawn ngay tại nơi state được cập nhật, tránh một pass CPU thứ hai phải quét toàn mảng.",
        },
      ],
    },
    "p38-l02": {
      focus:
        "Sinh particle có thể tái lập từ index và seed, rồi trải tuổi ban đầu để đài phun có hình ngay từ frame đầu.",
      expected:
        "Checkpoint 2 tạo lại đúng cùng particle với cùng seed, trong khi seed khác đổi hướng phun và lifetime có kiểm soát.",
      files,
      steps: [
        {
          title: "Hash index thay vì giữ RNG state",
          explanation:
            "Mỗi invocation có thể tự dựng random-like values từ index và epoch; không cần chia sẻ một random generator có thứ tự toàn cục.",
        },
        {
          title: "Sinh trạng thái lúc vừa rời emitter",
          explanation:
            "Spawn state gồm vị trí miệng phun, velocity hướng lên, age zero và lifetime dương rõ ràng.",
        },
        {
          title: "Đẩy mỗi particle tới một age ban đầu",
          explanation:
            "Khởi tạo steady-state dùng nghiệm chuyển động để phân bố particle dọc quỹ đạo; không cần chạy hàng trăm warm-up frame trước khi thấy fountain.",
        },
      ],
    },
    "p38-l03": {
      focus:
        "Kiểm tra layout std430 của Particle, tính trước ngân sách 160 MB và chỉ chọn preset mà GPU thật sự hỗ trợ.",
      expected:
        "Checkpoint 3 upload một SSBO ở binding 0; preset 5 triệu chỉ được chọn khi block size và dispatch limits đều đạt.",
      files,
      steps: [
        {
          title: "Khóa size, alignment và offset",
          explanation:
            "Ba static_assert buộc C++ record khớp hai vec4 liên tiếp mà compute/vertex shader cùng đọc.",
        },
        {
          title: "Tính byte budget bằng số nguyên",
          explanation:
            "Count nhân sizeof(Particle) được kiểm overflow và so với GL_MAX_SHADER_STORAGE_BLOCK_SIZE trước khi vector/buffer lớn được tạo.",
        },
        {
          title: "Fallback có tên",
          explanation:
            "Ứng dụng thử preset từ lớn xuống nhỏ và in lý do; nó không âm thầm gọi 1 triệu là 5 triệu.",
        },
      ],
    },
    "p38-l04": {
      focus:
        "Viết lại bước cập nhật CPU trong compute shader: mỗi invocation xử lý một particle, kiểm tra index trước khi đọc và tái sinh theo cùng seed/epoch.",
      expected:
        "Checkpoint 4 dispatch đủ ceilDiv(count,256) groups và không chạm 192 lane dư ở preset 5 triệu.",
      files,
      steps: [
        {
          title: "Lấy index rồi guard ngay",
          explanation:
            "gl_GlobalInvocationID.x được so với uParticleCount trước khi đọc particles[index]; guard muộn vẫn cho phép read ngoài buffer.",
        },
        {
          title: "Giữ thứ tự phép tính như CPU",
          explanation:
            "Velocity, position rồi age được cập nhật theo đúng thứ tự của bản CPU, nhờ đó phép đối chiếu ở bài 9 chỉ đo sai số số học chứ không phải hai thuật toán khác nhau.",
        },
        {
          title: "Respawn tại đúng index",
          explanation:
            "Hash nhận index và spawn epoch nên mỗi invocation tự tạo state mới mà không tranh chấp counter hay RNG chung.",
        },
      ],
    },
    "p38-l05": {
      focus:
        "Đọc cùng particle SSBO trong vertex shader bằng gl_VertexID rồi vẽ GL_POINTS qua VAO rỗng.",
      expected:
        "Checkpoint 5 vẽ static fountain từ GPU-resident buffer; không có vertex upload thứ hai và không dựng position trên CPU mỗi frame.",
      files,
      steps: [
        {
          title: "Dùng draw index làm particle index",
          explanation:
            "glDrawArrays phát vertex ID 0..N-1; vertex shader dùng ID đó để lấy record ở binding 0.",
        },
        {
          title: "Đổi world position sang clip space",
          explanation:
            "uHalfExtent mô tả nửa chiều rộng/cao camera 2D; phép chia theo từng trục giữ aspect khi resize.",
        },
        {
          title: "Biến point thành sprite tròn",
          explanation:
            "Fragment shader dùng gl_PointCoord để discard góc vuông và pha màu theo normalized age mà không cần texture.",
        },
      ],
    },
    "p38-l06": {
      focus:
        "Đặt memory barrier giữa compute và draw để vertex shader đọc được trạng thái mới trong cùng SSBO.",
      expected:
        "Checkpoint 6 chạy update → GL_SHADER_STORAGE_BARRIER_BIT → draw mỗi frame, không full readback.",
      files,
      steps: [
        {
          title: "Đặt barrier sau bước ghi",
          explanation:
            "Compute phải hoàn tất ghi trước khi barrier mô tả visibility cho lệnh draw tới sau.",
        },
        {
          title: "Chọn bit theo bước đọc tiếp theo",
          explanation:
            "Bước tiếp theo là vertex shader đọc SSBO nên dùng SHADER_STORAGE. BUFFER_UPDATE của Project 37 dành cho trường hợp CPU đọc buffer bằng glGetBufferSubData.",
        },
        {
          title: "Không đọc toàn bộ buffer trong mỗi frame",
          explanation:
            "CPU chỉ phát commands và cập nhật uniforms; 160 MB particle state không đi qua PCIe mỗi frame.",
        },
      ],
    },
    "p38-l07": {
      focus:
        "Quản lý raw frame dt, clamp, pause, single-step và reset mà không tạo bước nhảy simulation.",
      expected:
        "Checkpoint 7 clamp dt ở 1/30 giây, pause gửi zero update, N chạy đúng 1/120 giây và R tái tạo seed ban đầu.",
      files,
      steps: [
        {
          title: "Đọc clock một lần mỗi frame",
          explanation:
            "Raw dt được tính từ SDL_GetTicksNS rồi clamp trước khi thành uniform; render và title không tự tạo clock phụ.",
        },
        {
          title: "Pause vẫn cập nhật mốc clock",
          explanation:
            "Khi resume, app không cộng cả khoảng người dùng đã dừng vào một dispatch duy nhất.",
        },
        {
          title: "Single-step dùng hằng số",
          explanation:
            "N luôn gửi 1/120 giây, nhờ đó cùng reset và số lần nhấn tạo cùng state dù tốc độ thao tác khác nhau.",
        },
      ],
    },
    "p38-l08": {
      focus:
        "Đo riêng compute và draw bằng các vòng timer query không chặn CPU, đồng thời đổi số particle theo giới hạn GPU.",
      expected:
        "Checkpoint 8 giữ bốn slot cho mỗi phase, chỉ đọc available result và báo median cạnh count/bytes thật.",
      files,
      steps: [
        {
          title: "Tách compute và draw thành hai query set",
          explanation:
            "Hai nhãn trả lời hai câu hỏi khác nhau; barrier và swap không bị nhập nhằng vào kernel time.",
        },
        {
          title: "Không tái dùng slot còn pending",
          explanation:
            "Nếu cả bốn slot chưa available, frame đó bỏ qua timing thay vì block để ép một con số.",
        },
        {
          title: "So median theo cùng điều kiện",
          explanation:
            "Count, point size, viewport và validation state được đặt cạnh timing để một con số không mất ngữ cảnh.",
        },
      ],
    },
    "p38-l09": {
      focus:
        "Chạy compute shader trên một buffer thử nhỏ với dt cố định, rồi so kết quả với bản CPU mà không tải toàn bộ trạng thái particle.",
      expected:
        "Checkpoint 9 chạy 64 particles, BUFFER_UPDATE barrier cho probe readback và report finite/max error/first mismatch.",
      files,
      steps: [
        {
          title: "Tạo buffer thử độc lập",
          explanation:
            "Probe dùng cùng Particle layout, shader program và binding 0 nhưng có count nhỏ, seed và dt cố định.",
        },
        {
          title: "Đổi barrier vì bước đọc đã thay đổi",
          explanation:
            "Main path dùng SHADER_STORAGE cho draw; probe path dùng BUFFER_UPDATE vì lệnh kế tiếp là glGetBufferSubData.",
        },
        {
          title: "Khôi phục main binding",
          explanation:
            "Sau khi xóa buffer thử, engine gắn lại SSBO chính để thao tác kiểm tra không làm hỏng frame tiếp theo.",
        },
      ],
    },
    "p38-l10": {
      focus:
        "Ghép lựa chọn preset an toàn, update/draw trên GPU, điều khiển, timer query, kiểm tra kết quả và cleanup thành ứng dụng hoàn chỉnh.",
      expected:
        "Final chỉ readback probe khi V được yêu cầu, hỗ trợ bốn count preset và xóa queries/VAO/buffer/program khi context còn current.",
      files,
      steps: [
        {
          title: "Một rebuild path cho reset và count",
          explanation:
            "Dữ liệu CPU chỉ tồn tại trong lúc tạo/upload; sau đó simulation state tiếp tục sống ở SSBO.",
        },
        {
          title: "Title phản ánh state thật",
          explanation:
            "Count sau fallback, MiB, pause, compute/draw median và probe PASS/FAIL đều lấy từ engine state, không phải nhãn cố định.",
        },
        {
          title: "Dọn resource theo thứ tự ngược",
          explanation:
            "Query rings, VAO, buffer và programs bị xóa trước SDL_GL_DestroyContext để mọi glDelete call còn context hợp lệ.",
        },
      ],
    },
  },
  references: {
    "p38-l01": [
      { label: "Semi-implicit Euler", href: "/glossary#semi-implicit-euler", kind: "Thuật ngữ" },
      { label: "Particle lifecycle", href: "/glossary#particle-lifecycle", kind: "Thuật ngữ" },
    ],
    "p38-l02": [
      {
        label: "Deterministic initialization",
        href: "/glossary#deterministic-particle-initialization",
        kind: "Thuật ngữ",
      },
      { label: "GPU hash RNG", href: "/glossary#gpu-hash-rng", kind: "Thuật ngữ" },
    ],
    "p38-l03": [
      {
        label: "glGetInteger64v",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGet.xhtml",
        kind: "OpenGL API",
      },
      { label: "SSBO", href: "/glossary#shader-storage-buffer-object", kind: "Thuật ngữ" },
    ],
    "p38-l04": [
      {
        label: "glDispatchCompute",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml",
        kind: "OpenGL API",
      },
      { label: "Bounds guard", href: "/glossary#compute-bounds-guard", kind: "Thuật ngữ" },
    ],
    "p38-l05": [
      {
        label: "gl_VertexID",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml",
        kind: "OpenGL API",
      },
      { label: "Point sprite", href: "/glossary#point-sprite", kind: "Thuật ngữ" },
    ],
    "p38-l06": [
      {
        label: "glMemoryBarrier",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU-resident state", href: "/glossary#gpu-resident-state", kind: "Thuật ngữ" },
    ],
    "p38-l07": [
      { label: "Delta-time clamp", href: "/glossary#delta-time-clamp", kind: "Thuật ngữ" },
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
    ],
    "p38-l08": [
      {
        label: "glGetQueryObject",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetQueryObject.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "Asynchronous query ring",
        href: "/glossary#asynchronous-query-ring",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l09": [
      { label: "Validation probe", href: "/glossary#gpu-validation-probe", kind: "Thuật ngữ" },
      { label: "Mixed tolerance", href: "/glossary#mixed-tolerance", kind: "Thuật ngữ" },
    ],
    "p38-l10": [
      {
        label: "glDeleteVertexArrays",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteVertexArrays.xhtml",
        kind: "OpenGL API",
      },
      { label: "Phép kiểm tra có tên", href: "/glossary#named-validation", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
