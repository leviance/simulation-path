import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p67-l01": {
      focus: "Chạy nền SDL và cây UI trước khi thêm thuật toán layout.",
      expected:
        "Bóng và Pause/Reset/Slider chạy được; số đọc Pause world=(638,82) theo đúng Rect đặt tay.",
      files: ["include/app.hpp"],
      steps: [
        {
          title: "Build starter",
          explanation:
            "Window, renderer, logical presentation, cây Widget và input từ Project 66 đều đã có. Chạy thử ba control; không bắt đầu từ một struct mới chưa có chỗ sử dụng.",
        },
        {
          title: "Theo dõi một Rect",
          explanation:
            "add tạo widget với local Rect; paintList cộng offset của parent, drawWidget gọi SDL_RenderFillRect. Đó là đường đi từ dữ liệu tới hình đang thấy.",
        },
        {
          title: "Thử sửa khoảng cách",
          explanation:
            "Tăng y của Reset không làm Slider đi theo. Ghi lại các tọa độ phải sửa, rồi phục hồi starter trước khi tiếp tục.",
        },
      ],
    },
    "p67-l02": {
      focus: "Phân biệt thông số mong muốn với hình học đã tính.",
      expected: "Inspector hiển thị margin/border/content của widget, control chưa được tự xếp.",
      files: ["include/style.hpp", "include/scene.hpp", "include/app.hpp"],
      steps: [
        {
          title: "Tách BoxStyle",
          explanation:
            "Margin thuộc khoảng chiếm chỗ bên ngoài; border và padding nằm trong border box. Style không chứa x/y và không bị arrange ghi đè.",
        },
        {
          title: "Tính content box",
          explanation:
            "Trừ border hai phía và padding từng phía khỏi border box. Clamp kích thước còn lại về 0, không cho width âm hoặc âm thầm làm node rộng hơn.",
        },
        {
          title: "Vẽ lớp chẩn đoán",
          explanation:
            "Overlay dùng world bounds của node đã chọn. Màu margin chỉ để giải thích, không mở rộng hit area; input vẫn theo cây và clip.",
        },
      ],
    },
    "p67-l03": {
      focus: "Đo border box trước khi đặt vị trí.",
      expected: "Measure có số đo từng node; local Rect vẫn do builder điền.",
      files: ["include/layout.hpp", "include/runtime.hpp"],
      steps: [
        {
          title: "Đặt hợp đồng width",
          explanation:
            "availableWidth còn chứa margin của node. Fill trừ margin trái/phải; Fixed giữ fixedWidth dù tràn. Giá trị trả về là border box, không phải content box.",
        },
        {
          title: "Lưu số đo theo ID",
          explanation:
            "Measures là map WidgetId→Size. Width/height dùng để arrange; naturalHeight cho biết tổng nội dung dù height bị cố định. Không dùng địa chỉ vector làm khóa.",
        },
        {
          title: "Giới hạn phép đo",
          explanation:
            "Leaf height là số đã gồm padding/border; chưa đo glyph, wrap chữ hay auto height cho Label. Auto height chỉ có ở Panel, nên không có vòng phụ thuộc height của con theo height cha.",
        },
      ],
    },
    "p67-l04": {
      focus: "Đặt một cột bằng cursorY thay vì chuỗi tọa độ.",
      expected: "Gap và padding đổi được; mọi child root được đặt lại cùng lượt.",
      files: ["include/layout.hpp", "include/runtime.hpp"],
      steps: [
        {
          title: "Bắt đầu từ content origin",
          explanation:
            "cursorY bắt đầu ở border+padding.top. Child x thêm margin.left; child y thêm margin.top. Mọi tọa độ này đều local của parent.",
        },
        {
          title: "Tiến cursor sau mỗi child",
          explanation:
            "Sau border-box height còn có margin.bottom. Gap chỉ thêm trước child thứ hai trở đi; không thêm ở đầu hoặc cuối cột.",
        },
        {
          title: "Thay khoảng cách",
          explanation:
            "setSpacing đổi Style, không sửa Rect. Thử gap=0: hai margin 4 vẫn tạo khoảng cách 8; project không dùng margin collapsing của CSS.",
        },
      ],
    },
    "p67-l05": {
      focus: "Đo chiều cao Panel con rồi đặt cả cây.",
      expected: "Group cao 252; Pause world=(656,96), rộng 240.",
      files: ["include/scene.hpp", "include/layout.hpp"],
      steps: [
        {
          title: "Đưa control vào Group",
          explanation:
            "Root giữ tiêu đề và footer; Group chứa năm control. Parent ownership không đổi; Style mới quyết định kích thước, không phải Rect tạm dùng khi add.",
        },
        {
          title: "Cộng outer height của con",
          explanation:
            "Measure đã biết content width rồi đi xuống child; height Auto được cộng khi quay lên. Group gồm 28 inset, 192 outer heights và 32 gap nên cao 252.",
        },
        {
          title: "Arrange từ parent xuống",
          explanation:
            "Dùng Measures đã tính, không gọi measure lại trong mỗi arrange. Bản nested gọi đệ quy trên child, vẫn chỉ ghi local; traversal của Project 66 mới cộng world.",
        },
      ],
    },
    "p67-l06": {
      focus: "Tính flow theo node visible và quản lý style theo lifetime.",
      expected: "Ẩn Reset làm Group thấp đi 52; thêm/xóa Label dời footer, ID còn lại giữ nguyên.",
      files: ["include/runtime.hpp", "include/layout.hpp"],
      steps: [
        {
          title: "Bỏ qua node ẩn",
          explanation:
            "Skip trước khi tăng visibleCount, cộng margin hoặc gap. Node ẩn vẫn thuộc cây nhưng không chiếm chỗ; disabled là trạng thái input khác, vẫn chiếm chỗ.",
        },
        {
          title: "Thêm cả node và Style",
          explanation:
            "appendLabel tạo ID mới rồi thêm style tương ứng. Chỉ tối đa bốn Label; Rect ban đầu là giá trị tạm hợp lệ, arrange sẽ thay bằng kết quả.",
        },
        {
          title: "Xóa đúng phần sở hữu",
          explanation:
            "Xóa Label cuối phải xóa style và danh sách extras cùng node. Không giữ Widget* qua erase; hủy active trước layout và reconcile focus sau layout.",
        },
      ],
    },
    "p67-l07": {
      focus: "Hoàn tất geometry mới trước khi nhận input và cache khi không đổi.",
      expected: "Width đổi làm Fill cập nhật, slider vẫn đúng; bước vật lý không tăng passes.",
      files: ["include/runtime.hpp", "include/events.hpp"],
      steps: [
        {
          title: "Đặt dirty ở các đường ghi",
          explanation:
            "Width, gap, padding và visibility cần invalidation. Gravity/ticks/hover không đổi hình học nên không làm dirty. API bỏ qua giá trị không đổi hoặc không hợp lệ.",
        },
        {
          title: "Ensure trước input",
          explanation:
            "Vòng SDL có thể nhận resize rồi mouse down trong cùng frame. Nếu chờ tới draw, down đọc Rect cũ. ensureLayout phải đứng trước pointerDown và render.",
        },
        {
          title: "Hủy gesture cũ",
          explanation:
            "Layout đổi thì active/hot bị hủy, host nhả capture; focus được đối chiếu sau arrange. Không áp release của Slider cũ lên vị trí mới.",
        },
      ],
    },
    "p67-l08": {
      focus: "Tách kích thước cần bố trí khỏi phần nhìn thấy.",
      expected: "Slider Fixed 320 vẫn rộng 320 khi parent hẹp; phần ngoài clip không hit.",
      files: ["include/runtime.hpp", "include/traversal.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Giữ Fixed đúng hợp đồng",
          explanation:
            "Không tự clamp fixedWidth theo parent; làm vậy sẽ âm thầm đưa flex-shrink vào một engine chưa dạy. Fill mới nhận phần chiều rộng còn lại.",
        },
        {
          title: "Dùng clip tổ tiên",
          explanation:
            "Render và picking vẫn dùng intersection của Project 66. Width của Slider không bị thay bằng clip.width; gravity được ánh xạ bằng bounds đầy đủ.",
        },
        {
          title: "Kiểm cả tràn đứng",
          explanation:
            "Thêm bốn Label làm root naturalHeight lớn hơn 492. Root vẫn cao 492 và cắt phần tràn; chưa có scrolling hay tự tăng height toàn window.",
        },
      ],
    },
    "p67-l09": {
      focus: "Kiểm bằng con số tự tính và chuỗi input thật.",
      expected: "Mọi checkpoint build độc lập; Debug/Release tests và smoke hữu hạn.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt fixture độc lập",
          explanation:
            "Expected world và outer heights là hằng số tính từ Style, không gọi measure để tạo đáp án cho measure. Kiểm hide/show phục hồi và margin/gap riêng.",
        },
        {
          title: "Kiểm transition và cache",
          explanation:
            "Resize khi kéo phải hủy active; input tiếp theo dùng Rect mới. Một nghìn frame đọc và bước vật lý không được tăng passes hoặc dựng lại cây.",
        },
        {
          title: "Build có giới hạn",
          explanation:
            "Check/EXIT_FAILURE có hiệu lực ở Release, khác assert bị NDEBUG bỏ. Dùng hai compiler, deadline ngoài build, CTest timeout và smoke ẩn; desktop QA được ghi riêng.",
        },
      ],
    },
  },
  references: {
    "p67-l01": [
      { label: "Retained widget tree", href: "/glossary#retained-widget-tree", kind: "Thuật ngữ" },
    ],
    "p67-l02": [{ label: "Box model", href: "/glossary#vertical-box-model", kind: "Thuật ngữ" }],
    "p67-l03": [
      { label: "Measure và arrange", href: "/glossary#measure-arrange", kind: "Thuật ngữ" },
    ],
    "p67-l04": [{ label: "Vertical flow", href: "/glossary#vertical-flow-gap", kind: "Thuật ngữ" }],
    "p67-l05": [
      { label: "Measure và arrange", href: "/glossary#measure-arrange", kind: "Thuật ngữ" },
    ],
    "p67-l06": [
      { label: "WidgetId lifetime", href: "/glossary#widget-id-lifetime", kind: "Thuật ngữ" },
    ],
    "p67-l07": [
      { label: "Dirty layout", href: "/glossary#dirty-layout", kind: "Thuật ngữ" },
      {
        label: "SDL: window units và pixel size",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSize",
        kind: "SDL API",
      },
    ],
    "p67-l08": [
      {
        label: "Bounds và ancestor clip",
        href: "/glossary#widget-local-world-clip",
        kind: "Thuật ngữ",
      },
    ],
    "p67-l09": [{ label: "Dirty layout", href: "/glossary#dirty-layout", kind: "Thuật ngữ" }],
  },
} satisfies ProjectLearningAssets;
export default data;
