import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p62-l01": {
      focus: "Khi bước qua mép chunk, đất mới đến từ đâu?",
      expected: "Đứng lại sau một lần qua biên, hàng đợi vẫn giảm và có đủ vùng 5×5 quanh mắt.",
      files: [
        "include/trail/stream.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Vẽ hai vòng quanh cột đang đứng",
          explanation:
            "Trong stream.hpp, plan đổi tọa độ mắt sang chunk rồi lập danh sách khi tâm chuyển cột. Lần lượt đi qua các vành vuông 0, 1, 2 theo khoảng cách Chebyshev: vành gần đứng trước trong hàng.",
        },
        {
          title: "Làm từng việc, dù người vừa ngừng đi",
          explanation:
            "Trong Stream::tick, lấy một số cột từ đầu hàng, nạp và dựng chúng, sau đó cho region.buildSome(1) sửa phần mép còn bẩn. Trong field-scene.hpp, giữ Stream trong cảnh, nạp cột dưới chân trước, gọi plan rồi tick trong update ở preset cảnh quan.",
        },
        {
          title: "Cho ảnh chụp và cửa sổ dùng cùng cảnh",
          explanation:
            "Trong window.hpp, ở đường chạy smoke, gọi thêm các lượt cập nhật với dt = 0 để vùng quanh mắt kịp nạp trước khi chụp. Đó là chuẩn bị cho phép kiểm một khung, không phải vòng lặp đặc biệt của người đang đi.",
        },
      ],
    },
    "p62-l02": {
      focus: "Đừng sinh cả con đường trong một khung hình",
      expected:
        "J đổi giới hạn nạp mới giữa 1 và 2 cột mỗi lượt. Hàng đợi rỗng không tạo khác biệt.",
      files: ["include/trail/field-controls.hpp"],
      steps: [
        {
          title: "Xác định cái gì thật sự bị giới hạn",
          explanation:
            "Stream::tick của bài 1 dùng budget cho **số cột mới** trong một lượt. Sau đó còn có việc sửa mép đã đánh dấu qua markNeighborhood.",
        },
        {
          title: "Đưa lựa chọn vào tay người đi",
          explanation:
            "Mở field-controls.hpp, tìm fieldKey. Ở sự kiện SDLK_J, gán scene.stream.budget = 3 - scene.stream.budget;.",
        },
      ],
    },
    "p62-l03": {
      focus: "Vì sao đám mây không được dán lên màn hình?",
      expected: "Mây trôi qua ngọn cây khi đứng yên; P dừng giờ, C chỉ tắt mây.",
      files: [
        "include/trail/cloud.hpp",
        "include/trail/field-render.hpp",
        "include/trail/field-controls.hpp",
      ],
      steps: [
        {
          title: "Tính chỗ tia mắt đi qua tầng mây",
          explanation:
            "Trong cloud.hpp, viết valueNoise để độ phủ chuyển êm giữa các điểm lưới. cloudCover bỏ tia nhìn xuống hoặc quá sát đường chân trời; với những tia còn lại, tìm giao với mặt phẳng y = 96. Trừ độ dời của gió theo thời gian khỏi tọa độ lấy mẫu: hình mây sẽ trôi ngay cả khi mắt đứng yên.",
        },
        {
          title: "Pha mây vào bầu trời trước khi vẽ cây",
          explanation:
            "Trong field-render.hpp, gọi cloudCover trong fieldSky, pha màu theo độ phủ rồi mới vẽ địa hình lên phía trước. Lấy mẫu theo từng ô pixel nhỏ giúp bầu trời không chiếm toàn bộ thời gian vẽ.",
        },
      ],
    },
    "p62-l04": {
      focus: "Đi xa rồi quay về: bộ nhớ có chịu buông không?",
      expected:
        "Qua miền âm rồi về, L kiểm đủ 5×5 địa chỉ và hàng chờ rỗng; vùng giữ không quá 49 cột.",
      files: ["include/trail/stream.hpp", "include/trail/field-controls.hpp"],
      steps: [
        {
          title: "Kiểm đủ từng địa chỉ, không chỉ đếm số cột",
          explanation:
            "Trong stream.hpp, thêm complete: hàng chờ và tập bẩn phải rỗng, số cột không vượt 49 và đủ từng địa chỉ trong ô vuông 5×5 quanh tâm. keep và tick dưới đây là phần đã có. Nếu chỉ đếm 25 cột bất kỳ, một cột ở rất xa có thể che mất một lỗ ngay dưới chân.",
        },
        {
          title: "Cho phím L chụp trạng thái tại lúc nhấn",
          explanation:
            "Trong field-controls.hpp, nối L với complete(scene.region) và ghi kết luận vào HUD. Đây là phép kiểm tức thời, không phải đèn tự đổi khi hàng về 0.",
        },
      ],
    },
  },
  references: {
    "p62-l01": [
      {
        label: "Địa chỉ chunk ở phía âm",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l02": [
      {
        label: "Ngân sách nạp mỗi frame",
        href: "/glossary#chunk-job-budget",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l03": [
      {
        label: "Tầng mây trong tọa độ world",
        href: "/glossary#voxel-cloud-layer",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l04": [
      {
        label: "Vành nạp và vành giữ",
        href: "/glossary#chunk-retention",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
