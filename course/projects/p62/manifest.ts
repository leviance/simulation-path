import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary: "Đi hàng trăm block qua vùng được nạp và gỡ; mây vẫn trôi liên tục khi camera qua biên.",
  duration: "5–7 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 61. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Khi bước qua mép chunk, đất mới đến từ đâu?",
    "Đừng sinh cả con đường trong một khung hình",
    "Vì sao đám mây không được dán lên màn hình?",
    "Đi xa rồi quay về: bộ nhớ có chịu buông không?",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission:
      "Đi qua hàng trăm block mà bộ nhớ không tăng theo tổng quãng đường; chọn một đám mây làm mốc khi quay lại.",
    outcome: "Một thế giới nạp theo bước chân với cửa sổ 5×5 và mây vẫn dịch khi camera đứng yên.",
    requirements: [
      "Đi vùng âm, đổi hướng giữa hàng đợi, quay về; kiểm resident, queued, dirty và unloaded.",
      "Khi đã ổn định có đủ 25 vị trí quanh tâm; không giữ cột xa hơn vành đệm. Đi sang phần âm rồi quay về vẫn đặt cây đúng ô.",
      "Quay lại phải nhận cùng mẫu đất/cây. Tại một tâm ổn định, cửa sổ hoạt động đủ 5×5 và toàn bộ vùng giữ không vượt 7×7.",
    ],
    constraints: [
      "Ngân sách theo frame, vùng đệm hữu hạn; mây gắn tọa độ world, không dán lên màn hình.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "Đi vùng âm, đổi hướng giữa hàng đợi, quay về; kiểm resident, queued, dirty và unloaded.",
      "Cùng vị trí, hướng và giờ phải cho cùng độ phủ, bất kể chunk nào vừa nạp. Hai thời điểm khác nhau dịch được mép mây khi camera đứng yên.",
      "Quay lại phải nhận cùng mẫu đất/cây. Tại một tâm ổn định, cửa sổ hoạt động đủ 5×5 và toàn bộ vùng giữ không vượt 7×7.",
    ],
  },
  lessons: [
    {
      id: "p62-l01",
      slug: "01-nap-quanh-mat",
      title: "Khi bước qua mép chunk, đất mới đến từ đâu?",
      summary: "Dùng khoảng cách lớn hơn giữa chênh lệch hai tọa độ chunk để chia vành vuông.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "voxel-chunk-streaming",
    },
    {
      id: "p62-l02",
      slug: "02-chia-ngan-sach",
      title: "Đừng sinh cả con đường trong một khung hình",
      summary: "Tách kế hoạch khỏi công việc của một frame.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "voxel-chunk-streaming",
    },
    {
      id: "p62-l03",
      slug: "03-may-qua-ngon-cay",
      title: "Vì sao đám mây không được dán lên màn hình?",
      summary: "Cho tia nhìn cắt một mặt phẳng ở cao độ 96.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "voxel-chunk-streaming",
    },
    {
      id: "p62-l04",
      slug: "04-di-xa-va-quay-lai",
      title: "Đi xa rồi quay về: bộ nhớ có chịu buông không?",
      summary: "Có hai phép kiểm khác nhau.",
      order: 4,
      estimatedMinutes: 50,
      demoId: "voxel-chunk-streaming",
    },
  ],
  lessonAliases: {
    "01-nhan-vat-tren-mot-chunk": "01-nap-quanh-mat",
    "02-world-chunk-va-toa-do-am": "01-nap-quanh-mat",
    "03-tai-cac-chunk-quanh-nhan-vat": "01-nap-quanh-mat",
    "04-go-va-tao-lai-chunk": "01-nap-quanh-mat",
    "05-hang-doi-co-ngan-sach": "02-chia-ngan-sach",
    "06-giu-vung-du-phong": "02-chia-ngan-sach",
    "07-nhin-sang-chunk-hang-xom": "02-chia-ngan-sach",
    "08-chi-dung-lai-mesh-bi-anh-huong": "02-chia-ngan-sach",
    "09-dieu-khien-va-quan-sat-streaming": "04-di-xa-va-quay-lai",
    "10-kiem-chung-va-hoan-thien": "04-di-xa-va-quay-lai",
  },
} satisfies PublishedProjectEditorial;
export default data;
