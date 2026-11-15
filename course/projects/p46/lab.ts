import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "FALLING SAND WORKSHOP",
    title: "Vẽ cảnh, mở đường cho cát và nước",
    description:
      "Canvas dùng cùng Cell, luật swap, seed và scan order với C++. Sáu bài đầu dùng 96×64; từ bài 7 xử lý đủ 512×320 ô, không dùng hình ảnh động vẽ sẵn.",
  },
  modes: {
    "sand-1": {
      title: "Nhìn từng ô vật liệu",
      description: "Chọn một ô để đọc vật liệu và index. Chưa có bút vẽ hoặc chuyển động.",
    },
    "sand-2": {
      title: "Vẽ một lối đi",
      description:
        "Thử brush sát biên và kéo nhanh ra ngoài lưới. Vật liệu đứng yên để bạn đọc đúng input.",
    },
    "sand-3": {
      title: "Một tick, một hàng",
      description:
        "Tiến từng tick để xem cát rơi và ô trống truyền lên trong một cột; moved mask không giữ chỗ Empty.",
    },
    "sand-4": {
      title: "Cát bắt đầu tạo đống",
      description:
        "Cát thử xuống rồi hai ô chéo; theo dõi hướng ưu tiên và chiều duyệt thay đổi theo tick.",
    },
    "sand-5": {
      title: "Cát đi qua nước",
      description:
        "Vẽ nước, thả cát phía trên và kiểm số ô từng loại. Nước giả chưa có áp suất hoặc độ nhớt.",
    },
    "sand-6": {
      title: "Tick không phải frame",
      description:
        "Đổi FPS và speed; tách nhịp 30 tick/giây khỏi tốc độ vẽ, đọc thời gian bị bỏ khi chạm budget.",
    },
    "sand-7": {
      title: "Cả lưới 163.840 ô",
      description:
        "Lưới 512×320 được mã hóa thành ảnh rồi vẽ một lần. So màu phẳng và màu có bóng mà không đổi dữ liệu.",
    },
    "sand-8": {
      title: "Năm cảnh, bốn thứ tự quét",
      description:
        "Thử phá đập, rót cát qua phễu và đổi order từ cùng seed; clear khác reset thế nào?",
    },
    "sand-9": {
      title: "Kiểm trước khi tin hình ảnh",
      description:
        "Đối chiếu fixture nhỏ trên lưới riêng; không lấy một nút PASS làm chứng nhận mọi cảnh hoặc hiệu năng native.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
