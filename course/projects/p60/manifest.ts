import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Nhìn vào cảnh để đọc vật liệu, tọa độ và khoảng cách; mẫu dò không làm thay đổi thế giới.",
  duration: "4–6 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 59. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Từ tâm màn hình đến hướng nhìn trong thế giới",
    "Theo tia đến mặt đầu tiên, không bỏ sót block",
    "Đóng băng phép đo và đi quanh vật vừa ngắm",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission:
      "Tự làm một ống ngắm đọc được từng viên đá: chỉ vào đâu, cách mắt bao xa, nhìn trúng mặt nào?",
    outcome:
      "Khi tâm ngắm đi từ thân cây ra trời, tên vật liệu nhường chỗ cho kết quả không gặp gì.",
    requirements: [
      "Phân biệt trống với chưa nạp. Đóng băng và tắt được ống ngắm; hash địa hình bất biến.",
      "Tia giữa song song với hướng nhìn và dài một đơn vị; tia bên phải có tích vô hướng dương với trục phải. Kiểm lại ở hai khung hình khác tỉ lệ.",
      "Qua lần lượt đá, cát, nước và trời; đồng thời kiểm hash ô, số quad và số lần dựng mesh trước/sau một loạt phép dò. Tất cả số đo về hình học phải bất biến.",
    ],
    constraints: [
      "3D DDA chỉ đọc, tầm hữu hạn; không đặt hoặc phá block.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "Phân biệt trống với chưa nạp. Đóng băng và tắt được ống ngắm; hash địa hình bất biến.",
      "So DDA với giao ray/hộp của từng block trên một cảnh nhỏ. Kiểm hướng song song trục, biên âm, điểm bắt đầu trong vật liệu và vật nằm đúng giới hạn tầm dò.",
      "Qua lần lượt đá, cát, nước và trời; đồng thời kiểm hash ô, số quad và số lần dựng mesh trước/sau một loạt phép dò. Tất cả số đo về hình học phải bất biến.",
    ],
  },
  lessons: [
    {
      id: "p60-l01",
      slug: "01-tia-tu-tam-mat",
      title: "Từ tâm màn hình đến hướng nhìn trong thế giới",
      summary: "Màn hình là cửa sổ nhìn qua, không phải mặt phẳng đất.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "voxel-ray-editor",
    },
    {
      id: "p60-l02",
      slug: "02-buoc-qua-tung-o",
      title: "Theo tia đến mặt đầu tiên, không bỏ sót block",
      summary: "Đặt một thước trên mỗi trục.",
      order: 2,
      estimatedMinutes: 85,
      demoId: "voxel-ray-editor",
    },
    {
      id: "p60-l03",
      slug: "03-doc-khong-sua",
      title: "Đóng băng phép đo và đi quanh vật vừa ngắm",
      summary:
        "Phân biệt ba kết quả: gặp vật liệu, đi hết tầm trong không khí, hoặc chạm biên chưa có dữ liệu.",
      order: 3,
      estimatedMinutes: 55,
      demoId: "voxel-ray-editor",
    },
  ],
  lessonAliases: {
    "01-tam-ngam-tren-khoi-dat": "01-tia-tu-tam-mat",
    "02-tu-pixel-den-ray": "01-tia-tu-tam-mat",
    "03-cat-ray-voi-chunk": "02-buoc-qua-tung-o",
    "04-di-qua-tung-o": "02-buoc-qua-tung-o",
    "05-hit-va-phap-tuyen": "02-buoc-qua-tung-o",
    "06-pha-mot-block": "03-doc-khong-sua",
    "07-dat-block-ke-mat": "03-doc-khong-sua",
    "08-input-va-cap-nhat-mesh": "03-doc-khong-sua",
    "09-kiem-chung-va-hoan-thien": "03-doc-khong-sua",
  },
} satisfies PublishedProjectEditorial;
export default data;
