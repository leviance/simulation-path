import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time, pause và giới hạn bước thời gian khi mô phỏng chuyển động",
    "Project 31 — tư duy data-oriented khi một vòng lặp phải đi qua hàng triệu phần tử",
    "Project 33 — SDL3 tạo OpenGL context và quản lý shader/program/resource lifetime",
    "Project 37 — SSBO std430, compute workgroup, bounds guard, memory barrier và GPU timer query",
  ],
  summary:
    "Xây một đài phun có thể cập nhật và vẽ tới năm triệu particle mà không tải toàn bộ trạng thái về CPU ở mỗi frame. Compute shader cập nhật vị trí, vận tốc và vòng đời ngay trong SSBO; vertex shader đọc lại chính buffer ấy bằng gl_VertexID. Qua đó, bạn sẽ thấy barrier nối hai shader ra sao, timer query đo phần việc nào và vì sao chỉ cần một buffer nhỏ để kiểm tra kết quả.",
  challenge: {
    timebox: "1.050–1.380 phút",
    mission:
      "Tự xây dựng một mô phỏng đài phun 2D bằng C++/SDL3/OpenGL 4.3, trong đó GPU giữ, cập nhật và render tối đa 5.000.000 particle từ cùng một SSBO mà không readback toàn bộ buffer trong vòng lặp bình thường.",
    outcome:
      "Một cửa sổ hiển thị dòng hạt phun lên, rơi xuống dưới tác dụng của trọng lực rồi tái sinh tại emitter. Phím 1–4 chọn 100 nghìn, 500 nghìn, 1 triệu hoặc 5 triệu hạt; Space tạm dừng, N chạy đúng một bước, R đặt lại và V kiểm tra một nhóm hạt nhỏ. Thanh tiêu đề cho biết số hạt thực tế, dung lượng buffer, thời gian compute/draw và kết quả kiểm tra.",
    requirements: [
      "Starter tạo SDL window cùng OpenGL 4.3 Core context, xử lý resize/high-DPI và báo rõ giới hạn phần cứng nào chưa đáp ứng.",
      "Một Particle gồm hai vec4: positionAge và velocityLife; C++ size/alignment/offset phải khớp struct std430 trong cả compute lẫn vertex shader.",
      "Dữ liệu khởi tạo phải tái lập được từ seed (deterministic). Tuổi ban đầu được trải đều trong vòng đời để đài phun có hình ngay frame đầu; một bước mô phỏng trên CPU được dùng để đối chiếu nhóm hạt thử nghiệm.",
      "Ứng dụng tính trước 5.000.000 × sizeof(Particle), đọc GL_MAX_SHADER_STORAGE_BLOCK_SIZE và chỉ cấp phát preset mà GPU hỗ trợ; nếu không đủ bộ nhớ, chương trình phải tự chọn mức thấp hơn và giải thích lý do.",
      "Compute shader dùng local_size_x=256, phép chia làm tròn lên và kiểm tra index trước mọi lần truy cập SSBO.",
      "Từng invocation chỉ cập nhật particle cùng index bằng semi-implicit Euler, trọng lực, age/lifetime và deterministic respawn.",
      "Vertex shader đọc cùng SSBO ở binding 0 bằng gl_VertexID; render path không cần chép particle sang một VBO thứ hai và không readback mỗi frame.",
      "Sau compute, glMemoryBarrier dùng GL_SHADER_STORAGE_BARRIER_BIT vì consumer kế tiếp là vertex shader đọc SSBO.",
      "Frame time được clamp; pause không tích lũy dt, single-step dùng bước cố định và reset tái tạo đúng seed.",
      "Compute và draw dùng hai timer-query ring bất đồng bộ; code kiểm GL_QUERY_RESULT_AVAILABLE và không chờ query của frame vừa gửi.",
      "Phần kiểm tra chạy trên buffer thử gồm 64 particle, dùng chính compute shader, fixed dt và bản đối chiếu CPU; readback chỉ xảy ra khi người dùng yêu cầu hoặc lúc khởi tạo.",
      "Kèm starter, mười checkpoint độc lập, final có comment, ba shader, README và CTest thuần CPU.",
    ],
    constraints: [
      "Không dùng CUDA, OpenCL, Vulkan, WebGPU, transform feedback hoặc particle library có sẵn.",
      "Không update hàng triệu particle bằng CPU rồi upload lại mỗi frame.",
      "Không gọi glGetBufferSubData trên toàn bộ particle buffer trong render loop.",
      "Không dùng glFinish, FPS hoặc CPU wall-clock để gắn nhãn compute/draw GPU time.",
      "Không giả sử mọi GPU đều chứa được SSBO 160.000.000 byte; phải đọc giới hạn phần cứng trước khi bật preset 5 triệu.",
      "Không bỏ bounds guard dù 5.000.000 gần tròn theo mắt người; dispatch vẫn tạo 192 invocation dư.",
      "Không dùng GL_ALL_BARRIER_BITS để che việc chưa xác định consumer.",
      "Không đọc query result theo cách block mỗi frame và không chạy benchmark/window loop trong CTest.",
    ],
    definitionOfDone: [
      "sizeof(Particle)=32, alignof(Particle)=16 và offsetof(velocityLife)=16; shader dùng hai vec4 theo đúng thứ tự.",
      "5.000.000 particle cần 160.000.000 byte, tạo 19.532 workgroups × 256 invocation và có 192 tail lanes bị guard loại.",
      "Ứng dụng chọn preset lớn nhất phù hợp SSBO/workgroup limits, không allocation rồi mới đoán lỗi.",
      "Compute update dùng dt đã clamp, semi-implicit Euler và respawn cho age hết hạn hoặc particle rơi dưới floor.",
      "Static checkpoint render được particle trực tiếp từ binding 0 bằng gl_VertexID và một VAO rỗng hợp lệ cho Core profile.",
      "Final chạy theo chuỗi update → GL_SHADER_STORAGE_BARRIER_BIT → draw; không có full-buffer readback trong frame path.",
      "Pause giữ trạng thái đứng yên, N chỉ chạy một fixed step, R tái lập cùng seed và resize cập nhật viewport/half extent.",
      "Query ring bỏ qua timing khi slot còn bận, chỉ lấy kết quả available và giữ median từ tập mẫu hữu hạn.",
      "Validation probe bắt được layout, dispatch-tail, finite, gravity, integration và respawn; report nêu mismatch đầu tiên và maximum error.",
      "Additive blend, point-size và lifetime color tạo fountain đọc được ở cả preset nhỏ và lớn mà không đổi simulation state.",
      "Canvas có pause/reset, pointer capture, keyboard, DPR, reduced motion và ghi rõ đây là mô hình Canvas 2D chứ không phải phép đo GPU.",
      "Starter, mười checkpoint, final, CTest, Canvas tests và website production build đều hoàn thành trong timeout hữu hạn.",
    ],
  },
  duration: "29–38 giờ",
  objectives: [
    "Hiểu cách giữ toàn bộ trạng thái mô phỏng trên GPU và nối compute shader với vertex shader bằng đúng memory barrier",
    "Biết tổ chức dữ liệu vòng đời particle theo index: khởi tạo có thể tái lập, tích phân chuyển động, tăng tuổi và tái sinh",
    "Biết đo compute/draw bất đồng bộ, tự chọn preset theo giới hạn GPU và kiểm tra bằng một buffer nhỏ thay vì đọc lại hàng triệu particle",
  ],
  lessons: [
    {
      id: "p38-l01",
      slug: "01-khoa-hop-dong-mo-phong-particle",
      title: "Xác định dữ liệu và quy tắc chuyển động của particle",
      summary:
        "Định nghĩa trạng thái tối thiểu, semi-implicit Euler, vòng đời và CPU step tham chiếu trước khi chạm vào SSBO.",
      order: 1,
      estimatedMinutes: 125,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l02",
      slug: "02-khoi-tao-deterministic-va-trai-tuoi-hat",
      title: "Khởi tạo particle có thể tái lập và trải tuổi",
      summary:
        "Sinh velocity/lifetime từ index và seed, phân bố age ban đầu để fountain đã ở trạng thái ổn định tương đối ngay frame đầu.",
      order: 2,
      estimatedMinutes: 135,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l03",
      slug: "03-capability-budget-va-ssbo-160-mb",
      title: "Tính ngân sách cho SSBO 160 MB",
      summary:
        "Tính byte budget trước allocation, đọc limits và upload một Particle[ ] std430 với fallback rõ ràng cho máy không đủ 5 triệu hạt.",
      order: 3,
      estimatedMinutes: 145,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l04",
      slug: "04-compute-update-trong-luc-va-respawn",
      title: "Cập nhật trọng lực và respawn trong compute shader",
      summary:
        "Dispatch một invocation cho mỗi particle, tích phân semi-implicit, tăng age và tái sinh hạt hết vòng đời bằng hash deterministic.",
      order: 4,
      estimatedMinutes: 165,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l05",
      slug: "05-render-ssbo-bang-gl-vertexid",
      title: "Vẽ trực tiếp từ SSBO bằng gl_VertexID",
      summary:
        "Dùng vertex shader đọc particle theo gl_VertexID, VAO rỗng, GL_POINTS và fragment point-sprite mà không tạo bản sao VBO.",
      order: 5,
      estimatedMinutes: 165,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l06",
      slug: "06-barrier-tu-compute-sang-vertex-shader",
      title: "Đồng bộ compute shader với vertex shader",
      summary:
        "Chọn SHADER_STORAGE bit theo consumer, giữ particle trên GPU và loại full readback khỏi frame path.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l07",
      slug: "07-dieu-khien-thoi-gian-pause-va-single-step",
      title: "Pause, single-step và kiểm soát delta time",
      summary:
        "Clamp frame dt, không tích lũy thời gian lúc pause và dùng một fixed step có thể lặp lại khi nhấn N.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l08",
      slug: "08-timer-query-ring-va-thang-do-5-trieu",
      title: "Đo GPU bằng timer-query ring",
      summary:
        "Đo compute/draw bằng hai query ring không block, đọc median và đổi quy mô từ 100 nghìn tới 5 triệu bằng capability-aware controls.",
      order: 8,
      estimatedMinutes: 165,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l09",
      slug: "09-validation-probe-khong-readback-toan-bo",
      title: "Kiểm tra shader bằng một buffer probe nhỏ",
      summary:
        "Chạy cùng compute shader trên 64 particle, readback riêng probe buffer và đối chiếu với CPU oracle bằng named report.",
      order: 9,
      estimatedMinutes: 145,
      demoId: "five-million-particle-fountain",
    },
    {
      id: "p38-l10",
      slug: "10-hoan-thien-dai-phun-5-trieu-hat",
      title: "Hoàn thiện đài phun 5 triệu hạt",
      summary:
        "Ghép capability fallback, controls, resident pipeline, diagnostics, additive rendering, validation và cleanup thành source hoàn chỉnh.",
      order: 10,
      estimatedMinutes: 165,
      demoId: "five-million-particle-fountain",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
