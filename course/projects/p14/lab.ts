import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "FPS CAMERA LAB",
    title: "Camera làm gì để một căn phòng đứng yên trông như đang chuyển động?",
    description:
      "Quan sát room geometry, view transform, camera basis, WASD và mouse look trong cùng hệ tọa độ mà source C++ sử dụng.",
  },
  modes: {
    "camera-room": {
      title: "Một căn phòng wireframe cần những segment nào?",
      description:
        "Xem floor grid, khung tường và từng world-space segment trước khi camera có thể di chuyển hoặc xoay.",
    },
    "camera-translation": {
      title: "Vì sao camera đi sang phải làm căn phòng trôi sang trái?",
      description:
        "Thay camera position và so sánh world point với point sau phép trừ position trong camera space.",
    },
    "camera-orientation": {
      title: "Inverse yaw và pitch đổi hướng nhìn ra sao?",
      description:
        "Kéo yaw/pitch rồi theo dõi một world point đi qua translation, inverse yaw và inverse pitch.",
    },
    "camera-basis": {
      title: "Forward, right và up có thật sự trực chuẩn?",
      description:
        "Quan sát ba trục camera, magnitude và dot product khi yaw/pitch thay đổi gần giới hạn.",
    },
    "camera-movement": {
      title: "WASD phải được đổi từ input axis sang world velocity thế nào?",
      description:
        "Giữ phím hoặc dùng nút bước, đổi FPS và so sánh quãng đường sau cùng một khoảng thời gian.",
    },
    "camera-mouse-look": {
      title: "Mouse delta điều khiển yaw/pitch mà không cần vị trí tuyệt đối ra sao?",
      description:
        "Kéo trong Canvas bằng pointer capture, thay sensitivity và quan sát pitch dừng ở giới hạn an toàn.",
    },
    "camera-validation": {
      title: "Camera còn đúng khi vừa đi, vừa nhìn và chạm tường không?",
      description:
        "Điều khiển camera hoàn chỉnh rồi theo dõi bounds, basis error, view round trip và trạng thái pointer capture.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
