import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/optics",
    withDemo: true,
    overview: ["timber"],
    lessons: { "ct56-11": ["timber"] },
    takes: {
      timber: {
        title: "Bên trong khoanh gỗ",
        source: "Project 56 · C++/SDL3 · Release",
        poster: "timber.png",
        alt: "Ba ô cho mặt cắt gỗ, sinogram theo 180 góc và ảnh dựng không lọc có mắt gỗ sáng.",
        caption:
          "Tìm mắt gỗ ở phía dưới bên phải của ô thứ ba rồi so với ô đầu. Hai hình không trùng khít vì phép trải ngược không lọc làm mờ cạnh.",
      },
    },
  },
  base: {
    label: "CT SINOGRAM LAB",
    title: "Trạm soi khoanh gỗ",
    description:
      "Tìm hốc và mắt gỗ qua 180 góc: đối chiếu vật mẫu, các hàng số đo và ảnh trải ngược.",
  },
  modes: {
    "ct56-1": {
      title: "Vẽ vật thể trước khi xây máy quét",
      description: "Phantom là dữ liệu hình học, không phải ảnh CT đã đo.",
    },
    "ct56-2": {
      title: "Quay nguồn và detector quanh vật thể",
      description: "Giữ đúng khoảng cách và hướng dãy detector bằng radial/tangent.",
    },
    "ct56-3": {
      title: "Đo chiều dài tia đi trong một đĩa",
      description: "Đọc từng chord của đoạn tia hữu hạn.",
    },
    "ct56-4": {
      title: "Từ chiều dài đến một hàng detector",
      description: "So p và T khi đổi phantom hoặc strength.",
    },
    "ct56-5": {
      title: "Ghép các góc đo thành sinogram",
      description: "Đo từng hàng, phân biệt ô chưa đo và p=0; chọn ô để xem tia.",
    },
    "ct56-6": {
      title: "Quét từng phần và giữ dữ liệu nhất quán",
      description: "Dừng/tiếp tục, đổi display không xóa dữ liệu, đổi vật lý tạo lượt mới.",
    },
    "ct56-7": {
      title: "Theo dõi vệt của một điểm lệch tâm",
      description: "Vệt dự đoán fan-beam và phép đo của đĩa nhỏ là hai đại lượng khác nhau.",
    },
    "ct56-8": {
      title: "Đổi số góc mà không nhầm với độ nét ảnh",
      description: "So 30/60/120 góc, giữ nguyên 128 pixel detector.",
    },
    "ct56-9": {
      title: "Kiểm máy đo trên đĩa chuẩn",
      description: "Audit độc lập theo khoảng cách từ tâm đến đường tia.",
    },
    "ct56-10": {
      title: "Dựng lại khoanh gỗ từ số đo",
      description: "Dừng sau một góc rồi theo dõi các dải sáng hội tụ khi đo tiếp.",
    },
    "ct56-11": {
      title: "Mắt gỗ và quầng mờ",
      description: "Đối chiếu ảnh dựng không lọc với vật mẫu, đọc sai số trên cùng miền.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
