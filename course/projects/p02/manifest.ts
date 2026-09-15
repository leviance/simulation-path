import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: ["Project 01 — window, renderer và event loop"],
  summary:
    "Điều khiển một ô vuông bằng WASD, giữ tốc độ ổn định ở mọi FPS và tự viết cơ chế giới hạn khung hình.",
  challenge: {
    timebox: "90–120 phút",
    mission:
      "Dùng WASD điều khiển một ô vuông sao cho tốc độ chỉ phụ thuộc vào thời gian thực tế, không phụ thuộc máy đang vẽ được bao nhiêu khung hình mỗi giây. Sau đó tự viết cơ chế giới hạn ở 60 FPS.",
    outcome:
      "Ô vuông di chuyển mượt, đi chéo không nhanh hơn đi thẳng và luôn nằm trong cửa sổ. Người dùng có thể chọn 30, 60, 120 FPS hoặc bỏ giới hạn mà tốc độ tính theo pixel/giây vẫn không đổi.",
    requirements: [
      "Đọc trạng thái W, A, S, D liên tục thay vì chỉ phản ứng với SDL_EVENT_KEY_DOWN.",
      "Dùng vector hai chiều để lưu `position`, `direction` và `velocity`.",
      "Chuẩn hóa `direction` để đi chéo không nhanh hơn đi ngang hoặc đi dọc.",
      "Đo `dt` bằng đồng hồ của SDL, đổi sang giây rồi cập nhật `position += velocity × dt`.",
      "Giới hạn `dt` tối đa ở 0,05 giây để tránh cú nhảy lớn sau breakpoint hoặc khi ứng dụng bị treo tạm thời.",
      "Tự vẽ ô vuông bằng SDL_SetRenderDrawColor và SDL_RenderFillRect, rồi giữ toàn bộ hình trong cửa sổ.",
      "Đo thời gian đã dùng cho mỗi khung hình và chỉ nghỉ trong phần còn thiếu của chu kỳ 60 Hz.",
      "Hiển thị FPS, mức giới hạn và quãng đường đã đi; có phím đặt lại để so sánh nhiều lần.",
    ],
    constraints: [
      "Không dùng hằng `1/60` thay cho thời gian thực tế.",
      "Phần cập nhật chuyển động và bộ giới hạn FPS phải tách biệt.",
      "Không dùng game loop hay timer của game engine.",
    ],
    definitionOfDone: [
      "Trong test thuần không bị giới hạn bởi mép cửa sổ, 5 giây ở 30, 60 và 120 FPS cho quãng đường sai lệch không quá 2%.",
      "Đi chéo và đi thẳng trong cùng thời gian cho quãng đường gần bằng nhau.",
      "Khi bật giới hạn, FPS trung bình ở gần 60 nhưng vận tốc tính theo pixel/giây không đổi.",
      "Bạn giải thích được vì sao tốc độ render và tốc độ mô phỏng là hai khái niệm khác nhau.",
    ],
  },
  duration: "4–5 giờ",
  objectives: [
    "Phân biệt sự kiện bàn phím và trạng thái phím đang giữ",
    "Dùng delta time đúng cách",
    "Đo thời gian của khung hình thay vì đoán",
  ],
  lessons: [
    {
      id: "p02-l01",
      slug: "01-keyboard-state",
      title: "Vẽ ô vuông rồi đọc WASD",
      summary:
        "Bắt đầu từ cửa sổ trống, tự vẽ một SDL_FRect rồi biến trạng thái WASD thành vector hướng.",
      order: 1,
      estimatedMinutes: 50,
    },
    {
      id: "p02-l02",
      slug: "02-position-velocity",
      title: "Từ hướng đến vị trí và vận tốc",
      summary: "Tách rõ hướng, vận tốc và vị trí trước khi cho ô vuông di chuyển.",
      order: 2,
      estimatedMinutes: 30,
    },
    {
      id: "p02-l03",
      slug: "03-loi-frame-based",
      title: "Thí nghiệm lỗi phụ thuộc FPS",
      summary: "Cố ý giữ công thức sai rồi đo quãng đường ở nhiều tốc độ vòng lặp.",
      order: 3,
      estimatedMinutes: 30,
      demoId: "motion",
    },
    {
      id: "p02-l04",
      slug: "04-delta-time",
      title: "Di chuyển bằng delta time",
      summary: "Dùng thời gian thực đã trôi qua để cập nhật vị trí.",
      order: 4,
      estimatedMinutes: 40,
    },
    {
      id: "p02-l05",
      slug: "05-fps-cap",
      title: "Tự viết cơ chế giới hạn FPS",
      summary: "Đo thời gian của khung hình và nghỉ đúng phần còn lại.",
      order: 5,
      estimatedMinutes: 40,
    },
    {
      id: "p02-l06",
      slug: "06-validation",
      title: "Kiểm chứng và hoàn thiện",
      summary: "Dùng test để so quãng đường ở nhiều FPS rồi chạy bản hoàn chỉnh.",
      order: 6,
      estimatedMinutes: 30,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
