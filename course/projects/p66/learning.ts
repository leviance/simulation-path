import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p66-l01": {
      focus:
        "Chạy cảnh bóng rơi trước, rồi tạo Panel, Label và Button bằng dữ liệu; parent sở hữu child và cây được dựng ngoài vòng lặp.",
      expected:
        "Có Panel, Label và một Button chưa nhận click; frames tăng còn builds và ID không đổi.",
      files: ["include/tree.hpp", "include/scene.hpp", "include/app.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Mở starter và nhận ra phần đã có",
          explanation:
            "Starter đã có window, renderer, bóng, sàn và Space/N/R của Project 65. Hãy chạy nó trước. Mã hình học và vật lý được giữ làm nền; phần còn thiếu là đối tượng biểu diễn UI.",
        },
        {
          title: "Cho mỗi widget một kiểu, ID và Rect",
          explanation:
            "Widget giữ dữ liệu, không giữ SDL_Renderer. Rect local đo từ góc parent; children là vector unique_ptr để ownership hiện rõ. ID 0 dành cho trạng thái không chọn widget nào.",
        },
        {
          title: "Tạo cây một lần trong App",
          explanation:
            "buildTree nằm ở khởi tạo App, trước vòng while. draw chỉ nhận cây để đọc; Reset cảnh chỉ sửa Model. Theo dõi builds=1 trong khi số frame tăng.",
        },
      ],
    },
    "p66-l02": {
      focus:
        "Đưa hai button vào Panel con; dùng một phép duyệt để tính tọa độ world và vẽ từ parent tới child.",
      expected:
        "Group có Pause/Reset; dịch root 16 đơn vị làm mọi descendant dịch 16, builds vẫn bằng 1.",
      files: ["include/traversal.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Tính vị trí từ góc của parent",
          explanation:
            "World X/Y của một node bằng góc world của parent cộng Rect local của node. Width/height giữ nguyên vì project chưa có scale theo node.",
        },
        {
          title: "Duyệt parent trước rồi đến các child",
          explanation:
            "visit nhận node, origin, clip và callback draw. Sau khi đặt node, truyền góc world vừa tính cho lời gọi trên từng child; đây là depth-first traversal, không phải layout tự động.",
        },
        {
          title: "Dịch cả Panel bằng cách sửa root",
          explanation:
            "movePanel chỉ đổi hai trường của root. Các Rect local của con không đổi, nhưng vị trí vẽ của chúng đổi theo. So Inspector trước và sau khi dịch 16 pixel.",
        },
      ],
    },
    "p66-l03": {
      focus:
        "Tính giao của các Rect tổ tiên và áp clip cho từng node; cùng một phép giao sẽ được dùng lại khi hit-test.",
      expected:
        "Preset cắt Panel giữ bounds của Reset là 224×44 nhưng clip chỉ cao 36; clip không làm mất node.",
      files: ["include/geometry.hpp", "include/traversal.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Tìm phần giao của hai hình chữ nhật",
          explanation:
            "Mép trái/trên lấy max, phải/dưới lấy min. Nếu không giao, width hoặc height bằng 0. Không sửa Rect local để ép child vào parent.",
        },
        {
          title: "Mang clip của tổ tiên xuống từng nhánh",
          explanation:
            "place giao bounds của node với clip đang có. visit truyền kết quả đó xuống child. Node nằm hoàn toàn ngoài clip không được đưa vào paintList, dù find vẫn tìm thấy nó trong cây.",
        },
        {
          title: "Áp clip vào SDL rồi trả renderer về trạng thái chung",
          explanation:
            "drawWidget đặt clip theo tọa độ logic và draw tắt clip trước HUD. Canvas dùng save/clip/restore. Chọn preset cắt Panel để thấy Reset chỉ còn phần nằm trong khung.",
        },
      ],
    },
    "p66-l04": {
      focus:
        "Dùng cùng bounds/clip với phép vẽ, nhưng duyệt child theo thứ tự ngược để trả về một WidgetId.",
      expected:
        "Ở preset chồng nhau, điểm (700,90) trả ID của Reset on top; hover chưa thay đổi Model.",
      files: ["include/traversal.hpp", "include/events.hpp"],
      steps: [
        {
          title: "Loại điểm ngoài viewport hoặc clip",
          explanation:
            "Point phải nằm trong cả bounds và clip với quy ước half-open. Một phần button bị cắt không được nhận chuột ở vùng đã biến mất.",
        },
        {
          title: "Tìm từ child cuối về child đầu",
          explanation:
            "Parent được vẽ trước, child được thêm sau vẽ sau. Vì vậy picking tìm từ rbegin tới rend và dừng ở hit đầu tiên; không lấy node đầu trong danh sách vẽ.",
        },
        {
          title: "Quy định ai nhận input",
          explanation:
            "Label chỉ hiển thị nên không nhận input. Panel nhận cả vùng trống, còn Button/Slider trả ID để bước sau quyết định action. Control disable vẫn chắn click nhưng không kích hoạt.",
        },
      ],
    },
    "p66-l05": {
      focus:
        "Giữ hot/active/focus bằng ID, nối action với Model và ánh xạ slider bằng tọa độ world của chính node đó.",
      expected:
        "Pause/Reset dùng chung dispatcher; slider vẫn đúng sau khi dịch Panel, release cuối cùng được áp dụng.",
      files: ["include/input.hpp", "include/scene.hpp", "include/events.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Tra ID trong phạm vi một sự kiện",
          explanation:
            "Ui chỉ lưu ID. Khi down, locate trả view hiện tại; khi up, tra lại trước khi dùng. WidgetView không được cất qua frame hoặc qua thao tác xóa cây.",
        },
        {
          title: "Chốt click sau khi thả đúng nút",
          explanation:
            "pointerUp nhận tọa độ cuối, cập nhật slider nếu đang kéo, xóa active rồi mới xét action. Release mồ côi, release trên nút khác và cancel không tạo action.",
        },
        {
          title: "Đổi X world thành trọng lực",
          explanation:
            "drag dùng bounds.x và bounds.width của Slider sau khi cộng mọi parent, không dùng hằng x=688. Giá trị được clamp; dịch Panel không làm slider đọc nhầm tọa độ.",
        },
      ],
    },
    "p66-l06": {
      focus:
        "Sinh focus order từ các node đang hiển thị, giữ hover độc lập và chặn key repeat cho action của Button.",
      expected:
        "Tab theo Pause→Reset→Slider; hover không đổi focus; giữ Enter không toggle liên tục, arrow vẫn repeat.",
      files: [
        "include/keyboard.hpp",
        "include/traversal.hpp",
        "include/events.hpp",
        "include/view.hpp",
      ],
      steps: [
        {
          title: "Lấy danh sách node có thể nhận focus",
          explanation:
            "focusOrder đọc paintList theo preorder và chỉ giữ Button/Slider có enabled kế thừa. Label và Panel không nằm trong thứ tự Tab.",
        },
        {
          title: "Đi tới hoặc lùi một ID",
          explanation:
            "Tìm vị trí của focus hiện tại, cộng hoặc trừ 1 rồi xử lý hai đầu. Native đi vòng; Canvas trả Tab ra ngoài ở hai đầu để không nhốt người học.",
        },
        {
          title: "Tách phím action khỏi phím chỉnh giá trị",
          explanation:
            "Enter/Space chỉ activate khi không repeat. Arrow/Home/End chỉ chỉnh Slider đang focus; Shift+arrow dịch Panel và không được đồng thời sửa gravity.",
        },
      ],
    },
    "p66-l07": {
      focus:
        "Phân biệt ownership với visibility, dọn active/focus khi nhánh đổi và không dùng lại ID trong cùng phiên cây.",
      expected:
        "Ẩn rồi hiện giữ ID; xóa Group loại cả button/slider, release cũ không tạo action; Label mới không mượn ID đã xóa.",
      files: [
        "include/mutation.hpp",
        "include/tree.hpp",
        "include/input.hpp",
        "include/events.hpp",
      ],
      steps: [
        {
          title: "Ẩn khác với hủy đối tượng",
          explanation:
            "setVisible không xóa children. find vẫn tìm thấy node, nhưng locate và focusOrder không còn đưa nhánh ẩn vào UI. Enabled cũng được kế thừa từ parent.",
        },
        {
          title: "Xóa từ owner của nhánh",
          explanation:
            "removeSubtree xóa unique_ptr trong children của parent. Các descendant bị hủy cùng nhánh. Không giữ iterator/reference rồi tiếp tục dùng sau erase; root không được xóa.",
        },
        {
          title: "Đối chiếu Ui sau mutation",
          explanation:
            "reconcile loại active/focus không còn tương tác được và hot không còn view. Host nhả capture khi active về 0. add dùng nextId tăng dần; dựng lại toàn cây mở phiên ID mới và phải xóa Ui.",
        },
      ],
    },
    "p66-l08": {
      focus:
        "Kiểm tọa độ, thứ tự vẽ/chọn, clipping, lifetime và giới hạn công việc bằng fixture độc lập ở Debug lẫn Release.",
      expected:
        "Các test hình học, ID, mutation, input và retained state qua Debug/Release; ZIP và mã cuối bài khớp nguồn chuẩn.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm cấu trúc trước khi kiểm hành vi",
          explanation:
            "checkNode đếm node, ID duy nhất, depth, Rect và loại parent; audit so count với Tree rồi kiểm ID trong Ui. Đây chỉ là kiểm state hiện tại, không thay test chuỗi input.",
        },
        {
          title: "Viết đáp án tọa độ và transition độc lập",
          explanation:
            "Fixture tính Pause tại (688,80) bằng các phép cộng cụ thể, không gọi place để tạo expected. Test thay thứ tự child và xóa nhánh trong lúc active, rồi kiểm Model có đổi hay không.",
        },
        {
          title: "Build và chạy trong giới hạn hữu hạn",
          explanation:
            "Build starter, tám checkpoint và final với hai compiler; CTest không cần window, dùng check/EXIT_FAILURE thay assert. Smoke chỉ vẽ một frame ẩn và luôn có watchdog bên ngoài.",
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
