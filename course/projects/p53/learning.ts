import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p53-l01": {
      focus: "Tự tính scalar của một mặt XY rồi đưa RGBA qua streaming texture SDL3.",
      expected: "Mở cửa sổ rồi vẽ lát cắt đầu tiên",
      files: [
        "include/platform.hpp",
        "include/field.hpp",
        "include/slice.hpp",
        "include/display.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy shell trước",
          explanation: "Platform kiểm từng tài nguyên SDL; destructor dọn cả khi khởi tạo dở dang.",
        },
        {
          title: "Tính một lát sphere",
          explanation:
            "Mỗi pixel thành một điểm world trên XY; z cố định, x/y đi theo cột/hàng ảnh.",
        },
        {
          title: "Đưa ảnh ra cửa sổ",
          explanation:
            "colorImage tạo RGBA; upload tôn trọng pitch và drawUi trình bày texture trong vòng lặp.",
        },
      ],
    },
    "p53-l02": {
      focus: "Tạo mảng Float32 3D, định nghĩa tâm mẫu và điền năm dataset tổng hợp.",
      expected: "Lưu cả khối thay vì tính riêng từng ảnh",
      files: ["include/grid.hpp", "include/volume.hpp", "include/field.hpp", "include/state.hpp"],
      steps: [
        {
          title: "Đặt quy ước world",
          explanation:
            "Origin ở mặt dưới, tâm voxel cộng nửa spacing; kích thước world không phụ thuộc N.",
        },
        {
          title: "Đếm và cấp phát an toàn",
          explanation: "Kiểm ba kích thước trước khi nhân; x là chỉ số thay đổi nhanh nhất.",
        },
        {
          title: "Tạo dataset thật",
          explanation: "buildVolume điền mọi voxel; load chuẩn bị thành công rồi mới thay state.",
        },
      ],
    },
    "p53-l03": {
      focus: "Dùng một bảng trục cho XY/XZ/YZ và giữ aspect của ảnh theo mm.",
      expected: "Nhìn một điểm từ ba hướng",
      files: ["include/sampling.hpp", "include/slice.hpp", "include/layout.hpp", "include/ui.hpp"],
      steps: [
        {
          title: "Đọc từ volume",
          explanation:
            "Nearest đổi world về chỉ số, kiểm outside trước khi kẹp trong vùng nửa voxel biên.",
        },
        {
          title: "Dựng ba ảnh",
          explanation:
            "axesFor chỉ rõ trục ngang, dọc và giữ cố định; row ảnh đi ngược chiều world dọc.",
        },
        {
          title: "Giữ đúng tỉ lệ",
          explanation:
            "sliceRect fit physical extent vào panel; vòng tròn không bị méo thành ellipse vì spacing.",
        },
      ],
    },
    "p53-l04": {
      focus: "Tính tám đóng góp ở một điểm và hiểu rõ chính sách tại biên.",
      expected: "Đi giữa các tâm voxel bằng trilinear",
      files: ["include/sampling.hpp", "include/ui.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đọc nearest trước",
          explanation: "Tại tâm phải đúng giá trị đã lưu; tie chọn chỉ số lớn hơn.",
        },
        {
          title: "Tính tám trọng số",
          explanation:
            "Phần lẻ của q quyết định tích ba trọng số; các trường hợp singleton/biên có trọng số zero hợp lệ.",
        },
        {
          title: "Kiểm một đáp số biết trước",
          explanation:
            "Fixture x+10y+100z cho đáp số 50.5 tại (1,0,3); bảng inspector cộng đúng tám đóng góp.",
        },
      ],
    },
    "p53-l05": {
      focus: "Tách scalar khỏi window/level, palette và histogram.",
      expected: "Làm rõ chi tiết mà không sửa dữ liệu",
      files: ["include/display.hpp", "include/analysis.hpp", "include/state.hpp", "include/ui.hpp"],
      steps: [
        {
          title: "Ánh xạ khoảng scalar",
          explanation:
            "Level là tâm, width là độ rộng; kết quả bị kẹp trong [0,1] chỉ ở đường hiển thị.",
        },
        {
          title: "Đếm dữ liệu gốc",
          explanation: "Histogram có 64 bin và phải đếm đủ N³; trục cao log không đổi số voxel.",
        },
        {
          title: "Đổi ảnh, không đổi volume",
          explanation:
            "RGBA có thể được tính lại mà không fill volume hoặc làm thay đổi giá trị đo.",
        },
      ],
    },
    "p53-l06": {
      focus: "Nối renderer/camera được cung cấp với ảnh lát cắt hiện có.",
      expected: "Đặt ba lát cắt trở lại trong khối 3D",
      files: [
        "include/camera.hpp",
        "include/context-mesh.hpp",
        "include/raster.hpp",
        "include/state.hpp",
        "include/ui.hpp",
      ],
      steps: [
        {
          title: "Nhận biết scaffold",
          explanation:
            "Vỏ iso 0.12/stride 2 chỉ định hướng; giải thích phần cung cấp sẵn, không giấu thuật toán đo trong renderer.",
        },
        {
          title: "Cắt một góc",
          explanation: "Vỏ được clip theo probe; ba cap dùng cùng scalar image với các ảnh phẳng.",
        },
        {
          title: "Giữ phép đo độc lập camera",
          explanation:
            "Camera basis chỉ đi vào projection/rasterizer, không đi vào sampler hoặc probe.",
        },
      ],
    },
    "p53-l07": {
      focus: "Nối pointer/phím vào một probe world và nhả capture đúng vòng đời.",
      expected: "Chọn một điểm, cập nhật cả ba view",
      files: ["include/layout.hpp", "include/input.hpp", "include/ui.hpp"],
      steps: [
        {
          title: "Bỏ vùng letterbox",
          explanation: "Đổi event sang logical rồi chỉ pick bên trong actual image rectangle.",
        },
        {
          title: "Chọn hai tọa độ",
          explanation:
            "Giữ trục cố định của view đang chọn; hai tọa độ mới tự dời crosshair ở hai view còn lại.",
        },
        {
          title: "Tách loại thao tác",
          explanation:
            "Drag scene đổi camera; drag ảnh đổi probe; blur/reset/preset hủy kéo và dừng quét.",
        },
      ],
    },
    "p53-l08": {
      focus: "Đặt giới hạn thời gian quét và cache theo đúng nguồn dữ liệu phụ thuộc.",
      expected: "Quét lát liên tục mà không tính lại mọi thứ",
      files: ["include/state.hpp", "include/platform.hpp", "include/input.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Quét theo thời gian",
          explanation:
            "12 mm/s, chặn dt của animation ở 0.05 s, tới biên thì dừng; Pause không khóa camera.",
        },
        {
          title: "Tách raw và RGBA",
          explanation:
            "Raw chỉ phụ thuộc dataset, tọa độ cắt và sampler; đổi window không resample volume.",
        },
        {
          title: "Chỉ upload phần thay đổi",
          explanation:
            "Streaming texture chỉ được ghi khi ảnh đổi; nạp dataset dùng trạng thái tạm trước khi commit.",
        },
      ],
    },
    "p53-l09": {
      focus: "Đối chiếu fixture và app thật, build Debug/Release rồi kiểm source tải về.",
      expected: "Kiểm chứng rồi chạy toàn bộ project",
      files: ["include/analysis.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm độc lập",
          explanation: "Đáp số fixture/affine không lấy từ chính hàm nội suy đang kiểm.",
        },
        {
          title: "Kiểm bản cuối",
          explanation:
            "N³, histogram, đối xứng và display không sửa data; CTest vẫn chạy trong Release.",
        },
        {
          title: "Tách bằng chứng",
          explanation:
            "Audit toán, smoke có điểm dừng và chuột/phím thật là ba việc khác nhau; mở final từ ZIP độc lập.",
        },
      ],
    },
  },
  references: {
    "p53-l01": [
      {
        label: "SDL_LockTexture: streaming pixels và pitch",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p53-l02": [
      {
        label: "Tâm voxel và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l03": [
      {
        label: "Ba mặt cắt vuông góc",
        href: "/glossary#volume-orthogonal-slices",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l04": [
      { label: "Trilinear và tám trọng số", href: "/glossary#volume-trilinear", kind: "Thuật ngữ" },
    ],
    "p53-l05": [
      {
        label: "Window/level của scalar",
        href: "/glossary#volume-window-level",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l06": [
      {
        label: "Vỏ tham chiếu và phép đo từ volume",
        href: "/glossary#volume-context-surface",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l07": [
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p53-l08": [
      {
        label: "Streaming texture: ghi khi dữ liệu thay đổi",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p53-l09": [
      {
        label: "SDL_RenderReadPixels: ảnh chương trình thật",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderReadPixels",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
