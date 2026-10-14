import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "X-RAY DETECTOR LAB",
    title: "Theo dõi tia từ nguồn tới detector",
    description:
      "CPU oracle cho chiều dài, optical depth và detector ratio; dữ liệu tổng hợp, không thiết bị hay ảnh y khoa.",
  },
  modes: {
    "xray55-1": {
      title: "Vẽ ảnh detector đầu tiên bằng SDL3",
      description: "Streaming texture, RGBA và ảnh kiểm pipeline trước vật lý.",
    },
    "xray55-2": {
      title: "Nối nguồn điểm với từng pixel detector",
      description: "Pixel centre, beam normalized và chiều dài đoạn hữu hạn.",
    },
    "xray55-3": {
      title: "Tính chiều dài tia đi trong một lớp vật liệu",
      description: "Slab interval, source inside, detector clip và xoay object space.",
    },
    "xray55-4": {
      title: "Từ chiều dài qua nhiều lớp đến tín hiệu detector",
      description: "Optical depth cộng, transmission nhân và overlap cộng mu.",
    },
    "xray55-5": {
      title: "So lấy mẫu theo bước với kết quả giải tích",
      description: "Midpoint, partial tail, air segment và sai số biên không đơn điệu.",
    },
    "xray55-6": {
      title: "Tách tín hiệu thô khỏi ảnh mức xám và ảnh log",
      description: "I/I0, -ln(T), display range và palette không sửa measurement.",
    },
    "xray55-7": {
      title: "Cộng tín hiệu của hai năng lượng trước khi lấy log",
      description: "Phổ hai thành phần minh họa vì sao log không còn tuyến tính theo độ dày.",
    },
    "xray55-8": {
      title: "Kiểm máy X-ray ảo rồi chạy project hoàn chỉnh",
      description: "Oracle slab, CTest Debug/Release, audit và giới hạn mô hình.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
