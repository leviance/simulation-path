import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  native: {
    directory: "/field-notes/perspective-point",
    withDemo: true,
    overview: ["start", "flight"],
    lessons: { "projection-motion": ["flight"], "projection-full": ["start", "flight", "ruler"] },
    takes: {
      start: {
        title: "Trước khi nhấn W",
        source: "Project 11 · C++/SDL3 · Release",
        poster: "departure.png",
        alt: "Trường sao trên nền tối ở camera Z=0. Một ngôi sao màu hổ phách nằm ở phía trên bên phải tâm ảnh.",
        caption:
          "Hãy tìm sao hổ phách trước khi chuyển sang ảnh tiếp theo. Vị trí thật của nó là (1; 0,6; 4).",
      },
      flight: {
        title: "Tiến thêm hai đơn vị",
        source: "Project 11 · C++/SDL3 · Release",
        poster: "in-flight.png",
        alt: "Vẫn bầu trời ấy ở camera Z=2. Sao hổ phách xuất hiện xa tâm hơn, còn sao nằm trên trục nhìn vẫn ở giữa.",
        caption:
          "Máy ảnh đi từ Z=0 đến Z=2; ống kính vẫn 60°. Độ sâu của sao hổ phách giảm một nửa nên khoảng cách từ ảnh của nó tới tâm tăng gấp đôi.",
      },
      ruler: {
        title: "Kiểm hai độ sâu khi dừng bay",
        source: "Project 11 · C++/SDL3 · Release",
        poster: "depth-ruler.png",
        alt: "Trường sao thật ở phía sau, sao thử A và vòng đo B hiện cùng hai khoảng cách đến tâm ảnh.",
        caption:
          "Nhấn M. B là vị trí dự đoán của A khi nhân đôi độ sâu so với camera, không phải một ngôi sao khác trong danh sách.",
      },
    },
  },
  base: {
    label: "PHÉP CHIẾU PHỐI CẢNH",
    title: "Bay xuyên trường sao",
    description:
      "Bấm vào khung hình rồi giữ W để bay. Vì sao sao lệch tâm tỏa ra hai bên, còn sao ngay trước mặt thì không?",
  },
  modes: {
    "projection-point": {
      title: "Thắp ngôi sao đầu tiên",
      description:
        "Dùng framebuffer để đánh dấu một sao. Đổi riêng Z để thấy điều còn thiếu trong hình vẽ XY.",
    },
    "projection-camera": {
      title: "Khi người xem tiến về phía ngôi sao",
      description:
        "Cùng một ngôi sao, nhưng ở hai chỗ đứng khác nhau bạn đo được hai độ sâu khác nhau.",
    },
    "projection-divide": {
      title: "Vì sao các ngôi sao tỏa ra từ tâm ảnh?",
      description: "Vẽ đường nhìn qua sao, rút ra X/Z và Y/Z rồi thử đoán pixel trước khi chạy.",
    },
    "projection-fov": {
      title: "Bay tới hay chỉ đổi ống kính?",
      description:
        "So ảnh ở hai góc mở và hai vị trí camera. Kiểm kết quả trên cả khung vuông lẫn khung rộng.",
    },
    "projection-visibility": {
      title: "Từ một điểm đến cả trường sao",
      description:
        "Đi qua danh sách 96 tọa độ cố định, chỉ vẽ những sao mà camera thật sự nhìn được.",
    },
    "projection-motion": {
      title: "Giữ W để bay, thả phím để dừng",
      description:
        "Dùng thời gian giữa hai khung hình để bay; thử thả phím, lùi lại và so với lúc xuất phát.",
    },
    "projection-drag": {
      title: "Tùy chọn: kéo ngôi sao thử ở độ sâu đã biết",
      description: "Biết độ sâu rồi, hãy đi ngược từ con trỏ về tọa độ 3D mà không sửa trường sao.",
    },
    "projection-full": {
      title: "Bay thử rồi kiểm lại phép chiếu",
      description:
        "Chạy bản hoàn chỉnh, đo ngôi sao hổ phách, kiểm các trường hợp biên rồi dùng lại hàm chiếu ở Project 12.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
