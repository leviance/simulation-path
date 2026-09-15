import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p17-l01": {
      focus:
        "Dựng mesh cube có tám vertex dùng chung và mười hai indexed triangle, rồi đưa từng triangle qua projection cùng rasterizer Project 16.",
      expected:
        "Cube đặc có sáu màu xuất hiện trên CPU framebuffer và xoay được bằng chuột. Một số mặt che sai nhau là lỗi có chủ ý của checkpoint đầu.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Mô tả topology trước khi render",
          explanation:
            "CubeMesh giữ tám position và mười hai bộ ba index. Hai triangle của cùng một mặt dùng chung màu và cùng đường chéo, nên dữ liệu hình học có thể kiểm tra riêng.",
        },
        {
          title: "Project tám vertex đúng một lần",
          explanation:
            "Mỗi frame biến đổi tám vertex thành ScreenVertex rồi các triangle chỉ tra index. Cách này tránh tính lại phép quay và projection 36 lần.",
        },
        {
          title: "Tái dùng raster callback",
          explanation:
            "Mỗi ScreenTriangle đi qua top-left rasterizer Project 16; callback ban đầu chỉ ghi màu mặt vào color buffer.",
        },
      ],
    },
    "p17-l02": {
      focus:
        "Giữ nguyên scene nhưng đảo draw list để chứng minh color buffer hiện tại mô tả thứ tự lệnh, không mô tả bề mặt gần camera.",
      expected:
        "Nhấn O làm các vùng màu đổi rõ dù camera, cube và projection không đổi. Góc overlap cho thấy một triangle không thể được xếp đúng bằng một vị trí duy nhất.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đảo index, không đảo geometry",
          explanation:
            "triangleIndexAt chỉ thay triangle nào được gửi vào rasterizer trước. Đây là thí nghiệm có kiểm soát: mọi dữ liệu khác giữ nguyên.",
        },
        {
          title: "Nhìn color overwrite như log",
          explanation:
            "Không có depth test, callback sau luôn ghi đè callback trước. Màu cuối vì vậy chỉ cho biết fragment nào đến sau.",
        },
        {
          title: "Tách triệu chứng khỏi giải pháp",
          explanation:
            "Checkpoint này chưa thêm Z-buffer. Người học phải nhìn được lỗi và mô tả điều kiện đúng trước khi cài cấu trúc dữ liệu mới.",
        },
      ],
    },
    "p17-l03": {
      focus:
        "Tạo DepthBuffer có vòng đời song song với color buffer: cùng kích thước, cùng index, clear đầu frame và resize cùng lúc.",
      expected:
        "Title bar báo đúng width×height. Resize nhiều lần không crash; mỗi frame bắt đầu với toàn bộ depth bằng 1.0 nhưng hình vẫn chưa được sửa.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Một pixel, một ô depth",
          explanation:
            "index=y×width+x được dùng cho cả hai buffer. Không cần map hoặc cấu trúc lồng nhau vì vòng raster vốn đi theo row-major.",
        },
        {
          title: "Clear về giá trị xa nhất",
          explanation:
            "Projection của project tạo NDC depth trong [0,1], nên 1.0 là mốc khởi đầu hợp lệ để mọi fragment gần hơn có thể pass.",
        },
        {
          title: "Resize như một giao dịch",
          explanation:
            "Sau khi texture mới tạo thành công, color buffer và depth buffer mới cùng nhận kích thước pixel mới.",
        },
      ],
    },
    "p17-l04": {
      focus:
        "Đưa ndcDepth đi cùng mỗi ScreenVertex và nội suy scalar đó bằng chính barycentric weights mà coverage test đã tính.",
      expected:
        "Cube hiển thị grayscale đổi mượt theo chiều sâu. Một triangle nghiêng không còn một depth phẳng chung cho toàn bộ mặt.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ depth sau perspective divide",
          explanation:
            "projectVertex trả screen x/y và ndcDepth trong cùng ScreenVertex, tránh ghép nhầm dữ liệu từ hai không gian.",
        },
        {
          title: "Nội suy tại fragment",
          explanation:
            "interpolateNdcDepth dùng wA, wB, wC của sample. Đây là phép nội suy tuyến tính hợp lệ với NDC depth trên screen space.",
        },
        {
          title: "Hiển thị trước khi so sánh",
          explanation:
            "Grayscale biến con số khó nhìn thành gradient, giúp bắt lỗi depth đảo chiều hoặc dùng cùng một giá trị cho cả triangle.",
        },
      ],
    },
    "p17-l05": {
      focus:
        "Cài depth test và depth write thành một thao tác rõ thứ tự, sau đó chỉ ghi color nếu fragment vượt phép thử.",
      expected:
        "Bật D làm mặt gần che mặt xa đúng; đảo O không còn thay hình. Tắt D quay lại lỗi Painter để so trực tiếp.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc depth cũ trước",
          explanation:
            "DepthTestResult lưu storedDepth trước phép ghi, newDepth và passed để inspector/test giải thích được quyết định.",
        },
        {
          title: "So nhỏ hơn vì near bằng zero",
          explanation:
            "newDepth < storedDepth bám đúng convention đã chốt. Đổi dấu mà không đổi projection sẽ cho mặt xa thắng.",
        },
        {
          title: "Ghi hai buffer cùng nhánh pass",
          explanation:
            "Depth pass cập nhật depth trước, rồi callback ghi đúng color tại cùng index. Nhánh fail không được đụng vào buffer nào.",
        },
      ],
    },
    "p17-l06": {
      focus:
        "Gom projection, mười hai draw call và fragment path vào renderCube, rồi thêm animation có delta time và controls dùng chung trạng thái.",
      expected:
        "Cube quay liên tục hoặc từng bước; title bar báo covered/pass/reject. Kéo chuột, pause và resize không tạo nhánh renderer thứ hai.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Project vertex một lần mỗi frame",
          explanation:
            "renderCube tạo mảng tám ScreenVertex rồi duyệt draw order. Mọi face vẫn đi qua cùng rasterizeTriangle và depth callback.",
        },
        {
          title: "Đếm ở đúng tầng",
          explanation:
            "covered đếm fragment coverage, passed/rejected đếm kết quả depth. Ba số không thay thế nhau và giúp phát hiện clear hoặc compare sai.",
        },
        {
          title: "Animation không làm đổi thuật toán",
          explanation:
            "Delta time chỉ sửa angleY. Pause, N và drag đều tạo scene mới rồi gọi lại cùng renderCube.",
        },
      ],
    },
    "p17-l07": {
      focus:
        "Thêm depth visualization và kiểm chứng toàn buffer giữa draw order xuôi/ngược bằng CTest chạy được ở Debug lẫn Release.",
      expected:
        "V hiển thị vùng gần sáng hơn. Với D bật, hai order có color/depth difference bằng zero; CTest pass và source final chạy độc lập.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Biến depth thành ảnh chẩn đoán",
          explanation:
            "depthShade chỉ đọc buffer sau khi render và đổi [0,1] thành grayscale. Nó không can thiệp depth test.",
        },
        {
          title: "So toàn bộ output",
          explanation:
            "Test render cùng cube hai lần, chỉ đổi draw order, rồi so mọi pixel color và depth thay vì chọn một ảnh chụp đẹp.",
        },
        {
          title: "Giữ đối chứng âm",
          explanation:
            "Test tắt depth và yêu cầu hai color buffer khác nhau. Nếu đối chứng không còn khác, bài test order-independence có thể đang dùng scene quá dễ.",
        },
      ],
    },
  },
  references: {
    "p17-l01": [
      { label: "Indexed mesh", href: "/glossary#indexed-mesh", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Screen space", href: "/glossary#screen-space", kind: "Thuật ngữ" },
    ],
    "p17-l02": [
      { label: "Painter's algorithm", href: "/glossary#painters-algorithm", kind: "Thuật ngữ" },
      { label: "Draw order", href: "/glossary#draw-order", kind: "Thuật ngữ" },
      { label: "Fragment", href: "/glossary#fragment", kind: "Thuật ngữ" },
    ],
    "p17-l03": [
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
    ],
    "p17-l04": [
      { label: "NDC", href: "/glossary#ndc", kind: "Thuật ngữ" },
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Depth interpolation", href: "/glossary#depth-interpolation", kind: "Thuật ngữ" },
    ],
    "p17-l05": [
      { label: "Depth test", href: "/glossary#depth-test", kind: "Thuật ngữ" },
      { label: "Depth write", href: "/glossary#depth-write", kind: "Thuật ngữ" },
      { label: "Fragment", href: "/glossary#fragment", kind: "Thuật ngữ" },
    ],
    "p17-l06": [
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
      { label: "Render pipeline", href: "/glossary#render-pipeline", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p17-l07": [
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
