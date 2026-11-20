import type { ProjectLearningAssets } from "../../learning/types";

const data = {
  guides: {
    "p70-l01": {
      focus: "Cùng một cây, chọn hướng main/cross của từng nhóm.",
      expected:
        "Chỉ đúng main axis và cross axis của từng container trước khi viết vòng lặp. Không có thay đổi nào với dữ liệu đàn chim.",
      files: ["include/flex/line.hpp", "include/style/sheet.hpp"],
      steps: [
        {
          title: "Gói phép đổi trục vào một chỗ",
          explanation:
            "Một dòng có offset chính 12, offset ngang 4, dài 80 và dày 20. Row cho Rect (12,4,80,20); column cho (4,12,20,80).",
        },
        {
          title: "Đọc các yêu cầu mới từ cùng một file",
          explanation:
            "Parser cũ vẫn đọc selector và declaration. Từ mốc này display, flex-direction cùng những property thuộc subset Flex được nhận biết, chưa dùng hết để di chuyển widget.",
        },
      ],
    },
    "p70-l02": {
      focus: "Xác định chiều dài cơ sở, margin và số gap trước khi đặt từng nút.",
      expected:
        "Với 40,20 và gap 8, tổng đã dùng là 68 pixel. Dòng còn 32 pixel chưa chia; một nút đứng một mình vẫn không có gap.",
      files: ["include/flex/line.hpp", "include/flex/layout.hpp"],
      steps: [
        {
          title: "Đếm những gì đã chiếm chỗ",
          explanation:
            "Nút đầu không có gap trước nó và dòng rỗng không phát sinh gap âm. Nếu bị thiếu chỗ, phần dư đặt về 0: các basis không bị ép thành số âm.",
        },
        {
          title: "Đặt Rect trong content box của cha",
          explanation:
            "Lấy size đã đo và margin đúng hướng, bỏ child ẩn, rồi dịch kết quả bằng gốc content. Các WidgetId vẫn là ID cũ của tài liệu HTML.",
        },
      ],
    },
    "p70-l03": {
      focus: "Phân chia số pixel còn lại theo trọng số flex-grow.",
      expected:
        "Rộng thêm 30 pixel chỉ làm phần grow 1 nở 10 và phần grow 2 nở 20 khi cả hai đều nhìn thấy. Không chia cho 0 nếu tổng grow bằng 0.",
      files: ["include/flex/line.hpp"],
      steps: [
        {
          title: "Đặt đúng mẫu số",
          explanation:
            "`totalGrow` chỉ tính các item hiện trong dòng, không tính item ẩn. Grow bằng 0 giữ basis; không có ai muốn nhận thì chỗ dư còn cho justify ở bài sau.",
        },
        {
          title: "Chia phần dư một lần",
          explanation:
            "Ví dụ hai basis 20 và 30, gap 10, dòng rộng 150: dư 90. Hai nút grow 1:2 có bề rộng cuối 50 và 90, không phải 50 và 100.",
        },
      ],
    },
    "p70-l04": {
      focus: "Phân biệt phân phối chỗ dư theo dòng với căn trên trục còn lại.",
      expected:
        "Hàng 120, hai item 40 và gap 10: center cho mép trái 15/65; end cho 30/80; space-between cho 0/80. Đổi row thành column, các con số ấy phải chuyển sang y.",
      files: ["include/flex/line.hpp"],
      steps: [
        {
          title: "Chọn vị trí trên cross axis",
          explanation:
            "Toolbar cao 50, nút cao 10: start cho y=0, center cho y=20, end cho y=40. Chỉ đổi direction thì cùng phép tính này chuyển sang trục x.",
        },
        {
          title: "Trả Rect về hệ tọa độ cửa sổ",
          explanation:
            "Không đổi orientation của glyph hoặc sự kiện chuột. Một nút dời qua phải trong column vẫn nhận click trong chính border box nó đang vẽ.",
        },
      ],
    },
    "p70-l05": {
      focus: "Làm việc với nhiều container và bỏ hẳn phần chiếm chỗ của child ẩn.",
      expected:
        "Có ít nhất ba flex container: root, toolbar và nhóm thông số. Chỉ người cha trực tiếp phân chia chỗ cho con; giữ chuột rồi đổi visibility không sinh click muộn.",
      files: ["include/flex/layout.hpp", "include/flex/workshop.hpp"],
      steps: [
        {
          title: "Đi xuống đúng một tầng mỗi lần",
          explanation:
            "Hình vừa tính trở thành khung cha cho lần gọi kế tiếp. Margin của một nút không bị cộng lần thứ hai ở tổ tiên của nó.",
        },
        {
          title: "Đổi visibility theo ID, không xóa con khỏi đàn",
          explanation:
            "Ẩn widget rồi bỏ số đo cũ. Cây và tham số của đàn không đổi. Việc bỏ node khỏi phép xếp phải kéo theo cả việc bỏ một gap và trọng số grow của nó.",
        },
      ],
    },
    "p70-l06": {
      focus: "Nghiệm thu overflow, bàn phím, hai stylesheet và lượt layout khi đứng yên.",
      expected:
        "Width hẹp cắt bớt Links; quay lại width rộng vẫn có cùng node, không có Rect âm. Hai stylesheet thay row/column thật, tương tác chuột và Tab tiếp tục đúng.",
      files: ["include/flex/layout.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Dùng một lượt đo và một lượt đặt",
          explanation:
            "Khi dirty, đo kích thước tự nhiên từ con lên cha, đặt khung từ cha xuống và đối chiếu lại focus. Một nghìn frame sạch không cần lặp lại công việc này.",
        },
        {
          title: "Đặt đáp số trước khi hỏi layout",
          explanation:
            "Đoạn fixture kiểm hàng rỗng, một nút, khoảng dư và thiếu chỗ. Phần còn lại của tests đổi cả row/column, bốn justify, bốn align và chạy lại với file CSS thật.",
        },
      ],
    },
  },
  references: {
    "p70-l01": [
      {
        label: "Trục chính và trục ngang trong TinyFlex",
        href: "/glossary#tiny-flex-axis",
        kind: "Thuật ngữ",
      },
    ],
    "p70-l02": [
      {
        label: "Trục chính và trục ngang trong TinyFlex",
        href: "/glossary#tiny-flex-axis",
        kind: "Thuật ngữ",
      },
    ],
    "p70-l03": [
      {
        label: "Flex basis và grow",
        href: "/glossary#tiny-flex-grow",
        kind: "Thuật ngữ",
      },
    ],
    "p70-l04": [
      {
        label: "Trục chính và trục ngang trong TinyFlex",
        href: "/glossary#tiny-flex-axis",
        kind: "Thuật ngữ",
      },
    ],
    "p70-l05": [
      {
        label: "Khi nào cần tính lại bố cục?",
        href: "/glossary#ui-layout-invalidation",
        kind: "Thuật ngữ",
      },
    ],
    "p70-l06": [
      {
        label: "Flex basis và grow",
        href: "/glossary#tiny-flex-grow",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default data;
