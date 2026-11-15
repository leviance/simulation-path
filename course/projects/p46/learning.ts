import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p46-l01": {
      focus:
        "Giữ khung SDL/RAII của starter; tự thêm Cell, Grid và đường gọi drawGrid. Chưa có chuyển động.",
      expected: "Thấy cát vàng và bệ xám trên lưới 96×64; resize không đổi dữ liệu.",
      files: [
        "src/main.cpp",
        "include/grid.hpp",
        "include/view.hpp",
        "include/layout.hpp",
        "include/sdl_resources.hpp",
      ],
      steps: [
        {
          title: "Biết phần nào đã được cung cấp",
          explanation:
            "SdlResources lo cleanup; main mở window/renderer và clear/present. Đó là nền chạy được, không phải thuật toán hộp cát đã viết hộ.",
        },
        {
          title: "Lưu vật liệu, không lưu màu",
          explanation:
            "Cell trong vector xác định vật liệu. index=y*width+x; màu được chọn ở đường vẽ và không quyết định luật.",
        },
        {
          title: "Nối dữ liệu tới màn hình",
          explanation:
            "Gọi drawGrid sau clear, trước present; logical presentation giữ cùng lưới khi window đổi kích thước.",
        },
      ],
    },
    "p46-l02": {
      focus:
        "Thêm brush tròn và nội suy, rồi nối mouse event với chúng qua vị trí ô đã đổi tọa độ.",
      expected:
        "Vẽ/tẩy liên tục bằng chuột hoặc Enter; không có nét chéo khi rời lưới rồi vào lại.",
      files: [
        "include/grid.hpp",
        "include/layout.hpp",
        "include/input.hpp",
        "include/workshop.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đổi tọa độ trước khi chọn ô",
          explanation:
            "SDL_RenderCoordinatesFromWindow bỏ scale/letterbox. logicalCell chỉ nhận điểm trong viewport; không clamp dải đen thành ô biên.",
        },
        {
          title: "Một nét gồm nhiều lần chấm",
          explanation:
            "paintDisk xét dx²+dy²≤r². paintStroke nối các tâm đủ gần để sample chuột thưa không làm đứt nét.",
        },
        {
          title: "Kết thúc nét là một phần của input",
          explanation:
            "Mouse up, mất focus hoặc ra ngoài đều xóa trạng thái nối; phím Enter dùng cùng thao tác stamp thay vì viết brush thứ hai.",
        },
      ],
    },
    "p46-l03": {
      focus:
        "Tạo tryMove, stepGrid và singleStep; phím N tiến một tick, còn render chỉ đọc dữ liệu.",
      expected:
        "Cát xuống đúng một hàng/tick; hai ô cát cùng cột có thể nối tiếp vào chỗ vừa trống.",
      files: ["include/rules.hpp", "include/grid.hpp", "include/workshop.hpp", "include/input.hpp"],
      steps: [
        {
          title: "Duyệt từ phía hạt sắp rơi tới",
          explanation:
            "Hàng dưới được xét trước. Đổi chỗ với Empty giữ số hạt, thay vì tạo bản sao rồi quên xóa nguồn.",
        },
        {
          title: "Đánh dấu hạt, không giữ chỗ trống",
          explanation:
            "Mask theo tọa độ được cập nhật ở hai đầu swap, nhưng cờ đích Empty không chặn hạt khác. Nhờ đó một vacancy có thể truyền lên trong tick.",
        },
        {
          title: "Chạy một bước ở nơi duy nhất",
          explanation:
            "Workshop::singleStep gọi stepGrid và tăng tick. main/event không tự viết một vòng cập nhật khác.",
        },
      ],
    },
    "p46-l04": {
      focus: "Thêm hai đích chéo sau down; tách thứ tự xét ô khỏi hướng đích ưu tiên.",
      expected: "Cát chạm bệ rồi trượt thành đống, thay vì tạo một cột đứng vô hạn.",
      files: ["include/rules.hpp"],
      steps: [
        {
          title: "Dừng khi một đích đã nhận hạt",
          explanation:
            "tryMove thành công thì continue. Những phép thử sau không còn được dùng tọa độ nguồn cũ để di chuyển một hạt khác.",
        },
        {
          title: "Hai nguồn thiên lệch khác nhau",
          explanation:
            "Tick lẻ đảo chiều ngang của vòng quét; parity x+y+tick đổi chéo trái/phải được thử trước. Đây không phải RNG.",
        },
        {
          title: "Thừa nhận ảnh hưởng của thứ tự",
          explanation:
            "Cập nhật tại chỗ cho ô sau thấy kết quả của ô trước. Đảo chiều giảm một số lệch hướng nhưng không biến nó thành cập nhật đồng bộ.",
        },
      ],
    },
    "p46-l05": {
      focus: "Cho Water đi xuống/chéo/ngang và cho Sand đổi chỗ với Water chưa di chuyển.",
      expected:
        "Nước lan trong bể, cát đi qua nước; từng loại vật liệu giữ nguyên số lượng khi không vẽ/tẩy.",
      files: ["include/rules.hpp", "include/grid.hpp", "include/input.hpp"],
      steps: [
        {
          title: "Chỉ lan ngang khi không rơi được",
          explanation:
            "Nước thử xuống và hai chéo trước; hai ô ngang là phương án sau cùng, không phải ưu tiên trôi trên không.",
        },
        {
          title: "Viết rõ cặp vật liệu được phép đổi",
          explanation:
            "Sand→Water được phép, Water→Sand không được. Không suy luật từ thứ tự enum hoặc độ sáng của màu.",
        },
        {
          title: "Giữ hạt nước bị đẩy lên",
          explanation:
            "Water về ô nguồn của Sand sau swap. Cờ nguồn và đích ngăn cả hai hạt đi tiếp trong tick, kể cả khi ô nguồn còn sắp được duyệt.",
        },
      ],
    },
    "p46-l06": {
      focus:
        "Thêm planSteps/advance vào vòng frame, giữ luật ô không nhận dt và mở điều khiển speed.",
      expected:
        "15/30/120 FPS cho cùng số tick ở tải bình thường; stall bị chặn và có dropped model seconds.",
      files: ["include/timing.hpp", "include/workshop.hpp", "src/main.cpp", "include/input.hpp"],
      steps: [
        {
          title: "Tích lũy giây mô hình",
          explanation:
            "Chấp nhận tối đa 0,25 giây wall time rồi nhân speed; mỗi tick tiêu thụ 1/30 giây mô hình. Phần lẻ được giữ lại.",
        },
        {
          title: "Không bù vô hạn",
          explanation:
            "Chạy nhiều nhất bốn tick/frame, bỏ các tick đến hạn còn lại và cộng vào dropped. Khi chạm budget, mô phỏng không còn theo kịp wall time.",
        },
        {
          title: "Pause phải xóa nợ thời gian",
          explanation:
            "Pause/reset/mất focus xóa accumulator và kết thúc nét. Single-step luôn dừng trước rồi tiến đúng một tick.",
        },
      ],
    },
    "p46-l07": {
      focus:
        "Giữ nguyên luật nhưng nâng lưới lên 512×320; chuyển presentation sang một streaming texture.",
      expected:
        "Toàn bộ 163.840 ô được xử lý/vẽ; ảnh vẫn đúng khi pitch có padding hoặc đổi màu phẳng.",
      files: ["include/pixels.hpp", "include/view.hpp", "include/presets.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đừng gọi mỗi ô một draw call",
          explanation:
            "encodePixels chuyển Cell thành bốn byte RGBA. Vòng ghi hàng dùng pitch trả bởi SDL_LockTexture, không giả định width*4.",
        },
        {
          title: "Tôn trọng hợp đồng lock",
          explanation:
            "SDL_PIXELFORMAT_RGBA32 cho layout byte R/G/B/A; texture streaming được ghi đầy đủ rồi unlock trước khi SDL_RenderTexture.",
        },
        {
          title: "Đọc số đo theo đúng phạm vi",
          explanation:
            "Tách update, encode/upload CPU và draw submission. CPU trả khỏi lời gọi render chưa có nghĩa GPU đã làm xong.",
        },
      ],
    },
    "p46-l08": {
      focus:
        "Hoàn thiện sandbox bằng commands dùng chung, năm preset, seed, order và hold-to-pour theo tick.",
      expected:
        "Chuột/phím cho cùng kết quả; clear không quên preset, reset tái tạo đúng cảnh và về pause.",
      files: [
        "include/commands.hpp",
        "include/input.hpp",
        "include/panel.hpp",
        "include/presets.hpp",
        "include/workshop.hpp",
      ],
      steps: [
        {
          title: "Một lệnh, nhiều cách gọi",
          explanation:
            "Button và hotkey đều gọi commands. Không để phím R và nút Reset khôi phục hai loại trạng thái khác nhau.",
        },
        {
          title: "Seed không phải nguồn chuyển động",
          explanation:
            "LCG chỉ xếp vật liệu của Mixture. Những tick sau dùng luật xác định; ghi seed/order để người khác dựng lại input.",
        },
        {
          title: "Giữ cảnh hợp lệ khi thay cấu hình",
          explanation:
            "Tạo grid ứng viên trước rồi mới thay dữ liệu/config. Nếu thông số sai hoặc cấp phát lỗi, cảnh cũ vẫn còn.",
        },
      ],
    },
    "p46-l09": {
      focus:
        "Đối chiếu luật với ca biết trước và oracle ID, chạy CTest/benchmark hữu hạn, mở toàn bộ mã hoàn chỉnh.",
      expected:
        "Biết kết quả nào đã chứng minh, đo phần nào và cách kiểm code tự viết thay vì vô tình test final mẫu.",
      files: [
        "include/validation.hpp",
        "include/benchmark.hpp",
        "include/options.hpp",
        "tests/tests.cpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Dùng reference không gọi lại thuật toán",
          explanation:
            "Oracle gán ID cho hạt và nhớ ID đã đi, không dùng moved mask/tryMove của production. Kiểm từng ô qua nhiều tick và bốn order.",
        },
        {
          title: "Kiểm code đang sửa",
          explanation:
            "CTest mặc định đọc final mẫu. Khi hoàn thiện starter, thêm target tests trỏ starter/include như bài hướng dẫn, rồi chủ động làm sai luật để thấy test thất bại.",
        },
        {
          title: "Đo ngắn, công bố đủ điều kiện",
          explanation:
            "Benchmark CPU dùng Mixture/seed/order/steps cố định, warm-up 32 tick và raw samples; giới hạn 500 triệu cell visits và deadline 30 giây.",
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
        label: "SDL_LockTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p46-l08": [
      { label: "Cập nhật tại chỗ", href: "/glossary#in-place-cell-update", kind: "Thuật ngữ" },
    ],
    "p46-l09": [
      {
        label: "Bảo toàn vật liệu",
        href: "/glossary#cell-material-conservation",
        kind: "Thuật ngữ",
      },
      { label: "SDL3 với CMake", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
