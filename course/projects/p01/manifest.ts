import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "C++ cơ bản: biến, hàm, if, vòng lặp và struct; vector, uint32_t và size_t được giải thích khi dùng",
    "Đã làm theo Getting Started: compiler C++20, CMake 3.24+ và chạy được một target",
  ],
  summary:
    "Tự tạo ảnh trên CPU: từ vị trí một pixel trong vector đến bốn chế độ solid, gradient, checkerboard, noise và resize an toàn trên cửa sổ SDL3.",
  challenge: {
    timebox: "90–150 phút tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3 trong đó toàn bộ ảnh được tạo từ mảng pixel do bạn quản lý trên CPU. SDL chỉ mở cửa sổ, nhận sự kiện và đưa bức ảnh đã tạo lên màn hình.",
    outcome:
      "Cửa sổ có bốn chế độ: tô một màu, gradient, checkerboard và noise. Dùng phím 1–4 để đổi chế độ; kéo resize liên tục mà ảnh vẫn phủ kín vùng hiển thị, không lệch hàng và không crash.",
    requirements: [
      "Khởi tạo window/renderer, duy trì event loop và giải phóng tài nguyên khi nhận Close hoặc Escape.",
      "Framebuffer sở hữu đúng width × height pixel 32 bit; dữ liệu xếp row-major và index = y × width + x.",
      "Tự viết rgba và putPixel; kiểm tọa độ có dấu trước khi đổi sang size_t và không ghi ngoài vector.",
      "Có đủ solid, gradient hai trục, checkerboard với cell thay đổi được và noise tái lập bằng seed.",
      "Dùng texture RGBA8888 để copy ảnh CPU; pitch là số byte mỗi hàng, không phải số pixel.",
      "Framebuffer và texture khớp kích thước output thật. Resize tạo cặp mới trước khi thay cặp đang dùng; minimize không cấp phát ảnh 0×0.",
      "Có kiểm thử độc lập cho màu, index, biên, bốn scene, ảnh 1×1 và resize không hợp lệ; test chạy ở Debug lẫn Release.",
    ],
    constraints: [
      "Không dùng SDL_RenderPoint/Line/FillRect hoặc OpenGL để tạo hình thay cho framebuffer. SDL_RenderTexture chỉ copy ảnh đã tính.",
      "C++20, CMake ≥3.24, SDL 3.4.8; không thêm thư viện vẽ hay framework.",
      "Công bố giới hạn cấp phát và báo lỗi khi vượt giới hạn; không tự đổi kích thước thành một ảnh khác rồi gọi là đã resize đúng.",
      "Canvas chỉ là bàn thí nghiệm phóng to pixel, không thay ứng dụng desktop chạy được.",
    ],
    definitionOfDone: [
      "Phím 1/2/3/4 lần lượt chọn solid/gradient/checker/noise; mỗi chế độ phủ kín ảnh.",
      "Framebuffer 4×3 có 12 phần tử; index(0,0)=0, index(0,1)=4 và index(3,2)=11.",
      "Ghi ngoài bốn cạnh không đổi dữ liệu; một putPixel hợp lệ chỉ đổi đúng phần tử được chọn.",
      "Gradient đạt 0/255 ở đúng hai đầu; ảnh rộng hoặc cao 1 không chia cho 0; cell≤0 có quy tắc xử lý rõ.",
      "Cùng kích thước và seed cho cùng noise; có fixture biết trước, không chỉ so hai lần gọi cùng thuật toán.",
      "Kéo resize ít nhất 10 lần, minimize/restore rồi đổi scene; texture không null hoặc lệch kích thước với framebuffer.",
      "CTest đạt cả Debug và Release. Smoke ẩn hữu hạn và kiểm trực tiếp desktop được ghi nhận riêng.",
      "Có source đầy đủ từng checkpoint, final, README, tests và ZIP; không đưa thư viện SDL hoặc output build vào Git.",
    ],
  },
  duration: "7–10 giờ, chưa tính thử thách và bài tập mở rộng",
  objectives: [
    "Tự viết và giải thích vòng đời init → event loop → cleanup của một ứng dụng SDL3.",
    "Hiểu một ảnh hai chiều được lưu trong vector một chiều và bốn kênh màu được đóng gói ra sao.",
    "Tạo đủ bốn scene từ công thức CPU rồi đưa ảnh qua texture với pitch đúng.",
    "Phân biệt window coordinates với pixel output; resize an toàn và kiểm chứng thay vì chỉ nhìn ảnh.",
  ],
  lessons: [
    {
      id: "p01-l01",
      slug: "01-cua-so-va-event-loop",
      title: "Mở cửa sổ và giữ chương trình phản hồi",
      summary: "Từ starter chạy được đến window, renderer, event loop, báo lỗi và cleanup.",
      order: 1,
      estimatedMinutes: 65,
    },
    {
      id: "p01-l02",
      slug: "02-framebuffer-la-gi",
      title: "Tạo framebuffer và tìm vị trí một pixel",
      summary: "Tự tính ảnh 4×3, dùng vector và giữ kích thước khớp vùng nhớ khi cấp phát.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "pixel",
    },
    {
      id: "p01-l03",
      slug: "03-putpixel-va-rgba",
      title: "Ghi màu và đưa những pixel đầu tiên lên cửa sổ",
      summary:
        "RGBA, bounds, streaming texture và pitch được nối thành một dấu cộng nhìn thấy được.",
      order: 3,
      estimatedMinutes: 110,
      demoId: "pixel",
    },
    {
      id: "p01-l04",
      slug: "04-pattern-dau-tien",
      title: "Tạo bốn chế độ: solid, gradient, checkerboard và noise",
      summary: "Viết từng công thức, chọn bằng phím 1–4 và chỉ tính lại ảnh khi có thay đổi.",
      order: 4,
      estimatedMinutes: 95,
      demoId: "pixel",
    },
    {
      id: "p01-l05",
      slug: "05-present-va-resize",
      title: "Resize mà không làm sai ảnh hoặc mất tài nguyên",
      summary: "Đọc pixel output thật, thay cả framebuffer lẫn texture và xử lý minimize/restore.",
      order: 5,
      estimatedMinutes: 80,
      demoId: "pixel",
    },
    {
      id: "p01-l06",
      slug: "06-validation",
      title: "Kiểm chứng và chạy dự án hoàn chỉnh",
      summary:
        "Fixture độc lập, CTest Debug/Release, smoke hữu hạn và checklist desktop theo spec.",
      order: 6,
      estimatedMinutes: 80,
      demoId: "pixel",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
