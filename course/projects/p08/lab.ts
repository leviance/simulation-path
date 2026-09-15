import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "TURRET LAB",
    title: "Tháp pháo quyết định quay về phía nào?",
    description:
      "Kéo mục tiêu để quan sát dot product, góc, projection, chiều quay và vùng khóa trên cùng một hình vẽ.",
  },
  modes: {
    "turret-scene": {
      title: "Tọa độ chuột trở thành hướng tới mục tiêu thế nào?",
      description:
        "Kéo mục tiêu quanh tháp pháo và đối chiếu độ dời trong world space với vị trí pixel trên Canvas.",
    },
    "turret-dot": {
      title: "Dot product đang đo hướng hay khoảng cách?",
      description:
        "Đặt mục tiêu cùng hướng, vuông góc hoặc ngược hướng rồi thay đổi khoảng cách để so raw dot với normalized dot.",
    },
    "turret-angle": {
      title: "Làm sao đổi normalized dot thành góc?",
      description:
        "Theo dõi cosine và góc từ acos; trường hợp mục tiêu trùng tâm được xử lý riêng để không sinh NaN.",
    },
    "turret-projection": {
      title: "Mục tiêu nằm dọc đường ngắm bao xa và lệch bao nhiêu?",
      description:
        "Vector xanh là projection lên hướng nòng; đoạn đỏ là rejection vuông góc còn lại.",
    },
    "turret-rotation": {
      title: "Góc có dấu chọn chiều quay như thế nào?",
      description:
        "Tháp pháo quay từng bước theo turnSpeed × deltaTime và tự dừng khi chạm đúng hướng mục tiêu.",
    },
    "turret-view-cone": {
      title: "Khi nào mục tiêu được xem là đã khóa?",
      description:
        "Điều chỉnh half-angle và so normalized dot với cos(halfAngle) ngay trên hai cạnh vùng nhìn.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
