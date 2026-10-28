import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "CPU / GPU MODEL VIEWER LAB",
    title: "Cùng một mô hình, đổi renderer mà không đổi cảnh",
    description:
      "Dùng lại rocket và sphere Project 21 để quan sát mesh, camera, clipping, depth và ánh sáng. Canvas 2D minh họa công thức; bản C++ thực hiện OpenGL và phép đối chiếu phần cứng.",
  },
  modes: {
    "shared-scene": {
      title: "Mở lại model viewer, tách scene khỏi renderer",
      description:
        "Khởi động bộ khung SDL/OpenGL đã biết, đặt camera, mô hình và tùy chọn hiển thị vào một ViewerScene không chứa tài nguyên backend.",
    },
    "indexed-mesh": {
      title: "Dùng lại OBJ và chuẩn bị một mesh chung",
      description:
        "Dùng nguyên loader và dataset Project 21; chuẩn hóa mesh, tạo normal phẳng và tách vertex tại cạnh cứng để CPU/GPU đọc cùng dữ liệu.",
    },
    "cpu-path": {
      title: "Giữ nguyên pipeline CPU cho mesh thật",
      description:
        "Nối indexed mesh với transform, clipping sáu mặt, rasterizer và Z-buffer; texture presenter chỉ mang ảnh đã vẽ lên cửa sổ.",
    },
    "gpu-indexed-draw": {
      title: "Đưa mesh lên GPU bằng VBO và EBO",
      description:
        "Định nghĩa position/normal attributes, upload VBO/EBO một lần, giữ EBO trong VAO và vẽ đủ cả mesh 2.976 tam giác.",
    },
    "mvp-contract": {
      title: "Một camera, cùng Model–View–Projection",
      description:
        "Quy định hệ trục, thứ tự xoay, camera orbit/pan/zoom và projection; truyền đúng 16 float cho C++ lẫn GLSL.",
    },
    "depth-contract": {
      title: "Clipping, depth và winding phải khớp",
      description:
        "Cắt trước perspective divide, ánh xạ depth về [0,1], thống nhất LESS và CCW; chủ động tắt depth/culling để tìm lỗi.",
    },
    "culling-contract": {
      title: "Chiếu sáng và các chế độ xem mô hình",
      description:
        "Dùng cùng normal và ánh sáng Lambert, thêm wireframe, normal vectors và lưới; phân biệt chế độ debug với ảnh dùng để đối chiếu.",
    },
    "renderer-switch": {
      title: "Đổi backend mà không mất trạng thái",
      description:
        "Đặt input/update trước render, giữ nguyên scene khi F1/F2, xử lý capture/focus/resize và cache tài nguyên qua nhiều lần đổi backend.",
    },
    "cube-validation": {
      title: "Đối chiếu, đo thời gian và hoàn thiện viewer",
      description:
        "Dùng CPU tests, transform feedback, so ảnh/depth và benchmark hữu hạn; đọc đúng các cột thời gian và tải toàn bộ source chạy độc lập.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
