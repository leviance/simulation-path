import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p04-l01": {
      focus:
        "Dùng DDA để chuyển một đoạn thẳng liên tục thành danh sách pixel, chọn số bước theo trục thay đổi nhiều hơn rồi làm tròn từng điểm.",
      expected:
        "Checkpoint chạy với một đoạn thẳng DDA cố định. DDA giữ đúng hai đầu, vẽ được đường ngang, dọc, chéo và xử lý đoạn có độ dài 0.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn số bước theo trục dài",
          explanation:
            "`max(abs(dx), abs(dy))` bảo đảm mỗi bước không nhảy quá một pixel trên cả hai trục.",
        },
        {
          title: "Nội suy từng điểm",
          explanation:
            "Với chỉ số từ 0 đến `steps`, điểm liên tục là `start + (end - start) × index / steps`, sau đó `lround` chọn pixel gần nhất.",
        },
        {
          title: "Xử lý hai đầu trùng nhau",
          explanation: "Khi `steps == 0`, hàm phải trả `{start}` trước phép chia.",
        },
        {
          title: "Vẽ danh sách pixel",
          explanation:
            "Ứng dụng gọi `putPixel` cho từng `Point`; thao tác kéo và công cụ phóng to được để sang bài sau để checkpoint đầu không bị quá tải.",
        },
      ],
    },
    "p04-l02": {
      focus:
        "Viết Bresenham bằng số nguyên: biến `error` giữ sai lệch tích lũy và quyết định khi nào bước X, Y hoặc cả hai.",
      expected:
        "Đường vẽ liền mạch, có đủ pixel đầu/cuối và vòng lặp chính không dùng phép chia hay số thực.",
      files: ["include/lab.hpp"],
      steps: [
        {
          title: "Tách khoảng cách và hướng",
          explanation:
            "`stepX`/`stepY` là ±1 nên cùng một vòng lặp có thể đi sang trái, sang phải, lên hoặc xuống.",
        },
        {
          title: "Xuất phát từ phép thử trung điểm",
          explanation:
            "Hàm đường thẳng cho biết trung điểm giữa hai pixel ứng viên nằm ở phía nào; nhân đôi kết quả loại được phân số 1/2.",
        },
        {
          title: "Giữ sai số có dấu",
          explanation:
            "Bản đối xứng lưu `dy` âm; `error = dx + dy` và `e2 = 2 × error` tạo hai phép so dùng được cho mọi độ dốc.",
        },
        {
          title: "Giữ hai if độc lập",
          explanation:
            "Một bước chéo cần cập nhật cả X lẫn Y, vì vậy nhánh thứ hai không được đổi thành `else if`.",
        },
      ],
    },
    "p04-l03": {
      focus:
        "Kiểm tra Bresenham ở tám octant, xác nhận hai đầu, số pixel và tính liên thông theo cả hai chiều mà không giả định sai về trường hợp bằng nhau.",
      expected:
        "Kéo một đầu quanh đầu còn lại không làm hỏng bất kỳ hướng nào; cả tám octant đều giữ hai đầu và mỗi bước chỉ đi tối đa một pixel trên mỗi trục.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách độ lớn và hướng",
          explanation:
            "`abs(dx)`/`abs(dy)` xử lý độ dốc cao hoặc thấp, còn `stepX`/`stepY` xử lý hướng; không cần tám cách cài đặt riêng.",
        },
        {
          title: "Kiểm tra cả hai chiều",
          explanation:
            "A→B và B→A đều phải liên thông và giữ hai đầu. Khi đường lý tưởng đi đúng giữa hai lựa chọn, mỗi chiều có thể chọn một pixel khác nhau.",
        },
        {
          title: "Dùng dữ liệu lặp lại được",
          explanation:
            "Phím O đặt đúng tám độ lệch dốc cao/thấp quanh tâm, giúp tái hiện lỗi bằng cùng một bộ dữ liệu.",
        },
      ],
    },
    "p04-l04": {
      focus:
        "Tạo đường viền hình chữ nhật từ bốn đoạn Bresenham và hình đặc từ các hàng pixel, với quy ước lấy cả hai biên.",
      expected:
        "Hình chữ nhật đúng dù hai góc được đưa vào theo thứ tự nào. Phần viền không hở và phần tô không vượt quá cạnh phải hoặc cạnh dưới.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Tính bốn cạnh bằng min/max",
          explanation:
            "Tính `left`, `right`, `top`, `bottom` trước giúp hàm nhận hai góc theo bất kỳ thứ tự nào.",
        },
        {
          title: "Dùng lại Bresenham cho đường viền",
          explanation:
            "Bốn cạnh gọi cùng hàm vẽ đường đã được kiểm thử, không cần thêm một cách xử lý biên khác.",
        },
        {
          title: "Tô theo từng hàng",
          explanation: "Mỗi hàng là một đoạn X liên tục, dễ hiểu và truy cập bộ nhớ tuần tự.",
        },
        {
          title: "Đối chiếu bằng Rectangle Lab",
          explanation:
            "Kéo và đảo hai góc để kiểm tra `min/max`; đổi sang hình đặc để so số pixel với `width × height`.",
        },
      ],
    },
    "p04-l05": {
      focus:
        "Tính một octant bằng biến `decision` của midpoint circle, phản chiếu sang tám phía rồi loại các điểm trùng trên trục và đường chéo.",
      expected:
        "Đường tròn đối xứng qua hai trục và hai đường chéo. Bán kính 0 trả về đúng một điểm tại tâm.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy ra phép thử trung điểm",
          explanation:
            "Dấu của `F(x−1/2, y+1) = x² + y² − r²` cho biết nên giữ X hay giảm X ở hàng kế tiếp.",
        },
        {
          title: "Chỉ tính một octant",
          explanation:
            "Bắt đầu tại `(r,0)`, tăng Y và chỉ giảm X khi `decision` cho biết trung điểm đã nằm ngoài đường tròn.",
        },
        {
          title: "Phản chiếu sang tám phía",
          explanation: "Hoán đổi X/Y và đổi dấu tạo đủ tám vị trí tương ứng quanh tâm.",
        },
        {
          title: "Loại pixel trùng",
          explanation:
            "Tại `y = 0` hoặc `x = y`, các phép phản chiếu có thể trùng nhau; `sort` và `unique` làm kết quả dễ đếm và kiểm thử hơn.",
        },
      ],
    },
    "p04-l06": {
      focus:
        "Hoàn thiện pixel inspector, kiểm tra hình dạng thay vì chỉ nhìn ảnh, rồi benchmark nhiều lượt trên cùng dữ liệu mà không tính thời gian tạo đầu vào.",
      expected:
        "Toàn bộ CTest đều đạt. `project_4_final` quan sát được từng pixel, chuyển được giữa DDA và Bresenham; kết quả đo ghi rõ lượng công việc, cấu hình build và đơn vị thời gian.",
      files: ["src/main.cpp", "tests/tests.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Đúng trước, nhanh sau",
          explanation:
            "Không benchmark một cách cài đặt chưa vượt qua kiểm tra tám octant và hai đầu trùng nhau.",
        },
        {
          title: "Tách inspector khỏi thuật toán",
          explanation:
            "Phím trái/phải chỉ thay đổi `inspectedStep`; lưới phóng to đọc `linePoints` đã có và không can thiệp vào DDA/Bresenham.",
        },
        {
          title: "Kiểm tra đường tròn có đúng bán kính",
          explanation:
            "Ngoài đối xứng, test còn xác nhận bốn điểm ngoài cùng, không có pixel trùng và sai lệch bán kính nằm trong ngưỡng.",
        },
        {
          title: "Làm nóng rồi đo nhiều lượt",
          explanation:
            "Chạy nhiều lượt giúp giảm ảnh hưởng của cache lạnh, bộ lập lịch và độ phân giải đồng hồ.",
        },
        {
          title: "Sử dụng kết quả",
          explanation:
            "Benchmark phải tiêu thụ kết quả, chẳng hạn cộng số pixel vào `checksum`, để trình biên dịch không loại bỏ công việc.",
        },
      ],
    },
  },
  references: {
    "p04-l01": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Framebuffer",
        href: "/glossary#framebuffer",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l02": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l03": [
      {
        label: "Octant",
        href: "/glossary#octant",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l04": [
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l05": [
      {
        label: "Octant",
        href: "/glossary#octant",
        kind: "Thuật ngữ",
      },
      {
        label: "Rasterization",
        href: "/glossary#rasterization",
        kind: "Thuật ngữ",
      },
    ],
    "p04-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
      {
        label: "Octant",
        href: "/glossary#octant",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
