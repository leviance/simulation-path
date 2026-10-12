import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p46-l01": {
      focus:
        "Từ cửa sổ nền tối của starter, thêm Grid, vài ô vật liệu và drawGrid. Chưa xử lý chuyển động.",
      expected:
        "Thấy một khối cát vàng đứng trên bệ xám; resize không làm thay đổi số ô hoặc vị trí trên lưới.",
      files: ["src/main.cpp", "include/grid.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Cố định thế giới, không cố định kích thước cửa sổ",
          explanation:
            "SDL render theo lưới 96 × 64; logical presentation lo phần phóng lên màn hình. Width của Grid dùng để tính index, không lấy từ kích thước window.",
        },
        {
          title: "Lưu vật liệu trước, chọn màu sau",
          explanation:
            "Grid giữ Cell; colorFor chỉ chuyển Cell thành màu để vẽ. Đổi màu cát không được làm thay đổi thuật toán.",
        },
        {
          title: "Vẽ sau khi xóa nền",
          explanation:
            "Mỗi ô là SDL_FRect 1 × 1 trong logical coordinates. Thứ tự là clear, drawGrid, present; ở starter chưa có drawGrid.",
        },
      ],
    },
    "p46-l02": {
      focus: "Thêm mouseCell, paintDisk và paintStroke; lưu trạng thái nét vẽ qua các mouse event.",
      expected:
        "Tô được cát/tường/tẩy bằng chuột, kể cả sau resize; click vào dải letterbox không vẽ nhầm ô biên.",
      files: ["include/grid.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi tọa độ rồi mới lấy phần nguyên",
          explanation:
            "SDL_RenderCoordinatesFromWindow xử lý scale/viewport/letterbox. Chỉ floor tọa độ sau khi xác nhận điểm nằm trong miền lưới.",
        },
        {
          title: "Dùng một điều kiện hình tròn",
          explanation:
            "Một offset thuộc brush khi dx*dx+dy*dy không vượt radius*radius. Grid::set loại các điểm ngoài biên.",
        },
        {
          title: "Nối sample nhưng không nối qua ngoài lưới",
          explanation:
            "paintStroke nội suy các tâm ô. Khi mouse ra ngoài, hủy previousValid; lần vào lại bắt đầu nét mới để tránh một đường chéo ngoài ý muốn.",
        },
      ],
    },
    "p46-l03": {
      focus: "Tạo stepGrid và tryMove. Phím N gọi đúng một tick, render không được cập nhật grid.",
      expected: "Một ô cát ở (x,y) chuyển tới (x,y+1) nếu trống; sàn và biên chặn được nó.",
      files: ["include/rules.hpp", "include/grid.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn thứ tự duyệt có chủ đích",
          explanation:
            "Duyệt từ hàng cuối lên đầu để ô đích ở dưới đã qua lượt xét. Không duyệt theo thứ tự của framebuffer chỉ vì dữ liệu lưu row-major.",
        },
        {
          title: "Đổi chỗ thay vì tạo thêm một hạt",
          explanation:
            "Swap ô cát với ô trống giữ số ô cát. Việc quên xóa ô nguồn không thể xảy ra trong phép đổi chỗ này.",
        },
        {
          title: "Đánh dấu ngay khi di chuyển",
          explanation:
            "moved được xóa đầu tick; hai ô của lần swap được đánh dấu. Quy tắc này chuẩn bị cho chuyển động ngang và đổi chỗ nước ở các bài sau.",
        },
      ],
    },
    "p46-l04": {
      focus: "Thêm thứ tự down, diagonal-first, diagonal-second và thay đổi chiều quét mỗi tick.",
      expected:
        "Cát không còn chồng thành cột khi chạm bệ; nó trượt sang bên nếu một ô chéo còn trống.",
      files: ["include/rules.hpp"],
      steps: [
        {
          title: "Dừng sau phép di chuyển đầu tiên thành công",
          explanation:
            "continue kết thúc xử lý hạt hiện tại. Nếu thử cả ba đích dù đã chuyển, tọa độ nguồn có thể không còn chứa hạt đang xét.",
        },
        {
          title: "Tách thứ tự ô và thứ tự đích",
          explanation:
            "tick lẻ đảo chiều ngang; x+y+tick quyết định chéo trái hay phải được thử trước. Hai lựa chọn xử lý hai nguồn thiên lệch khác nhau.",
        },
        {
          title: "Thừa nhận giới hạn của cập nhật tại chỗ",
          explanation:
            "Ô sau nhìn thấy thay đổi của ô trước. Đây không phải double buffer; đảo chiều không biến kết quả thành độc lập thứ tự.",
        },
      ],
    },
    "p46-l05": {
      focus:
        "Cho phép Water tham gia stepGrid, thêm hai đích ngang và luật Sand đổi chỗ với Water.",
      expected:
        "Nước rơi rồi lan ngang, cát có thể chìm qua nước; số ô của từng loại giữ nguyên trong tick không có input.",
      files: ["include/rules.hpp", "include/grid.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ thứ tự ưu tiên của nước",
          explanation:
            "Water thử xuống và chéo trước; chỉ thử ngang khi cả ba đích đó bị chặn. Nhờ vậy nước không ưu tiên trôi ngang trên không.",
        },
        {
          title: "Xác định ai được đổi chỗ với ai",
          explanation:
            "Nguồn Sand, đích Water được phép. Chiều ngược lại không được phép; không suy diễn từ màu hoặc từ giá trị enum lớn hơn.",
        },
        {
          title: "Giữ cả hạt bị đẩy lên",
          explanation:
            "Swap đưa nước về ô nguồn của cát. Đánh dấu cả nguồn lẫn đích để nước bị đẩy lên không lập tức rơi lại hoặc đổi chỗ lần thứ hai.",
        },
      ],
    },
    "p46-l06": {
      focus: "Thêm planSteps và accumulator, giữ thuật toán stepGrid không nhận dt.",
      expected:
        "Đổi tốc độ render không đổi tốc độ tick ở tải bình thường; frame quá chậm bị giới hạn và có dropped time.",
      files: ["include/timing.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tích lũy giây, tiêu thụ tick",
          explanation:
            "Một tick luôn là 1/30 giây. elapsed cộng vào accumulator; số tick đến hạn là floor(total/h), phần lẻ giữ cho frame sau.",
        },
        {
          title: "Giới hạn phần việc phải bù",
          explanation:
            "Chỉ nhận tối đa 0,25 giây mỗi frame, chạy tối đa 4 tick rồi bỏ các tick đến hạn còn lại. Ghi rõ thời gian bỏ qua thay vì giấu việc mô phỏng chạy chậm.",
        },
        {
          title: "Pause không tích lũy nợ",
          explanation:
            "Pause/reset/đổi preset xóa accumulator. N luôn tạm dừng rồi tiến một tick; mất focus dừng chạy và kết thúc nét vẽ.",
        },
      ],
    },
    "p46-l07": {
      focus:
        "Thêm preset, đếm vật liệu, checksum và ca validateScene; kiểm tra những điều hình ảnh đẹp chưa chứng minh được.",
      expected:
        "V chạy 120 tick trên cảnh chuẩn riêng và báo ba điều kiện; CTest kiểm thêm các ca nhỏ, nhịp thời gian và kết quả C++/Canvas.",
      files: ["include/grid.hpp", "include/validation.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đếm đúng từng loại vật liệu",
          explanation:
            "Tổng số ô luôn bằng W*H nên chỉ kiểm tổng là chưa đủ. So sánh bốn bộ đếm trước/sau để phát hiện cát bị biến thành nước hoặc bị xóa.",
        },
        {
          title: "So sánh trạng thái, không chỉ ảnh",
          explanation:
            "Hai lần chạy phải khớp từng Cell. Checksum là dấu vết gọn để đối chiếu; nó không thay thế so sánh mảng trong unit test.",
        },
        {
          title: "Bản hoàn chỉnh vẫn đọc được",
          explanation:
            "Code thuần ở grid/rules/timing/validation, SDL ở view và main. Bài cuối hiển thị toàn bộ file từ source chuẩn cùng CMake và tests; ZIP build được riêng.",
        },
      ],
    },
  },
  references: {
    "p46-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
      {
        label: "SDL_SetRenderLogicalPresentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p46-l02": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p46-l03": [
      { label: "Cellular automaton", href: "/glossary#cellular-automaton", kind: "Thuật ngữ" },
    ],
    "p46-l04": [
      { label: "Cập nhật tại chỗ", href: "/glossary#in-place-cell-update", kind: "Thuật ngữ" },
    ],
    "p46-l05": [{ label: "Moved mask", href: "/glossary#moved-mask", kind: "Thuật ngữ" }],
    "p46-l06": [
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
    ],
    "p46-l07": [
      {
        label: "Bảo toàn vật liệu",
        href: "/glossary#cell-material-conservation",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
