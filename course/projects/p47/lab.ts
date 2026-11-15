import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "HEAT PLATE LAB",
    title: "Tô một vùng nóng rồi quan sát nhiệt lan",
    description:
      "Trường nhiệt thực, slider D/dt, hai kiểu biên và thí nghiệm bất ổn có giới hạn; Canvas hỗ trợ bài học, không thay ứng dụng C++/SDL3.",
  },
  modes: {
    "heat-1": {
      title: "Thấy nhiệt độ trước khi viết solver",
      description: "Lưới 32×32 đứng yên, số thực và màu là hai thứ khác nhau.",
    },
    "heat-2": {
      title: "Tô nóng và lạnh lên tấm",
      description: "Mouse/keyboard, brush tròn và stroke; chưa có bước khuếch tán.",
    },
    "heat-3": {
      title: "Vì sao ô nóng hạ nhiệt?",
      description: "Chỉ trao đổi theo chiều ngang; tiến từng bước và đọc các ô cạnh nhau.",
    },
    "heat-4": {
      title: "Một xung nhiệt lan theo bốn hướng",
      description: "Stencil năm điểm, double buffer và phép kiểm dấu cộng ở bước đầu.",
    },
    "heat-5": {
      title: "Giữ nóng một điểm, làm lạnh một vành",
      description: "So cách nhiệt với vành lạnh; phân biệt dấu bút và heater giữ theta.",
    },
    "heat-6": {
      title: "Cố ý tăng bước thời gian quá lớn",
      description:
        "D/dt tác động lên solver; bàn cờ có giá trị âm/vượt 1 thật, được dừng trước khi phát nổ.",
    },
    "heat-7": {
      title: "192×192 ô thật, cùng một miền",
      description: "Thử 128/192/256, đọc h và giới hạn dt; toàn bộ field vẫn được cập nhật/vẽ.",
    },
    "heat-8": {
      title: "Đo nhiệt tại một điểm",
      description:
        "Cảnh mẫu, probe và đồ thị theo thời gian mô hình; không tự co thang màu để che sự nguội đi.",
    },
    "heat-9": {
      title: "Hình ảnh có khớp phép tính?",
      description:
        "Fixture độc lập và refinement hữu hạn trên dữ liệu riêng; không dùng chữ PASS thay nghiệm thu ứng dụng.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
