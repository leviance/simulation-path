import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "FPS CAMERA LAB",
    title: "Đi trong phòng bằng camera, không xoay cả world",
    description:
      "Cùng convention với C++: view inverse, basis, Walk/Fly, clipping và các thí nghiệm kiểm chứng.",
  },
  modes: {
    "camera-room": {
      title: "Dựng căn phòng trước khi cho camera đi",
      description:
        "Sinh sàn, tường, trần và mốc quan sát trong world; vẽ từ vị trí mắt cố định bằng renderer CPU của P13.",
    },
    "camera-translation": {
      title: "Đổi gốc tọa độ về vị trí camera",
      description:
        "Trừ camera position, quan sát vật trôi ngược chiều mà không sửa một world vertex nào.",
    },
    "camera-orientation": {
      title: "Nhìn quanh bằng phép quay ngược",
      description: "Suy đúng dấu và thứ tự inverse yaw/pitch theo quy ước +Z trước, +Y lên.",
    },
    "camera-basis": {
      title: "Dựng ba trục forward, right, up",
      description:
        "Từ yaw/pitch suy basis, so dot product với cách quay ngược và kiểm tra số biết trước.",
    },
    "camera-movement": {
      title: "Đi bộ theo hướng nhìn với WASD",
      description:
        "Đọc keyboard state, tạo direction trong world và nhân speed × dt, không bay khi nhìn lên.",
    },
    "camera-fly": {
      title: "Thêm Fly và điều khiển độ cao",
      description:
        "Tách forward đầy đủ khỏi groundForward, dùng Q/E theo world Y và chuẩn hóa tổng hướng.",
    },
    "camera-mouse-look": {
      title: "Nhìn quanh bằng relative mouse mode",
      description:
        "Click để bật SDL relative mode, dùng delta không nhân dt và dọn input khi thoát hoặc mất focus.",
    },
    "camera-bounds": {
      title: "Giữ camera trong phòng, hoàn thiện bản demo",
      description:
        "Giới hạn sáu biên ngoài, pause/step/reset, chế độ sạch và đi thử tự động có thể dừng.",
    },
    "camera-validation": {
      title: "Kiểm chứng camera và chạy bản hoàn chỉnh",
      description:
        "Khóa phép view bằng oracle độc lập, kiểm basis/movement/clipping và build toàn bộ source.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
