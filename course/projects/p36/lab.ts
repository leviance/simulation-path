import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "RAY-MARCHED SHAPE ROOM LAB",
    title: "Một pixel tìm được vật thể thế nào khi không có mesh?",
    description:
      "Theo dõi trọn đường đi từ một pixel đến camera ray, SDF, các bước sphere tracing, normal, material và bóng đổ trong cùng một căn phòng.",
  },
  modes: {
    "raymarch-screen": {
      title: "Fullscreen triangle tạo fragment ở đâu?",
      description:
        "Quan sát tọa độ pixel, UV và NDC trước khi biến mỗi fragment thành một tia nhìn. Bước này chưa dùng SDF hay vòng ray marching.",
    },
    "raymarch-camera": {
      title: "Từ một pixel, ta dựng tia nhìn trong world space thế nào?",
      description:
        "Thay đổi forward, right, up, aspect và field of view rồi quan sát tia ở tâm cùng bốn góc màn hình.",
    },
    "raymarch-sphere-sdf": {
      title: "Dấu của Sphere SDF cho ta biết điều gì?",
      description:
        "Kéo điểm mẫu qua lát cắt của sphere: giá trị âm ở bên trong, bằng zero trên bề mặt và dương ở bên ngoài.",
    },
    "raymarch-stepper": {
      title: "Vì sao tia có thể tiến theo đúng khoảng cách SDF?",
      description:
        "Cho một tia tiến từng bước rồi đọc quãng đường đã đi, khoảng cách hiện tại, hit epsilon và lý do vòng lặp dừng.",
    },
    "raymarch-normal": {
      title: "Không có triangle thì lấy normal ở đâu?",
      description:
        "Lấy sáu mẫu SDF quanh điểm chạm, dựng gradient rồi quan sát ánh sáng Lambert thay đổi theo normal và hướng đèn.",
    },
    "raymarch-primitives": {
      title: "Thêm box và torus có cần tạo vertex mới không?",
      description:
        "Bật hoặc tắt sphere, box và torus. Số draw call vẫn giữ nguyên; chỉ hàm khoảng cách của scene thay đổi.",
    },
    "raymarch-materials": {
      title: "Bề mặt gần nhất mang material nào tới điểm chạm?",
      description:
        "Giữ `distance` và `materialId` trong cùng một `SceneSample`, thêm các mặt tường rồi tô đúng màu của bề mặt gần nhất.",
    },
    "raymarch-shadow-camera": {
      title: "Camera ray và shadow ray làm hai việc gì khác nhau?",
      description:
        "Orbit camera, di chuyển đèn và quan sát normal bias cùng độ che sáng của shadow ray có giới hạn.",
    },
    "raymarch-validation": {
      title: "Một bức hình đẹp có thể che giấu lỗi ray marching không?",
      description:
        "Đổi giữa Beauty, Steps, Hit và Normal; sau đó điều chỉnh step/epsilon và đọc báo cáo kiểm tra trước khi sang Project 37.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
