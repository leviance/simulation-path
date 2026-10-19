import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "TURRET LAB",
    title: "Từ hướng mục tiêu tới quyết định quay",
    description:
      "Di chuột, giữ target hoặc chọn preset; đọc dot, góc và hình chiếu trên cùng tháp pháo. Bản đầy đủ không ẩn các lớp cốt lõi.",
  },
  modes: {
    "turret-scene": {
      title: "Vẽ tháp pháo rồi đặt mục tiêu bằng chuột",
      description: "Chạy starter, vẽ thân/nòng, đổi mouse sang world và hiện hai hướng.",
    },
    "turret-dot": {
      title: "Dot product đo điều gì giữa hai vector?",
      description: "So raw dot với normalized dot bằng các hướng và khoảng cách biết trước.",
    },
    "turret-angle": {
      title: "Từ cosine đến góc sai lệch",
      description: "Dùng acos, clamp và phân biệt góc đo được với trường hợp chưa có hướng.",
    },
    "turret-projection": {
      title: "Mục tiêu nằm dọc đường ngắm bao xa?",
      description: "Tách projection và rejection, kiểm dấu và tính vuông góc.",
    },
    "turret-rotation": {
      title: "Chọn chiều quay và giới hạn tốc độ",
      description: "Tự viết crossZ, signed angle và steering không vượt mục tiêu.",
    },
    "turret-view-cone": {
      title: "Kiểm tra vùng nhìn bằng dot product",
      description: "Dùng nửa góc, xử lý hai biên và nói rõ phép kiểm tra chỉ xét góc.",
    },
    "turret-full": {
      title: "Hoàn thiện tháp pháo và kiểm chứng",
      description: "Ghép bản đầy đủ, kiểm bằng oracle độc lập và thử input/HiDPI.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
