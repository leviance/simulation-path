import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p47-l01": {
      focus: "Lưu nhiệt độ bằng số thực, tạo một vùng nóng và vẽ lưới bằng SDL3.",
      expected:
        "Thấy tấm 64 × 48 ô với vùng vàng 8 × 8 ở giữa; resize chỉ đổi kích thước hiển thị.",
      files: ["src/main.cpp", "include/field.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chạy cửa sổ nền tối",
          explanation:
            "Starter đã lo SDL và logical presentation 64 × 48. Xác nhận mở, resize và đóng được trước khi thêm field.",
        },
        {
          title: "Tách số đo khỏi màu",
          explanation:
            "Field giữ double theta; colorFor chỉ đổi giá trị sang màu. Giữ thang 0–1 cố định để nhìn ra vùng nóng đang nguội.",
        },
        {
          title: "Vẽ từng ô",
          explanation:
            "drawField gọi SDL_RenderFillRect cho từng ô logical 1 × 1, sau clear và trước present.",
        },
      ],
    },
    "p47-l02": {
      focus: "Đổi tọa độ input, tô brush tròn và nối các sample thành nét liền.",
      expected: "Vẽ được nét nóng/lạnh liền mạch và không lệch sau resize; tấm chưa tự lan nhiệt.",
      files: ["include/field.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi hệ tọa độ đúng chỗ",
          explanation:
            "mouseCell dùng SDL_RenderCoordinatesFromWindow rồi kiểm bounds, không kéo điểm ngoài letterbox vào mép lưới.",
        },
        {
          title: "Đặt giá trị tại ô",
          explanation:
            "paintDisk ghi theta bằng 0 hoặc 1. Đây là dấu bút, chưa phải một nguồn phát nhiệt có công suất.",
        },
        {
          title: "Nối các dấu bút",
          explanation:
            "paintStroke nội suy tâm brush; mất focus hoặc ra khỏi lưới phải hủy điểm nối trước.",
        },
      ],
    },
    "p47-l03": {
      focus: "Từ chênh lệch hai bên, suy ra sai phân bậc hai và cập nhật một hàng.",
      expected: "Một xung nhiệt cho tâm 0.6 và hai bên 0.2 sau một bước; hàng trên/dưới vẫn lạnh.",
      files: ["include/diffusion.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tính trao đổi ở hai phía",
          explanation:
            "horizontal = left - 2*center + right. Một ô nhận nhiệt từ phía nóng hơn và mất nhiệt sang phía lạnh hơn.",
        },
        {
          title: "Đọc cũ, ghi mới",
          explanation:
            "Mỗi ô đọc current và ghi next. Chỉ swap hai vector sau khi tính xong toàn bộ lưới.",
        },
        {
          title: "Tiến từng bước",
          explanation:
            "N gọi diffuse đúng một lần; ở bài này ry bằng 0, các hàng chưa truyền nhiệt cho nhau.",
        },
      ],
    },
    "p47-l04": {
      focus: "Thêm hai hàng trên/dưới và phân biệt diffusion với chuyển vật liệu.",
      expected:
        "Xung nhiệt lan thành dấu cộng: tâm và bốn ô cạnh cùng bằng 0.2, ô chéo bằng 0 sau bước đầu.",
      files: ["include/diffusion.hpp"],
      steps: [
        {
          title: "Thêm hướng còn thiếu",
          explanation:
            "vertical = up - 2*center + down, với hệ số ry riêng. Không lấy trung bình cả tám hàng xóm.",
        },
        {
          title: "Kiểm một xung nhiệt",
          explanation:
            "Với rx=ry=0.2, một ô 1 trong nền 0 trở thành 0.2; bốn hàng xóm cũng bằng 0.2.",
        },
        {
          title: "Giữ nguyên double buffer",
          explanation:
            "Không đổi thành cập nhật tại chỗ như hộp cát. Thứ tự vòng lặp không được làm đổi nghiệm một bước.",
        },
      ],
    },
    "p47-l05": {
      focus: "So sánh biên cách nhiệt với vành ô bị giữ lạnh, cả khi người dùng tô lên mép.",
      expected:
        "Biên cách nhiệt giữ trường đồng đều; biên lạnh luôn giữ vành ngoài ở 0, kể cả khi tô lên mép.",
      files: ["include/diffusion.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Bịt dòng nhiệt qua mặt ngoài",
          explanation:
            "Ở biên cách nhiệt, ghost cell lấy giá trị ô sát biên; chênh lệch qua mặt ngoài bằng 0.",
        },
        {
          title: "Giữ vành ô ở nhiệt độ môi trường",
          explanation:
            "Cold ép vành ngoài về 0 khi đổi chế độ, sau input và trong solver. Nhiệt được rút ra khỏi miền.",
        },
        {
          title: "Đọc phép đo đúng điều kiện",
          explanation:
            "Không yêu cầu bảo toàn tổng theta với biên lạnh. Chuyển biên hoặc tô bút cũng có thể đổi tổng tức thời.",
        },
      ],
    },
    "p47-l06": {
      focus: "Suy ra rx+ry ≤ 1/2, từ chối cấu hình sai và tách solver khỏi FPS.",
      expected:
        "Chạy liên tục được ở tham số chuẩn; alpha=12, dt=1/30 bị từ chối, giảm dt về 1/60 chạy lại được.",
      files: ["include/timing.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nhìn các trọng số",
          explanation:
            "Trọng số của ô giữa là 1-2rx-2ry. Khi nó âm, không còn lập luận trung bình có trọng số để giữ min/max.",
        },
        {
          title: "Không chữa sai số bằng màu",
          explanation:
            "alpha=12 và dt=1/30 bị từ chối; dt=1/60 khôi phục ổn định. Không clamp current để giả vờ solver đúng.",
        },
        {
          title: "Giới hạn công việc mỗi frame",
          explanation:
            "Accumulator dùng dt của solver, tối đa tám bước/frame và nhận tối đa 0,25 giây. Báo dropped time khi bỏ bước.",
        },
      ],
    },
    "p47-l07": {
      focus: "Thêm inspector, min/max, trung bình và tổng nhiệt độ dư.",
      expected:
        "Đọc được một ô cùng min/max/mean/sum; thấy max giảm trong khi tổng gần như giữ nguyên ở tấm cách nhiệt.",
      files: ["include/diagnostics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn ô để đối chiếu",
          explanation:
            "Mũi tên chọn tọa độ; I in nhiệt độ thật ra terminal. Canvas còn hiển thị bốn hàng xóm.",
        },
        {
          title: "Phân biệt cực đại và tổng",
          explanation:
            "Cực đại hạ dần không đồng nghĩa tấm mất nhiệt: tổng có thể giữ nguyên trong khi phân bố phẳng hơn.",
        },
        {
          title: "Ghi rõ đơn vị",
          explanation:
            "Sum(theta) tỉ lệ với nhiệt lượng nếu kích thước ô, bề dày và nhiệt dung cố định; không ghi nhãn Joule khi chưa có các hệ số đó.",
        },
      ],
    },
    "p47-l08": {
      focus: "Cảnh mẫu, ca kiểm chứng hữu hạn, nghiệm tham chiếu rời rạc và CTest Debug/Release.",
      expected:
        "Bốn preset hoạt động, V báo từng điều kiện và CTest Debug/Release đạt trên các ca có đáp án độc lập.",
      files: ["include/field.hpp", "include/diagnostics.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chọn cảnh có đáp án",
          explanation:
            "Trường đồng đều phải đứng yên với biên cách nhiệt. Xung nhiệt có đáp án chính xác sau một bước.",
        },
        {
          title: "Kiểm độc lập với hình ảnh",
          explanation:
            "So sánh cosine mode với hệ số suy giảm rời rạc; kiểm bảo toàn tổng, min/max và biên lạnh riêng biệt.",
        },
        {
          title: "Bàn giao chương trình chạy được",
          explanation:
            "ZIP có starter, tám checkpoint, final và tests. V chỉ kiểm một bản field riêng rồi trả quyền điều khiển.",
        },
      ],
    },
  },
  references: {
    "p47-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
    ],
    "p47-l02": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p47-l03": [
      {
        label: "Laplacian rời rạc",
        href: "/glossary#heat-laplacian",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l04": [
      {
        label: "Double buffer",
        href: "/glossary#heat-double-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l05": [
      {
        label: "Điều kiện biên nhiệt",
        href: "/glossary#heat-boundary",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l06": [
      {
        label: "Điều kiện ổn định khuếch tán",
        href: "/glossary#heat-stability",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l07": [
      {
        label: "Nhiệt độ dư chuẩn hóa",
        href: "/glossary#normalized-temperature",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l08": [
      {
        label: "Laplacian rời rạc",
        href: "/glossary#heat-laplacian",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
