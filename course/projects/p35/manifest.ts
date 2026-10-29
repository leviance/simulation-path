import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 33 — SDL/OpenGL context, GLSL compile/link, function loader và readback",
    "Project 34 — tách state khỏi tài nguyên, uniform handling và lifecycle của program",
    "C++20 — filesystem/stream/string; toán vector 2D và nội suy từ các project trước",
  ],
  summary:
    "Xây một shader playground fullscreen để sửa GLSL và xem kết quả ngay. Gallery có gradient, vòng tròn, Mandelbrot và noise chuyển động; F5 hoặc file watcher thử bản sửa, báo lỗi rõ và giữ program tốt gần nhất. Canvas minh họa công thức và giao dịch; C++ chạy compiler OpenGL thật.",
  duration: "28–38 giờ",
  objectives: [
    "Tự viết shader loader, compile/link logger và reload trigger an toàn",
    "Kiểm interface từ active uniforms của program đã link, không dò tên trong chuỗi source",
    "Tạo bốn hiệu ứng fullscreen có time/mouse/zoom và giải thích được công thức",
    "Kiểm last-good recovery, watcher, resize/high-DPI, hình ảnh và resource cleanup trên GPU thật",
  ],
  challenge: {
    timebox: "1.500–2.000 phút",
    mission:
      "Tự xây dựng một ứng dụng C++20/SDL3/OpenGL có thể đọc và reload GLSL khi đang chạy. Gallery trong cùng cửa sổ phải có gradient, circle, Mandelbrot và noise phủ viewport. Thử cả source sai rồi sửa lại: ứng dụng không restart và không mất hình tốt gần nhất.",
    outcome:
      "Một công cụ xem/sửa shader với phím 1–4 chọn hiệu ứng, F5 reload, tự theo dõi file, kéo mouse và zoom, time pause/step/reset. Chế độ showcase sạch hiển thị hiệu ứng lớn; debug/error overlay ghi program generation, attempts, file/log và hướng sửa. Không còn dùng một cube làm toàn bộ sản phẩm.",
    requirements: [
      "Dùng fullscreen triangle, cùng một window/context và renderer cho cả bốn hiệu ứng; không chỉ một quad nhỏ hoặc bốn app riêng.",
      "Đọc lab.vert và fragment được chọn từ shader directory rõ ràng; có giới hạn file, báo path/lỗi đọc và fallback dùng được.",
      "Compile hai stage riêng, kiểm status bất kể log rỗng và giữ nguyên log driver có file/stage.",
      "Link candidate program, kiểm active uniforms đúng type/array size: uResolution vec2, uTime float, uMouse vec2 và uZoom float.",
      "Giữ active program/locations/generation/fingerprint khi lỗi; chỉ bind program mới và xóa program cũ sau khi candidate hợp lệ.",
      "F5 thử reload thủ công; watcher theo dõi vertex và fragment đang yêu cầu với debounce hữu hạn, không block bằng sleep hoặc retry source lỗi đứng yên.",
      "Time/resolution/mouse/zoom cập nhật mỗi frame qua snapshot; đổi dữ liệu không compile lại hoặc reset khi đổi effect/reload.",
      "Resize/high-DPI dùng framebuffer pixels; mouse logical được đổi đúng gốc OpenGL bottom-left và có keyboard alternative.",
      "Có gradient/palette, circle/SDF/ripples, Mandelbrot với iteration limit và noise/fBm/domain warp; mọi effect có chuyển động và parameter thấy được.",
      "Có debug overlay đọc được và showcase sạch; lỗi mới vẫn hiện ở showcase, full log còn trong terminal.",
      "Mỗi executable có bản shader fallback đúng target, không bị checkpoint khác ghi đè khi build song song.",
      "Kèm starter, mười checkpoint, final có comment, GLSL/README/tests và ZIP độc lập; Canvas 2D có controls và giới hạn được nói rõ.",
    ],
    constraints: [
      "Không dùng engine, GLAD/GLEW, editor library hoặc GLSL compiler giả để thay driver trong ứng dụng C++.",
      "Không gọi source có tên uniform là interface hợp lệ; uniform có thể sai type hoặc bị compiler tối ưu mất.",
      "Không xóa last-good trước khi compile/link/validate xong; candidate lỗi không được rò shader/program object.",
      "Không dùng timeout trong một lời gọi tool làm bảo đảm chống treo; build/tests qua supervisor, native verification có chế độ hữu hạn và watchdog ngoài.",
      "Không chạy GUI trong CTest và không tự mở dev server.",
      "Canvas không chạy WebGL/GLSL. Editor giảng dạy chỉ nhận mẫu và hằng số được hỗ trợ; không tuyên bố kiểm được GLSL tùy ý.",
      "Không thêm loop không giới hạn vào shader mẫu hoặc fixture lỗi có thể làm treo GPU.",
    ],
    definitionOfDone: [
      "Bốn effect chạy trong cùng executable, phủ viewport, có time/mouse/zoom và chế độ xem sạch.",
      "Đổi file/nhấn F5 hiện kết quả; compile/link/interface lỗi có file/log và last-good giữ nguyên; sửa rồi reload phục hồi.",
      "Uniform locations được lấy lại sau mỗi link, kiểu/size được kiểm bằng reflection.",
      "Watcher debounce, đọc file lỗi có thể sửa, nguồn không đổi không tạo retry storm.",
      "Resize và mouse high-DPI có tests riêng; uniform change không tăng attempts/generation.",
      "Pixel probes/reference cho gallery và compile/link/type failure thật chạy trên OpenGL; resource cleanup được kiểm bằng glIs*.",
      "Debug overlay đọc được ở window nhỏ, error overlay không biến mất chỉ vì đang ở showcase.",
      "Starter/checkpoints/final build Debug/Release và CTest không phụ thuộc window.",
      "Canvas có pause/reset/step, preset, editor minh họa last-good, pointer capture, keyboard, DPR, reduced motion và mô tả thay thế.",
      "Build/test, trình duyệt, desktop và phần cứng được ghi riêng; source hiển thị/ZIP không lệch và output sinh không đưa vào Git.",
    ],
  },
  lessons: [
    {
      id: "p35-l01",
      slug: "01-dua-glsl-ra-file-rieng",
      title: "Đưa GLSL ra file và phủ kín cửa sổ",
      summary:
        "Bỏ mesh/camera không cần thiết, dùng fullscreen triangle và nạp shader từ đúng thư mục của executable/checkpoint.",
      order: 1,
      estimatedMinutes: 130,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l02",
      slug: "02-compile-shader-va-doc-info-log",
      title: "Compile từng shader và đọc lỗi đúng stage",
      summary:
        "Đọc compile status và log thật, ghi rõ file và vertex/fragment stage; không đoán cú pháp bằng tìm token.",
      order: 2,
      estimatedMinutes: 150,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l03",
      slug: "03-link-candidate-va-khoa-interface",
      title: "Link program, kiểm interface bằng driver",
      summary:
        "Phân biệt compile với link; kiểm active uniform, kiểu và array size sau link thay vì chỉ thấy tên trong source.",
      order: 3,
      estimatedMinutes: 170,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l04",
      slug: "04-reload-theo-giao-dich-giu-last-good",
      title: "Thử bản mới, giữ bản tốt gần nhất",
      summary:
        "Build candidate bên cạnh active program, cập nhật locations khi thành công và giữ hình/metadata cũ khi thất bại.",
      order: 4,
      estimatedMinutes: 170,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l05",
      slug: "05-theo-doi-file-va-debounce",
      title: "Tự reload sau khi file đã ổn định",
      summary:
        "Theo dõi timestamp, size và trạng thái file; debounce không block, coalesce thay đổi và không retry storm.",
      order: 5,
      estimatedMinutes: 150,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l06",
      slug: "06-truyen-time-resolution-va-mouse",
      title: "Time, pixel và mouse: dữ liệu đổi từng frame",
      summary:
        "Dùng một uniform snapshot; đổi logical input sang pixel OpenGL, pause/step và resize không compile lại.",
      order: 6,
      estimatedMinutes: 160,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l07",
      slug: "07-viet-fragment-shader-procedural",
      title: "Gradient và vòng tròn: tạo hình từ tọa độ",
      summary:
        "Từ UV đến palette chuyển động, signed distance của circle, anti-alias và ánh sáng viền có công thức rõ.",
      order: 7,
      estimatedMinutes: 190,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l08",
      slug: "08-mandelbrot-trong-fragment-shader",
      title: "Mandelbrot trong fragment shader",
      summary:
        "Biểu diễn số phức bằng vec2, lặp z²+c hữu hạn, kiểm escape và tô màu liên tục theo thời gian.",
      order: 8,
      estimatedMinutes: 210,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l09",
      slug: "09-noise-va-chuyen-dong-procedural",
      title: "Noise và chuyển động procedural",
      summary:
        "Nội suy value noise, cộng năm octave fBm và domain warp; hash số nguyên lặp lại được.",
      order: 9,
      estimatedMinutes: 200,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l10",
      slug: "10-hoan-thien-shader-gallery",
      title: "Hoàn thiện gallery và kiểm hot reload",
      summary:
        "Ghép gallery bốn hiệu ứng, error overlay/showcase, kiểm GPU và cleanup, source/ZIP độc lập.",
      order: 10,
      estimatedMinutes: 190,
      demoId: "shader-hot-reload",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
