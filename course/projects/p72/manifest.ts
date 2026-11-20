import type { PublishedProjectEditorial } from "../../types";

const data = {
  summary:
    "Đổi cách đàn chim phản hồi bằng file TinyScript, không biên dịch lại. Tự viết lexer, parser và interpreter nhỏ, nối năm handler vào giao diện đã hoàn thiện rồi thử cùng một cử chỉ với hai script.",
  duration: "9–13 giờ",
  prerequisites: [
    "Project 71: callback theo ID và quyền sở hữu input.",
    "C++20: vector, map, variant, gọi hàm, đệ quy hữu hạn.",
    "Project 68–70: hiểu nguồn markup, style và bố cục.",
  ],
  objectives: [
    "Dựng AST và tính đúng thứ tự toán tử, biến, nhánh if và function có tham số.",
    "Phân biệt biến global, tham số, biến cục bộ trong khối.",
    "Từ một event gọi host C++ hữu hạn rồi đọc kết quả thật trong đàn.",
    "Ngăn lỗi cú pháp, runtime, đệ quy hoặc script quá dài làm hỏng phiên.",
  ],
  challenge: {
    timebox: "150–210 phút tự thử",
    mission:
      "Giữ cùng thanh kéo và đàn chim. Tạo hai file: một file chuyển giá trị trực tiếp, một file khảo sát gần. Thay file là thay kết quả, không cần build lại C++.",
    outcome:
      "Đầu vào 80 tạo vòng 80 hoặc 50 px tùy script. Người dùng có thể cố tình viết sai, xem chẩn đoán, sửa file và tiếp tục.",
    requirements: [
      "File .tiny thật; let, gán, number/boolean, toán tử, if/else, function/tham số và return.",
      "Dispatcher Project 71 gọi các handler; host có bộ lệnh hạn chế, kiểm kiểu/range.",
      "Có hai chương trình hợp lệ, ví dụ sai cú pháp, sai host và đệ quy.",
      "Reload không lưu tham chiếu cũ; lỗi không làm treo main loop hoặc áp dụng nửa handler.",
    ],
    constraints: [
      "Không nhúng Lua/JS, không viết solver bằng script; không module, class, file/network/OS phía script.",
      "16 KiB, 4.096 token, 64 function, 8 tham số, 1.024 bước/event và call depth 16.",
      "F9 dừng/chạy bằng C++ kể cả lúc script lỗi, không dùng UI để che lỗi.",
    ],
    definitionOfDone: [
      "Fixture precedence, scope, parameters, return, lỗi kiểu, budget và call depth.",
      "Hai lần click giữa thanh ở cùng executable tạo đúng 80/50; không sửa model giữa hai lần để giúp test đạt.",
      "Chẩn đoán có vị trí/call context, handler lỗi không đổi globals hay model, lần bấm sau vẫn hoạt động.",
      "Bảy bài, năm file script, code final và ZIP chạy được; không cần học Project 73–78 để hoàn thành.",
    ],
  },
  lessons: [
    {
      id: "p72-l01",
      slug: "01-doi-hanh-vi-khong-build",
      title: "Giữ nguyên nút, đổi điều nó làm",
      summary: "Đọc một script thật bên cạnh panel.html và style.css.",
      order: 1,
      estimatedMinutes: 45,
      demoId: "tiny-script",
    },
    {
      id: "p72-l02",
      slug: "02-doc-token-cua-logic",
      title: "Một dấu bằng khác hai dấu bằng",
      summary: "Đọc tên, số, dấu câu và toán tử kèm vị trí trong file.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "tiny-script",
    },
    {
      id: "p72-l03",
      slug: "03-tu-token-den-cay-bieu-thuc",
      title: "Vì sao 2 + 3 × 4 phải ra 14?",
      summary: "Dựng cây biểu thức, câu lệnh và function trước khi tính.",
      order: 3,
      estimatedMinutes: 95,
      demoId: "tiny-script",
    },
    {
      id: "p72-l04",
      slug: "04-bien-tham-so-va-pham-vi",
      title: "Hai hàm cùng đặt tên biến là value: có dùng chung giá trị không?",
      summary: "Thực thi let, gán, if, gọi function và return với phạm vi rõ ràng.",
      order: 4,
      estimatedMinutes: 95,
      demoId: "tiny-script",
    },
    {
      id: "p72-l05",
      slug: "05-handler-thanh-keo-goi-host",
      title: "Từ tay kéo đến vòng quanh chim vàng",
      summary: "Nối handler vào dispatcher và giới hạn quyền đổi model ở host C++.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "tiny-script",
    },
    {
      id: "p72-l06",
      slug: "06-loi-ma-cua-so-van-song",
      title: "Làm sao để script lỗi không làm treo cửa sổ?",
      summary: "Giới hạn chi phí và không công bố nửa thay đổi.",
      order: 6,
      estimatedMinutes: 75,
      demoId: "tiny-script",
    },
    {
      id: "p72-l07",
      slug: "07-cung-thanh-keo-hai-hanh-vi",
      title: "Cùng một điểm giữa: 80 px hay 50 px?",
      summary: "Nghiệm thu hai chương trình điều khiển và kết thúc lộ trình chính.",
      order: 7,
      estimatedMinutes: 65,
      demoId: "tiny-script",
    },
  ],
} satisfies PublishedProjectEditorial;

export default data;
