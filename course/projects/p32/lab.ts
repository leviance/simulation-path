import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "MEMORY LAYOUT RACE LAB",
    title: "Cùng một triệu particle, CPU phải tải những byte nào?",
    description:
      "Đổi AoS/SoA và workload, theo dõi memory cells, useful bytes, cache-line traffic, output agreement cùng timing thực trên thiết bị hiện tại.",
  },
  modes: {
    "layout-scene": {
      title: "Một triệu particle thực sự gồm những field nào?",
      description:
        "Đọc sáu float của mỗi particle, đổi N/seed và phân biệt workload update đủ N với số điểm hữu hạn được lấy mẫu để vẽ.",
    },
    "aos-layout": {
      title: "AoS đặt dữ liệu của từng particle cạnh nhau ra sao?",
      description:
        "Mỗi cụm màu là position/velocity của một particle; chọn workload để thấy field cần dùng nằm xen với field không cần dùng.",
    },
    "aos-baseline": {
      title: "Baseline AoS đang đo kernel nào?",
      description:
        "Chọn workload, chạy benchmark hữu hạn và đọc timing cạnh checksum thay vì dùng FPS của Canvas.",
    },
    "soa-layout": {
      title: "SoA biến sáu field thành sáu dải liên tục thế nào?",
      description:
        "Mỗi hàng chỉ chứa một field; particle index vẫn nối các giá trị thuộc cùng particle giữa sáu mảng.",
    },
    "layout-agreement": {
      title: "Hai layout có còn mô tả đúng cùng state không?",
      description:
        "Tiến từng bước hoặc chạy animation; maximum difference phải giữ bằng 0 trước khi timing được xem là có ý nghĩa.",
    },
    "cache-lines": {
      title: "Một field hữu ích kéo theo bao nhiêu cache line?",
      description:
        "Đổi giữa position.x, velocity-only và integrate để so useful bytes, loaded bytes và efficiency trong mô hình line 64 byte.",
    },
    "layout-benchmark": {
      title: "Timing thay đổi thế nào khi N tăng tới một triệu?",
      description:
        "Chạy scaling 10k/100k/1M với cùng seed và workload; đọc AoS/SoA time cạnh traffic model cùng output agreement.",
    },
    "layout-validation": {
      title: "Cuộc đua đã công bằng và có thể lặp lại chưa?",
      description:
        "Kiểm seed, conversion, kernel agreement, bounded repetitions, pointer lifecycle và tách rendering khỏi vùng đo trước Project 33.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
