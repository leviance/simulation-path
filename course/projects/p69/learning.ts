import type { ProjectLearningAssets } from "../../learning/types";

const data = {
  guides: {
    "p69-l01": {
      focus: "Đọc stylesheet thật; phân biệt file mô tả cấu trúc với file quy định hình thức.",
      expected:
        "Cùng bản HTML vẫn nhận chuột và Tab; số byte đổi ngay sau F5, không cần build C++.",
      files: ["include/markup/source.hpp", "include/style/editor.hpp"],
      steps: [
        {
          title: "Dùng lại bộ đọc file nhỏ",
          explanation:
            "CSS cũng có giới hạn 16 KiB. Không viết thêm một đường đọc riêng chỉ vì phần mở rộng đổi từ html thành css.",
        },
        {
          title: "Cho F5 nạp lại kiểu trình bày",
          explanation:
            "Ở mốc này chỉ đọc file và hiện số byte; bàn HTML của Project 68 vẫn dùng style mặc định. Đây là chỗ tách lỗi đường dẫn khỏi lỗi parser.",
        },
      ],
    },
    "p69-l02": {
      focus: "Biến một selector và dãy property/value thành dữ liệu trước khi đụng đến giao diện.",
      expected:
        "File sai có tên và vị trí; file đúng trả đủ số rule. Tới mốc này các rule chưa thắng hay thua và màu vẫn chưa được áp.",
      files: ["include/style/sheet.hpp", "include/style/editor.hpp"],
      steps: [
        {
          title: "Tách tên selector rồi đi qua từng cặp key/value",
          explanation:
            "Gặp dấu ngoặc đóng trước dấu chấm phẩy thì báo lỗi. Giữ offset của property để có thể chỉ ngay dòng chữ viết nhầm.",
        },
        {
          title: "Kiểm cả stylesheet trước khi dùng",
          explanation:
            "Checkpoint 2 báo số rule hợp lệ. Thử typo ở cuối file: không có chuyện nửa file đầu đã đổi màu trên màn hình.",
        },
      ],
    },
    "p69-l03": {
      focus: "Chọn rule thắng cho từng property bằng tag, class, ID và thứ tự nguồn.",
      expected:
        "Màu từ computed style thật sự đến nét vẽ SDL. Dùng fixture màu #111111, #222222, #333333 để phân biệt người thắng trước khi so giao diện bằng mắt.",
      files: ["include/style/cascade.hpp"],
      steps: [
        {
          title: "Xác định điều kiện có khớp không",
          explanation:
            "Element có nhiều class. .action và .primary đều có thể đúng, nhưng chỉ #pause nhắm riêng nút Pause. Rank 0 có nghĩa không tham gia.",
        },
        {
          title: "Giữ người thắng và vết về nguồn",
          explanation:
            "Mỗi property lưu rule nguồn, độ ưu tiên và giá trị. Việc giữ matched rules giúp inspector sau này giải thích được cả rule khớp nhưng không thắng.",
        },
      ],
    },
    "p69-l04": {
      focus: "Phân biệt thay đổi nét vẽ và thay đổi khoảng cách; cập nhật hit-test đúng lúc.",
      expected:
        "Theme tối cao 34 cho Button, theme sáng cao 30. Màu khác mà width không đổi thì không có thêm lượt đo; hit-test theo Rect mới ngay khi padding đổi.",
      files: ["include/style/editor.hpp"],
      steps: [
        {
          title: "So sánh phần làm các hàng dời chỗ",
          explanation:
            "Không có màu trong phép so. So bốn cạnh margin và padding, không chỉ bên trái: thay padding phải cũng có thể làm thanh kéo ngắn đi.",
        },
        {
          title: "Chỉ chuyển sang bảng mới khi mọi node hợp lệ",
          explanation:
            "Tính vào bản nháp trên nền mặc định nguyên vẹn. Nếu một giá trị tạo hình học sai ở node cuối, các node trước vẫn giữ theme cũ. Khi geometry đổi mới hủy gesture và bố trí lại.",
        },
      ],
    },
    "p69-l05": {
      focus: "Nghiệm thu hai theme, inspector và khả năng quay lại sau lỗi.",
      expected:
        "Cùng cây HTML và cùng đàn, hai stylesheet tạo hai giao diện khác cả màu lẫn geometry. Nhập CSS sai không mất theme hợp lệ; focus và hai slider còn dùng được.",
      files: ["include/style/skin.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Vẽ từ computed style của đúng widget",
          explanation:
            "Lớp sơn đọc background, viền và màu chữ theo node. Focus vẫn có đường bao riêng để người dùng bàn phím nhìn thấy, slider vẫn đọc mô hình hiện hành.",
        },
        {
          title: "Cài một tình huống có hai người cùng muốn thắng",
          explanation:
            "Một element khớp năm rule: hai class đặt màu chữ, một ID đấu với một tag về nền. Ca này không thể đạt bằng cách luôn chọn rule cuối cùng.",
        },
      ],
    },
  },
  references: {
    "p69-l01": [
      {
        label: "Cascade và độ ưu tiên của selector",
        href: "/glossary#ui-cascade",
        kind: "Thuật ngữ",
      },
    ],
    "p69-l02": [
      {
        label: "Cascade và độ ưu tiên của selector",
        href: "/glossary#ui-cascade",
        kind: "Thuật ngữ",
      },
    ],
    "p69-l03": [
      {
        label: "Cascade và độ ưu tiên của selector",
        href: "/glossary#ui-cascade",
        kind: "Thuật ngữ",
      },
    ],
    "p69-l04": [
      {
        label: "Khi nào cần tính lại bố cục?",
        href: "/glossary#ui-layout-invalidation",
        kind: "Thuật ngữ",
      },
    ],
    "p69-l05": [
      {
        label: "Nạp lại mà không làm mất phiên đang chạy",
        href: "/glossary#ui-safe-reload",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default data;
