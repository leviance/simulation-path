import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "TRIANGLE RASTER LAB",
    title: "Rasterizer quyết định một pixel thuộc tam giác như thế nào?",
    description:
      "Kéo ba vertex, đặt sample, chạy từng candidate pixel và so hai fill rule bằng cùng edge function, pixel-center convention và barycentric weights như source C++.",
  },
  modes: {
    "triangle-frame": {
      title: "Ba screen vertex đã đủ để bắt đầu chưa?",
      description:
        "Kéo A, B, C và kiểm tra wireframe cùng screen-space coordinates trước khi thuật toán tìm phần bên trong.",
    },
    "triangle-bounds": {
      title: "Có cần kiểm tra mọi pixel trên màn hình?",
      description:
        "Quan sát bounding box đã clamp, số pixel toàn Canvas và số candidate thực sự cần đưa qua coverage test.",
    },
    "triangle-edge": {
      title: "Một edge function nói gì về sample?",
      description:
        "Di chuyển sample để đọc ba giá trị orient2D, signed double area và winding sau khi đổi thứ tự vertex.",
    },
    "triangle-center": {
      title: "Tại sao phải lấy mẫu ở x+0.5, y+0.5?",
      description:
        "Chuyển giữa pixel corner và pixel center để thấy một độ lệch nửa pixel có thể thay đổi quyết định coverage gần biên.",
    },
    "triangle-fill": {
      title: "Vòng raster đi qua bounding box theo thứ tự nào?",
      description:
        "Pause rồi tiến từng candidate theo row-major; pixel được nhận và bị loại dùng hai trạng thái khác nhau.",
    },
    "triangle-top-left": {
      title: "Ai sở hữu pixel nằm đúng cạnh chung?",
      description:
        "Ghép hai triangle thành quad và so inclusive với top-left rule; sample bị tô hai lần được đánh dấu rõ trên đường chéo.",
    },
    "triangle-barycentric": {
      title: "Ba edge value biến thành màu bên trong ra sao?",
      description:
        "Đọc wA, wB, wC tại sample, kiểm tổng bằng 1 và dùng cùng weights để nội suy ba màu vertex.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
