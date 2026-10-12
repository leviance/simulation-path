import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "HEAT PLATE LAB",
    title: "Nhiệt lan đi, không phải màu tự nhòe",
    description:
      "Đặt vùng nóng, tiến từng bước và đọc nhiệt độ thật. Canvas dùng cùng stencil, điều kiện biên và hệ số với source C++.",
  },
  modes: {
    "heat-1": {
      title: "Vẽ tấm kim loại trước khi mô phỏng nhiệt",
      description: "Lưu nhiệt độ bằng số thực, tạo một vùng nóng và vẽ lưới bằng SDL3.",
    },
    "heat-2": {
      title: "Đặt vùng nóng và lạnh bằng chuột",
      description: "Đổi tọa độ input, tô brush tròn và nối các sample thành nét liền.",
    },
    "heat-3": {
      title: "Vì sao ô nóng truyền nhiệt sang ô bên cạnh?",
      description: "Từ chênh lệch hai bên, suy ra sai phân bậc hai và cập nhật một hàng.",
    },
    "heat-4": {
      title: "Cho nhiệt lan trên cả tấm bằng stencil năm điểm",
      description: "Thêm hai hàng trên/dưới và phân biệt diffusion với chuyển vật liệu.",
    },
    "heat-5": {
      title: "Nhiệt đi đâu khi chạm mép tấm?",
      description: "So sánh biên cách nhiệt với vành ô bị giữ lạnh, cả khi người dùng tô lên mép.",
    },
    "heat-6": {
      title: "Chạy liên tục mà không làm nghiệm phát nổ",
      description: "Suy ra rx+ry ≤ 1/2, từ chối cấu hình sai và tách solver khỏi FPS.",
    },
    "heat-7": {
      title: "Đọc nhiệt độ thật thay vì chỉ nhìn màu",
      description: "Thêm inspector, min/max, trung bình và tổng nhiệt độ dư.",
    },
    "heat-8": {
      title: "Kiểm chứng solver và chạy bản hoàn chỉnh",
      description:
        "Cảnh mẫu, ca kiểm chứng hữu hạn, nghiệm tham chiếu rời rạc và CTest Debug/Release.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
