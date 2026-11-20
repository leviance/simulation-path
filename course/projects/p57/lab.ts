import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/optics",
    withDemo: true,
    overview: ["tank"],
    lessons: { "photon57-8": ["tank"] },
    takes: {
      tank: {
        title: "Bể quang học",
        source: "Project 57 · C++/SDL3 · Release",
        poster: "tank.png",
        alt: "Bể kính, đường photon, màn thu 24 ô và hai bản đồ đếm hấp thụ và tán xạ.",
        caption:
          "Ảnh chụp từ một lượt 16.384 photon, seed 42. Những vệt trên bể chỉ là các đường gần nhất; bản đồ bên phải đếm toàn bộ lượt.",
      },
    },
  },
  base: {
    label: "PHOTON RAIN LAB",
    title: "Theo dõi photon rồi kiểm thống kê",
    description:
      "Analog transport trong môi trường 2D đồng nhất; tách hấp thụ, thoát và photon chưa biết kết cục.",
  },
  modes: {
    "photon57-1": {
      title: "Vẽ môi trường và photon đầu tiên",
      description: "Chưa ngẫu nhiên, chưa hấp thụ; kiểm vị trí phát và trục XY.",
    },
    "photon57-2": {
      title: "Từ số ngẫu nhiên đến quãng đường tự do",
      description: "Seed/ID, U trong (0,1), lấy mẫu phân bố mũ; thước S không phải trajectory.",
    },
    "photon57-3": {
      title: "Photon gặp tương tác hay thoát qua biên trước?",
      description: "So S với khoảng cách tới biên; ứng viên tương tác chưa được gọi là hấp thụ.",
    },
    "photon57-4": {
      title: "Bắt đầu với môi trường chỉ hấp thụ",
      description: "Mỗi photon dừng ở absorbed hoặc escaped; chưa có tán xạ.",
    },
    "photon57-5": {
      title: "Cho photon tán xạ nhiều lần",
      description: "Hướng đều góc 2D, xem từng đỉnh; giới hạn tương tác cho trạng thái Censored.",
    },
    "photon57-6": {
      title: "Gom nhiều đường đi thành thống kê",
      description: "Thêm mẫu thủ công, giữ mẫu số và phân biệt scatter events với nhóm kết thúc.",
    },
    "photon57-7": {
      title: "Đọc kết quả Monte Carlo cùng mức bất định",
      description: "Ballistic estimate, Wilson interval và bất định do photon bị dừng sớm.",
    },
    "photon57-8": {
      title: "Hoàn thiện mưa photon và kiểm chứng mô hình",
      description: "Chạy theo batch hữu hạn, reset dữ liệu nhất quán và kiểm hấp thụ thuần.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
