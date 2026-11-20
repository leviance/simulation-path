import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p60-l01": {
      focus: "Từ tâm màn hình đến hướng nhìn trong thế giới",
      expected: "F3 bật/tắt hai nét giữa ảnh. Bài này chưa trả tên vật liệu.",
      files: [
        "include/trail/probe.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/field-controls.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Từ tâm ảnh lấy một hướng trong thế giới",
          explanation:
            "Thêm eyeRay vào probe.hpp. Lấy vị trí mắt làm gốc, cộng các độ lệch theo hai trục của camera rồi chuẩn hóa.",
        },
        {
          title: "Bật ống ngắm và vẽ dấu cộng",
          explanation:
            "Trong field-scene.hpp, giữ trạng thái dụng cụ và mở vùng khảo sát 3×3 cột. Trong field-controls.hpp, F3 đổi showProbe.",
        },
      ],
    },
    "p60-l02": {
      focus: "Theo tia đến mặt đầu tiên, không bỏ sót block",
      expected: "Nhìn gần thấy ô và khoảng cách; quay lên trời mất ô; tia không thay đổi dữ liệu.",
      files: [
        "include/trail/probe.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Tìm đoạn tia có thể gặp đất",
          explanation:
            "Trong probe.hpp, viết clipVolume để cắt tia với hộp chứa các cột. Với một trục có hướng bằng 0, tia không bao giờ cắt thêm vách trên trục đó.",
        },
        {
          title: "Thăm ô theo đúng thứ tự",
          explanation:
            "Trong probe, đọc vật liệu ở ô hiện tại trước khi tiến. Nếu hai trục hòa khi chạm cạnh, cho cả hai bước cùng lúc để không thăm một ô tia chỉ sượt qua.",
        },
        {
          title: "Đưa phép đo lên ảnh",
          explanation:
            "Trong field-scene.hpp, Scene::reading() đổi ô world sang địa chỉ cột. Khi dụng cụ bật, update lưu gốc, hướng và kết quả; draw viền ô trúng, thêm đường tia khi bật chẩn đoán.",
        },
      ],
    },
    "p60-l03": {
      focus: "Đóng băng phép đo và đi quanh vật vừa ngắm",
      expected:
        "Khi giữ bằng I, đi ngang vẫn đọc ô và khoảng cách cũ. Bỏ giữ mới lấy phép đo tiếp.",
      files: ["include/trail/field-scene.hpp", "include/trail/field-controls.hpp"],
      steps: [
        {
          title: "Giữ cả tia, không chỉ ô trúng",
          explanation:
            "Trong field-scene.hpp, thêm holdHit, ban đầu tắt. Chỉ ghi shotOrigin, shotDirection và hit khi không giữ kết quả.",
        },
        {
          title: "Gắn phím I để ghim phép đo",
          explanation:
            "Trong field-controls.hpp, đảo scene.holdHit khi nhận I. F3 vẫn chỉ bật/tắt hiển thị.",
        },
      ],
    },
  },
  references: {
    "p60-l01": [
      {
        label: "Tia từ mắt qua một pixel",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l02": [
      {
        label: "3D DDA: đi qua các ô theo tia",
        href: "/glossary#voxel-dda-traversal",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l03": [
      {
        label: "Ống ngắm chỉ đọc",
        href: "/glossary#voxel-read-only-probe",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
