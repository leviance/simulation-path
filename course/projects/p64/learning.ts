import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p64-l01": {
      focus: "Đứng giữa tuyết rơi, không đứng trước một tấm rèm",
      expected:
        "Ở F8, bông cũ không mất ngay khi tắt T, tuyết sau thân cây bị che. Pool không vượt 768.",
      files: [
        "include/trail/flakes.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/field-controls.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Sinh bông quanh người, để bông cũ ở lại trong rừng",
          explanation:
            "Trong flakes.hpp, giữ một pool 768 chỗ. Tích số bông cần sinh theo giây trong carry; khi đủ một bông mới lấy một chỗ trống và đặt nó quanh vị trí mắt.",
        },
        {
          title: "Cho tuyết đi qua vòng lặp của cảnh",
          explanation:
            "Trong field-scene.hpp, cho Scene sở hữu Snow; trong update, đọc loại địa hình dưới chân. Khi bật tuyết và đang ở vùng núi thì cho tốc độ phát lớn hơn 0; khi tắt, **vẫn gọi** snow.update với cường độ 0 để bông cũ rơi hết.",
        },
        {
          title: "Nối phím T và chuẩn bị khung chụp",
          explanation:
            "Trong field-controls.hpp, T đổi snowEnabled, không xóa pool. Trong window.hpp, riêng đường chạy smoke cho tuyết tiến một lúc trước khi chụp để ảnh đầu không trống.",
        },
      ],
    },
    "p64-l02": {
      focus: "Một Mặt Trời cho cả trời, đá và sóng",
      expected:
        "Tại cùng vách đá, đổi giờ làm đĩa Mặt Trời, mặt sáng trên vách và ánh nước thay đổi cùng nhau.",
      files: [
        "include/trail/day.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/field-render.hpp",
        "include/trail/field-controls.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Đổi giờ thành hướng chiếu",
          explanation:
            "Trong day.hpp, viết skyAtHour: một vòng 24 giờ cho hướng Mặt Trời, độ sáng ban ngày và sắc ấm gần đường chân trời. Trong field-scene.hpp, tính giờ từ startHour và đồng hồ seconds rồi đưa vào weather.",
        },
        {
          title: "Dùng đúng một hướng cho cả trời và vật",
          explanation:
            "Trong field-render.hpp, gọi hàm trên khi vẽ trời, gán hướng cho draw.sun, pha màu trời/mây và vẽ đĩa vào vùng tia nhìn gần hướng đó. Mặt đá và mặt nước ở các lượt vẽ sau phải lấy cùng draw.sun; nếu dùng một vector cố định cho đá, đĩa sẽ lặn mà vách vẫn như giữa trưa.",
        },
        {
          title: "Cho người xem trở về cùng một thời điểm",
          explanation:
            "Trong field-controls.hpp, dấu trừ và dấu bằng lùi/tới hai giờ có vòng lại sau 24. Trong window.hpp, cho --hour đặt giờ ban đầu khi cần lặp phép so giữa hai lần mở.",
        },
      ],
    },
    "p64-l03": {
      focus: "Đặt chân lên đất thay vì cho camera bay xuyên đồi",
      expected: "Đi bộ lên được bậc thấp, vách cao chặn người; P không khóa chân và camera.",
      files: ["include/trail/field-scene.hpp", "include/trail/field-controls.hpp"],
      steps: [
        {
          title: "Đo khoảng trống cho cả người",
          explanation:
            "Trong field-scene.hpp, coi Air và nước là chỗ đi qua được, còn cột chưa nạp thì **chưa được bước vào**. moveAxis thử những góc của thân người từ chân tới đầu, không chỉ tra ô chứa mắt. Tách bước ngang thành X rồi Z: khi một trục bị chặn, trục kia vẫn có thể trượt dọc vách.",
        },
        {
          title: "Đặt chân xuống đất rồi mới cho nhảy",
          explanation:
            "Cũng trong Scene, giữ vận tốc thẳng đứng, trạng thái chạm đất và độ cao mắt 1,65 block so với chân. Trừ trọng lực theo dt, kiểm nền ở vị trí sắp đáp; khi mặt đất chỉ cao hơn một bậc thì kiểm khoảng trống trên đầu trước khi bước lên.",
        },
        {
          title: "Giữ bay khảo sát là một chế độ riêng",
          explanation:
            "Trong field-controls.hpp, chỉ nhận Space lúc chạm đất và không bay. F đổi đi bộ/bay, đồng thời đặt vận tốc đứng về 0 để không mang cú rơi ở chế độ cũ sang chế độ mới.",
        },
      ],
    },
    "p64-l04": {
      focus: "Một bếp lửa nhỏ làm mốc giữa chiều xuống",
      expected: "Ở F9 đốm lửa tàn bên trong bếp. Dừng giờ rồi đi quanh, bếp vẫn ở chỗ cũ.",
      files: ["include/trail/field-scene.hpp"],
      steps: [
        {
          title: "Đặt vòng đá trên nền, không trước mắt",
          explanation:
            "Chỉ sửa field-scene.hpp. Trong draw, lấy campX(region.seed) và z = 147 để tìm chỗ nghỉ, hỏi độ cao nền rồi đặt vòng mười viên đá ở đó.",
        },
        {
          title: "Cho đốm lửa thu nhỏ rồi tàn",
          explanation:
            "Từ seconds, tính tuổi và pha riêng cho các đốm; lúc mới sinh chúng gần bếp, khi bay lên thì nhỏ dần và đổi màu. Dùng depthDot như với tuyết để viên đá che được phần lửa sau nó.",
        },
      ],
    },
    "p64-l05": {
      focus: "Tự đi mười phút để kiểm một thế giới sống",
      expected:
        "Trong chuyến 10–20 phút, đi thật qua bờ biển, sông, hẻm, rừng tuyết và bếp; ghi số liệu tách khỏi lần kiểm tuyến nhanh.",
      files: [
        "include/trail/field-walk.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Lập tuyến đi qua những chỗ dễ lộ lỗi",
          explanation:
            "Trong field-walk.hpp, RecordedWalk đi qua một chuỗi điểm bằng chính travel của người chơi; không đặt thẳng tọa độ mắt vào mỗi điểm. Tích quãng đường từ độ dời XZ thật, không từ số lượng phím W đã gửi.",
        },
        {
          title: "Ghi lại thứ đã xảy ra trong khung hình",
          explanation:
            "Trong field-scene.hpp, thêm giờ và số hạt còn sống vào readout. Trong window.hpp, nối --route-check với lượt dò ngắn có giới hạn bước và --survey với đồng hồ thực.",
        },
      ],
    },
  },
  references: {
    "p64-l01": [
      {
        label: "Tuyết trong tọa độ world",
        href: "/glossary#voxel-world-flakes",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l02": [
      {
        label: "Đồng hồ cảnh và hướng nắng",
        href: "/glossary#voxel-day-clock",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l03": [
      {
        label: "Đi bộ trên bậc voxel",
        href: "/glossary#voxel-walk-collision",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l04": [
      {
        label: "Đồng hồ cảnh và hướng nắng",
        href: "/glossary#voxel-day-clock",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l05": [
      {
        label: "Nạp chunk theo bước chân",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
