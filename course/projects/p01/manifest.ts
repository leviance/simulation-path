import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: ["C++ cơ bản", "CMake 3.24+"],
  summary:
    "Tự tạo framebuffer trên CPU, ghi màu cho từng pixel rồi đưa bức ảnh đó lên cửa sổ SDL3.",
  challenge: {
    timebox: "90–120 phút",
    mission:
      "Viết một ứng dụng SDL3 trong đó bạn tự tạo và quản lý toàn bộ pixel trên CPU. SDL chỉ giúp mở cửa sổ, nhận thao tác từ người dùng và hiển thị framebuffer.",
    outcome:
      "Cửa sổ hiển thị được gradient, checkerboard và noise tạo từ seed cố định. Có thể đổi mẫu bằng phím 1–3 và kéo thay đổi kích thước cửa sổ mà hình ảnh vẫn đúng.",
    requirements: [
      "Mở cửa sổ, chạy event loop và thoát bằng phím Escape hoặc khi nhận SDL_EVENT_QUIT.",
      "Tạo kiểu Framebuffer chứa width, height và đúng width × height phần tử pixel.",
      "Tự viết rgba, index và putPixel; mọi tọa độ ngoài ảnh phải được bỏ qua an toàn.",
      "Tạo ba mẫu hình: gradient theo hai trục, checkerboard có kích thước ô thay đổi được và noise sinh từ seed cố định.",
      "Cập nhật streaming texture bằng framebuffer với pitch tính đúng theo byte, rồi hiển thị texture lên cửa sổ.",
      "Tạo lại cả framebuffer lẫn texture khi kích thước pixel của cửa sổ thay đổi.",
      "Dùng các phím 1, 2, 3 để chuyển mẫu hình ngay khi chương trình đang chạy.",
    ],
    constraints: [
      "Không dùng SDL_RenderPoint, SDL_RenderLine hay API vẽ primitive có sẵn.",
      "Luôn kiểm tra biên trước khi ghi vào pixels.",
      "Dùng C++20, lưu pixel theo row-major và thống nhất một cách đóng gói màu RGBA trong toàn project.",
    ],
    definitionOfDone: [
      "Kiểm thử xác nhận index(0,0)=0 và index(width−1,height−1)=width×height−1.",
      "Gọi putPixel với tọa độ âm hoặc vượt biên không làm thay đổi framebuffer.",
      "Kéo thay đổi kích thước cửa sổ liên tục ít nhất 10 lần mà chương trình không lỗi và không gọi hàm render với `texture == nullptr`.",
      "Bạn giải thích được công thức index = y × width + x và lý do pitch phải tính theo byte.",
    ],
  },
  duration: "4–5 giờ",
  objectives: [
    "Hiểu vòng đời một ứng dụng SDL3",
    "Tự quản lý pixel RGBA trên CPU",
    "Hiểu cách tính vị trí pixel và bảo vệ biên ảnh",
  ],
  lessons: [
    {
      id: "p01-l01",
      slug: "01-cua-so-va-event-loop",
      title: "Cửa sổ và event loop",
      summary: "Mở cửa sổ, xử lý sự kiện và đóng ứng dụng đúng cách.",
      order: 1,
      estimatedMinutes: 45,
    },
    {
      id: "p01-l02",
      slug: "02-framebuffer-la-gi",
      title: "Framebuffer là gì?",
      summary: "Biến một mảng tuyến tính thành lưới pixel hai chiều.",
      order: 2,
      estimatedMinutes: 35,
      demoId: "pixel",
    },
    {
      id: "p01-l03",
      slug: "03-putpixel-va-rgba",
      title: "Tự viết putPixel và RGBA",
      summary: "Đóng gói màu, chặn ghi ngoài biên và vẽ pixel đầu tiên.",
      order: 3,
      estimatedMinutes: 60,
      demoId: "pixel",
    },
    {
      id: "p01-l04",
      slug: "04-pattern-dau-tien",
      title: "Gradient, checkerboard và noise",
      summary: "Tạo ba mẫu hình vừa đẹp mắt, vừa giúp phát hiện lỗi.",
      order: 4,
      estimatedMinutes: 35,
    },
    {
      id: "p01-l05",
      slug: "05-present-va-resize",
      title: "Đưa framebuffer lên cửa sổ",
      summary: "Cập nhật texture và tạo lại tài nguyên khi kích thước thay đổi.",
      order: 5,
      estimatedMinutes: 40,
    },
    {
      id: "p01-l06",
      slug: "06-validation",
      title: "Kiểm tra và hoàn thiện",
      summary: "Viết các phép kiểm thử cần thiết rồi chạy toàn bộ dự án.",
      order: 6,
      estimatedMinutes: 30,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
