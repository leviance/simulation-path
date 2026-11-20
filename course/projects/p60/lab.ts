import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["probe"],
    lessons: {},
    takes: {
      probe: {
        title: "Ngắm từ bờ suối",
        source: "Project 60 · Bản hoàn chỉnh",
        poster: "probe.png",
        alt: "Tâm ngắm nằm giữa lòng suối; dòng chỉ báo dưới khung hình ghi kết quả dò.",
        caption:
          "Đường ngắm bắt đầu từ mắt. So vật liệu hiện ở dòng dưới với thứ bạn thấy ngay sau tâm ngắm.",
      },
    },
  },
  base: {
    label: "ỐNG NGẮM THỰC ĐỊA",
    title: "Nhìn từ tầm mắt người đứng trên bờ",
    description:
      "Nhìn vào cảnh để đọc vật liệu, tọa độ và khoảng cách; mẫu dò không làm thay đổi thế giới.",
  },
  modes: {
    "voxel60-1": {
      title: "Từ tâm màn hình đến hướng nhìn trong thế giới",
      description:
        "Xoay bằng mũi tên hoặc kéo để đặt tâm lên bờ. Hướng tia thay đổi cùng hướng mắt.",
    },
    "voxel60-2": {
      title: "Theo tia đến mặt đầu tiên, không bỏ sót block",
      description:
        "Ngắm từ bờ sang nước, đọc tọa độ và khoảng cách. Ngẩng lên để thử một tia không gặp vật liệu.",
    },
    "voxel60-3": {
      title: "Đóng băng phép đo và đi quanh vật vừa ngắm",
      description:
        "Giữ phép đo, đổi góc nhìn rồi mở khóa. Dữ liệu các ô không đổi trong cả hai lần đọc.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
