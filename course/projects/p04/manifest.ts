import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer và putPixel",
    "Project 03 — mouse input và input sampling",
  ],
  summary:
    "Tự vẽ đường thẳng, hình chữ nhật và đường tròn; phóng to pixel để hiểu vì sao thuật toán chọn chúng.",
  duration: "7–8 giờ",
  challenge: {
    timebox: "150–210 phút",
    mission:
      "Tự xây dựng một ứng dụng SDL3 để vẽ và khảo sát các hình 2D trên framebuffer. Trước khi đọc hướng dẫn, hãy thử làm một bảng hình học có thể tương tác, không dùng API primitive của SDL.",
    outcome:
      "Một executable có đường thẳng kéo được hai đầu, hình chữ nhật và đường tròn ở cả dạng viền lẫn tô đặc. Người dùng đổi công cụ, phóng to pixel, chọn từng bước và chạy benchmark trên dữ liệu cố định.",
    requirements: [
      "Tự viết DDA và Bresenham; cả hai giữ hai đầu và vẽ được đường ngang, dọc, dốc cao/thấp, đảo chiều, đoạn dài 0.",
      "Có drawLine, drawRect, fillRect, drawCircle và fillCircle; mọi pixel được ghi qua putPixel.",
      "Hình chữ nhật nhận hai góc theo bất kỳ thứ tự nào và dùng quy ước lấy cả hai biên.",
      "Tự viết midpoint circle, phản chiếu tám phía và loại điểm trùng. Tô đặc bằng các hàng ngang tới chính đường viền đó.",
      "Có pixel inspector 9 × 9 lấy màu từ framebuffer thật, đọc được pixel hiện tại và trạng thái của thuật toán đường thẳng.",
      "Có công cụ Line/Rectangle/Circle và một bảng hình mẫu sạch; kéo tay nắm, đổi kiểu tô và bán kính bằng input.",
      "Resize/HiDPI không làm méo hình hoặc lệch thao tác; mất focus, thả nút và rời vùng vẽ đều kết thúc kéo đúng cách.",
      "Kiểm tra hàng trăm hướng/kích thước trước khi benchmark DDA/Bresenham: cùng 20.000 đoạn, warm-up, bảy lượt, median và checksum từ tọa độ.",
    ],
    constraints: [
      "SDL chỉ lo window, input, timing và hiển thị texture; không gọi API line/rect/circle hoặc engine vẽ hộ.",
      "Vòng lặp Bresenham dùng số nguyên; inspector phải đọc cùng dữ liệu mà chương trình dùng để vẽ.",
      "Sinh dữ liệu ngoài vùng đo. Nêu rõ phép đo bao gồm cấp phát trace và hash, không gọi đó là thời gian của riêng phép cộng.",
      "Giữ công việc hữu hạn: tọa độ ±4.096, cạnh hình đặc tối đa 1.024 pixel, bán kính 0–256; benchmark chạy từng đợt và tự dừng sau 30 giây.",
    ],
    definitionOfDone: [
      "Line giữ hai đầu, đủ số pixel, liên thông ở mọi hướng và bám sát đường lý tưởng. Không mặc định hai chiều hoặc hai thuật toán phải chọn cùng tập pixel khi hòa.",
      "Rectangle đúng cả trường hợp một hàng, một cột, một điểm; viền không lặp góc, hình đặc không có lỗ.",
      "Circle đối xứng, đủ bốn điểm ngoài cùng, không lặp pixel. Hình đặc chứa toàn bộ viền midpoint và mỗi hàng liên tục.",
      "Starter, sáu checkpoint và final build được; CTest hoạt động ở Debug/Release. Kết quả desktop và SDL smoke được ghi nhận riêng.",
      "Benchmark báo build mode, số đoạn/lượt, đơn vị, phạm vi đo và checksum; có thể hủy, không kết luận thuật toán nhanh hơn chỉ từ một lần chạy.",
    ],
  },
  objectives: [
    "Hiểu cách biến hình học liên tục thành pixel rời rạc",
    "Tự viết và kiểm tra năm hàm vẽ/tô cơ bản",
    "Quan sát quyết định của rasterizer bằng dữ liệu thật",
    "Đo hiệu năng có đối chứng và biết giới hạn của phép đo",
  ],
  lessons: [
    {
      id: "p04-l01",
      slug: "01-dda",
      title: "Vẽ đường thẳng đầu tiên bằng DDA",
      summary: "Từ starter nền trống đến một đoạn thẳng thật trên framebuffer.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "raster",
    },
    {
      id: "p04-l02",
      slug: "02-bresenham",
      title: "Chọn pixel bằng sai số nguyên",
      summary: "Hiểu từng quyết định của Bresenham rồi ghép vào cùng chương trình.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "raster",
    },
    {
      id: "p04-l03",
      slug: "03-tam-octant",
      title: "Kéo hai đầu và soi từng pixel",
      summary: "Tám hướng, tọa độ sau resize và inspector 9 × 9 từ ảnh CPU.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "raster",
    },
    {
      id: "p04-l04",
      slug: "04-rectangle",
      title: "Ghép đường viền, tô hình chữ nhật",
      summary: "Hai góc bất kỳ, quy ước lấy cả biên và các trường hợp suy biến.",
      order: 4,
      estimatedMinutes: 45,
      demoId: "raster",
    },
    {
      id: "p04-l05",
      slug: "05-midpoint-circle",
      title: "Vẽ và tô đường tròn",
      summary: "Midpoint, đối xứng tám phần và tô các hàng tới đúng đường viền.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "raster",
    },
    {
      id: "p04-l06",
      slug: "06-benchmark-validation",
      title: "Kiểm chứng rồi mới đo tốc độ",
      summary: "Hàng nghìn trường hợp, bảng hình mẫu và benchmark không khóa event loop.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "raster",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
