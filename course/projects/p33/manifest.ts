import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — SDL3 window, event loop và quy trình kiểm tra lỗi",
    "Project 15 — Local → Clip → NDC → Screen và cách lần theo một vertex",
    "Project 16 — coverage, barycentric weights và nội suy màu trên CPU",
  ],
  summary:
    "Vẽ cùng một tam giác bằng hai con đường: CPU rasterizer đã tự xây và OpenGL 3.3 Core. Mỗi vertex dùng chung position, color và transform; hai panel được đối chiếu từ input, vertex shader, NDC, viewport cho tới màu fragment đọc lại từ GPU.",
  challenge: {
    timebox: "750–950 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3 tạo OpenGL 3.3 Core context và vẽ cùng một tam giác ở hai nửa cửa sổ. Nửa trái là framebuffer CPU được upload thành texture; nửa phải là triangle do GPU rasterize. Người dùng phải đổi transform, solid/smooth color và đọc probe để kiểm tra hai pipeline thay vì chỉ thấy hai hình giống nhau.",
    outcome:
      "Một cửa sổ high-DPI chia đôi rõ CPU/GPU. Title bar báo kích thước pixel thật, transform, chế độ interpolation, probe NDC, barycentric weights và maximum RGB difference; terminal giữ shader diagnostics cùng validation report có tên.",
    requirements: [
      "Tạo SDL window với `SDL_WINDOW_OPENGL`, yêu cầu OpenGL 3.3 Core, tạo context rồi mới gọi `SDL_GL_GetProcAddress`.",
      "Lấy kích thước framebuffer bằng `SDL_GetWindowSizeInPixels`; không dùng logical window size cho `glViewport`.",
      "Viết loader tối thiểu cho đúng các OpenGL function project dùng và kiểm mọi function pointer trước lần gọi đầu.",
      "Compile vertex/fragment shader riêng, đọc `GL_COMPILE_STATUS`, link program, đọc `GL_LINK_STATUS` và in đầy đủ info log khi lỗi.",
      "Dùng một vertex contract gồm hai `float` position và ba `float` color; khóa stride/offset bằng `offsetof` và `static_assert`.",
      "Upload ba vertex vào VBO, mô tả attributes trong VAO và vẽ bằng `glDrawArrays(GL_TRIANGLES, 0, 3)`.",
      "Giữ CPU reference rasterizer độc lập: transform cùng thứ tự, đổi NDC sang framebuffer top-left, tính barycentric weights và ghi RGBA8.",
      "Upload CPU framebuffer bằng texture và vẽ nó ở viewport trái; GPU triangle dùng viewport phải nhưng cùng NDC contract.",
      "Vertex shader và CPU phải cùng thực hiện rotate → scale → translate bằng cùng angle, scale và translation.",
      "Solid mode dùng một màu cố định; smooth mode nội suy ba vertex colors bằng barycentric weights/fragment shader.",
      "Đọc một số probe nằm xa triangle edges bằng `glReadPixels`, so với CPU expected color sau quantization và dùng tolerance theo channel.",
      "Kèm starter, chín checkpoint độc lập, final có comment, README và CTest chỉ gọi code CPU thuần không tạo OpenGL context.",
    ],
    constraints: [
      "Không dùng immediate mode (`glBegin/glEnd`), fixed-function matrix, compatibility profile, GLU, GLUT hoặc SDL_Renderer trong project này.",
      "Không dùng GLAD, GLEW hoặc loader sinh sẵn; project nhỏ này tự load đúng tập function cần dùng để thấy context lifecycle.",
      "Không viết hai bộ vertex data hoặc hai công thức transform riêng chỉ để hình trông giống nhau.",
      "Không so pixel đúng trên triangle edge vì CPU và GPU có thể khác coverage rule; probe validation phải nằm đủ xa edge.",
      "Không đảo ảnh CPU bằng cách sửa tùy tiện vertex positions; xử lý rõ khác biệt top-left framebuffer và bottom-left OpenGL texture/viewport.",
      "Không coi shader compile thành công là pipeline đúng; VAO, attribute location, stride, viewport và fragment output đều phải được kiểm.",
      "Không gọi OpenGL function sau khi đã destroy context; function pointers và GPU resources cùng thuộc context lifetime.",
      "Không chạy GUI trong CTest hoặc phụ thuộc GPU của CI; test tự động khóa math, rasterization, mapping và tolerance bằng code CPU.",
    ],
    definitionOfDone: [
      "Context yêu cầu OpenGL 3.3 Core và mọi function pointer cần thiết được load sau khi context current.",
      "Shader compile/link failure trả log rõ ràng, không tiếp tục dùng program bằng 0.",
      "VBO chứa đúng ba vertex; VAO mô tả position/color bằng stride và offsets khớp `GpuVertex`.",
      "GPU vẽ triangle ở viewport phải; CPU rasterizer vẽ cùng geometry ở framebuffer riêng rồi upload sang viewport trái.",
      "Identity và nhiều transform rotate/scale/translate cho cùng NDC vertex ở CPU và vertex-shader contract.",
      "NDC ↔ CPU top-left pixel và NDC ↔ GPU bottom-left window coordinate đều round-trip trong sai số nhỏ.",
      "Barycentric weights tại centroid gần 1/3; solid/smooth mode tạo đúng color contract.",
      "Interior probes sau `glReadPixels` nằm trong tolerance RGBA8; edge probes được ghi rõ là không dùng làm pass/fail.",
      "Resize/high-DPI cập nhật hai viewport và CPU texture theo framebuffer pixel size thật.",
      "Resources được destroy theo thứ tự texture/buffer/program → GL context → window → SDL; app reset/pause/step được.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/step/reset và có mô tả thay thế bằng văn bản.",
      "Starter, chín checkpoint và final build ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "21–28 giờ",
  objectives: [
    "Nối từng stage OpenGL/GLSL với stage tương ứng trong renderer CPU đã tự xây",
    "Quản lý rõ context, function loader, shader program, VBO, VAO, texture và resource lifetime",
    "Kiểm chứng CPU/GPU bằng coordinate trace và interior color probes thay vì chỉ nhìn bằng mắt",
  ],
  lessons: [
    {
      id: "p33-l01",
      slug: "01-tao-opengl-context-tu-sdl3",
      title: "Tạo OpenGL context từ SDL3",
      summary:
        "Bắt đầu từ event-loop skeleton, yêu cầu OpenGL 3.3 Core, tạo context đúng thứ tự và chia framebuffer pixels thành hai vùng clear nhìn thấy được.",
      order: 1,
      estimatedMinutes: 120,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l02",
      slug: "02-bien-dich-shader-dau-tien",
      title: "Biên dịch shader đầu tiên",
      summary:
        "Viết vertex/fragment shader tối thiểu, load function qua context hiện tại và giữ compile/link log đủ rõ để tự tìm lỗi GLSL.",
      order: 2,
      estimatedMinutes: 135,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l03",
      slug: "03-dua-triangle-vao-vbo-va-vao",
      title: "Đưa triangle vào VBO và VAO",
      summary:
        "Khóa vertex memory contract, upload ba vertex, mô tả hai attributes và thực hiện draw call GPU đầu tiên ở nửa phải cửa sổ.",
      order: 3,
      estimatedMinutes: 145,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l04",
      slug: "04-ve-cung-triangle-bang-cpu",
      title: "Vẽ cùng triangle bằng CPU",
      summary:
        "Mang barycentric rasterizer trở lại, ghi framebuffer RGBA8 và upload nó thành texture ở nửa trái mà không trộn code CPU vào shader path.",
      order: 4,
      estimatedMinutes: 155,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l05",
      slug: "05-doi-chieu-transform-voi-vertex-shader",
      title: "Đối chiếu transform với vertex shader",
      summary:
        "Dùng cùng angle, scale và translation cho CPU/GLSL, rồi trace từng vertex sau rotate → scale → translate.",
      order: 5,
      estimatedMinutes: 140,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l06",
      slug: "06-ndc-viewport-va-hai-he-truc-y",
      title: "NDC, viewport và hai hệ trục Y",
      summary:
        "Phân biệt framebuffer top-left với OpenGL bottom-left, dùng pixel size thật và kiểm round-trip của cả hai phép ánh xạ khi resize.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l07",
      slug: "07-noi-suy-mau-trong-fragment-shader",
      title: "Nội suy màu trong fragment shader",
      summary:
        "Bật smooth color ở cả hai phía, nối barycentric weights CPU với varying GPU và tách coverage khỏi color interpolation.",
      order: 7,
      estimatedMinutes: 145,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l08",
      slug: "08-doc-lai-gpu-va-do-sai-khac",
      title: "Đọc lại GPU và đo sai khác",
      summary:
        "Chọn probe nội thất, đổi NDC thành GPU window pixel, gọi glReadPixels và so RGB sau quantization bằng tolerance có lý do.",
      order: 8,
      estimatedMinutes: 150,
      demoId: "cpu-gpu-triangle",
    },
    {
      id: "p33-l09",
      slug: "09-hoan-thien-cpu-gpu-triangle",
      title: "Hoàn thiện CPU/GPU Triangle",
      summary:
        "Ghép input, resize, validation, diagnostics và cleanup thành final app; build/test cả Debug lẫn Release trước khi sang cube ở Project 34.",
      order: 9,
      estimatedMinutes: 155,
      demoId: "cpu-gpu-triangle",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
