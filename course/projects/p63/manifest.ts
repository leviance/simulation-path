import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Theo một con sông từ hẻm núi qua rừng, bãi cát đến vùng nước mở có sóng nhìn được từ bờ.",
  duration: "7–10 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 62. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Khắc một lòng sông từ núi ra biển",
    "Cho tán thông vượt qua đường biên chunk",
    "Nhìn vệt nước chạy qua một tảng đá đứng yên",
    "Đỉnh sóng phải nhô lên khỏi mặt biển",
    "Theo một con sông qua năm điểm hẹn",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission:
      "Sinh bằng một seed cả rừng thông tuyết, hẻm đá, rừng lá rộng và bãi cát; đứng yên vẫn thấy dòng sông chạy ra đại dương.",
    outcome:
      "Một bản đồ liên tục có bờ, đáy, nhiều tầng đá, hai dáng cây và mặt biển có độ cao thay đổi.",
    requirements: [
      "So mép đất, tán cây và mặt biển cùng tọa độ/giờ; kiểm hướng vệt nước ở hai mốc dọc sông.",
      "Cùng seed và tọa độ world cho cùng độ cao ở hai thứ tự nạp. Một cột có 64 tầng; có khoảng không thực bên trên đất chứ không phải chỉ một tấm heightmap để nhìn từ xa.",
      "Ở final nhìn thấy rừng, đồi đá, hẻm sâu, tuyết, bãi cát và nước mở trong cùng bản đồ; vừa thấy gợn sông trôi vừa thấy biển nhấp nhô. CTest so cả tính lặp lại và dấu của chuyển động.",
    ],
    constraints: [
      "Bốn section theo chiều đứng, seed ổn định, sóng hình học; không dùng bộ giải chất lưu.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "So mép đất, tán cây và mặt biển cùng tọa độ/giờ; kiểm hướng vệt nước ở hai mốc dọc sông.",
      "Lấy hai điểm dọc dòng: vệt đi qua điểm dưới sau điểm trên. Cùng vị trí/giờ ở hai chunk cho cùng pha; khi Pause hai mẫu đều đứng lại.",
      "Ở final nhìn thấy rừng, đồi đá, hẻm sâu, tuyết, bãi cát và nước mở trong cùng bản đồ; vừa thấy gợn sông trôi vừa thấy biển nhấp nhô. CTest so cả tính lặp lại và dấu của chuyển động.",
    ],
  },
  lessons: [
    {
      id: "p63-l01",
      slug: "01-khac-long-song",
      title: "Khắc một lòng sông từ núi ra biển",
      summary:
        "Dựng mặt cắt ngang bằng ba mốc: đáy thấp hơn mặt nước, bờ dần nâng cao, đất xa bờ chuyển thành đồi.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l02",
      slug: "02-cay-vuot-bien",
      title: "Cho tán thông vượt qua đường biên chunk",
      summary: "Chia bản đồ thành những ô dành cho gốc.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l03",
      slug: "03-vet-nuoc-xuoi-dong",
      title: "Nhìn vệt nước chạy qua một tảng đá đứng yên",
      summary: "Gọi s là quãng đường theo chiều hạ lưu.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l04",
      slug: "04-song-ngoai-khoi",
      title: "Đỉnh sóng phải nhô lên khỏi mặt biển",
      summary: "Cộng hai sóng có hướng khác nhau để bớt cảm giác những hàng rào song song.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l05",
      slug: "05-di-tu-tuyet-ra-bien",
      title: "Theo một con sông qua năm điểm hẹn",
      summary: "Các điểm hẹn đều là tọa độ trên cùng một seed, không phải năm màn hình độc lập.",
      order: 5,
      estimatedMinutes: 65,
      demoId: "voxel-procedural-terrain",
    },
  ],
  lessonAliases: {
    "01-chay-khung-dia-hinh": "01-khac-long-song",
    "02-do-cao-theo-toa-do-world": "01-khac-long-song",
    "03-hash-va-seed": "02-cay-vuot-bien",
    "04-noi-suy-value-noise": "01-khac-long-song",
    "05-ghep-nhieu-octave": "01-khac-long-song",
    "06-lap-day-cot-va-vat-lieu": "01-khac-long-song",
    "07-doi-cau-hinh-khong-tron-world": "02-cay-vuot-bien",
    "08-doc-dia-hinh-bang-inspector": "05-di-tu-tuyet-ra-bien",
    "09-kiem-chung-va-hoan-thien": "05-di-tu-tuyet-ra-bien",
  },
} satisfies PublishedProjectEditorial;
export default data;
