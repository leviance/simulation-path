import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["grass", "wind"],
    lessons: {
      "voxel61-2": ["wind"],
      "voxel61-3": ["grass"],
      "voxel61-4": ["grass", "wind"],
    },
    takes: {
      wind: {
        title: "Tán lá đón gió",
        source: "Project 61 · Bài 02",
        poster: "wind.png",
        video: "wind.webm",
        alt: "Hai hàng cây bên suối, tán lá dịch nhẹ trên thân cố định.",
        caption:
          "Chọn mép một tán lá sát nền trời, rồi bấm phát. Thân cây là mốc đứng yên để nhận ra độ lệch nhỏ ở ngọn.",
      },
      grass: {
        title: "Gốc đứng yên, ngọn chuyển động",
        source: "Project 61 · Bài 03",
        poster: "grass.png",
        video: "grass.webm",
        alt: "Các ngọn cỏ trên bờ và mép tán lá chuyển động, còn bậc đất giữ nguyên vị trí.",
        caption:
          "Dừng rồi phát lại đoạn ngắn này. Nhìn cỏ sát bậc đất thay vì theo cả tán cây; bờ suối không dịch chuyển theo gió.",
      },
    },
  },
  base: {
    label: "RỪNG ĐÓN GIÓ",
    title: "Gió chạm cỏ trước, tới tán cây sau",
    description:
      "Greedy meshing giảm hình học tĩnh; một cơn gió chung đi qua ngọn cỏ và từng tán cây.",
  },
  modes: {
    "voxel61-1": {
      title: "Một vạt đất phẳng cần bao nhiêu quad?",
      description:
        "Chọn khối đặc, bờ suối hoặc Air. So đường chéo trước/sau khi gộp trên một lớp; số quad bên dưới tính cho cả chunk.",
    },
    "voxel61-2": {
      title: "Cho cơn gió đi qua rừng, thay vì lắc cả cảnh",
      description:
        "Tăng gió, tiến một nhịp rồi so độ lệch gốc và ngọn. Đổi hướng để nhìn lại cùng khu rừng.",
    },
    "voxel61-3": {
      title: "Gắn chuyển động vào từng ngọn cỏ và tán lá",
      description:
        "Nhìn xuống gốc cỏ khi gió đổi hướng. Dừng ở cùng một giờ và so với cường độ bằng 0.",
    },
    "voxel61-4": {
      title: "Đo riêng công dựng đất và công vẽ ngọn cây",
      description:
        "Số quad được tính trên mẫu bạn chọn; hình rừng minh họa riêng cơn gió. Cho giờ chạy và so xem đại lượng nào giữ nguyên.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
