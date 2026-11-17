import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "SPH WATER / 3D",
    title: "Bể nước 3D: từ hạt tới mặt nước",
    description:
      "Canvas CPU giải thích mô hình với 64–8.000 hạt. Bản C++ xử lý 110.592 hạt thật trên GPU; Canvas không phải benchmark GPU.",
  },
  modes: {
    "sph3-1": {
      title: "Dựng bể và nhìn rõ từng lớp hạt",
      description: "Giữ đúng vòng đời cửa sổ OpenGL; tính vị trí người quan sát.",
    },
    "sph3-2": {
      title: "Đổi SPH từ diện tích sang thể tích",
      description: "Chốt đơn vị và độ phân giải; giữ một cách tính chậm nhưng dễ kiểm.",
    },
    "sph3-3": {
      title: "Tạo dữ liệu hạt trực tiếp trên GPU",
      description: "Khóa layout bằng static_assert; cho mỗi invocation khởi tạo một hạt.",
    },
    "sph3-4": {
      title: "Tính density và pressure mà chưa di chuyển hạt",
      description: "Đưa đúng kernel 3D sang GLSL; tính pressure từ kết quả vừa cộng.",
    },
    "sph3-5": {
      title: "Cho nước chuyển động từ lực SPH",
      description: "Viết lực pressure và viscosity; tích phân sang bank khác.",
    },
    "sph3-6": {
      title: "Tìm hàng xóm bằng grid 3D trên GPU",
      description: "Đếm occupancy của từng cell; ghép scan nhiều tầng trên host.",
    },
    "sph3-7": {
      title: "Chọn timestep từ dữ liệu của chính tick hiện tại",
      description: "Viết đáp án dt trước khi port; lặp reduction tới một record.",
    },
    "sph3-8": {
      title: "Dựng độ sâu và độ dày từ các hạt nước",
      description: "Vẽ một quad đủ che mặt cầu; cộng độ dày bằng blending.",
    },
    "sph3-9": {
      title: "Biến ảnh độ sâu thành mặt nước có chiều sâu",
      description: "Lọc depth nhưng giữ cạnh; kết hợp độ dày và góc nhìn.",
    },
    "sph3-10": {
      title: "Kéo vật cản để tạo dòng chảy 3D",
      description: "Cấp support ở vùng rắn; đổi con trỏ thành target world.",
    },
    "sph3-11": {
      title: "Giữ cửa sổ phản hồi khi GPU đang tính",
      description: "Đọc một báo cáo nhỏ sau batch; poll không khóa event loop.",
    },
    "sph3-12": {
      title: "Chạy 110.592 hạt và đo từng phần",
      description: "Dự toán trước khi cấp phát; đo một phiên có điểm dừng.",
    },
    "sph3-13": {
      title: "Kiểm chứng rồi đóng gói bể nước hoàn chỉnh",
      description: "So sánh trên cùng input, không cùng implementation; kiểm một bước từ state cũ.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
