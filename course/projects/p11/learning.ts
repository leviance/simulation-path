import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p11-l01": {
      focus: "Làm sáng một pixel ở đúng chỗ trước khi thêm cả bầu trời.",
      expected:
        "Các phím mũi tên đổi vị trí chấm trên ảnh. Q/E thay Z trong dữ liệu nhưng chưa làm chấm dịch chuyển: bản xem thử XY chưa hề đọc Z.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung",
          explanation:
            "Mở cửa sổ từ work/ trước khi sửa. Starter đã lo SDL, texture và framebuffer; tìm chỗ tô chấm trước khi trình bày khung hình.",
        },
        {
          title: "Đặt một ngôi sao",
          explanation:
            "Lưu ba tọa độ world; dùng X/Y để thử tô lệch tâm 70 pixel sang phải và 42 pixel lên trên.",
        },
        {
          title: "Thử chiều còn thiếu",
          explanation:
            "Cho điểm lệch sang bên rồi nhấn E. Nhìn con số tăng trong khi ảnh vẫn đứng yên, rồi tự hỏi phép chiếu đang thiếu dữ kiện nào.",
        },
      ],
    },
    "p11-l02": {
      focus: "Tìm khoảng cách từ mắt đến một ngôi sao mà không di chuyển chính ngôi sao ấy.",
      expected:
        "Với sao ở Z=4 và mắt ở Z=2, độ sâu để chiếu là 2. Thay vị trí mắt không được ghi đè dữ liệu world.",
      files: [
        "include/lab.hpp",
        "include/presentation.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đặt mắt tại gốc",
          explanation:
            "Camera nhìn thẳng theo +Z. Chỉ cho nó tịnh tiến; chưa cần ma trận hoặc thao tác xoay.",
        },
        {
          title: "Đổi nơi đứng để đo",
          explanation:
            "Trừ vị trí mắt khỏi vị trí sao. Kiểm trường hợp ở cùng độ sâu và trường hợp camera đã đi qua nó.",
        },
        {
          title: "Đi rồi quay lại",
          explanation:
            "Dùng J/L hoặc điều khiển trên Canvas để thay Z của camera. Tách chuyện có đúng khoảng cách khỏi chuyện đã vẽ được phối cảnh.",
        },
      ],
    },
    "p11-l03": {
      focus: "Dùng một tia nhìn để tìm pixel của sao thay vì đoán quãng đường chấm chạy.",
      expected:
        "Khi độ sâu giảm một nửa, độ lệch khỏi tâm ảnh tăng gấp đôi, miễn sao còn trong khung. Điểm trên trục vẫn ở tâm.",
      files: ["include/lab.hpp", "include/presentation.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Vẽ hai tam giác",
          explanation:
            "Trong mặt cắt XZ, nối mắt với ngôi sao rồi xét mặt ảnh cách mắt một đơn vị. Làm tương tự bên mặt cắt YZ.",
        },
        {
          title: "Chia cho đúng độ sâu",
          explanation:
            "Dùng Z so với mắt, không dùng Z world. Trả về trạng thái riêng cho những điểm không có ảnh.",
        },
        {
          title: "Đổi tỉ số ra pixel",
          explanation:
            "Từ tâm viewport, cộng hiệu theo X và trừ hiệu theo Y. So hai vị trí có thể tính trước trên giấy.",
        },
      ],
    },
    "p11-l04": {
      focus: "Phân biệt bay đến gần vật với phóng to bằng ống kính.",
      expected:
        "Đổi FOV nhân độ lệch của tất cả sao cùng một hệ số. Bay tới lại thay đổi độ sâu của từng sao theo tỉ lệ khác nhau.",
      files: ["include/lab.hpp", "include/presentation.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn góc nhìn",
          explanation:
            "Dùng tangent của nửa góc mở dọc. Thử với góc 90° để biết ngay tiêu cự theo pixel.",
        },
        {
          title: "Giữ khung không méo",
          explanation:
            "Tính aspect từ viewport, rồi đổi NDC thành tọa độ có gốc thật của vùng ảnh.",
        },
        {
          title: "So cùng hai ngôi sao",
          explanation:
            "Giữ camera và đổi FOV trước. Khôi phục FOV rồi mới tiến camera, không thay hai biến cùng một lúc.",
        },
      ],
    },
    "p11-l05": {
      focus: "Từ một hàm chiếu điểm, tạo cả bầu trời mà không học thêm một loại vật thể nào.",
      expected:
        "96 ngôi sao giữ nguyên tọa độ. Chỉ những sao có độ sâu hợp lệ và nằm trong vùng nhìn mới thành chấm trên màn hình.",
      files: [
        "include/lab.hpp",
        "include/presentation.hpp",
        "include/starfield.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chọn bầu trời cố định",
          explanation:
            "Tạo danh sách một lần. Giữ hai sao dễ nhận biết để so với đáp số, dùng các dải độ sâu cho phần còn lại.",
        },
        {
          title: "Loại điểm không nhìn thấy",
          explanation:
            "Phân biệt sau mắt, ngoài khoảng near/far và lệch khỏi khung ngang/dọc. Không đẩy chúng dính vào viền.",
        },
        {
          title: "Vẽ từng sao",
          explanation:
            "Lặp cùng projectPerspective cho mọi điểm. Màu và rìa mềm chỉ tô ngôi sao tại pixel đã biết, không làm sao di chuyển.",
        },
      ],
    },
    "p11-l06": {
      focus: "Cho người học tự bay qua các sao bằng một thao tác giữ rồi nhả phím.",
      expected:
        "Giữ W để tiến, S để lùi với tốc độ 2 đơn vị/giây. Thả phím dừng ngay khi không bật tự bay; về Z=0 vẫn là bố cục cũ.",
      files: ["include/presentation.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đếm thời gian bằng giây",
          explanation:
            "Đổi số mili giây của SDL sang giây, chặn mỗi lần cập nhật ở 0,1 giây để một khung bị trễ không làm camera nhảy vọt.",
        },
        {
          title: "Dịch camera",
          explanation:
            "Nhân tốc độ với hướng và thời gian. Hành trình Z=0 đến Z=12 không sửa dữ liệu của trường sao.",
        },
        {
          title: "Nhả phím để dừng",
          explanation:
            "Nhận cả lúc nhấn lẫn lúc thả. Thử riêng Space để tự bay và N để nhận ra độ dịch của chỉ một bước.",
        },
      ],
    },
    "p11-l07": {
      focus: "Tùy chọn: đặt lại điểm thử bằng chuột trong khi cả trường sao vẫn đứng yên.",
      expected:
        "Biết một pixel và một độ sâu mới xác định được điểm trong không gian. Có lối đi thẳng sang bài 08 bằng hai tệp tham khảo.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ một độ sâu",
          explanation:
            "Lưu độ sâu so với camera ngay lúc nắm điểm thử. Giữ cả khoảng lệch giữa tâm điểm và con trỏ.",
        },
        {
          title: "Đưa pixel trở về world",
          explanation: "Đổi pixel về NDC, dựng điểm ở độ sâu đã giữ rồi cộng lại vị trí camera.",
        },
        {
          title: "Trả lại quyền điều khiển",
          explanation:
            "Lấy vị trí cuối lúc thả chuột, hủy khi mất focus hoặc resize. Không cho thao tác của một thiết bị khác giành lần kéo đang dở.",
        },
      ],
    },
    "p11-l08": {
      focus: "Kiểm chuyến bay bằng cả một khung hình nhìn thấy được lẫn một đáp số pixel tính tay.",
      expected:
        "Bật tắt được dụng cụ mà không làm đổi bầu trời. Chương trình từ work/ đi qua các ca kiểm ở cả Debug lẫn Release.",
      files: [
        "include/lab.hpp",
        "include/presentation.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tính hai ảnh trước",
          explanation:
            "Dùng khung vuông 800×800, FOV 90° và sao (1,0.6,4). Tiến camera từ Z=0 tới Z=2 và kiểm hai pixel (500,340), (600,280).",
        },
        {
          title: "Bật thước để đối chiếu",
          explanation:
            "M vẽ thêm ảnh của điểm thử ở độ sâu gấp đôi. Đo từ tâm viewport; B là dấu đo, không phải một sao mới.",
        },
        {
          title: "Chạy mã mình vừa viết",
          explanation:
            "Kiểm ảnh khi bay trở về và chạy CTest cho work/. Lấy final/ trong ZIP khi cần đối chiếu nguyên chương trình.",
        },
      ],
    },
  },
  references: {
    "p11-l01": [
      {
        label: "Vector 3D",
        href: "/glossary#vector-3d",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_GetKeyboardState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState",
        kind: "SDL API",
      },
    ],
    "p11-l02": [
      {
        label: "Camera space",
        href: "/glossary#camera-space",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l03": [
      {
        label: "Similar triangles",
        href: "/glossary#similar-triangles",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l04": [
      {
        label: "Field of view",
        href: "/glossary#field-of-view",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l05": [
      {
        label: "Near plane",
        href: "/glossary#near-plane",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l06": [
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l07": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p11-l08": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
