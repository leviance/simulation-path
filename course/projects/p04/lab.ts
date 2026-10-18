import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "RASTER STEPPER",
    title: "Nhìn từng pixel được chọn",
    description:
      "Đặt hai đầu, chọn một trường hợp nhỏ và đi từng bước; dữ liệu bên dưới giải thích pixel đang thấy.",
  },
  modes: {
    "raster-dda": {
      title: "DDA làm tròn điểm nào?",
      description: "Đường đỏ là đoạn lý tưởng; ô trắng là kết quả làm tròn ở bước đang xét.",
    },
    "raster-bresenham": {
      title: "Khi nào phải bước thêm Y?",
      description: "Theo dõi error và e2 trước mỗi bước, rồi đổi sang DDA để so cùng hai đầu.",
    },
    "raster-octants": {
      title: "Cùng một vòng lặp có đi đủ tám hướng?",
      description:
        "Chọn từng octant, đảo A/B và thử cả trường hợp hai đầu trùng nhau bằng thao tác kéo.",
    },
    "raster-rectangle": {
      title: "Hai góc tạo ra bao nhiêu pixel?",
      description: "Đảo góc, thử một hàng/cột/điểm rồi đổi giữa viền và hình đặc để đếm lại.",
    },
    "raster-circle": {
      title: "Từ một phần tám đến cả đường tròn",
      description:
        "Xem decision và các điểm phản chiếu, sau đó tô các hàng ngang tới viền midpoint.",
    },
    "raster-validation": {
      title: "Một đoạn hợp lệ có nhất thiết giống nhau khi đảo chiều?",
      description:
        "Dùng trường hợp giữa hai lựa chọn để phân biệt quy tắc chọn pixel với lỗi hở nét. Benchmark chạy trong C++, không suy từ tốc độ Canvas.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
