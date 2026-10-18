import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: ["Project 01 — framebuffer, putPixel, texture và event loop"],
  summary:
    "Tự tô một ô vuông, điều khiển bằng WASD, đo lỗi phụ thuộc FPS rồi sửa bằng delta time và viết bộ giới hạn 60 FPS.",
  challenge: {
    timebox: "90–120 phút",
    mission:
      "Từ cửa sổ và framebuffer của Project 01, tự xây dựng một ứng dụng 2D có ô vuông điều khiển bằng WASD. Ô vuông phải giữ tốc độ theo pixel/giây khi thay đổi FPS; bạn tự viết cả hàm tô hình chữ nhật lẫn bộ giới hạn 60 FPS.",
    outcome:
      "Ứng dụng C++ chạy độc lập: WASD di chuyển, 1/2/3 chọn 30/60/120 FPS, 0 bỏ giới hạn, F1 bật/tắt mức cap gần nhất. Thanh tiêu đề hiển thị FPS, quãng đường và phép đo năm giây; resize không làm méo ô vuông.",
    requirements: [
      "Dùng hai vòng lặp và putPixel để tự tô ô vuông, không gọi SDL_RenderFillRect thay cho phần này.",
      "Đọc trạng thái WASD sau khi xử lý sự kiện; thả phím thì dừng, các phím đối nghịch triệt tiêu nhau.",
      "Tách position, direction và velocity; chuẩn hóa hướng để đi chéo không nhanh hơn đi thẳng.",
      "Đo dt bằng SDL_GetTicksNS, đổi sang giây và cập nhật vị trí bằng vận tốc nhân thời gian.",
      "Giới hạn dt ở 0,05 giây, đồng thời giải thích rằng thời gian vượt ngưỡng bị bỏ chứ không được mô phỏng bù.",
      "Đo thời gian làm việc của frame, chỉ nghỉ phần còn thiếu; khung hình quá hạn không được gây unsigned underflow.",
      "Giữ player trong ảnh logic 960×540; resize chỉ thay tỉ lệ hiển thị và giữ nguyên tỉ lệ hai chiều.",
      "Có phép đo tham chiếu đúng năm giây không bị giới hạn bởi biên; tạm ngưng khi mất focus/minimize và có phím đặt lại.",
    ],
    constraints: [
      "Không dùng 1/60 làm dt trong bản final và không dùng game loop của engine.",
      "SDL chỉ phụ trách cửa sổ, sự kiện, đồng hồ và hiển thị ảnh; tự cài đặt tô hình, cập nhật chuyển động và FPS limiter.",
      "Canvas chỉ hỗ trợ giải thích; sản phẩm cuối phải là ứng dụng C++/SDL3 chạy được.",
    ],
    definitionOfDone: [
      "Ở 30/60/120 FPS, cùng năm giây và không có dt vượt 0,05 s, phép đo tham chiếu cho khoảng 900 px; sai lệch không quá 2%.",
      "Đi chéo và đi thẳng cùng tốc độ; player không vượt bốn cạnh, resize không bóp méo hình.",
      "F1 chuyển capped/uncapped, hiển thị FPS thực; mức cap là giới hạn trên gần đúng, không cam kết phần cứng luôn đạt 60 FPS.",
      "Giải thích được FPS, số lần cập nhật và thời gian mô phỏng; nêu đúng trường hợp clamp làm mô phỏng chậm hơn thời gian thực.",
    ],
  },
  duration: "5–6 giờ",
  objectives: [
    "Tự tô hình từ framebuffer đã học ở Project 01",
    "Đi từ trạng thái WASD đến chuyển động có đơn vị rõ ràng",
    "Đo và sửa lỗi phụ thuộc FPS bằng thí nghiệm có số liệu",
    "Tự viết, kiểm thử FPS limiter và giới hạn của delta time",
  ],
  lessons: [
    {
      id: "p02-l01",
      slug: "01-keyboard-state",
      title: "Tự tô ô vuông rồi đọc WASD",
      summary: "Dùng putPixel tô hình, sau đó đổi màu để kiểm tra trạng thái phím đang giữ.",
      order: 1,
      estimatedMinutes: 55,
    },
    {
      id: "p02-l02",
      slug: "02-position-velocity",
      title: "Cho ô vuông di chuyển",
      summary: "Vị trí, hướng, vận tốc và cách giữ tốc độ chéo bằng tốc độ thẳng.",
      order: 2,
      estimatedMinutes: 45,
    },
    {
      id: "p02-l03",
      slug: "03-loi-frame-based",
      title: "Đo lỗi phụ thuộc FPS",
      summary: "Đo FPS thật và một chuyển động tham chiếu năm giây trước khi sửa công thức.",
      order: 3,
      estimatedMinutes: 45,
      demoId: "motion",
    },
    {
      id: "p02-l04",
      slug: "04-delta-time",
      title: "Dùng thời gian thực để di chuyển",
      summary: "Thay bước đoán 1/60 bằng dt; quan sát cả tác dụng lẫn cái giá của clamp.",
      order: 4,
      estimatedMinutes: 50,
      demoId: "motion",
    },
    {
      id: "p02-l05",
      slug: "05-fps-cap",
      title: "Tự viết bộ giới hạn FPS",
      summary: "Đo thời gian làm việc, nghỉ phần còn lại và bật/tắt cap mà không đổi vận tốc.",
      order: 5,
      estimatedMinutes: 45,
      demoId: "motion",
    },
    {
      id: "p02-l06",
      slug: "06-validation",
      title: "Kiểm chứng và chạy bản hoàn chỉnh",
      summary: "Test input, hình chữ nhật, dt, limiter và phép đo năm giây; build Debug/Release.",
      order: 6,
      estimatedMinutes: 40,
      demoId: "motion",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
