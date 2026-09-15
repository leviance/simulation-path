import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 33 — OpenGL context, function loader, shader compile/link và GPU buffers",
    "Project 34 — indexed cube, shared MVP, depth/culling và resource lifetime",
    "C++20 — std::filesystem, file stream, string và state machine đơn giản",
  ],
  summary:
    "Biến cube GPU thành một phòng thí nghiệm GLSL có thể sửa khi chương trình đang chạy. Bạn sẽ đọc shader từ file, compile/link một candidate program, giữ program cũ khi source lỗi, tự phát hiện file thay đổi và truyền time/resolution/mouse để viết hiệu ứng procedural có thể quan sát ngay.",
  challenge: {
    timebox: "720–960 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL hiển thị indexed cube và theo dõi hai file `lab.vert`, `lab.frag`. Mỗi lần người dùng lưu file hoặc nhấn F5, ứng dụng phải thử compile/link source mới mà không dừng render loop. Chỉ candidate hợp lệ mới được thay program đang chạy; mọi lỗi phải có diagnostics và cube vẫn được vẽ bằng last-good program.",
    outcome:
      "Một cửa sổ shader lab có cube procedural, time animation và mouse interaction. Terminal cho biết chính xác thư mục shader, stage thất bại và driver info log. Title bar hiển thị program generation, reload attempts, trạng thái gần nhất và validation. Người học có thể sửa GLSL rồi thấy kết quả mà không build lại C++.",
    requirements: [
      "Starter giữ OpenGL 3.3 Core context, indexed cube, VAO/VBO/EBO, MVP, depth test và face culling đã chạy được từ Project 34.",
      "Đưa vertex và fragment shader ra file text nằm trong từng snapshot source; executable biết chính xác thư mục shader của target đang chạy.",
      "Đọc file theo binary mode, giữ nguyên nội dung và báo tên file khi open/read thất bại.",
      "Compile từng stage riêng, kiểm `GL_COMPILE_STATUS` và lấy đầy đủ `glGetShaderInfoLog` trước khi xóa shader lỗi.",
      "Link một candidate program riêng, kiểm `GL_LINK_STATUS`, program info log và các location/interface bắt buộc trước khi commit.",
      "Reload theo giao dịch: program cũ chỉ bị xóa sau khi candidate đã compile, link và validate thành công.",
      "F5 luôn thử reload thủ công; auto watcher so timestamp của cả hai file và dùng debounce hữu hạn để không compile file đang được editor ghi dở.",
      "Một source lỗi không được tạo reload storm: watcher chỉ thử lại sau khi timestamp thay đổi lần nữa hoặc người dùng nhấn F5.",
      "Mỗi frame upload cùng `uMvp`, `uTime`, `uResolution` theo framebuffer pixels và `uMouse` đã đổi từ window coordinates sang OpenGL pixel coordinates.",
      "Fragment shader cuối dùng local position, time, resolution và mouse để tạo hiệu ứng procedural có thể giải thích từng thành phần.",
      "Window resize/high-DPI phải cập nhật viewport, aspect và resolution uniform mà không reload program.",
      "Kèm starter, tám checkpoint độc lập, final có chú thích, shader source, README và CTest thuần CPU.",
    ],
    constraints: [
      "Không gọi compiler ngoài, không nhúng editor library và không chạy GLSL trên CPU; OpenGL driver mới là compiler thật.",
      "Không xóa active program trước khi candidate hoàn tất, kể cả khi người dùng lưu file liên tục.",
      "Không bỏ qua compile/link status chỉ vì info log rỗng hoặc vì shader cũ vẫn đang vẽ được.",
      "Không cache uniform location từ program cũ sang program mới; location được truy vấn lại sau mỗi link thành công.",
      "Không dùng `sleep` trong render loop để debounce; watcher đọc thời gian và tiếp tục xử lý input/render bình thường.",
      "Không dựa vào current working directory ngẫu nhiên; source path và executable fallback phải có quy ước rõ.",
      "Không reload vì `uTime` hoặc mouse thay đổi; uniform data và shader source là hai luồng cập nhật khác nhau.",
      "Không biến Project 35 thành shader engine tổng quát; chỉ giữ những abstraction cần để quan sát compile–link–commit.",
    ],
    definitionOfDone: [
      "Starter chạy cube bằng embedded shaders trước khi hot reload được thêm.",
      "Checkpoint 1 đọc đúng `lab.vert`/`lab.frag`; lỗi path nêu rõ file không mở được.",
      "Compile error ghi stage và driver info log; link error được phân biệt với compile error.",
      "Candidate thiếu `uMvp` hoặc varying contract không thể trở thành active program.",
      "Chèn lỗi vào fragment shader làm reload thất bại nhưng program generation và hình đang vẽ không đổi.",
      "Sửa lỗi rồi lưu làm generation tăng đúng một và program cũ chỉ bị xóa sau commit.",
      "Auto watcher gom nhiều timestamp change thành một reload sau debounce và không lặp lại khi file đứng yên.",
      "Time, resolution và mouse locations được truy vấn lại sau link; uniform values thay đổi mà không compile lại.",
      "Resize ở màn hình high-DPI giữ đúng aspect và shader nhận framebuffer pixels, không phải chỉ logical window size.",
      "Canvas có editor, compile/error experiment, pause/reset, pointer capture, keyboard, DPR, reduced-motion và readout văn bản.",
      "GPU objects được xóa khi context vẫn current; candidate lỗi không rò shader/program object.",
      "Starter, tám checkpoint, final build ở Debug/Release; CTest, Canvas tests và website build đều đạt.",
    ],
  },
  duration: "20–27 giờ",
  objectives: [
    "Hiểu compile, link, interface validation và program lifetime như bốn bước riêng",
    "Thiết kế hot reload theo giao dịch để source lỗi không phá frame đang hiển thị",
    "Phân biệt thay shader program với cập nhật uniform data mỗi frame",
  ],
  lessons: [
    {
      id: "p35-l01",
      slug: "01-dua-glsl-ra-file-rieng",
      title: "Đưa GLSL ra file riêng",
      summary:
        "Bắt đầu từ cube chạy bằng embedded shader, tạo `lab.vert`/`lab.frag`, đọc đúng snapshot directory và chứng minh sửa file không cần biên dịch lại C++.",
      order: 1,
      estimatedMinutes: 120,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l02",
      slug: "02-compile-shader-va-doc-info-log",
      title: "Compile shader và đọc info log",
      summary:
        "Compile vertex/fragment riêng, giữ tên stage và lấy driver log để một lỗi GLSL trở thành thông tin có thể sửa thay vì màn hình đen.",
      order: 2,
      estimatedMinutes: 125,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l03",
      slug: "03-link-candidate-va-khoa-interface",
      title: "Link candidate program và khóa interface",
      summary:
        "Link vào program tạm, kiểm varying/uniform contract và chỉ coi candidate sẵn sàng khi toàn pipeline có thể được draw.",
      order: 3,
      estimatedMinutes: 135,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l04",
      slug: "04-reload-theo-giao-dich-giu-last-good",
      title: "Reload theo giao dịch, giữ last-good",
      summary:
        "Thêm F5, build candidate bên cạnh active program và commit theo đúng thứ tự để shader lỗi không làm mất hình đang chạy.",
      order: 4,
      estimatedMinutes: 145,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l05",
      slug: "05-theo-doi-file-va-debounce",
      title: "Theo dõi file và debounce",
      summary:
        "Poll hai timestamp không block render loop, chờ file ổn định 140 ms rồi phát đúng một reload request.",
      order: 5,
      estimatedMinutes: 130,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l06",
      slug: "06-truyen-time-resolution-va-mouse",
      title: "Truyền time, resolution và mouse",
      summary:
        "Tách uniform update khỏi source reload, xử lý high-DPI coordinates và truy vấn lại location cho mỗi program generation.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l07",
      slug: "07-viet-fragment-shader-procedural",
      title: "Viết fragment shader procedural",
      summary:
        "Từ local position và uniform snapshot, ghép rings, palette cùng mouse glow thành hiệu ứng có thể sửa từng hằng số và thấy ngay.",
      order: 7,
      estimatedMinutes: 145,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l08",
      slug: "08-hoan-thien-shader-hot-reload-lab",
      title: "Hoàn thiện Shader Hot Reload Lab",
      summary:
        "Khóa named validation, thí nghiệm lỗi, Debug/Release build, cleanup và toàn bộ source trước khi sang ray marching ở Project 36.",
      order: 8,
      estimatedMinutes: 145,
      demoId: "shader-hot-reload",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
