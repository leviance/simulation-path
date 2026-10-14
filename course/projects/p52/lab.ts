import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "RAY INTERSECTION LAB",
    title: "Một tia, bốn loại bề mặt",
    description: "Ngắm tia bằng chuột hoặc bàn phím, đọc hit và thử những trường hợp dễ viết sai.",
  },
  modes: {
    "ray52-1": {
      title: "Dựng cảnh để nhìn thấy thứ mình sắp chọn",
      description: "Mở SDL window, chiếu world lên màn hình và vẽ bốn hình bằng khung dây.",
    },
    "ray52-2": {
      title: "Từ vị trí chuột đến một tia trong world",
      description: "Đổi tọa độ input, aspect và FOV thành direction; kiểm ngược bằng projection.",
    },
    "ray52-3": {
      title: "Tìm điểm chạm mặt phẳng và nhận ra tia song song",
      description: "Giải một phương trình theo t, thêm Hit và xử lý khoảng tia cùng normal.",
    },
    "ray52-4": {
      title: "Hai nghiệm của sphere: vào, ra và tiếp tuyến",
      description: "Giải quadratic với direction bất kỳ, chọn nghiệm hợp lệ và giữ outward normal.",
    },
    "ray52-5": {
      title: "Thu hẹp khoảng tia qua ba slab của box",
      description: "Lấy giao khoảng x/y/z; phân biệt xuyên thể tích với chạm bề mặt.",
    },
    "ray52-6": {
      title: "Chọn đúng phần bên trong tam giác",
      description: "Möller–Trumbore, barycentric, hai phía và tam giác suy biến.",
    },
    "ray52-7": {
      title: "Ghép bốn phép giao thành công cụ chọn vật thể",
      description: "So t trên cùng ray, giữ ID ổn định và thêm preset, scan/pause, range.",
    },
    "ray52-8": {
      title: "Kiểm chứng hình học và chạy project hoàn chỉnh",
      description: "CTest Debug/Release, round-trip, residual và source độc lập tải về.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
