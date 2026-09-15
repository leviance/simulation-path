import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p15-l01": {
      focus:
        "Bắt đầu từ framebuffer CPU đã chạy được, tạo một local vertex và vẽ pipeline rail cùng viewport marker trước khi đưa matrix vào chương trình.",
      expected:
        "Cửa sổ hiện sáu stage Local/World/Camera/Clip/NDC/Screen. Checkpoint đầu chỉ có local value thật; các stage chưa xây được ghi rõ là pending, không giả vờ đã project.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ local vertex làm nguồn sự thật",
          explanation:
            "Vertex được đặt quanh local origin và không bị ghi đè trong render loop. Mỗi stage sau sẽ nhận đầu vào từ stage trước rồi lưu vào một trường khác.",
        },
        {
          title: "Dựng rail trước công thức",
          explanation:
            "drawPipelineRail chia chiều ngang thành sáu vị trí cố định, đánh dấu stage đang chọn và cho người học một nơi để quan sát dữ liệu dần xuất hiện.",
        },
        {
          title: "Cho checkpoint đầu có hình nhìn thấy ngay",
          explanation:
            "Local X/Y được vẽ bằng một preview scale đơn giản trong viewport. Đây chưa phải perspective; nhãn và title phải nói rõ để không trộn hai phép chiếu.",
        },
      ],
    },
    "p15-l02": {
      focus:
        "Tạo Vec4/Mat4, identity, matrix multiplication và matrix–vector multiplication; dùng w=1 cho point và w=0 cho direction.",
      expected:
        "Point và direction có cùng xyz trước translation. Sau cùng translation matrix, point đổi xyz còn direction giữ nguyên; identity không thay cả bốn thành phần.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt quy ước lưu và nhân",
          explanation:
            "Mat4 lưu row-major để đọc phần tử bằng at(row,column), nhưng vector đứng bên phải matrix. Mỗi output row là dot product giữa row đó và column vector.",
        },
        {
          title: "Đưa Vec3 vào homogeneous space",
          explanation:
            "toPoint đặt w=1 vì position phải nhận translation; toDirection đặt w=0 vì một hướng không có vị trí để tịnh tiến.",
        },
        {
          title: "Tự nhân trước khi ghép",
          explanation:
            "multiply(Mat4,Mat4) dùng ba vòng lặp nhỏ và không tối ưu sớm. CTest khóa identity, thứ tự và từng phần tử trước khi matrix đi vào pipeline.",
        },
      ],
    },
    "p15-l03": {
      focus:
        "Dựng model matrix bằng Translation × RotationY × Scale rồi đổi local vertex sang world point mà không sửa local data.",
      expected:
        "Scale, model yaw và model position chỉ làm World cùng các stage phía sau đổi. Local giữ nguyên; direction test không nhận phần translation.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc thứ tự từ phải sang trái",
          explanation:
            "Với column vector, matrix gần vertex chạy trước. T×R×S×p nghĩa là scale local point, xoay kết quả rồi mới đặt model vào world space.",
        },
        {
          title: "Không cập nhật dồn world vertex",
          explanation:
            "Mỗi frame gọi modelMatrix(model) rồi nhân lại với local vertex ban đầu. Cách này tránh sai số tích lũy và giữ inspector có nguồn đầu vào ổn định.",
        },
        {
          title: "Đối chiếu bằng công thức thành phần",
          explanation:
            "Test chạy một đường scale→rotateY→add position không qua matrix. Hai kết quả phải trùng để bắt lỗi dấu hoặc thứ tự nhân.",
        },
      ],
    },
    "p15-l04": {
      focus:
        "Biểu diễn view transform thành View = RotationX(+pitch) × RotationY(−yaw) × Translation(−position).",
      expected:
        "Camera sang phải làm camera-space X của vertex giảm; yaw dương quay world ngược lại trong camera space. World value vẫn không thay đổi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Hoàn tác translation trước",
          explanation:
            "Translation(−camera.position) nằm gần world vector nhất nên chạy trước. Nó biến world point thành độ dời tính từ mắt người xem.",
        },
        {
          title: "Hoàn tác orientation theo thứ tự ngược",
          explanation:
            "Quy ước FPS của Project 14 cần inverse yaw rồi inverse pitch. Khi viết dưới dạng column-vector matrix, phép chạy sau nằm bên trái.",
        },
        {
          title: "Giữ một đường tính tham chiếu",
          explanation:
            "worldToCameraDirect dùng phép trừ và hai hàm rotate. CTest so nó với view matrix ở nhiều camera pose để matrix không che mất lỗi logic.",
        },
      ],
    },
    "p15-l05": {
      focus:
        "Dựng perspective matrix cho camera nhìn +Z, đưa camera point thành clip vector và giữ camera depth trong clip.w.",
      expected:
        "Thay FOV làm clip.x/clip.y đổi nhưng camera point không đổi. clip.w luôn bằng camera.z; near/far quyết định cách clip.z ánh xạ vào khoảng 0..w.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đưa focal scale vào hai hàng đầu",
          explanation:
            "f=1/tan(FOV/2). Hàng X dùng f/aspect, hàng Y dùng f để vertical FOV giữ đúng khi viewport thay đổi.",
        },
        {
          title: "Ánh xạ depth bằng near và far",
          explanation:
            "Hai hệ số ở hàng Z được chọn để sau phép chia, camera.z=near cho NDC.z=0 và camera.z=far cho NDC.z=1.",
        },
        {
          title: "Đặt camera.z vào w",
          explanation:
            "Hàng cuối (0,0,1,0) tạo clip.w=z. Matrix chưa chia gì cả; clip space cố ý giữ numerator và denominator riêng.",
        },
      ],
    },
    "p15-l06": {
      focus:
        "Phân loại depth/w trước, chia clip.xyz cho w, kiểm tra NDC và chỉ đổi point visible sang pixel.",
      expected:
        "Preset visible cho marker trong viewport; near/behind/far/outside báo đúng status và không dùng screen coordinate không hợp lệ để vẽ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Guard trước phép chia",
          explanation:
            "Camera depth≤0 là behind; 0<depth<near là before-near; depth>far là beyond-far. Các trường hợp này dừng trước perspective divide.",
        },
        {
          title: "Chia cả ba thành phần clip",
          explanation:
            "NDC = (clip.x/w, clip.y/w, clip.z/w). X/Y mô tả vị trí trong khung; Z nằm trong 0..1 để chuẩn bị cho Z-buffer ở Project 17.",
        },
        {
          title: "Viewport chỉ nhận NDC hợp lệ",
          explanation:
            "NDC X/Y ngoài [-1,1] là outside. Chỉ status Visible mới được đổi sang pixel với Y đảo chiều theo framebuffer.",
        },
      ],
    },
    "p15-l07": {
      focus:
        "Ghép MVP = Projection × View × Model, thêm stage selection/preset/pause/reset và kiểm thử kết quả ghép với pipeline chạy rời.",
      expected:
        "Left/Right chọn stage, A/D xoay model, W/S đổi camera Z, 1–5 chọn preset, Space pause và R reset. Sai số separate-vs-MVP gần zero ở mọi trạng thái hữu hạn.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Ghép từ phải sang trái",
          explanation:
            "Model gần local vertex nhất, View đứng giữa, Projection ở ngoài cùng. Viết ngược thứ tự sẽ cho kết quả khác ngay khi model và camera cùng có translation/rotation.",
        },
        {
          title: "Giữ PipelineTrace cho inspector",
          explanation:
            "MVP giúp tính nhanh clip point, nhưng inspector vẫn chạy từng matrix để lưu World/Camera/Clip/NDC/Screen. Hai đường phục vụ hai mục đích và được so sai số mỗi frame.",
        },
        {
          title: "Khóa invariant thay vì chỉ nhìn hình",
          explanation:
            "CTest kiểm point/direction, model direct-vs-matrix, view direct-vs-matrix, near/far mapping, status, viewport và separate-vs-MVP ở Debug lẫn Release.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau test, thử resize, stage navigation, năm preset, pause/step/reset và chỉnh đồng thời model, camera, FOV để chắc dữ liệu phía trước stage không bị ảnh hưởng sai.",
        },
      ],
    },
  },
  references: {
    "p15-l01": [
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
      { label: "Pipeline trace", href: "/glossary#pipeline-trace", kind: "Thuật ngữ" },
    ],
    "p15-l02": [
      {
        label: "Homogeneous coordinates",
        href: "/glossary#homogeneous-coordinates",
        kind: "Thuật ngữ",
      },
      {
        label: "Transformation matrix",
        href: "/glossary#transformation-matrix",
        kind: "Thuật ngữ",
      },
      { label: "Column vector", href: "/glossary#column-vector", kind: "Thuật ngữ" },
    ],
    "p15-l03": [
      { label: "Model matrix", href: "/glossary#model-matrix", kind: "Thuật ngữ" },
      { label: "Non-commutative", href: "/glossary#non-commutative", kind: "Thuật ngữ" },
      { label: "Pivot", href: "/glossary#pivot", kind: "Thuật ngữ" },
    ],
    "p15-l04": [
      { label: "View matrix", href: "/glossary#view-matrix", kind: "Thuật ngữ" },
      { label: "View transform", href: "/glossary#view-transform", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
    ],
    "p15-l05": [
      { label: "Clip space", href: "/glossary#clip-space", kind: "Thuật ngữ" },
      { label: "Field of view", href: "/glossary#field-of-view", kind: "Thuật ngữ" },
      { label: "Aspect ratio", href: "/glossary#aspect-ratio", kind: "Thuật ngữ" },
    ],
    "p15-l06": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      {
        label: "Normalized device coordinates",
        href: "/glossary#normalized-device-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Viewport transform", href: "/glossary#viewport-transform", kind: "Thuật ngữ" },
    ],
    "p15-l07": [
      { label: "MVP matrix", href: "/glossary#mvp-matrix", kind: "Thuật ngữ" },
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
