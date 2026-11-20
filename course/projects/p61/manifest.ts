import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary: "Greedy meshing giảm hình học tĩnh; một cơn gió chung đi qua ngọn cỏ và từng tán cây.",
  duration: "5–7 giờ",
  prerequisites: [
    "Đã chạy bản hoàn chỉnh của Project 60. ZIP dưới đây có đủ mã để bắt đầu, không cần chép từ project trước.",
    "Biết cách cấu hình CMake, mở cửa sổ SDL3 và đi lại trong góc nhìn phối cảnh.",
  ],
  objectives: [
    "Một vạt đất phẳng cần bao nhiêu quad?",
    "Cho cơn gió đi qua rừng, thay vì lắc cả cảnh",
    "Gắn chuyển động vào từng ngọn cỏ và tán lá",
    "Đo riêng công dựng đất và công vẽ ngọn cây",
  ],
  challenge: {
    timebox: "60–120 phút tự thử trước khi mở bài",
    mission:
      "Dựng một bìa rừng có thể xem khung dây mặt đất và nhìn gốc cỏ đứng yên khi ngọn nghiêng theo gió.",
    outcome:
      "Cỏ và lá nhận cùng cơn gió qua nhiều vị trí; họa tiết đất vẫn lặp đúng từng block sau khi gộp.",
    requirements: [
      "So tập mặt đơn vị của hai cách dựng, tắt gió và Pause để kiểm gốc, ngọn và bộ đếm mesh.",
      "Khối đồng nhất 16³ còn đúng sáu quad. Bung chúng thành các mặt đơn vị phải thu lại đúng tập mặt trước khi gộp, kể cả hướng và vật liệu.",
      "Bảng kiểm gồm khối đặc, bàn cờ, hốc rỗng và biên hai cột. Gió chạy nhiều nhịp vẫn không làm thay đổi bất kỳ mặt đất tĩnh nào.",
    ],
    constraints: [
      "Không gộp lá động vào hình học tĩnh, không dựng lại đất để làm gió.",
      "Bản C++ chạy độc lập. Canvas chỉ tách nhỏ thí nghiệm để soi kết quả.",
    ],
    definitionOfDone: [
      "So tập mặt đơn vị của hai cách dựng, tắt gió và Pause để kiểm gốc, ngọn và bộ đếm mesh.",
      "Khi gió đổi hướng, cỏ và tán cùng nghiêng theo hướng mới; đất, thân gỗ và số lần dựng mesh không đổi. Sau Pause, xoay mắt không làm cây rung trở lại.",
      "Bảng kiểm gồm khối đặc, bàn cờ, hốc rỗng và biên hai cột. Gió chạy nhiều nhịp vẫn không làm thay đổi bất kỳ mặt đất tĩnh nào.",
    ],
  },
  lessons: [
    {
      id: "p61-l01",
      slug: "01-gop-vat-dat",
      title: "Một vạt đất phẳng cần bao nhiêu quad?",
      summary: "Trải mặt bên của vách thành một tờ giấy kẻ ô.",
      order: 1,
      estimatedMinutes: 80,
      demoId: "voxel-greedy-meshing",
    },
    {
      id: "p61-l02",
      slug: "02-gio-di-qua-rung",
      title: "Cho cơn gió đi qua rừng, thay vì lắc cả cảnh",
      summary: "Chiếu vị trí gốc cây lên hướng gió để biết nó nằm ở đâu dọc đường truyền.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "voxel-greedy-meshing",
    },
    {
      id: "p61-l03",
      slug: "03-neo-la-va-co",
      title: "Gắn chuyển động vào từng ngọn cỏ và tán lá",
      summary: "Một ngọn cỏ hẹp có thể vẽ bằng một quad.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "voxel-greedy-meshing",
    },
    {
      id: "p61-l04",
      slug: "04-kiem-mesh-va-gio",
      title: "Đo riêng công dựng đất và công vẽ ngọn cây",
      summary: "Đếm riêng số lần dựng mesh, số mặt và thời gian của lần dựng vừa rồi.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "voxel-greedy-meshing",
    },
  ],
  lessonAliases: {
    "01-do-mat-tren-khoi-dac": "01-gop-vat-dat",
    "02-trai-mat-thanh-mask": "01-gop-vat-dat",
    "03-khi-nao-duoc-gop": "01-gop-vat-dat",
    "04-tim-hinh-chu-nhat": "01-gop-vat-dat",
    "05-tu-rectangle-den-quad": "01-gop-vat-dat",
    "06-quet-du-sau-huong": "01-gop-vat-dat",
    "07-xem-tung-lan-gop": "01-gop-vat-dat",
    "08-cache-va-do-cong-viec": "04-kiem-mesh-va-gio",
    "09-kiem-chung-va-hoan-thien": "04-kiem-mesh-va-gio",
  },
} satisfies PublishedProjectEditorial;
export default data;
