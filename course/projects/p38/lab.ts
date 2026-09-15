import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "FIVE MILLION PARTICLE LAB",
    title: "Năm triệu particle đi từ compute sang draw như thế nào?",
    description:
      "Theo dõi một particle từ lúc được tạo trên CPU, đưa vào SSBO, cập nhật bằng compute shader cho đến khi vertex shader vẽ nó. Canvas giải thích chuỗi xử lý, barrier, query ring và buffer probe; đây không phải phép đo GPU thật.",
  },
  modes: {
    "particle-contract": {
      title: "Một particle cần giữ những đại lượng nào?",
      description:
        "Thay đổi dt và gravity để quan sát thứ tự cập nhật velocity, position, age và thời điểm particle được respawn.",
    },
    "particle-initialization": {
      title: "Vì sao không nên cho năm triệu hạt cùng age bằng 0?",
      description:
        "Đổi seed và bật hoặc tắt việc trải age ban đầu để so một đợt phun đồng loạt với dòng hạt đã được phân bố theo vòng đời.",
    },
    "particle-budget": {
      title: "GPU hiện tại chứa được bao nhiêu particle?",
      description:
        "Đổi số particle và giới hạn phần cứng, đọc ngân sách byte cùng số workgroup rồi xem chương trình chọn preset nhỏ hơn trước khi cấp phát thế nào.",
    },
    "particle-compute": {
      title: "Mỗi invocation cập nhật particle của mình ra sao?",
      description:
        "Theo dõi local ID, global ID, dt và gravity; đồng thời quan sát các lane thừa dừng trước khi truy cập buffer.",
    },
    "particle-render": {
      title: "gl_VertexID tìm particle trong SSBO như thế nào?",
      description:
        "Chọn một draw vertex rồi nối `gl_VertexID` với particle record, point size, tuổi chuẩn hóa và màu của point sprite.",
    },
    "compute-draw-barrier": {
      title: "Vertex shader cần barrier bit nào để thấy dữ liệu mới?",
      description:
        "Thử `SHADER_STORAGE`, bỏ barrier hoặc cố tình chọn bit dành cho readback để thấy compute → vertex khác với compute → CPU ở Project 37.",
    },
    "particle-time-control": {
      title: "Một frame bị khựng có nên làm mô phỏng nhảy xa không?",
      description:
        "Thay đổi raw dt, pause và single-step rồi quan sát cách giới hạn dt ngăn particle đi qua cả vòng đời chỉ trong một frame.",
    },
    "particle-timing": {
      title: "Query ring tránh chờ GPU như thế nào?",
      description:
        "Theo dõi bốn slot đang chờ hoặc đã sẵn sàng, cùng các mẫu compute/draw và median khi tăng tới năm triệu particle.",
    },
    "particle-probe": {
      title: "Kiểm tra shader mà không đọc 160 MB về CPU thế nào?",
      description:
        "Chạy 64 particle trong một buffer riêng, chèn lỗi NaN, gravity hoặc respawn rồi đọc báo cáo sai số cụ thể.",
    },
    "particle-fountain-final": {
      title: "Chuỗi particle chạy hoàn toàn trên GPU đã hoàn chỉnh chưa?",
      description:
        "Đổi số particle, pause, step và reset; sau đó theo dõi update → barrier → draw và xác nhận vòng lặp thường không đọc toàn bộ buffer về CPU.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
