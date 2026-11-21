import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p35-l01": {
      focus:
        "Từ một tấm sàn, ghép bốn mảng tường thành ô cửa thật và đặt chiếc hộp xuống đất. Chưa vẽ bóng để kiểm riêng hình học.",
      expected:
        "Từ góc chéo nhìn thấy nền trời qua khung, bệ có chiều dày và hộp đứng sát sàn. Xoay camera không làm mất phần tường tiếp giáp. Chưa có lá chớp hoặc bóng đổ là đúng ở bài này.",
      files: ["include/shutter_scene.hpp", "shaders/room.frag"],
      steps: [
        {
          title: "Chừa một lỗ trên tường",
          explanation: "Ghép hai mảng bên, một mảng phía dưới và một mảng phía trên.",
        },
        {
          title: "Dùng lại lệnh vẽ của starter",
          explanation: "Đọc vòng lặp có sẵn trước khi thêm bệ cửa và hộp.",
        },
        {
          title: "Để chất liệu giúp đọc hình",
          explanation: "Sàn và bệ cửa đều là gỗ nhưng vân chạy theo hướng khác nhau.",
        },
      ],
    },
    "p35-l02": {
      focus:
        "Chọn trục quay đi qua giữa mỗi lá, rồi dịch chiếc hộp theo sàn. Vì sao lá đã xoay mà vệt nắng vẫn chưa xuất hiện?",
      expected:
        "Tám trục vẫn ở trong khung khi đổi preset. A/D chỉ di chuyển hộp; Q/E không xoay camera; chân hộp không xuyên sàn. Đổi lá chưa tạo sọc nắng giả trong vật liệu.",
      files: [
        "include/room_drawing.hpp",
        "include/shader_application.hpp",
        "include/shader_input.hpp",
        "include/shader_renderer.hpp",
        "include/shutter_scene.hpp",
        "shaders/room.frag",
      ],
      steps: [
        {
          title: "Giữ trục của từng lá ngay trong khung",
          explanation: "Chiều cao tâm lá đầu là 1,27 m; cứ thêm 0,345 m lại có một lá.",
        },
        {
          title: "Đưa hộp tới vị trí có thể lặp lại",
          explanation:
            "Mỗi lần nhấn A hoặc D, tâm hộp nhích sang một bên. Đặt giới hạn để không đẩy hộp ra khỏi vùng quan sát.",
        },
        {
          title: "Phân biệt hướng tới Mặt Trời và chiều tia truyền",
          explanation: "Vector trong hàm này đi từ sàn về nguồn sáng.",
        },
      ],
    },
    "p35-l03": {
      focus:
        "Đặt một camera trực giao phía ngoài cửa. Thứ cần giữ lại từ góc nhìn ấy không phải màu gỗ mà là khoảng sâu tới bề mặt đầu tiên.",
      expected:
        "V chuyển được giữa phòng và texture vuông. Nhìn từ đèn thấy cả nền trống lẫn các mặt che; nghiêng lá làm dấu vết trong texture thay đổi. Chỉ xoay camera thì ảnh độ sâu đứng yên.",
      files: [
        "include/room_drawing.hpp",
        "include/shader_application.hpp",
        "include/shader_input.hpp",
        "include/shadow_target.hpp",
        "include/shutter_scene.hpp",
        "shaders/depth.frag",
        "shaders/depth.vert",
      ],
      steps: [
        {
          title: "Đặt mắt nhìn từ ngoài cửa",
          explanation: "Từ tâm vùng cần chiếu, đi ngược chiều tia nắng 15 đơn vị rồi nhìn về tâm.",
        },
        {
          title: "Tạo nơi ghi độ sâu",
          explanation: "Gắn texture 1024×1024 vào GL_DEPTH_ATTACHMENT của framebuffer.",
        },
        {
          title: "Hỏi nguồn sáng trước khi vẽ từ mắt",
          explanation: "Dùng đúng danh sách room đã dựng.",
        },
      ],
    },
    "p35-l04": {
      focus:
        "Đưa điểm trên sàn vào cùng hệ tọa độ với bản đồ độ sâu. So hai giá trị để nắng xuyên khe, dừng trên hộp và không xuyên tường.",
      expected:
        "Cùng sàn có cả dải sáng và dải tối. Khép lá làm vùng nhận nắng thu hẹp; xoay camera không làm bóng trượt trên sàn; khi hộp đi ngang, vùng phía sau hộp thay đổi chứ không bám vào màn hình.",
      files: [
        "include/room_drawing.hpp",
        "include/shader_application.hpp",
        "include/shader_input.hpp",
        "include/shader_renderer.hpp",
        "shaders/room.frag",
        "shaders/room.vert",
      ],
      steps: [
        {
          title: "Chuyển điểm nhìn thấy sang ảnh của nguồn sáng",
          explanation:
            "Trong room.vert, dùng cùng model matrix cho cả gl_Position của mắt và tọa độ clip của đèn.",
        },
        {
          title: "So với vật đầu tiên trên đường nắng",
          explanation: "Đọc đúng một texel.",
        },
        {
          title: "Nối hai lượt vẽ với nhau",
          explanation: "Lượt camera cần texture vừa ghi xong, không phải depth buffer của cửa sổ.",
        },
      ],
    },
    "p35-l05": {
      focus:
        "Tăng dần bias để phân biệt vết tự đổ bóng với bóng bị nhấc khỏi sàn. So đường biên cứng với phép lọc chín mẫu.",
      expected:
        "Phím F đổi phần chuyển tiếp ở biên mà không biến cả vùng râm thành sáng. R trả bias và góc lá về mặc định. Bạn giải thích được tại sao trung bình chín giá trị độ sâu rồi so một lần không cho kết quả như chín phép so.",
      files: [
        "include/room_drawing.hpp",
        "include/shader_input.hpp",
        "include/shader_renderer.hpp",
        "shaders/room.frag",
      ],
      steps: [
        {
          title: "Nhìn chân hộp trước khi đổi ngưỡng",
          explanation: "Dừng ở góc cửa hé.",
        },
        {
          title: "Lấy chín quyết định thay vì chín độ sâu trung bình",
          explanation: "Cho chín texel trong một ô 3×3 bỏ phiếu.",
        },
        {
          title: "Cho hai cách nhìn dùng cùng shader",
          explanation: "Phím F quyết định so một hay chín mẫu; ngoặc vuông thay bias.",
        },
      ],
    },
    "p35-l06": {
      focus:
        "Đổi chất liệu của căn phòng, thử gõ sai GLSL rồi sửa lại. Cửa chớp và hộp không được quay về vị trí ban đầu.",
      expected:
        "Bản sửa hợp lệ làm màu thay đổi; bản lỗi không làm mất hình hoặc reset camera. Sau khi sửa lại, generation tăng. Chỉ xoay lá hoặc nhấn H không tạo program mới.",
      files: [
        "include/shader_application.hpp",
        "include/shader_files.hpp",
        "include/shader_input.hpp",
        "include/shader_overlay.hpp",
      ],
      steps: [
        {
          title: "Tìm đúng cặp file để sửa",
          explanation: "Mở thư mục in sau chữ Shaders trong terminal của bản work.",
        },
        {
          title: "Thử, rồi mới đổi program",
          explanation:
            "Lần theo RoomProgram::replace: compile từng stage, link, hỏi driver về các active uniform.",
        },
        {
          title: "Đừng biên dịch một file đang ghi dở",
          explanation: "Editor có thể lưu bằng cách đổi tên file tạm.",
        },
      ],
    },
    "p35-l07": {
      focus:
        "Giữ cùng điểm trên sàn khi đổi camera hoặc di chuyển hộp. So ảnh thành phẩm với độ sâu phía đèn, vùng bị che và độ sáng Lambert.",
      expected:
        "V và M cho thấy dữ liệu khác nhau nhưng giải thích được cùng cảnh. Khép cửa làm dải sàn thử tối đi, di chuyển hộp làm điểm cũ sáng lại. Bản work đạt CTest và --verify; bạn nhận ra được ảnh nào chụp từ C++ và hình nào là mặt cắt Canvas.",
      files: [
        "include/room_drawing.hpp",
        "include/shader_application.hpp",
        "include/shader_input.hpp",
        "include/shader_overlay.hpp",
        "include/shader_renderer.hpp",
        "include/shader_validation.hpp",
        "shaders/room.frag",
      ],
      steps: [
        {
          title: "Đọc cùng cảnh theo ba câu hỏi",
          explanation: "V xem độ sâu phía đèn.",
        },
        {
          title: "Trở lại đúng điểm dưới bóng hộp",
          explanation:
            "Hàm kiểm đặt camera và trạng thái ban đầu, cho GPU vẽ cả căn phòng rồi đọc dữ liệu thật.",
        },
        {
          title: "Hỏi cả lượt đèn lẫn lượt mắt",
          explanation: "Đổi camera rồi chiếu lại điểm sàn lên ảnh mới.",
        },
      ],
    },
  },
  references: {
    "p35-l01": [
      {
        label: "Vertex shader",
        href: "/glossary#vertex-shader",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l02": [
      {
        label: "Tích vô hướng",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l03": [
      {
        label: "Depth buffer",
        href: "/glossary#depth-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l04": [
      {
        label: "Fragment shader",
        href: "/glossary#fragment-shader",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l05": [
      {
        label: "Depth buffer",
        href: "/glossary#depth-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l06": [
      {
        label: "Nạp lại shader",
        href: "/glossary#shader-hot-reload",
        kind: "Thuật ngữ",
      },
    ],
    "p35-l07": [
      {
        label: "Shader program",
        href: "/glossary#shader-program",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
