import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["cloud"],
    lessons: {
      "voxel62-3": ["cloud"],
    },
    takes: {
      cloud: {
        title: "Mây trôi qua ngọn cây",
        source: "Project 62 · Bài 03",
        poster: "cloud.png",
        video: "cloud.webm",
        alt: "Cụm mây trắng đi qua khoảng trời phía trên hai bờ cây.",
        caption:
          "Giữ mắt ở chóp cây sát một đám mây. Camera đứng yên suốt đoạn ghi nên sự dịch chuyển là của mây, không phải của hàng đợi chunk.",
      },
    },
  },
  base: {
    label: "THEO CON ĐƯỜNG XA",
    title: "Đi qua biên dưới tầng mây trôi",
    description:
      "Đi hàng trăm block qua vùng được nạp và gỡ; mây vẫn trôi liên tục khi camera qua biên.",
  },
  modes: {
    "voxel62-1": {
      title: "Khi bước qua mép chunk, đất mới đến từ đâu?",
      description: "Di chuyển tâm từng chunk. Nhấn “Tiến một nhịp” để nạp phần đang chờ gần nhất.",
    },
    "voxel62-2": {
      title: "Đừng sinh cả con đường trong một khung hình",
      description: "Đổi ngân sách rồi quay về trước khi hàng đợi cạn. So số địa chỉ còn phải nạp.",
    },
    "voxel62-3": {
      title: "Vì sao đám mây không được dán lên màn hình?",
      description:
        "Chọn ngọn mây gần biên trên ảnh làm mốc. Cho giờ chạy khi tâm đứng yên; thử tắt mây để tách nó khỏi bản đồ nạp.",
    },
    "voxel62-4": {
      title: "Đi xa rồi quay về: bộ nhớ có chịu buông không?",
      description:
        "Đi qua vài chunk âm rồi quay về. Sau khi hàng đợi hết, kiểm đủ cửa sổ 5×5 quanh tâm.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
