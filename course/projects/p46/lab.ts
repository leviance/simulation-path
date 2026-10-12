import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "FALLING SAND LAB",
    title: "Từ một ô cát đến cả hộp vật liệu",
    description:
      "Vẽ cát, tường và nước rồi quan sát từng tick. Canvas dùng cùng kích thước lưới, thứ tự duyệt và quy tắc đổi chỗ với C++.",
  },
  modes: {
    "sand-1": {
      title: "Lưới đứng yên",
      description:
        "Chọn một ô để xem tọa độ và row-major index. Bài này chưa có input vẽ hoặc chuyển động.",
    },
    "sand-2": {
      title: "Bút vẽ trên lưới",
      description:
        "Vẽ cát, tường hoặc tẩy bằng chuột hay bàn phím. Vật liệu vẫn đứng yên để bạn kiểm tra input.",
    },
    "sand-3": {
      title: "Cát chỉ rơi thẳng",
      description: "Bấm từng tick: mỗi ô cát chỉ đi xuống một hàng, chưa trượt chéo.",
    },
    "sand-4": {
      title: "Cát trượt và tạo đống",
      description:
        "Khi dưới bị chặn, thử hai hướng chéo. Chiều quét và hướng ưu tiên thay đổi theo tick.",
    },
    "sand-5": {
      title: "Nước giả và trao đổi vật liệu",
      description:
        "Nước có thể lan ngang; cát có thể đổi chỗ với nước. Theo dõi số ô mỗi loại khi không vẽ thêm.",
    },
    "sand-6": {
      title: "30 tick mỗi giây",
      description:
        "Đổi FPS hiển thị, chạy/dừng và quan sát tick. Frame quá chậm chỉ được bù tối đa bốn tick.",
    },
    "sand-7": {
      title: "Hộp cát hoàn chỉnh",
      description:
        "Thử cảnh mẫu, đọc checksum và chạy ca kiểm chứng hữu hạn 120 tick trên một lưới riêng.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
