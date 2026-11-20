import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["cliff"],
    lessons: {},
    takes: {
      cliff: {
        title: "Hai bờ sau khi bỏ mặt khuất",
        source: "Project 59 · Bản hoàn chỉnh",
        poster: "cliff.png",
        alt: "Lòng suối và vách cát liền nhau, tán cây phủ trên bờ.",
        caption:
          "Phần đất bên trong không còn được vẽ. Bạn không thể đếm mặt từ ảnh này; hãy so số quad trong bài thực hành.",
      },
    },
  },
  base: {
    label: "MÉP VÁCH ĐÁ",
    title: "So hai cách dựng cùng một bờ",
    description: "Đổi cách dựng cùng một vách đá, đếm các mặt biến mất mà không làm thủng bờ suối.",
  },
  modes: {
    "voxel59-1": {
      title: "Tại sao có thể bỏ hai mặt mà vách đá vẫn nguyên?",
      description:
        "Chọn khối đặc rồi bật/tắt “Bỏ mặt khuất”. So số quad trước khi nhìn lại chính bức ảnh ấy.",
    },
    "voxel59-2": {
      title: "Ai chịu trách nhiệm về đường nối giữa hai bờ?",
      description:
        "Chọn bờ suối, nhìn sát mép nước. Canvas tách một chunk; đường nối hai cột thật được kiểm ở bản C++.",
    },
    "voxel59-3": {
      title: "So hai bức hình trước khi tin số tam giác",
      description:
        "So ba mẫu: đá, khối đặc và Air. Dùng bộ đếm để dự đoán kết quả trước khi đi vào hốc đá bằng bản C++.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
