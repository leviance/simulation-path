import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary: "Đổi cách dựng cùng một vách đá, đếm các mặt biến mất mà không làm thủng bờ suối.",
  duration: "4–6 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 58. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Tại sao có thể bỏ hai mặt mà vách đá vẫn nguyên?",
    "Ai chịu trách nhiệm về đường nối giữa hai bờ?",
    "So hai bức hình trước khi tin số tam giác",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission: "Giữ nguyên vật liệu và camera, giảm số mặt của vách mà không làm đổi hình bên ngoài.",
    outcome: "Một vách đá có thể đi vòng quanh, khung dây và công tắc để đối chiếu hai mesh.",
    requirements: [
      "Khối đặc từ 24.576 xuống 1.536 quad; hốc, mép nước và đường nối hai cột vẫn kín.",
      "Khối đặc 16³ cho 24.576 quad trước tối ưu, 1.536 quad sau tối ưu. Đổi góc nhìn không đổi hai số này; ở cạnh nước không có khe sáng.",
      "Chạy CTest cho bề mặt kín, mép nước, hốc và hai chunk kề nhau. Trong ứng dụng F1 phải báo các số đo của chính cảnh đang xem; quay đầu không dựng lại mesh.",
    ],
    constraints: [
      "Mặt giáp nước chỉ có một chủ. Camera không làm đổi dữ liệu block.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "Khối đặc từ 24.576 xuống 1.536 quad; hốc, mép nước và đường nối hai cột vẫn kín.",
      "Cùng hai chunk đặc liền x, tổng còn 2.560 quad đơn vị. Đổi thứ tự nạp vẫn có cùng tập mặt ngoài; bước qua đường nối không lộ đáy trời.",
      "Chạy CTest cho bề mặt kín, mép nước, hốc và hai chunk kề nhau. Trong ứng dụng F1 phải báo các số đo của chính cảnh đang xem; quay đầu không dựng lại mesh.",
    ],
  },
  lessons: [
    {
      id: "p59-l01",
      slug: "01-ai-che-mat-da",
      title: "Tại sao có thể bỏ hai mặt mà vách đá vẫn nguyên?",
      summary:
        "Thử đếm bằng hai viên xúc xắc: 12 mặt ban đầu, úp hai mặt vào nhau thì chỉ còn 10 mặt ngoài.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "voxel-hidden-faces",
    },
    {
      id: "p59-l02",
      slug: "02-mep-hai-chunk",
      title: "Ai chịu trách nhiệm về đường nối giữa hai bờ?",
      summary: "Chia một dãy 32 block thành hai nửa.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "voxel-hidden-faces",
    },
    {
      id: "p59-l03",
      slug: "03-do-cung-mot-vach",
      title: "So hai bức hình trước khi tin số tam giác",
      summary: "Lấy tập mặt ngoài làm đáp án hình học.",
      order: 3,
      estimatedMinutes: 55,
      demoId: "voxel-hidden-faces",
    },
  ],
  lessonAliases: {
    "01-do-ban-chua-toi-uu": "01-ai-che-mat-da",
    "02-tach-ham-ve-mot-mat": "01-ai-che-mat-da",
    "03-bo-mat-tiep-giap": "01-ai-che-mat-da",
    "04-bien-chunk-va-khoang-rong": "02-mep-hai-chunk",
    "05-giu-mat-o-lop-cat": "02-mep-hai-chunk",
    "06-doc-quyet-dinh-tung-mat": "02-mep-hai-chunk",
    "07-khong-dung-lai-mesh-khi-xoay": "03-do-cung-mot-vach",
    "08-kiem-chung-va-hoan-thien": "03-do-cung-mot-vach",
  },
} satisfies PublishedProjectEditorial;
export default data;
