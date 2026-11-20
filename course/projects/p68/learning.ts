import type { ProjectLearningAssets } from "../../learning/types";

const data = {
  guides: {
    "p68-l01": {
      focus: "Mở đúng file cạnh executable hoặc chọn thư mục đang biên tập.",
      expected:
        "Bỏ qua mạng và thư mục cài đặt: ZIP giải nén nơi khác vẫn chạy. File sai đường dẫn có thông báo và người dùng vẫn đóng được cửa sổ.",
      files: ["include/markup/source.hpp", "include/markup/desk.hpp"],
      steps: [
        {
          title: "Đọc đủ byte trước khi phân tích",
          explanation:
            "Mở ở cuối để biết kích thước. Chặn file lớn hơn 16 KiB trước khi cấp bộ nhớ rồi mới quay về đầu để đọc. File không tồn tại và file rỗng là hai trường hợp khác nhau.",
        },
        {
          title: "Nối phím F5 với thao tác đọc",
          explanation:
            "Ở snapshot này reload chỉ kiểm UTF-8, báo tên và số byte. Chạy executable với `--assets assets` từ thư mục dự án để sửa đúng bản đang mở.",
        },
      ],
    },
    "p68-l02": {
      focus: "Viết tokenizer đi qua nguồn theo đúng một chiều.",
      expected:
        "Chỉ số đọc đi hết input hợp lệ; lỗi có dòng và cột tính từ 1. Chưa có cây, CSS hay handler ở mốc này.",
      files: ["include/markup/tokens.hpp"],
      steps: [
        {
          title: "Đọc một cặp tên và giá trị",
          explanation:
            "Đọc tên rồi yêu cầu dấu bằng. Chỉ dừng ở đúng loại nháy đã mở; gặp key trùng thì báo lỗi ngay. Không nuốt nốt phần còn lại của file để đoán ý người viết.",
        },
        {
          title: "Giao từng token cho bước sau",
          explanation:
            "Nhìn một input tự đóng kết thúc bằng `/>`, khác với một Button mở rồi chứa chữ rồi đóng. Hai cú pháp này cần token khác nhau, chưa cần tạo Widget.",
        },
      ],
    },
    "p68-l03": {
      focus: "Dùng stack để biết nút Reset đang nằm trong nhóm nào.",
      expected:
        "Tag lạ, input có min không nhỏ hơn max, ID trùng, cây quá sâu đều bị từ chối. Một Label chứa `R &amp; D` lưu nội dung là R & D, không lưu nguyên chuỗi entity.",
      files: ["include/markup/tokens.hpp", "include/markup/document.hpp"],
      steps: [
        {
          title: "Đưa cú pháp đã tách tới parser",
          explanation:
            "Token mang kind, tag, attributes và vị trí. Parser không đọc lại từng dấu nháy: việc đó đã ở lớp dưới.",
        },
        {
          title: "Gắn chỉ số parent rồi kiểm cặp thẻ",
          explanation:
            "Lưu element theo thứ tự nguồn. Một phần tử có parent là chỉ số của div đang mở; ID đã dùng không được khai báo lần hai. Chặn giới hạn trước khi thêm node.",
        },
      ],
    },
    "p68-l04": {
      focus: "Tạo widget theo parent, nối slider với mô hình và chạy layout cũ.",
      expected:
        "Số node và thứ tự vẽ theo đúng markup. Cú kéo 50% của vùng 20–140 còn cho 80 px; bật/tắt Neighbors không thay solver.",
      files: ["include/markup/bridge.hpp", "include/markup/desk.hpp"],
      steps: [
        {
          title: "Tạo cây đã biết từ Project 66",
          explanation:
            "Không đo font hay viết lại cách xếp hàng. Tạo đúng loại node, ghi bảng đối chiếu element → widget rồi để box layout của Project 67 đo từ dữ liệu mới.",
        },
        {
          title: "Đưa giá trị slider thật vào đàn",
          explanation:
            "Lấy giá trị gần nhất theo step và chặn trong min/max. Chỉ hai ID radius và separation nối tới mô hình; mỗi slider không gắn mô hình vẫn có giá trị riêng.",
        },
      ],
    },
    "p68-l05": {
      focus: "Xem hai file đổi cả bố cục lẫn thứ tự Tab; đối chiếu node bằng inspector.",
      expected:
        "Dùng cùng executable, không build lại. Bán kính bạn vừa chọn còn nguyên nếu nằm trong miền mới. Có thể chỉ ra cả ID trong HTML và bounds trong cửa sổ.",
      files: ["include/markup/desk.hpp", "include/markup/paint.hpp"],
      steps: [
        {
          title: "Dựng bên cạnh cây đang dùng",
          explanation:
            "Parse, ánh xạ và đo bản nháp xong mới chuyển nó vào Desk. UI mới không mang active hoặc focus cũ; mô hình đàn chim thì được giữ lại.",
        },
        {
          title: "Nối ngược khung trên màn hình về file",
          explanation:
            "Inspector cho biết tag, ID từ file, WidgetId, parent, offset và bounds. Đây là cách kiểm một nhãn thực sự thuộc settings chứ không chỉ tình cờ được vẽ gần nó.",
        },
      ],
    },
    "p68-l06": {
      focus: "Giữ bản hợp lệ, in đúng vị trí lỗi và có phép thử không phụ thuộc ảnh.",
      expected:
        "Hai tài liệu đổi bố cục thật, lỗi có vị trí, kéo/thả sau reload không tác động nhầm. Chạy được ZIP ở một đường dẫn khác. Các phép kiểm vẫn chạy khi build Release với NDEBUG.",
      files: ["include/markup/desk.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Báo tên file cùng dòng/cột",
          explanation:
            "Đặt thao tác đọc và kiểm tra trong cùng ranh giới xử lý lỗi. `status` là thông tin cho người dùng; không để exception rơi khỏi vòng lặp native.",
        },
        {
          title: "Kiểm bằng một chuỗi thao tác thật",
          explanation:
            "Bắt đầu từ hai asset thật và một file sai. Giữ địa chỉ root để xác nhận trường hợp thất bại, kiểm giá trị radius, rồi kiểm focus/active sau khi thay cây thành công.",
        },
      ],
    },
  },
  references: {
    "p68-l01": [
      {
        label: "SDL_GetBasePath",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetBasePath",
        kind: "SDL API",
      },
    ],
    "p68-l02": [
      {
        label: "Token và vị trí trong file",
        href: "/glossary#tiny-token",
        kind: "Thuật ngữ",
      },
    ],
    "p68-l03": [
      {
        label: "Cây cú pháp (AST)",
        href: "/glossary#tiny-ast",
        kind: "Thuật ngữ",
      },
    ],
    "p68-l04": [
      {
        label: "Measure và arrange",
        href: "/glossary#measure-arrange",
        kind: "Thuật ngữ",
      },
    ],
    "p68-l05": [
      {
        label: "Token và vị trí trong file",
        href: "/glossary#tiny-token",
        kind: "Thuật ngữ",
      },
    ],
    "p68-l06": [
      {
        label: "Nạp lại mà không làm mất phiên đang chạy",
        href: "/glossary#ui-safe-reload",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default data;
