import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Xoay lá chớp và nhìn các dải nắng bò từ mặt sàn lên chiếc hộp. Bạn sẽ vẽ cùng một căn phòng hai lần: một lần từ phía Mặt Trời để tìm vật che, một lần từ mắt để thấy kết quả.",
  duration: "8–11 giờ",
  prerequisites: [
    "Project 17: hiểu vì sao Z-buffer giữ bề mặt gần nhất.",
    "Project 19: biết mặt hướng về đèn có tích vô hướng dương.",
    "Project 33–34: đã vẽ mesh bằng OpenGL, biết camera, uniform và depth test.",
  ],
  objectives: [
    "Dựng cửa sổ có lỗ và tám lá chớp chỉ bằng một mesh hộp.",
    "Tạo shadow map thật trên GPU; dùng hai độ sâu để biết điểm nào nhận nắng.",
    "Phân biệt bóng do vật che với màu vật liệu, ánh sáng Lambert và lỗi precision.",
    "Nạp lại shader an toàn, rồi kiểm kết quả trên hai điểm sàn có cùng pháp tuyến.",
  ],
  challenge: {
    timebox: "20–30 phút tự phác hình trước khi mở bài đầu",
    mission:
      "Làm một căn phòng có nắng xiên qua cửa sổ. Nghiêng lá chớp cho các dải sáng hẹp lại; kéo chiếc hộp vào một dải để ánh nắng chạy qua cạnh hộp. Hãy tự giải thích: cùng một mặt sàn hướng lên trời, vì sao có hai điểm ngay cạnh nhau mà chỉ một điểm nhận nắng?",
    outcome:
      "Một ứng dụng C++20/SDL3/OpenGL 3.3 chạy độc lập. Cùng một cảnh có thể nhìn từ mắt người, nhìn từ phía nguồn sáng và xem riêng phần bị vật khác che.",
    requirements: [
      "Dùng cùng mesh và cùng danh sách vị trí cho lượt nguồn sáng và lượt camera.",
      "Nghiêng lá, dịch hộp, đổi hướng nắng và xoay camera bằng các điều khiển riêng; có mở, hé, khép và reset.",
      "Có shadow map thật, so độ sâu, chỉnh bias và đối chiếu biên bóng cứng với lọc 3×3.",
      "Sửa một shader ngoài file, nạp lại khi đang chạy; giữ cảnh tốt gần nhất nếu shader mới lỗi.",
    ],
    constraints: [
      "Chỉ một nguồn sáng định hướng và một shadow map. Không thêm tán xạ thể tích, bụi bay, nhiều đèn hay tải model trang trí.",
      "Không sơn sẵn sọc nắng lên sàn. Ảnh C++ và thí nghiệm mặt cắt Canvas phải có nhãn riêng.",
    ],
    definitionOfDone: [
      "Khép lá làm nhiều điểm sàn từ sáng thành tối; tắt bóng thì vệt nắng biến mất dù toàn bộ hình học vẫn còn.",
      "Hộp trượt ngang làm điểm dưới bóng cũ sáng trở lại; xoay camera không làm shadow map đổi.",
      "Xem được texture độ sâu thật, lớp nhìn thấy nguồn sáng và lớp Lambert. Bóng bám sàn, vùng râm vẫn nhận ra vật liệu.",
      "Build từ work/ và chạy CTest ở đúng cây mã. Dùng --verify để kiểm pixel và lỗi shader trên driver GPU thật.",
    ],
  },
  lessons: [
    {
      id: "p35-l01",
      slug: "01-dung-goc-phong-tu-mot-mesh",
      title: "Dựng góc phòng từ một mesh hộp",
      summary:
        "Từ một tấm sàn, ghép bốn mảng tường thành ô cửa thật và đặt chiếc hộp xuống đất. Chưa vẽ bóng để kiểm riêng hình học.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l02",
      slug: "02-nghieng-la-chop-va-day-hop",
      title: "Nghiêng lá chớp và đẩy chiếc hộp",
      summary:
        "Chọn trục quay đi qua giữa mỗi lá, rồi dịch chiếc hộp theo sàn. Vì sao lá đã xoay mà vệt nắng vẫn chưa xuất hiện?",
      order: 2,
      estimatedMinutes: 75,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l03",
      slug: "03-nhin-can-phong-tu-phia-nguon-sang",
      title: "Nhìn căn phòng từ phía nguồn sáng",
      summary:
        "Đặt một camera trực giao phía ngoài cửa. Thứ cần giữ lại từ góc nhìn ấy không phải màu gỗ mà là khoảng sâu tới bề mặt đầu tiên.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l04",
      slug: "04-hai-diem-san-mot-diem-co-nang",
      title: "Hai điểm trên sàn, chỉ một điểm có nắng",
      summary:
        "Đưa điểm trên sàn vào cùng hệ tọa độ với bản đồ độ sâu. So hai giá trị để nắng xuyên khe, dừng trên hộp và không xuyên tường.",
      order: 4,
      estimatedMinutes: 90,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l05",
      slug: "05-giu-bong-bam-chan-hop",
      title: "Giữ bóng bám chân hộp",
      summary:
        "Tăng dần bias để phân biệt vết tự đổ bóng với bóng bị nhấc khỏi sàn. So đường biên cứng với phép lọc chín mẫu.",
      order: 5,
      estimatedMinutes: 70,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l06",
      slug: "06-sua-shader-khi-cua-so-dang-mo",
      title: "Sửa shader mà không đóng cửa sổ",
      summary:
        "Đổi chất liệu của căn phòng, thử gõ sai GLSL rồi sửa lại. Cửa chớp và hộp không được quay về vị trí ban đầu.",
      order: 6,
      estimatedMinutes: 80,
      demoId: "shader-hot-reload",
    },
    {
      id: "p35-l07",
      slug: "07-kiem-chung-nang-qua-cua-chop",
      title: "Kiểm chứng nắng qua cửa chớp",
      summary:
        "Giữ cùng điểm trên sàn khi đổi camera hoặc di chuyển hộp. So ảnh thành phẩm với độ sâu phía đèn, vùng bị che và độ sáng Lambert.",
      order: 7,
      estimatedMinutes: 75,
      demoId: "shader-hot-reload",
    },
  ],
  lessonAliases: {
    "01-dua-glsl-ra-file-rieng": "01-dung-goc-phong-tu-mot-mesh",
    "02-compile-shader-va-doc-info-log": "06-sua-shader-khi-cua-so-dang-mo",
    "03-link-candidate-va-khoa-interface": "06-sua-shader-khi-cua-so-dang-mo",
    "04-reload-theo-giao-dich-giu-last-good": "06-sua-shader-khi-cua-so-dang-mo",
    "05-theo-doi-file-va-debounce": "06-sua-shader-khi-cua-so-dang-mo",
    "06-truyen-time-resolution-va-mouse": "02-nghieng-la-chop-va-day-hop",
    "07-viet-fragment-shader-procedural": "04-hai-diem-san-mot-diem-co-nang",
    "08-mandelbrot-trong-fragment-shader": "07-kiem-chung-nang-qua-cua-chop",
    "09-noise-va-chuyen-dong-procedural": "05-giu-bong-bam-chan-hop",
    "10-hoan-thien-shader-gallery": "07-kiem-chung-nang-qua-cua-chop",
  },
} satisfies PublishedProjectEditorial;

export default project;
