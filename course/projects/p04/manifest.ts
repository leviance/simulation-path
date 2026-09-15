import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer và putPixel",
    "Project 03 — mouse input và input sampling",
  ],
  summary: "Tự biến đường thẳng, hình chữ nhật và đường tròn thành các pixel trên framebuffer.",
  challenge: {
    timebox: "150–180 phút",
    mission:
      "Tự xây dựng một bộ công cụ vẽ 2D trên framebuffer. Chương trình phải vẽ được đoạn thẳng, hình chữ nhật và đường tròn, đồng thời cho phép quan sát từng bước mà thuật toán chọn pixel.",
    outcome:
      "Một ứng dụng SDL3 hoàn chỉnh: kéo được hai đầu đoạn thẳng, chuyển qua lại giữa DDA và Bresenham, vẽ được hình chữ nhật rỗng/đặc và đường tròn, phóng to được pixel đang xét và đo hiệu năng trên dữ liệu cố định.",
    requirements: [
      "Viết DDA và xử lý riêng trường hợp hai đầu đoạn thẳng trùng nhau.",
      "Viết Bresenham với biến sai số nguyên và xử lý được đủ tám hướng quanh điểm đầu.",
      "Cả DDA lẫn Bresenham đều phải giữ đúng pixel đầu và pixel cuối.",
      "Ghép bốn đoạn thẳng thành đường viền hình chữ nhật và tô hình đặc theo từng hàng ngang.",
      "Viết midpoint circle bằng đối xứng tám phần, đồng thời loại các pixel bị lặp.",
      "Tạo lưới phóng to để quan sát thứ tự pixel và giá trị `error` ở từng bước.",
      "Cho phép chuyển qua lại giữa DDA và Bresenham trong khi kéo hai đầu đoạn thẳng.",
      "Đo ít nhất 10.000 đoạn thẳng trên cùng một bộ dữ liệu và lặp nhiều lượt trước khi kết luận.",
    ],
    constraints: [
      "Không dùng API line/rect/circle của SDL.",
      "Bresenham không dùng phép chia hoặc số thực trong vòng lặp chính.",
      "Thời gian sinh dữ liệu đầu vào không được tính vào thời gian chạy thuật toán.",
    ],
    definitionOfDone: [
      "Kiểm thử cả hai chiều ở đủ tám octant; mỗi chiều giữ hai đầu, đúng số điểm và không tạo lỗ hổng. Hai tập pixel có thể khác khi đường đi đúng giữa hai lựa chọn.",
      "DDA và Bresenham xử lý đoạn dài 0 mà không chia cho 0.",
      "Đường tròn có đủ bốn điểm ngoài cùng, không lặp pixel, đối xứng và bám sát bán kính yêu cầu.",
      "Kết quả đo ghi rõ số đoạn thẳng, số lượt chạy, cấu hình build và đơn vị thời gian.",
    ],
  },
  duration: "5–6 giờ",
  objectives: [
    "Hiểu cách biến hình học liên tục thành các pixel rời rạc",
    "So sánh cách bước bằng số thực và số nguyên",
    "Kiểm tra đủ tám octant và tính đối xứng",
  ],
  lessons: [
    {
      id: "p04-l01",
      slug: "01-dda",
      title: "DDA: đi dọc theo đường thẳng",
      summary: "Từ phương trình đoạn thẳng tới danh sách pixel.",
      order: 1,
      estimatedMinutes: 65,
    },
    {
      id: "p04-l02",
      slug: "02-bresenham",
      title: "Bresenham và biến sai số",
      summary: "Chọn pixel chỉ bằng số nguyên.",
      order: 2,
      estimatedMinutes: 50,
    },
    {
      id: "p04-l03",
      slug: "03-tam-octant",
      title: "Tám octant",
      summary: "Dùng cùng một thuật toán cho mọi hướng và độ dốc.",
      order: 3,
      estimatedMinutes: 35,
      demoId: "raster",
    },
    {
      id: "p04-l04",
      slug: "04-rectangle",
      title: "Vẽ hình chữ nhật rỗng và đặc",
      summary: "Tận dụng lại thuật toán đường thẳng và các hàng pixel liên tiếp.",
      order: 4,
      estimatedMinutes: 30,
      demoId: "raster",
    },
    {
      id: "p04-l05",
      slug: "05-midpoint-circle",
      title: "Midpoint circle: tính một phần tám rồi phản chiếu",
      summary: "Dùng phép thử trung điểm và đối xứng để chọn pixel cho đường tròn.",
      order: 5,
      estimatedMinutes: 45,
      demoId: "raster",
    },
    {
      id: "p04-l06",
      slug: "06-benchmark-validation",
      title: "Kiểm tra và đo hiệu năng",
      summary: "Kiểm tra tính đúng rồi lấy median của bảy lượt đo trên 20.000 đoạn thẳng.",
      order: 6,
      estimatedMinutes: 50,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
