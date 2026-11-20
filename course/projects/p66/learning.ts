import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p66-l01": {
      focus:
        "Ở Project 65, một biến và một Rect đã đủ cho nút Pause. Bây giờ bạn muốn thêm cả nhóm thông số khi đàn đang bay. Nếu Reset đàn đồng thời dựng lại mọi nút, focus và thao tác kéo đang dở sẽ thuộc về ai?",
      expected:
        "Node thuộc đúng một parent. Một lần Reset đàn không thay địa chỉ root hoặc bộ cấp ID; không cần hoạt động chuột cho các nút ở mốc đầu này.",
      files: ["include/tree.hpp"],
      steps: [
        {
          title: "Node chứa gì?",
          explanation:
            "`Widget` chứa hình học local, loại, nhãn và danh sách con. Không nhét vận tốc đàn vào widget: hai phần có vòng đời khác nhau.",
        },
        {
          title: "Trao child cho parent",
          explanation:
            "Lấy ID trước khi `std::move` chuyển quyền sở hữu. Từ đây không giữ con trỏ tạm qua lần thay đổi cây; tìm lại bằng ID khi cần.",
        },
      ],
    },
    "p66-l02": {
      focus:
        "Bảng bên phải đã chật. Hãy thử dịch cả nhóm Pause và Reset sang trái mà không sửa một tọa độ nào của từng nút.",
      expected:
        "Sau dịch (-16,4), world của Pause là (672,84). Reset và các child cùng đi theo, đàn không bị dịch.",
      files: ["include/traversal.hpp"],
      steps: [
        {
          title: "Tính bounds tại node đang thăm",
          explanation:
            "Chỉ lấy vị trí từ origin của cha; chiều rộng và chiều cao vẫn thuộc node hiện tại. `WidgetView` là kết quả quan sát tạm thời, không phải cái cây thứ hai.",
        },
        {
          title: "Đưa đúng gốc xuống một cấp",
          explanation:
            "Vẽ cha trước rồi duyệt các con theo thứ tự thêm. Truyền góc trái vừa tính cho cấp kế tiếp; nếu truyền mãi gốc cửa sổ, các cháu sẽ tách khỏi Panel khi dịch chuyển.",
        },
      ],
    },
    "p66-l03": {
      focus:
        "Chuyển sang preset bảng thấp. Reset vẫn cao 44 px, nhưng chỉ còn thấy 36 px. Tám pixel biến mất ở đâu? Nếu sửa chiều cao của Reset thành 36, khi mở rộng Panel nó sẽ không trở lại như cũ.",
      expected:
        "Reset vẫn báo bounds cao 44; clip cao 36. Child nằm ngoài vẫn thuộc parent và không bị cấp lại ID.",
      files: ["include/geometry.hpp", "include/traversal.hpp"],
      steps: [
        {
          title: "Giao hai hình chữ nhật",
          explanation:
            "Bên trái lấy giá trị lớn hơn, bên phải lấy giá trị nhỏ hơn. Nếu hai cạnh vượt qua nhau, chiều rộng bằng 0, không được lật chúng để tạo một khung giả.",
        },
        {
          title: "Giữ bounds đủ, thu hẹp clip",
          explanation:
            "Lưu cả hai vào `WidgetView` và truyền clip đã thu hẹp xuống child. Child bị khuất hoàn toàn có thể không có view, nhưng `find` vẫn tìm thấy ID trong cây.",
        },
      ],
    },
    "p66-l04": {
      focus:
        "Xếp Reset ở đúng chỗ Pause trong preset chồng. Nếu cứ trả ngay node đầu tiên chứa con trỏ, bạn sẽ kích hoạt nút ở bên dưới – nút mà người dùng không thấy.",
      expected:
        "Tại (700,90), nút Reset phía trên thắng; một label đặt sau cùng không cướp click. Điểm ở mép clip không lọt tới child bên dưới.",
      files: ["include/traversal.hpp"],
      steps: [
        {
          title: "Tìm từ phần nhìn thấy ở trên cùng",
          explanation:
            "Dùng `rbegin()` để đi ngược các child. Label có thể che một phần nét vẽ nhưng không phải control nhận input. Panel trống vẫn chặn click để con chim sau panel không bị chọn.",
        },
        {
          title: "Điểm ngoài viewport không trúng node nào",
          explanation:
            "Từ chối điểm ngoài cửa sổ trước khi gọi tìm trong root. Kết quả là ID, không phải một con trỏ mà lần sau rất có thể đã hết hiệu lực.",
        },
      ],
    },
    "p66-l05": {
      focus:
        "Bạn đã tìm được ID dưới con trỏ. Bây giờ kéo Radius ra khỏi Panel: chim phải tiếp tục nhận bán kính mới dù chuột đã đi sang viewport. Trả ID dưới con trỏ ở mỗi frame không giải được trường hợp này.",
      expected:
        "Kéo Radius đến tận mép ngoài vẫn clamp ở 140. Tắt lớp quan sát không đổi các cá thể. Click panel không chọn chim ở phía sau.",
      files: ["include/input.hpp"],
      steps: [
        {
          title: "Sửa đúng tham số được gắn với node",
          explanation:
            "`locate` tìm lại view còn hợp lệ. Một slider gắn Radius, slider kia gắn Separation. Đọc binding rồi gọi `assign`, không đoán loại tham số từ chữ ghi trên nhãn.",
        },
        {
          title: "Nhận mẫu cuối cùng trước khi nhả capture",
          explanation:
            "Sự kiện up có thể đến ở một tọa độ mới dù không có move cuối. Ghi giá trị lần chót, xóa active, rồi chỉ kích hoạt button nếu nhấn và thả trên cùng một ID.",
        },
      ],
    },
    "p66-l06": {
      focus:
        "Một nhóm mới được thêm vào bảng. Nếu Tab vẫn dựa trên danh sách năm nút của Project 65, người dùng bàn phím không bao giờ tới được nhóm ấy.",
      expected:
        "Tab và Shift+Tab đi ngược nhau; giữ Enter trên checkbox không đảo liên tục. Hai phím mũi tên trên slider chạm đúng binding của nó.",
      files: ["include/traversal.hpp", "include/keyboard.hpp"],
      steps: [
        {
          title: "Lấy những node có thể nhận focus",
          explanation:
            "Khi toàn bộ nhóm mất khỏi clip, child cũng mất khỏi danh sách. Label còn nhìn thấy không có nghĩa là nó phải nhận Tab.",
        },
        {
          title: "Đi vòng mà không tạo chỉ số âm",
          explanation:
            "Xác định hướng và vị trí kế tiếp, cộng chiều dài trước phép modulo. Tab từ cuối về đầu; Shift+Tab từ đầu tới cuối, kể cả sau khi preset vừa đổi.",
        },
      ],
    },
    "p66-l07": {
      focus:
        "Đang kéo Radius thì toàn bộ nhóm biến mất. Một sự kiện mouse-up vẫn có thể tới ở frame sau. Không được tìm một con trỏ cũ rồi tiếp tục điều khiển đàn.",
      expected:
        "Ẩn rồi hiện giữ ID cũ. Xóa rồi thêm Label bằng A cấp ID mới. Release muộn không chạy action và không chọn chim khác.",
      files: ["include/mutation.hpp", "include/input.hpp"],
      steps: [
        {
          title: "Hủy nhánh sau khi bảo vệ root",
          explanation:
            "Xóa qua parent và cập nhật số lượng node. Những child phía dưới được hủy theo `unique_ptr`; không tái sử dụng ID vừa mất cho một button mới.",
        },
        {
          title: "So active, focus và hot với cây mới",
          explanation:
            "Không chỉ hỏi ID có tồn tại. Kiểm cả visible/enabled kế thừa và loại node. Hành động dọn state phải diễn ra trước khi sự kiện tiếp theo có thể dùng ID.",
        },
      ],
    },
    "p66-l08": {
      focus:
        "Nếu mỗi lần Reset đàn lại dựng một cây trông hệt cây cũ, người dùng có thể chẳng nhận thấy đến khi đang kéo dở slider. Ta cần kiểm điều ảnh chụp không thể cho biết.",
      expected:
        "Kiểm đúng bounds (688,80), phần Reset bị clip 36 pixel, reverse pick, Tab và việc hủy capture. Debug và Release đều qua CTest.",
      files: ["include/audit.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đọc toàn cây mà không sửa trạng thái",
          explanation:
            "Đếm node thực, kiểm ID duy nhất. Đối chiếu với một bản sao UI đã reconcile: nếu hot/active/focus cũ khác bản hợp lệ, báo lỗi thay vì lặng lẽ sửa giúp test.",
        },
        {
          title: "Thử nghiệm đủ dài nhưng hữu hạn",
          explanation:
            "Một nghìn frame không phải thử tải vô hạn. Duyệt, hit-test, cập nhật đàn rồi Reset; sau đó đối chiếu root, nextId và số node với fixture. CTest dùng điều kiện chạy cả khi có NDEBUG.",
        },
      ],
    },
  },
  references: {
    "p66-l01": [
      {
        label: "Retained widget tree",
        href: "/glossary#retained-widget-tree",
        kind: "Thuật ngữ",
      },
      {
        label: "WidgetId và vòng đời",
        href: "/glossary#widget-id-lifetime",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l02": [
      {
        label: "Local, world và ancestor clip",
        href: "/glossary#widget-local-world-clip",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l03": [
      {
        label: "SDL_SetRenderClipRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderClipRect",
        kind: "SDL API",
      },
      {
        label: "Local bounds và clip",
        href: "/glossary#widget-local-world-clip",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l04": [
      {
        label: "Paint order và reverse hit-test",
        href: "/glossary#widget-paint-pick-order",
        kind: "Thuật ngữ",
      },
      {
        label: "Input consumption",
        href: "/glossary#ui-input-consumption",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l05": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      {
        label: "Slider mapping",
        href: "/glossary#ui-slider-mapping",
        kind: "Thuật ngữ",
      },
      {
        label: "Hot, active và focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l06": [
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l07": [
      {
        label: "WidgetId và vòng đời của nhánh",
        href: "/glossary#widget-id-lifetime",
        kind: "Thuật ngữ",
      },
      {
        label: "Retained widget tree",
        href: "/glossary#retained-widget-tree",
        kind: "Thuật ngữ",
      },
    ],
    "p66-l08": [
      {
        label: "WidgetId và lifetime",
        href: "/glossary#widget-id-lifetime",
        kind: "Thuật ngữ",
      },
      {
        label: "Paint và picking",
        href: "/glossary#widget-paint-pick-order",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
