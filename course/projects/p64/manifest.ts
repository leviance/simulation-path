import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Đi bộ trong một thế giới do C++/SDL3 dựng; nhìn tuyết rơi theo gió, mây trôi, sóng chạy và ánh sáng đổi theo Mặt Trời.",
  duration: "7–10 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 63. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Đứng giữa tuyết rơi, không đứng trước một tấm rèm",
    "Một Mặt Trời cho cả trời, đá và sóng",
    "Đặt chân lên đất thay vì cho camera bay xuyên đồi",
    "Một bếp lửa nhỏ làm mốc giữa chiều xuống",
    "Tự đi mười phút để kiểm một thế giới sống",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission:
      "Tự hoàn thiện chuyến đi bộ từ bãi cát qua hẻm tới rừng tuyết và bếp lửa. Khi buông chuột, cảnh vẫn sống.",
    outcome:
      "Tuyết khuất sau thông, ngọn cỏ nghiêng, mây và sóng chuyển động, ánh chiều hắt sang mặt kia của vách đá.",
    requirements: [
      "Đi một phiên 10–20 phút, qua biên âm, về lại mốc cũ; ghi số hạt/chunk và chi phí từng khâu.",
      "Số bông sống không vượt 768. Dừng giờ rồi bước ngang: vị trí bông trong world không đổi nhưng hình chiếu phải đổi. Trở về bãi cát không phát thêm tuyết.",
      "Báo riêng ảnh C++, CTest, số đo của phiên chạy dài và thao tác chưa kiểm. Qua được test toán không tự chứng minh chuyến đi hay hoặc đồ họa đủ dễ đọc.",
    ],
    constraints: [
      "C++20/SDL3 độc lập; chỉ khám phá, không đào hoặc đặt block. Không mô phỏng khí quyển hay cháy lan.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "Đi một phiên 10–20 phút, qua biên âm, về lại mốc cũ; ghi số hạt/chunk và chi phí từng khâu.",
      "Đi bộ qua biên không rơi xuống khe không có thật; bậc thấp có khoảng thoáng đi được, vách cao chặn. Khi Pause cảnh vẫn có thể đi và quay để soi hạt tuyết từ nhiều phía.",
      "Báo riêng ảnh C++, CTest, số đo của phiên chạy dài và thao tác chưa kiểm. Qua được test toán không tự chứng minh chuyến đi hay hoặc đồ họa đủ dễ đọc.",
    ],
  },
  lessons: [
    {
      id: "p64-l01",
      slug: "01-tuyet-roi-giua-rung-thong",
      title: "Đứng giữa tuyết rơi, không đứng trước một tấm rèm",
      summary: "Ta không cần rải tuyết khắp núi.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l02",
      slug: "02-mot-mat-troi-chung",
      title: "Một Mặt Trời cho cả trời, đá và sóng",
      summary:
        "Tưởng tượng một vòng tròn trên trời: sáng ở gần chân trời phía đông, trưa ở cao, chiều lặn về phía tây.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l03",
      slug: "03-dat-chan-len-duong-mon",
      title: "Đặt chân lên đất thay vì cho camera bay xuyên đồi",
      summary: "Đặt mắt cao hơn chân 1,65 block.",
      order: 3,
      estimatedMinutes: 85,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l04",
      slug: "04-lua-o-cho-nghi",
      title: "Một bếp lửa nhỏ làm mốc giữa chiều xuống",
      summary: "Mỗi đốm sáng có tuổi từ 0 đến 1.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l05",
      slug: "05-mot-chuyen-di-tron-ven",
      title: "Tự đi mười phút để kiểm một thế giới sống",
      summary: "Đặt ra hai kiểu quan sát.",
      order: 5,
      estimatedMinutes: 65,
      demoId: "voxel-sandbox",
    },
  ],
  lessonAliases: {
    "01-chay-sandbox-va-tam-ngam": "05-mot-chuyen-di-tron-ven",
    "02-ray-tu-camera-sang-world": "05-mot-chuyen-di-tron-ven",
    "03-chon-block-qua-nhieu-chunk": "05-mot-chuyen-di-tron-ven",
    "04-pha-dat-va-thanh-vat-lieu": "05-mot-chuyen-di-tron-ven",
    "05-giu-chinh-sua-khi-chunk-bi-go": "05-mot-chuyen-di-tron-ven",
    "06-cap-nhat-mesh-va-preview": "05-mot-chuyen-di-tron-ven",
    "07-undo-redo-theo-toa-do-world": "05-mot-chuyen-di-tron-ven",
    "08-xuat-nhap-ban-luu": "05-mot-chuyen-di-tron-ven",
    "09-hoan-thien-dieu-khien": "03-dat-chan-len-duong-mon",
    "10-kiem-chung-va-nghiem-thu": "05-mot-chuyen-di-tron-ven",
  },
} satisfies PublishedProjectEditorial;
export default data;
