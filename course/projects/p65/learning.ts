import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p65-l01": {
      focus: "Mở cửa sổ SDL3, vẽ bóng và sàn, rồi theo dõi vị trí qua từng bước 1/120 giây.",
      expected:
        "Starter có cảnh tĩnh; bản 01 có bóng tròn, N tăng một tick, Space chạy/dừng, Pause không tích thời gian.",
      files: ["include/simulation.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết một bước vật lý có đầu vào rõ ràng",
          explanation:
            "Mở `include/simulation.hpp`. `Model` giữ vị trí, vận tốc, gravity, accumulator và ticks; `paused=true` nên mở chương trình chưa tự chạy. `stepPhysics` chỉ tiến một bước h, không đọc đồng hồ hay sự kiện SDL. Bạn có thể gọi nó trong CTest mà không mở cửa sổ.",
        },
        {
          title: "Vẽ bóng bằng các hàng ngang",
          explanation:
            "Với mỗi hàng row, tính nửa chiều rộng bằng căn bậc hai của r²−row² rồi tô Rect cao 1. Tâm X giữ 320, tâm Y lấy từ model.y. Helper fill chuyển Rect sang SDL_FRect và gọi SDL_RenderFillRect; không cần asset hoặc texture bên ngoài.",
        },
        {
          title: "Đổi thời gian frame thành số bước hữu hạn",
          explanation:
            "`advance` nhận số giây đã trôi qua. Khi Pause, ta xóa accumulator và trả về ngay. Khi chạy, chỉ nhận tối đa 0.1 giây mỗi frame và làm tối đa 12 bước. Nếu máy bị đứng lâu, chương trình bỏ bớt thời gian thay vì cố chạy bù hàng nghìn bước. Ticks đếm bước vật lý, không phải số frame được vẽ.",
        },
        {
          title: "Gọi update rồi vẫn vẽ mỗi frame",
          explanation:
            "Trong `src/main.cpp`, lấy thời gian bằng SDL_GetTicksNS, đổi nanosecond thành giây, cập nhật previous rồi gọi advance. Lời gọi draw nằm ngoài phần kiểm Pause: bóng đứng lại nhưng cửa sổ vẫn được vẽ và nhận input. `view.hpp` tô hình tròn bằng các hàng ngang, dùng helper fill chuyển Rect sang SDL_FRect.",
        },
      ],
    },
    "p65-l02": {
      focus:
        "Dùng cùng một Rect để vẽ và hit-test; chừa vùng cảnh riêng, đọc tọa độ và tô trạng thái hover.",
      expected:
        "Panel có hai button; hover khớp Rect, cạnh phải/dưới loại trừ, click chưa có action.",
      files: ["include/geometry.hpp", "include/controls.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Định nghĩa phép kiểm điểm nằm trong Rect",
          explanation:
            "Mở geometry.hpp. Điều kiện kiểm cả X và Y, đồng thời loại NaN/Infinity. Đọc từng vế với ví dụ Pause: x thuộc [688,912), y thuộc [80,124). Điểm (688,80) nằm trong, còn (912,80) nằm ngoài. Không dùng khoảng cách đến tâm cho button chữ nhật.",
        },
        {
          title: "Đặt control rồi viết hit-test theo đúng Rect",
          explanation:
            "Panel bắt đầu x=664; button nằm ở x=688, rộng 224, cao 44. `hitTest` trả Control::None cho phần còn lại. Enum giúp phần điều khiển nói Pause/Reset thay vì nhớ số 0/1/2. Gravity chưa xuất hiện trong hit-test vì bài này chưa có slider.",
        },
        {
          title: "Vẽ hình và nhãn, rồi dùng hot để đổi màu",
          explanation:
            "drawButton nhận Rect và Control ID. Tô nền trước, tô lại khi hot trùng ID rồi vẽ nhãn. Trong event MOUSE_MOTION, main đưa event.motion.x/y vào hitTest và gán ui.hot. Di chuyển chuột không sửa Model. Nhãn Pause đổi thành Resume khi cảnh đang dừng, nhưng button chưa nhấn được.",
        },
      ],
    },
    "p65-l03": {
      focus:
        "Phân biệt nhấn với click hoàn tất, giữ active khi kéo ra ngoài và nối action với đồng hồ mô phỏng.",
      expected:
        "Một click hợp lệ tạo đúng một action; release ngoài/khác nút không kích hoạt, Reset giữ gravity/paused.",
      files: ["include/controls.hpp", "include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Ghi active tại thời điểm nhấn",
          explanation:
            "pointerDown lấy hot từ hitTest rồi ghi active/focus. Nếu đã có active, lần down mới không được cướp gesture. Hàm trả true cho toàn bộ panel, kể cả phần trống; bài 06 sẽ dùng kết quả này để chặn click lọt xuống cảnh. Ở bài này model chưa cần sửa khi down.",
        },
        {
          title: "Thả chuột, xóa active rồi mới thực hiện action",
          explanation:
            "Sao chép control đã nhấn, xóa active và tính hot ở vị trí thả. Sau đó mới so sánh và gọi activate. Xóa trạng thái trước action giúp Reset không để lại một nút đang bị giữ. activate chuyển Pause sang setPaused, Reset sang resetSimulation; không chứa lệnh SDL.",
        },
        {
          title: "Reset cả đồng hồ liên quan đến cảnh",
          explanation:
            "Reset không tạo Model mới vì làm vậy sẽ vô tình đưa gravity/paused về mặc định. Chỉ gán những trường cần khôi phục. clockRevision tăng để main biết frame này có action thay đổi mốc thời gian; main đặt elapsed=0 khi revision đổi, nên không dùng thời gian đo từ trước Reset/Resume.",
        },
      ],
    },
    "p65-l04": {
      focus:
        "Đổi vị trí chuột thành giá trị, clamp hai đầu và điều chỉnh gravity ngay cả khi đang Pause.",
      expected:
        "Nhấn/kéo giữa thanh cho 600, kéo ra hai đầu clamp 0/1200; nhận cả tọa độ ở lần up cuối, không reset vận tốc khi đổi gravity.",
      files: ["include/controls.hpp", "include/simulation.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Đặt một cửa vào duy nhất cho giá trị gravity",
          explanation:
            "setGravity loại giá trị không hữu hạn rồi clamp về 0..1200. Chuột, bàn phím và control HTML đều đi qua quy tắc này. Không clamp ở phần vẽ rồi để Model chứa số sai, vì vật lý sẽ đọc dữ liệu sai trước khi bạn nhìn thấy nó.",
        },
        {
          title: "Đổi X của chuột thành giá trị trên thanh",
          explanation:
            "dragGravity chỉ biết công thức mapping. Tọa độ Y dùng để quyết định có nhận lần down hay không; sau khi active=Gravity, kéo lên trên hoặc xuống dưới không làm mất gesture. knob được vẽ ở slider.x + gravity/1200 * slider.width, chính là phép đổi ngược.",
        },
        {
          title: "Cập nhật trong motion khi slider còn active",
          explanation:
            "pointerDown cập nhật ngay tại điểm nhấn. Trong pointerMove, active vẫn Gravity dù hot đổi. pointerUp nhận nốt tọa độ cuối trước khi xóa active; cancel chỉ hủy gesture, không áp thêm mẫu hoặc hoàn tác giá trị đã kéo.",
        },
        {
          title: "Đối chiếu trường hợp không có motion",
          explanation:
            "Down tại (800,252) rồi up tại (1200,252) vẫn phải cho gravity=1200. Up tại (−100,252) cho 0. Sau cancel, up đến muộn không được đổi giá trị nữa.",
        },
      ],
    },
    "p65-l05": {
      focus:
        "Thêm focus, Tab/Shift+Tab, kích hoạt nút không repeat và chỉnh slider bằng arrow/Home/End.",
      expected:
        "Tab/Shift+Tab đúng thứ tự, focus nhìn thấy; button không activation repeat, slider arrow repeat được.",
      files: ["include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dịch phím SDL sang ý nghĩa mà code thuần hiểu",
          explanation:
            "translateKey đặt ở main.cpp vì SDL_Keycode thuộc tầng SDL. controls.hpp chỉ nhận enum Key, bool shift và bool repeat nên CTest không cần SDL. Cách tách này giống việc chuyển event.button.x/y thành Point trước khi gọi hit-test.",
        },
        {
          title: "Đổi focus bằng Tab và hủy gesture còn dở",
          explanation:
            "Xử lý Escape và Tab trước action khác. Tab không lặp; khi chuyển focus, ta hủy active để việc đang giữ slider không đi kèm việc gõ nút khác. Các nhánh viết rõ thứ tự ba control, không ép người mới suy luận từ công thức modulo hoặc số enum.",
        },
        {
          title: "Tách repeat của button khỏi repeat của slider",
          explanation:
            "Nếu còn active, phím khác không chen vào gesture. Với Enter/Space, chỉ activate khi repeat=false. Với arrow, không chặn repeat, nhưng vẫn đi qua setGravity để clamp. Home/End chọn hai đầu. Khi hàm trả true, main biết UI đã dùng sự kiện và không gửi nó tiếp cho cảnh.",
        },
      ],
    },
    "p65-l06": {
      focus:
        "Đưa sự kiện về hệ tọa độ logic, cho UI nhận trước cảnh và hủy thao tác khi vòng đời cửa sổ thay đổi.",
      expected:
        "Resize giữ hit-test đúng; panel không lọt click, scenePresses chỉ tăng khi click cảnh; blur/cancel dừng gesture.",
      files: ["include/geometry.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Hiểu phép đổi tọa độ trước khi dùng API",
          explanation:
            "Hàm trả optional khi viewport không hợp lệ, ví dụ chiều cao 0 lúc minimize. Offset giải thích vì sao chỉ chia chuột cho scale chưa đủ. Với viewport960×720, content lệch xuống90; điểm window(800,180) phải về logical(800,90), nằm trên Pause.",
        },
        {
          title: "Chỉ cho cảnh xử lý khi UI chưa nhận input",
          explanation:
            "pointerDown trả true cho panel, không chỉ button. Main gọi nó trước; chỉ khi consumed=false mới gọi scenePointerDown. Hàm cảnh còn kiểm scene riêng, nên click dải letterbox hoặc khoảng giữa panel/cảnh không làm gì. X bóng giữ320; click chỉ thay Y, đưa v/accumulator về 0 và tăng scenePresses để dễ quan sát.",
        },
        {
          title: "Hủy gesture và tạm dừng khi cửa sổ đổi vòng đời",
          explanation:
            "suspend không giả lập pointerUp, vì pointerUp có thể kích hoạt button. Nó xóa active/hot, Pause vật lý và bỏ accumulator; focus được giữ để người dùng biết control trước đó. Main gọi nó khi focus lost, minimized, hidden hoặc resized, rồi release capture. Khi quay lại, người dùng tự Resume.",
        },
      ],
    },
    "p65-l07": {
      focus:
        "Kiểm chuỗi thao tác thay vì chỉ nhìn ảnh, đối chiếu vật lý bằng công thức và nghiệm thu Debug/Release có timeout.",
      expected:
        "Debug/Release CTest cùng kiểm y151/v240, input traces và bounds; F1 audit chỉ đọc, smoke có timeout.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm audit không tự sửa dữ liệu",
          explanation:
            "audit.hpp tách finite, bounds, clock và controls. Khi phát hiện gravity=-1, hàm trả false và giữ nguyên dữ liệu sai để test báo được nguyên nhân. Không clamp ngầm trong audit. F1 chỉ log kết quả, không thay thế CTest và không có nghĩa capture thực tế đã được kiểm.",
        },
        {
          title: "Đối chiếu đồng hồ và free-flight bằng công thức độc lập",
          explanation:
            "testClock chạy 60 bước, tính expectedY bằng tổng cấp số cộng và so sai số 1e-8. Một Model khác nhận 15 frame, mỗi frame 4h: cùng số fixed step phải cho cùng y/v. Test còn kiểm frame rất dài chỉ làm 12 bước, NaN không tiến, Pause bỏ thời gian chờ và Reset giữ lựa chọn. Check không dùng assert để Release vẫn kiểm thật.",
        },
        {
          title: "Kiểm chuỗi input trên chính các hàm production",
          explanation:
            "testPointer gọi down/move/up theo thứ tự, không gọi activate trực tiếp để giả vờ đã kiểm button. Nó thử release mồ côi, thả khác nút, thả ngoài, đi ra rồi quay lại, slider clamp và blur. testGeometry kiểm biên và letterbox; testKeyboard kiểm thứ tự focus/repeat. Stress 12000 frame là hữu hạn, không benchmark vô hạn.",
        },
      ],
    },
  },
  references: {
    "p65-l01": [
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l02": [
      {
        label: "SDL_RenderDebugText",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderDebugText",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderRect",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l03": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l04": [
      {
        label: "SDL_Event",
        href: "https://wiki.libsdl.org/SDL3/SDL_Event",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l05": [
      {
        label: "SDL_KeyboardEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_KeyboardEvent",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l06": [
      {
        label: "SDL_SetRenderLogicalPresentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "Input và hệ tọa độ logic",
        href: "/glossary#ui-logical-space",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l07": [
      {
        label: "SDL_RenderPresent",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderPresent",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
