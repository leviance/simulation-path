import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "TINYSCRIPT · BÀN QUAN SÁT LẬP TRÌNH ĐƯỢC",
    title: "Một thanh Radius, hai cách khảo sát đàn chim",
    description:
      "Đổi cách đàn chim phản hồi bằng file TinyScript, không biên dịch lại. Tự viết lexer, parser và interpreter nhỏ, nối năm handler vào giao diện đã hoàn thiện rồi thử cùng một cử chỉ với hai script.",
  },
  modes: {
    "script72-1": {
      title: "Giữ nguyên nút, đổi điều nó làm",
      description: "Đọc một script thật bên cạnh panel.html và style.css.",
    },
    "script72-2": {
      title: "Một dấu bằng khác hai dấu bằng",
      description: "Đọc tên, số, dấu câu và toán tử kèm vị trí trong file.",
    },
    "script72-3": {
      title: "Vì sao 2 + 3 × 4 phải ra 14?",
      description: "Dựng cây biểu thức, câu lệnh và function trước khi tính.",
    },
    "script72-4": {
      title: "Hai hàm cùng đặt tên biến là value: có dùng chung giá trị không?",
      description: "Thực thi let, gán, if, gọi function và return với phạm vi rõ ràng.",
    },
    "script72-5": {
      title: "Từ tay kéo đến vòng quanh chim vàng",
      description: "Nối handler vào dispatcher và giới hạn quyền đổi model ở host C++.",
    },
    "script72-6": {
      title: "Làm sao để script lỗi không làm treo cửa sổ?",
      description: "Giới hạn chi phí và không công bố nửa thay đổi.",
    },
    "script72-7": {
      title: "Cùng một điểm giữa: 80 px hay 50 px?",
      description: "Nghiệm thu hai chương trình điều khiển và kết thúc lộ trình chính.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      bytes: {
        title: "Script vừa được đọc",
        source: "Project 72 · Bài 01",
        poster: "p72-bytes.png",
        alt: "Bàn Boids và số byte của file flight.tiny, các nút hiện do C++ điều khiển.",
        caption: "Mốc này mới đọc, chưa chạy script.",
      },
      tokens: {
        title: "Token đã nhận diện",
        source: "Project 72 · Bài 02",
        poster: "p72-tokens.png",
        alt: "Trạng thái phía dưới báo số token, đàn vẫn nhìn thấy ở trên.",
        caption: "Thêm comment rồi F5 không làm tăng số token của chương trình.",
      },
      ast: {
        title: "Các function trong AST",
        source: "Project 72 · Bài 03",
        poster: "p72-ast.png",
        alt: "Bên dưới đàn có số function đã parse từ source.",
        caption: "Code trong body không tự chạy ở bước parse.",
      },
      runtime: {
        title: "Môi trường script",
        source: "Project 72 · Bài 04",
        poster: "p72-runtime.png",
        alt: "Bảng runtime cho biết tên file, edition và số globals.",
        caption: "Khởi tạo script không reset đàn hay thay tay kéo.",
      },
      direct: {
        title: "Script thường · 80 px",
        source: "Project 72 · Bản hoàn chỉnh",
        poster: "p72-direct.png",
        alt: "Cá thể được chọn giữa vòng bán kính 80 px, tay kéo ở điểm giữa.",
        caption: "Handler thường chuyển thẳng đề xuất 80 của người dùng tới model.",
      },
      close: {
        title: "Khảo sát gần · 50 px",
        source: "Project 72 · Bản hoàn chỉnh",
        poster: "p72-close.png",
        alt: "Tay kéo vẫn ở giữa nhưng nhãn Radius và vòng trên đàn còn 50 px.",
        caption: "Cùng một đầu vào; nearRadius tính 20 + (80 − 20) / 2.",
      },
      bad: {
        title: "Sai cú pháp",
        source: "Project 72 · Bản hoàn chỉnh",
        poster: "p72-bad.png",
        alt: "Thông báo ở dòng function thiếu ngoặc, đàn và các control vẫn còn.",
        caption: "Reload không hợp lệ không thay chương trình đang kết nối.",
      },
      recursive: {
        title: "Giới hạn đệ quy",
        source: "Project 72 · Bản hoàn chỉnh",
        poster: "p72-recursive.png",
        alt: "Thông báo call depth sau khi bấm Pause trong bản cố tình gọi lại chính nó.",
        caption: "Không có vòng chờ vô hạn. Reset hay F9 vẫn được xử lý ở lượt tiếp theo.",
      },
    },
    overview: ["direct", "close", "runtime", "recursive"],
    lessons: {
      "script72-1": ["bytes"],
      "script72-2": ["tokens"],
      "script72-3": ["ast"],
      "script72-4": ["runtime"],
      "script72-5": ["direct", "close"],
      "script72-6": ["recursive", "bad"],
      "script72-7": ["direct", "close", "bad", "recursive"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
