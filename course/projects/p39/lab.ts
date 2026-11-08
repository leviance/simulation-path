import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "MILLION OBJECT CITY",
    title: "Theo một object từ vùng nhìn đến lệnh vẽ",
    description:
      "Canvas 2D chiếu một thành phố CPU thu nhỏ theo phối cảnh. Nó giúp đọc mask, prefix, ID và command; không chạy compute shader, không đo GPU và không thay bản C++ một triệu object.",
  },
  modes: {
    city: {
      title: "Đi vào khu phố",
      description: "Đổi camera, FOV và seed, chọn vật thể rồi so culling bật/tắt trên cùng cảnh.",
    },
    frustum: {
      title: "Vì sao object được nhận?",
      description:
        "Xem bounds trong, ngoài hoặc cắt sáu plane; góc quan sát phụ giúp đọc tập nhận/loại.",
    },
    reduction: {
      title: "Gom count và min/max",
      description:
        "Đọc kết quả của tập được nhận, kể cả tập rỗng; số liệu là tính toán CPU minh họa, không phải GPU timing.",
    },
    scan: {
      title: "Một số 1 sẽ ghi vào đâu?",
      description: "So mask với exclusive prefix và các block offsets bằng số nguyên.",
    },
    compaction: {
      title: "Mỗi ID có đúng một chỗ",
      description:
        "Theo dõi danh sách visible IDs theo nhóm mesh và kiểm thứ tự ổn định khi camera đổi.",
    },
    indirect: {
      title: "Command đọc dữ liệu nào?",
      description:
        "Liên hệ group count/offset với instanceCount và vùng ID mà renderer sẽ đọc; zero-visible phải vẽ rỗng.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
