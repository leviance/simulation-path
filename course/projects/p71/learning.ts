import type { ProjectLearningAssets } from "../../learning/types";

const data = {
  guides: {
    "p71-l01": {
      focus: "Nối tên trong HTML với model, không nối bằng tọa độ hay thứ tự child.",
      expected:
        "Nút gọi đúng hàm dù di chuyển trong cây. Hàm không cần biết SDL vẽ nút bằng gì hay nút rộng bao nhiêu.",
      files: ["include/events/bus.hpp", "include/events/binding.hpp"],
      steps: [
        {
          title: "Tra một ID trong chính tài liệu đang mở",
          explanation:
            "Không có tên thì trả ID 0. Không tạo node mới để lấp chỗ trống: ở bài cuối ứng dụng sẽ báo rõ binding bắt buộc nào còn thiếu.",
        },
        {
          title: "Đưa lệnh về đúng mô hình đàn",
          explanation:
            "Pause đổi đồng hồ, Reset khởi tạo lại đàn, Observe chỉ đổi lớp nhìn. Radius và Separation có chung đường xác nhận giá trị theo range nhưng tới hai tham số khác nhau.",
        },
      ],
    },
    "p71-l02": {
      focus: "Phân biệt target với currentTarget, handled với stop.",
      expected:
        "Trường hợp bình thường có đủ ba ID; bật stop chỉ còn hai. Một lần click tạo đúng một lệnh thay model trong cả hai trường hợp.",
      files: ["include/events/bus.hpp", "include/events/binding.hpp"],
      steps: [
        {
          title: "Đi ngược đúng nhánh cha–con",
          explanation:
            "Tra callback theo current và topic, gọi tối đa một lần tại mỗi node. Với #pause, đường bình thường là #pause → #tools → #desk; không đi qua nhóm slider bên cạnh.",
        },
        {
          title: "Cha quan sát mà không làm lại lệnh của con",
          explanation:
            "Nhóm Tools tăng số lần quan sát. Chỉ khi bật chính sách stop mới cắt phần còn lại của đường đi; số lệnh vào solver không tăng theo số node đã thăm.",
        },
      ],
    },
    "p71-l03": {
      focus: "Đổi từ vị trí con trỏ sang bản tin input và chốt thay đổi khi thả.",
      expected:
        "Cùng một thao tác không làm cả hai việc. Hủy capture rồi gửi up cũ không thể thay bán kính hoặc phát click.",
      files: ["include/events/gesture.hpp"],
      steps: [
        {
          title: "Gom những mẫu tương đương thành một input",
          explanation:
            "Dùng bounds đầy đủ để quy đổi x, clamp và snap theo range trong file. Hai pixel khác nhau có thể cùng ứng với 80 px nên không cần gọi model hai lần.",
        },
        {
          title: "Chốt slider khác với kích hoạt button",
          explanation:
            "Slider giữ quyền nhận mẫu cuối khi thả bên ngoài. Button thì chỉ click nếu thả đúng owner. Hủy trước đó khiến owner bằng 0 và không có lệnh muộn.",
        },
      ],
    },
    "p71-l04": {
      focus: "Bàn phím đổi focus hoặc phát event, không viết lại năm lệnh của model.",
      expected:
        "Click và phím kích hoạt cho cùng kết quả; hover không tự giành focus. Một key repeat trên button không tạo lệnh thứ hai.",
      files: ["include/events/gesture.hpp", "include/events/binding.hpp"],
      steps: [
        {
          title: "Nhận diện loại control đang có focus",
          explanation:
            "Button chặn lặp khi kích hoạt; slider dùng step trong HTML. Home/End đi thẳng về hai đầu. Không có focus phù hợp thì trả quyền xử lý về cảnh.",
        },
        {
          title: "Không thêm một hàm Pause riêng cho keyboard",
          explanation:
            "Event đổi đường vào, không đổi nơi chịu trách nhiệm cập nhật model. Nhãn và trạng thái tick lấy từ model đó, không được tự cộng một tick cho đẹp.",
        },
      ],
    },
    "p71-l05": {
      focus: "Nạp đồng bộ cây, CSS, bố cục và callback; chạy kiểm hồi quy bằng state thật.",
      expected:
        "Có năm chức năng tác động đúng mô phỏng; trace không làm thay tác dụng của lệnh. Giao diện mới dùng được bằng chuột và Tab, file sai không xóa phiên cũ.",
      files: ["include/events/reload.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Thay cả phiên sau khi mọi bước thành công",
          explanation:
            "Hủy gesture trước khi thử đổi cây. File HTML có thể đúng cú pháp mà vẫn thiếu #reset, trường hợp đó giữ lại bảng và callback hợp lệ, báo tên binding thiếu.",
        },
        {
          title: "Đếm lệnh thật bên cạnh đường truyền",
          explanation:
            "Kiểm độc lập hai tình huống có và không stop. Các ca sau đó kéo, resize, thay tài liệu, thả muộn, đối chiếu radius, lực tách, checkbox và trạng thái Pause.",
        },
      ],
    },
  },
  references: {
    "p71-l01": [
      {
        label: "Target, currentTarget và bubbling",
        href: "/glossary#widget-bubble",
        kind: "Thuật ngữ",
      },
    ],
    "p71-l02": [
      {
        label: "Target, currentTarget và bubbling",
        href: "/glossary#widget-bubble",
        kind: "Thuật ngữ",
      },
    ],
    "p71-l03": [
      {
        label: "Quyền giữ một cử chỉ kéo",
        href: "/glossary#widget-gesture-owner",
        kind: "Thuật ngữ",
      },
    ],
    "p71-l04": [
      {
        label: "Quyền giữ một cử chỉ kéo",
        href: "/glossary#widget-gesture-owner",
        kind: "Thuật ngữ",
      },
    ],
    "p71-l05": [
      {
        label: "Nạp lại mà không làm mất phiên đang chạy",
        href: "/glossary#ui-safe-reload",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default data;
