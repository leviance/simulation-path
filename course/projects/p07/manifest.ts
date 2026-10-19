import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time và vòng lặp theo thời gian",
    "Project 04 — tự vẽ line/circle trên framebuffer",
    "Project 05–06 — đổi world/screen và kéo điểm",
  ],
  summary:
    "Xây một mô phỏng 2D có kim quay trên đường tròn đơn vị; nhìn đồng thời hình chiếu X/Y và hai đồ thị sin/cos được lấy từ cùng một góc.",
  duration: "6–7 giờ",
  objectives: [
    "Hiểu radian qua độ dài cung, không học thuộc bảng đổi đơn vị",
    "Tự đặt đầu kim bằng sin/cos rồi cho quay theo thời gian",
    "Vẽ hình chiếu và đồ thị có cùng nguồn dữ liệu",
    "Dùng atan2 để chọn góc; xử lý vùng tâm và capture",
    "Kiểm chứng một vòng, đẳng thức lượng giác và nhịp lấy mẫu độc lập FPS",
  ],
  challenge: {
    timebox: "150–210 phút tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó một chiếc kim quay quanh tâm đường tròn. Người dùng có thể đổi tốc độ hoặc kéo đầu kim để chọn góc; hai hình chiếu và đồ thị phải thay đổi theo.",
    outcome:
      "Bản final C++/SDL3 luôn hiển thị đường tròn, kim, hình chiếu X/Y và hai đồ thị sin/cos cùng lúc. Có nhãn góc radian/degree, giá trị, vận tốc góc và chu kỳ.",
    requirements: [
      "Tự viết đổi degree/radian, normalizeAngle, unitDirection và plotter; không dùng thư viện toán/biểu đồ thay phần này.",
      "Tất cả vị trí, hình chiếu và giá trị sin/cos được suy ra từ một angle, không cập nhật chúng độc lập.",
      "Kim chạy nhiều vòng bằng angularSpeed × deltaTime; đổi chiều, đứng yên, pause/resume, reset và tiến từng bước.",
      "Lưu lịch sử tối đa 361 mẫu, gồm hai đầu của 6 giây tại 60 Hz. Một frame chậm phải sinh đủ các mẫu tại timestamp của chúng.",
      "Đặt X của đồ thị theo thời gian mô phỏng, không theo số frame. Đổi tốc độ giữ lịch sử; đổi góc bằng tay bắt đầu lịch sử mới.",
      "Cho kéo chấm vàng bằng chuột trái; atan2 nhận world Y hướng lên. Không nhảy góc khi nắm lệch tâm chấm hoặc kéo qua vùng tâm.",
      "Giữ một mouse/pointer owner; áp dụng mẫu thả cuối và hủy capture khi mất focus, hidden, resize, reset hoặc đổi chế độ.",
      "Dùng preset, thanh điều khiển Canvas và phím ←/→ để thử các góc. Space pause, ↑/↓ đổi tốc độ, S tiến 0,1 giây khi dừng.",
      "Resize/HiDPI giữ đúng bảng logic 1100×760 bằng letterbox; input đổi về bảng logic đúng một lần.",
    ],
    constraints: [
      "Rasterize hình học trên CPU; SDL chỉ phụ trách window, input, texture và chữ debug ASCII.",
      "Angle bên trong luôn là radian, normalize về [0,2π); zero direction không có hướng nên thao tác gần tâm giữ góc cũ.",
      "Delta time ở vòng ứng dụng được chặn 0,1 giây. Đồ thị đo thời gian mô phỏng đã chấp nhận, không hứa bù toàn bộ thời gian ở breakpoint/tab ẩn.",
      "ZIP phải chạy độc lập, gồm starter, bảy checkpoint, final, CMake, README và tests.",
    ],
    definitionOfDone: [
      "2π là một vòng; các mốc 0,π/2,π,3π/2 đặt kim đúng phải/trên/trái/dưới.",
      "sin²(angle)+cos²(angle) sai lệch 1 không quá 1e-9 ở nhiều góc qua nhiều vòng.",
      "Chuỗi frame 10 Hz, 120 Hz và không đều có cùng tổng thời gian cho cùng góc lẫn bộ mẫu 60 Hz.",
      "Đầu kim, hai hình chiếu và đồ thị hiện đồng thời trong bản final, không dùng đường sóng hard-code.",
      "Build starter, mọi checkpoint và final ở Debug/Release; CTest không dựa vào assert bị tắt trong Release.",
      "Kiểm tra thủ công kéo/thả ngoài window, đổi focus, resize và HiDPI; phân biệt bước này với smoke cửa sổ ẩn.",
    ],
  },
  lessons: [
    {
      id: "p07-l01",
      slug: "01-radian-va-vong-tron-don-vi",
      title: "Từ một đường tròn có sẵn đến góc radian",
      summary: "Chạy bộ khung, đo góc bằng độ dài cung và đưa góc về một vòng.",
      order: 1,
      estimatedMinutes: 45,
      demoId: "angle",
    },
    {
      id: "p07-l02",
      slug: "02-sin-cos-thanh-toa-do",
      title: "Đặt đầu kim bằng sin và cos",
      summary: "Viết tọa độ từ góc, rồi đưa điểm toán học lên màn hình.",
      order: 2,
      estimatedMinutes: 45,
      demoId: "angle",
    },
    {
      id: "p07-l03",
      slug: "03-van-toc-goc-va-delta-time",
      title: "Cho kim quay theo thời gian",
      summary: "Đổi vận tốc góc, quay ngược, tạm dừng và kiểm tra chu kỳ.",
      order: 3,
      estimatedMinutes: 55,
      demoId: "angle",
    },
    {
      id: "p07-l04",
      slug: "04-hinh-chieu-len-hai-truc",
      title: "Nhìn thấy sin và cos trên hai trục",
      summary: "Vẽ đường dóng, hai thành phần có dấu và nhãn giá trị.",
      order: 4,
      estimatedMinutes: 40,
      demoId: "angle",
    },
    {
      id: "p07-l05",
      slug: "05-do-thi-sin-cos",
      title: "Từ kim quay đến hai đồ thị theo thời gian",
      summary: "Lấy mẫu 60 Hz đúng timestamp và tự vẽ cửa sổ lịch sử 6 giây.",
      order: 5,
      estimatedMinutes: 65,
      demoId: "angle",
    },
    {
      id: "p07-l06",
      slug: "06-keo-kim-voi-atan2",
      title: "Kéo đầu kim để chọn góc bằng atan2",
      summary: "Xử lý bốn góc phần tư, vùng tâm, grab offset và capture.",
      order: 6,
      estimatedMinutes: 60,
      demoId: "angle",
    },
    {
      id: "p07-l07",
      slug: "07-hoan-thien-va-kiem-chung",
      title: "Ghép bản hoàn chỉnh và kiểm chứng",
      summary: "Đối chiếu hình, số, lịch sử và kiểm thử độc lập ở Debug/Release.",
      order: 7,
      estimatedMinutes: 50,
      demoId: "angle",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
