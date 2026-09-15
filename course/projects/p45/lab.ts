import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "MOLECULAR LAB GPU",
    title: "Từ ca nhỏ kiểm chứng được tới mục tiêu hàng triệu hạt",
    description:
      "Canvas CPU giải thích các pha, bank và vùng tìm hạt; bản native dùng OpenGL compute mới là nơi đo GPU.",
  },
  modes: {
    "gpu-md-1": {
      title: "Dựng cửa sổ và nhìn thấy hệ hạt trước",
      description:
        "Tạo cửa sổ OpenGL, đặt 64 hạt đứng yên và phân biệt preview với dữ liệu tính trên GPU.",
    },
    "gpu-md-2": {
      title: "Đặt dữ liệu lên GPU và khởi tạo hạt",
      description:
        "Tách các SSBO vec4, ước tính dung lượng và cho compute shader tạo position/velocity bằng seed cố định.",
    },
    "gpu-md-3": {
      title: "Vẽ hạt trực tiếp từ SSBO",
      description:
        "Vertex shader đọc bank đã hoàn tất; thêm pan, cursor-anchored zoom và giới hạn số marker được vẽ.",
    },
    "gpu-md-4": {
      title: "Tính lực trên GPU, bắt đầu từ ca nhỏ",
      description:
        "Mỗi invocation tự cộng lực cho một hạt, giữ U/2 và đối chiếu force-shifted LJ với oracle CPU.",
    },
    "gpu-md-5": {
      title: "Dựng grid trên GPU để giảm số cặp",
      description:
        "Atomic append vào bucket 16 slot, kiểm overflow rồi tìm hạt trong stencil tuần hoàn quanh mốc dựng.",
    },
    "gpu-md-6": {
      title: "Cho hệ chuyển động bằng Velocity Verlet",
      description:
        "Drift ghi bank ứng viên, dựng grid rồi tính lực mới, kick và chỉ nhận bước hoàn tất.",
    },
    "gpu-md-7": {
      title: "Tái sử dụng grid mà không bỏ sót lực",
      description:
        "Theo dõi displacement trên GPU, kiểm nửa skin sau drift và truy vấn quanh vị trí reference.",
    },
    "gpu-md-8": {
      title: "Đo năng lượng và động lượng trên GPU",
      description:
        "Reduction phân tầng biến hàng triệu giá trị thành bốn số; từ chối bước có dữ liệu không hữu hạn.",
    },
    "gpu-md-9": {
      title: "Tăng số hạt có kiểm soát",
      description:
        "Kiểm SSBO, bộ nhớ resident/peak, chia dispatch và cho phép chọn 100.000 tới mục tiêu 5 triệu hạt.",
    },
    "gpu-md-10": {
      title: "Kiểm chứng, đo chi phí và chạy bản hoàn chỉnh",
      description:
        "Chạy oracle ở 64/257 hạt, kiểm quỹ đạo/reduction, đo hữu hạn và tải toàn bộ source có thể build.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
