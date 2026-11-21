import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 02 — delta time và keyboard input",
    "Project 05 — world/screen space",
    "Project 07 — radian và tangent",
    "Project 10 — Vec3 và hệ trục 3D",
  ],
  summary:
    "Giữ W và nhìn ngôi sao hổ phách chạy dần ra mép ảnh; giữ S, nó quay về chỗ cũ. Bạn tự viết phép chiếu từ một điểm 3D đến một pixel rồi dùng lại nó cho cả bầu trời.",
  challenge: {
    timebox: "Thử một mình trong 25–35 phút trước khi đọc bài 1",
    mission:
      "Không cần vẽ tàu. Hãy đặt một ngôi sao lệch sang phải và một ngôi sao ngay trước mặt. Khi người xem tiến thẳng, làm thế nào để sao thứ nhất dạt ra ngoài còn sao thứ hai không rời tâm ảnh? Hãy làm được với hai sao trước, rồi mới thêm cả bầu trời.",
    outcome:
      "Bạn bay được qua 96 sao đứng yên trong không gian. Thả W thì dừng ngay; giữ S để nhìn lại đúng những sao vừa bay qua. Sau chuyến bay, bạn giải thích được vì sao đổi ống kính không giống tiến tới.",
    requirements: [
      "Dùng một tọa độ world XYZ cho mỗi sao. Camera nhìn +Z, Y hướng lên; chỉ tọa độ Z của camera thay đổi khi bay.",
      "Tự tính tọa độ so với mắt, chia cho độ sâu, áp dụng FOV dọc và đưa kết quả tới đúng pixel. Không di chuyển sao bằng tọa độ màn hình.",
      "W/S để tiến hoặc lùi; R về xuất phát. Camera dừng ở hai đầu hành trình và khi nhả phím hoặc mất focus. Có cách tiến từng bước để kiểm.",
      "Chỉ vẽ sao còn trong vùng nhìn. Cho phép đổi FOV, thử khung vuông và xem tọa độ của một sao thử riêng mà không thay đổi bầu trời.",
    ],
    constraints: [
      "C++20, CMake 3.24, SDL 3.4.8, framebuffer CPU; không dùng sẵn phép chiếu của engine hoặc thư viện ma trận.",
      "Một kiểu hình duy nhất là đủ: điểm sáng. Không thêm mô hình tàu, vật lý quỹ đạo, texture hay sinh ngẫu nhiên theo frame.",
    ],
    definitionOfDone: [
      "Bay tới rồi lùi về cùng vị trí: ảnh phải khớp, kể cả khi chạy lại chương trình.",
      "FOV 90°, khung 800×800: sao (1; 0,6; 4) đi từ (500; 340) đến (600; 280) khi camera tiến từ Z=0 đến Z=2. Sao trên trục vẫn ở giữa khi còn nhìn thấy.",
      "Hai phím W/S giữ cùng lúc không đẩy camera về bên nào. Thả cả hai, khung hình đứng yên. Không xuất hiện điểm giả lúc đi qua một ngôi sao.",
      "Dùng cùng một hàm chiếu cho mọi sao và chạy được bản hoàn chỉnh từ work/ hoặc từ final/ trong ZIP, không cần website.",
    ],
  },
  duration: "Khoảng 6 giờ, gồm 40 phút kéo sao tùy chọn",
  objectives: [
    "Tự tìm ra phép chia cho Z từ tia nhìn qua một ngôi sao.",
    "Phân biệt đổi ống kính với di chuyển camera bằng những điểm sáng ở hai độ sâu.",
    "Kiểm được pixel tính tay và dùng lại hàm world → camera → pixel ở Project 12.",
  ],
  lessons: [
    {
      id: "p11-l01",
      slug: "01-diem-3d-va-marker-tren-framebuffer",
      title: "Thắp ngôi sao đầu tiên",
      summary:
        "Dùng framebuffer để đánh dấu một sao. Đổi riêng Z để thấy điều còn thiếu trong hình vẽ XY.",
      order: 1,
      estimatedMinutes: 35,
      demoId: "projection",
    },
    {
      id: "p11-l02",
      slug: "02-tu-world-space-sang-camera-space",
      title: "Khi người xem tiến về phía ngôi sao",
      summary:
        "Cùng một ngôi sao, nhưng ở hai chỗ đứng khác nhau bạn đo được hai độ sâu khác nhau.",
      order: 2,
      estimatedMinutes: 35,
      demoId: "projection",
    },
    {
      id: "p11-l03",
      slug: "03-perspective-divide",
      title: "Vì sao các ngôi sao tỏa ra từ tâm ảnh?",
      summary: "Vẽ đường nhìn qua sao, rút ra X/Z và Y/Z rồi thử đoán pixel trước khi chạy.",
      order: 3,
      estimatedMinutes: 45,
      demoId: "projection",
    },
    {
      id: "p11-l04",
      slug: "04-fov-aspect-ndc-va-pixel",
      title: "Bay tới hay chỉ đổi ống kính?",
      summary:
        "So ảnh ở hai góc mở và hai vị trí camera. Kiểm kết quả trên cả khung vuông lẫn khung rộng.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "projection",
    },
    {
      id: "p11-l05",
      slug: "05-near-plane-va-view-frustum",
      title: "Từ một điểm đến cả trường sao",
      summary: "Đi qua danh sách 96 tọa độ cố định, chỉ vẽ những sao mà camera thật sự nhìn được.",
      order: 5,
      estimatedMinutes: 60,
      demoId: "projection",
    },
    {
      id: "p11-l06",
      slug: "06-dieu-khien-va-chuyen-dong",
      title: "Giữ W để bay, thả phím để dừng",
      summary:
        "Dùng thời gian giữa hai khung hình để bay; thử thả phím, lùi lại và so với lúc xuất phát.",
      order: 6,
      estimatedMinutes: 50,
      demoId: "projection",
    },
    {
      id: "p11-l07",
      slug: "07-keo-diem-tai-depth-co-dinh",
      title: "Tùy chọn: kéo ngôi sao thử ở độ sâu đã biết",
      summary: "Biết độ sâu rồi, hãy đi ngược từ con trỏ về tọa độ 3D mà không sửa trường sao.",
      order: 7,
      estimatedMinutes: 40,
      demoId: "projection",
    },
    {
      id: "p11-l08",
      slug: "08-hoan-thien-va-kiem-chung",
      title: "Bay thử rồi kiểm lại phép chiếu",
      summary:
        "Chạy bản hoàn chỉnh, đo ngôi sao hổ phách, kiểm các trường hợp biên rồi dùng lại hàm chiếu ở Project 12.",
      order: 8,
      estimatedMinutes: 45,
      demoId: "projection",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
