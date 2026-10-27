import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "CPU FOUNTAIN · AoS / SoA",
    title: "Cùng đài phun, khác cách đặt dữ liệu",
    description:
      "Canvas cập nhật tối đa 20.000 hạt float32 để học mô hình; bản C++ có preset một triệu hạt sống. Đổi layout giữ nguyên state. Màu biểu thị tuổi hạt, không dùng hoạt ảnh định sẵn.",
  },
  modes: {
    "layout-scene": {
      title: "Nhìn thấy đài phun trước khi tối ưu",
      description:
        "Chạy khung SDL, đọc state của hạt trong không gian 3D và phân biệt khởi tạo warm với chuyển động do solver.",
    },
    "aos-layout": {
      title: "Phát hạt, cho rơi và tái sử dụng slot",
      description:
        "Thêm emission carry, gravity, age/lifetime và respawn có seed; tiến một bước đầy đủ rồi mới công bố state.",
    },
    "aos-baseline": {
      title: "Đo một kernel AoS có thể kiểm chứng",
      description:
        "Đo gravity-only và toàn bộ vòng đời bằng AoS; dùng warm-up, nhiều mẫu và checksum ngoài timer.",
    },
    "soa-layout": {
      title: "Đổi layout mà không làm đổi trạng thái",
      description:
        "Tách đủ mười một field thành các mảng; chuyển layout theo batch và có thể hủy mà không đổi snapshot đang xem.",
    },
    "layout-agreement": {
      title: "Chạy cùng vòng đời bằng SoA",
      description:
        "Viết kernel SoA theo cùng thứ tự phép tính float32, giữ ID/generation và kiểm cả các lần hạt được tái sử dụng.",
    },
    "cache-lines": {
      title: "Giải thích dữ liệu mà vòng lặp chạm tới",
      description:
        "Đếm cache line của gravity-only và nhận biết giới hạn của mô hình all-field; không gọi nó là số cache miss đo được.",
    },
    "layout-benchmark": {
      title: "Đo Release và giữ cả kết quả không nhanh hơn",
      description:
        "Đo AoS/SoA với cùng seed và workload ở 10k/100k/1M; đọc median, min/max, chi phí conversion và sai khác state.",
    },
    "layout-validation": {
      title: "Hoàn thiện đài phun một triệu hạt",
      description:
        "Ghép controls, đài phun, đo hiệu năng và quy trình kiểm chứng đủ một triệu hạt sống thành ứng dụng độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
