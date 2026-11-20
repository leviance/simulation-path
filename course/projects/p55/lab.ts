import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/optics",
    withDemo: true,
    overview: ["radio"],
    lessons: { "xray55-10": ["radio"] },
    takes: {
      radio: {
        title: "Bàn soi radio",
        source: "Project 55 · C++/SDL3 · Release",
        poster: "radio.png",
        alt: "Ảnh detector của viên pin và gân loa cạnh mô hình 3D có anten và bo mạch.",
        caption:
          "Đây là ảnh của fragment shader C++/OpenGL. Canvas bên dưới dùng CPU để bạn thử lại phép đo ở một ô.",
      },
    },
  },
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
    "xray55-9": {
      title: "Bên trong vỏ radio",
      description:
        "Tìm vùng pin, vỏ và gân loa; Canvas minh họa cùng phép đo bằng CPU, bản C++ dùng shader.",
    },
    "xray55-10": {
      title: "Đo trước khi đổi màu",
      description:
        "Giữ nguyên ô detector, đổi bảng màu rồi kiểm xem tỷ số truyền qua có đổi không.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
