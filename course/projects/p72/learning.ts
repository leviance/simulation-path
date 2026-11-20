import type { ProjectLearningAssets } from "../../learning/types";

const data = {
  guides: {
    "p72-l01": {
      focus: "Đọc một script thật bên cạnh panel.html và style.css.",
      expected:
        "Bàn vẫn điều khiển đúng đàn, biết vị trí file và biết F5 làm gì. Không nhầm 'đọc được source' với 'đã thực thi source'.",
      files: ["include/markup/source.hpp", "include/script/session.hpp"],
      steps: [
        {
          title: "Lấy script từ thư mục đang chỉnh sửa",
          explanation:
            "Dùng cùng bộ đọc có giới hạn như HTML và CSS. Bản C++ vẫn có thể chạy nếu script đang sửa bị lỗi; chức năng dừng khẩn bằng F9 không đi qua interpreter.",
        },
        {
          title: "Đặt một chỗ duy nhất cho lần nạp script",
          explanation:
            "Mốc đầu báo số byte. Các handler vẫn do C++ Project 71 thực hiện. Kiểm đúng file ở bước này trước khi nghi ngờ parser hay callback.",
        },
      ],
    },
    "p72-l02": {
      focus: "Đọc tên, số, dấu câu và toán tử kèm vị trí trong file.",
      expected:
        "Số token không phụ thuộc lúc nào bấm F5; lỗi chỉ đúng vị trí. Ở mốc này vẫn chưa có phép tính trên model.",
      files: ["include/script/lex.hpp", "include/script/session.hpp"],
      steps: [
        {
          title: "Đọc trọn một token và nhớ offset đầu tiên",
          explanation:
            "Token tên, số, ký hiệu, End là đủ. Tách giới hạn byte của file khỏi giới hạn 4.096 token để một file ngắn nhưng dày ký hiệu vẫn hữu hạn.",
        },
        {
          title: "Đưa số token về chính bàn điều khiển",
          explanation:
            "Mốc 2 đếm token thay vì byte. Một comment dài làm file nặng hơn nhưng không làm tăng số token hữu ích.",
        },
      ],
    },
    "p72-l03": {
      focus: "Dựng cây biểu thức, câu lệnh và function trước khi tính.",
      expected:
        "Nhận được function và số lượng tham số; ngoặc thiếu chỉ đúng chỗ. Một phép gọi trong thân hàm chưa được chạy khi file chỉ mới parse.",
      files: ["include/script/parse.hpp"],
      steps: [
        {
          title: "Giữ toán tử có ưu tiên cao hơn ở nhánh con",
          explanation:
            "Đọc vế trái trước. Khi gặp toán tử hợp lệ ở mức hiện tại, đọc vế phải ở mức cao hơn. Cách này giữ phép trừ và chia kết hợp từ trái sang phải.",
        },
        {
          title: "Phân biệt câu lệnh với biểu thức",
          explanation:
            "let tạo tên, gán sửa tên đã có, if chứa hai dãy câu lệnh, return gửi một kết quả về nơi gọi. Ghi chỉ số AST thay vì chép chuỗi rồi so với vài mẫu.",
        },
      ],
    },
    "p72-l04": {
      focus: "Thực thi let, gán, if, gọi function và return với phạm vi rõ ràng.",
      expected:
        "Fixture phân biệt được che biến trong if với thay globals, tham số với tên ở nơi gọi; điều kiện if nhận boolean, không âm thầm coi số 2 là true.",
      files: ["include/script/machine.hpp"],
      steps: [
        {
          title: "Tìm biến gần nhất, rồi đến globals",
          explanation:
            "Chỉ các lớp trong frame đang chạy được duyệt. Một let trong nhánh if có thể che tên bên ngoài; sau dấu } biến ở ngoài lại hiện ra.",
        },
        {
          title: "Tra function, kiểm số đối số và dựng frame mới",
          explanation:
            "Trước khi chạy body, sao các giá trị đối số vào đúng tên tham số. Return trở về người gọi; không có return thì kết quả số 0. Giới hạn độ sâu có từ ngay lần chạy đầu.",
        },
      ],
    },
    "p72-l05": {
      focus: "Nối handler vào dispatcher và giới hạn quyền đổi model ở host C++.",
      expected:
        "Pause, Reset, hai slider và Links vẫn chạy qua cùng dispatcher của Project 71. Binding không phụ thuộc vị trí nút hay một nhãn hard-code trên màn hình.",
      files: ["include/script/host.hpp", "include/script/session.hpp"],
      steps: [
        {
          title: "Kiểm tên, số đối số, kiểu và miền giá trị",
          explanation:
            "`radius(80)` hợp lệ; `radius(true)` sai kiểu, `radius(200)` vượt miền. Đừng ép kiểu hoặc clamp im lặng: người học cần biết công thức mình viết sai ở đâu.",
        },
        {
          title: "Chạy function rồi mới công bố kết quả",
          explanation:
            "Event Radius gọi onRadius(value); nhãn đọc giá trị cuối của host. Vị trí tay kéo là đề xuất, nên script có thể đặt bán kính khác mà không làm núm kéo giật ngược ở lần nhấn phím sau.",
        },
      ],
    },
    "p72-l06": {
      focus: "Giới hạn chi phí và không công bố nửa thay đổi.",
      expected:
        "Thông báo cho biết file, handler và vị trí. Event kế tiếp có ngân sách mới, không phải khởi động lại ứng dụng để phục hồi. F9 luôn do C++ xử lý.",
      files: ["include/script/machine.hpp", "include/script/host.hpp"],
      steps: [
        {
          title: "Trừ chi phí ở ba nơi có thể thực hiện công việc",
          explanation:
            "Tính một expression, đi qua một statement và vào một function đều tiêu bước. Ngân sách 1.024 bước không thay giới hạn 16 lần gọi lồng: mỗi giới hạn bắt một loại lỗi.",
        },
        {
          title: "Đặt kết quả của handler vào model ở đúng một chỗ",
          explanation:
            "Tới được đây nghĩa là không còn lỗi kiểu, phạm vi số hoặc ngân sách. Nếu lỗi ở giữa chương trình, `publish` không chạy, globals tạm cũng bị bỏ.",
        },
      ],
    },
    "p72-l07": {
      focus: "Nghiệm thu hai chương trình điều khiển và kết thúc lộ trình chính.",
      expected:
        "Hai file gây hai kết quả trên đàn thật; script lỗi không chặn F9, Reset hay reload. ZIP giải nén độc lập có toàn bộ app, HTML, CSS, scripts, tests và từng mốc để chạy lại.",
      files: ["include/script/session.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chỉ đổi sang một chương trình hợp lệ",
          explanation:
            "Đọc, parse, đối chiếu đủ năm handler, khởi tạo globals trong môi trường mới trước khi thay. Không cho phần khởi tạo tự ghi model. Nạp sai giữ chương trình hợp lệ trước đó.",
        },
        {
          title: "Kiểm với đúng hai lần bấm qua UI",
          explanation:
            "Nạp file thường, bấm giữa, Pause, rồi nạp file khảo sát và bấm đúng chỗ cũ. Kiểm cả giá trị raw 80 và bán kính thật 50, cùng trạng thái đàn vẫn Pause.",
        },
      ],
    },
  },
  references: {
    "p72-l01": [
      {
        label: "Cầu nối từ script tới C++ (host)",
        href: "/glossary#tiny-host",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l02": [
      {
        label: "Token và vị trí trong file",
        href: "/glossary#tiny-token",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l03": [
      {
        label: "Cây cú pháp (AST)",
        href: "/glossary#tiny-ast",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l04": [
      {
        label: "Phạm vi của biến trong TinyScript",
        href: "/glossary#tiny-lexical-scope",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l05": [
      {
        label: "Cầu nối từ script tới C++ (host)",
        href: "/glossary#tiny-host",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l06": [
      {
        label: "Ngân sách thực thi của handler",
        href: "/glossary#tiny-budget",
        kind: "Thuật ngữ",
      },
    ],
    "p72-l07": [
      {
        label: "Nạp lại mà không làm mất phiên đang chạy",
        href: "/glossary#ui-safe-reload",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default data;
