import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "RASTER STEPPER",
    title: "Thuật toán chọn pixel nào tiếp theo?",
    description: "Kéo endpoints, chọn preset và chạy từng bước DDA hoặc Bresenham.",
  },
  modes: {
    "raster-dda": {
      title: "DDA lấy mẫu và làm tròn pixel nào?",
      description: "Stepper được khóa ở DDA; Bresenham chưa xuất hiện trong bài này.",
    },
    "raster-bresenham": {
      title: "Error term của Bresenham thay đổi ra sao?",
      description: "Mặc định mở Bresenham nhưng vẫn cho đổi sang DDA để đối chiếu hai thuật toán.",
    },
    "raster-octants": {
      title: "Cùng một Bresenham có đi đủ tám hướng?",
      description:
        "Chọn từng octant quanh một tâm chung và kiểm tra endpoint cùng tính liên thông.",
    },
    "raster-rectangle": {
      title: "Hai góc bất kỳ tạo ra hình chữ nhật nào?",
      description:
        "Kéo hai góc, đổi giữa đường viền và hình đặc, rồi đối chiếu số pixel với công thức.",
    },
    "raster-circle": {
      title: "Một điểm tạo ra tám phía của đường tròn ra sao?",
      description:
        "Đi từng bước của midpoint circle để theo dõi decision và các pixel được phản chiếu.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
