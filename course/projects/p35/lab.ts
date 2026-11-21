import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  native: {
    directory: "/field-notes/shutter-light",
    withDemo: true,
    overview: ["ajar", "closed", "moved"],
    lessons: {
      "shutter-depth": ["depth"],
      "shutter-compare": ["ajar", "closed"],
      "shutter-observer": ["ajar", "moved", "depth"],
    },
    takes: {
      ajar: {
        title: "Nắng đi qua lá hé",
        alt: "Tám lá cửa hé; các dải sáng cắt ngang sàn gỗ và mặt trên chiếc hộp.",
        caption:
          "Góc lá 23°. Bề mặt sàn không đổi pháp tuyến từ dải này sang dải khác; chính cửa chớp đang chặn nắng.",
        poster: "ajar.png",
        source: "Project 35 · C++/SDL3/OpenGL · framebuffer Release",
      },
      closed: {
        title: "Khép theo hướng nắng",
        alt: "Cùng chiếc hộp và căn phòng, dải nắng trên sàn đã biến mất.",
        caption:
          "Lá xoay tới −38°. Người xem vẫn có thể thấy trời qua một vài khe vì mắt và Mặt Trời nhìn theo hai hướng khác nhau.",
        poster: "closed.png",
        source: "Project 35 · C++/SDL3/OpenGL · framebuffer Release",
      },
      moved: {
        title: "Đẩy hộp khỏi vệt cũ",
        alt: "Hộp đã trượt sang trái; vệt nắng ở vị trí cũ lại hiện trên sàn.",
        caption: "Giữ nguyên nguồn sáng và lá chớp, chỉ đổi X của hộp từ 0,35 sang −1,4 m.",
        poster: "moved.png",
        source: "Project 35 · C++/SDL3/OpenGL · framebuffer Release",
      },
      depth: {
        title: "Từ phía nguồn sáng",
        alt: "Ảnh xám của texture độ sâu thật; thấy lỗ cửa, lá chớp và vùng trắng trống.",
        caption:
          "Đây là framebuffer của nguồn sáng, không phải ảnh thành phẩm đổi sang đen trắng. Nhấn V trong ứng dụng để đối chiếu.",
        poster: "depth.png",
        source: "Project 35 · C++/SDL3/OpenGL · framebuffer Release",
      },
    },
  },
  base: {
    label: "GÓC NHÌN CỦA NGUỒN SÁNG",
    title: "Một tia nắng qua cửa chớp",
    description:
      "Chọn một điểm trên sàn, lần tia ngược ra cửa và xem nó gặp lá gỗ hay lọt qua khe. Đây là mặt cắt Canvas; ảnh căn phòng 3D được chụp từ bản C++.",
  },
  modes: {
    "shutter-room": {
      title: "Dựng góc phòng từ một mesh hộp",
      description:
        "Từ một tấm sàn, ghép bốn mảng tường thành ô cửa thật và đặt chiếc hộp xuống đất. Chưa vẽ bóng để kiểm riêng hình học.",
    },
    "shutter-blades": {
      title: "Nghiêng lá chớp và đẩy chiếc hộp",
      description:
        "Chọn trục quay đi qua giữa mỗi lá, rồi dịch chiếc hộp theo sàn. Vì sao lá đã xoay mà vệt nắng vẫn chưa xuất hiện?",
    },
    "shutter-depth": {
      title: "Nhìn căn phòng từ phía nguồn sáng",
      description:
        "Đặt một camera trực giao phía ngoài cửa. Thứ cần giữ lại từ góc nhìn ấy không phải màu gỗ mà là khoảng sâu tới bề mặt đầu tiên.",
    },
    "shutter-compare": {
      title: "Hai điểm trên sàn, chỉ một điểm có nắng",
      description:
        "Đưa điểm trên sàn vào cùng hệ tọa độ với bản đồ độ sâu. So hai giá trị để nắng xuyên khe, dừng trên hộp và không xuyên tường.",
    },
    "shutter-bias": {
      title: "Giữ bóng bám chân hộp",
      description:
        "Tăng dần bias để phân biệt vết tự đổ bóng với bóng bị nhấc khỏi sàn. So đường biên cứng với phép lọc chín mẫu.",
    },
    "shutter-reload": {
      title: "Sửa shader mà không đóng cửa sổ",
      description:
        "Đổi chất liệu của căn phòng, thử gõ sai GLSL rồi sửa lại. Cửa chớp và hộp không được quay về vị trí ban đầu.",
    },
    "shutter-observer": {
      title: "Kiểm chứng nắng qua cửa chớp",
      description:
        "Giữ cùng điểm trên sàn khi đổi camera hoặc di chuyển hộp. So ảnh thành phẩm với độ sâu phía đèn, vùng bị che và độ sáng Lambert.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
