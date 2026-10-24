import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "COLLISION TANK LAB",
    title: "Từ 256 circle đến 256 sphere va chạm thật",
    description:
      "Cùng một mô hình impulse trong 2D và 3D. So vật liệu, khối lượng, số đo sau solver và lượng công việc; đổi camera mà không xoay state vật lý.",
  },
  modes: {
    "collision-scene": {
      title: "Dựng bể và tạo đàn bóng lặp lại được",
      description:
        "Tạo 256 quả bóng theo lưới, giữ vị trí trong world space và thay đổi bán kính, khối lượng, vật liệu.",
    },
    "collision-motion": {
      title: "Cho cả đàn bóng chuyển động bằng fixed timestep",
      description:
        "Nối vận tốc với vị trí, tách physics khỏi render và công khai thời gian bị bỏ khi chạm giới hạn công việc.",
    },
    "collision-walls": {
      title: "Xử lý va chạm với bốn bức tường",
      description:
        "Xét bán kính, hướng chuyển động và restitution; ghi xung lực tường tác dụng lên bóng.",
    },
    "collision-detection": {
      title: "Phát hiện hai hình tròn chạm nhau",
      description:
        "Tìm contact normal và độ xuyên mà chưa thay đổi vị trí hay vận tốc của hai bóng.",
    },
    "collision-impulse": {
      title: "Đổi vận tốc bằng collision impulse",
      description:
        "Từ vận tốc tương đối và khối lượng khác nhau, suy ra xung lực dọc normal rồi kiểm bằng đáp án tính tay.",
    },
    "collision-correction": {
      title: "Sửa chồng lấn mà không đổi vận tốc",
      description:
        "Chia phần sửa vị trí theo inverse mass, thêm slop và phân biệt cách này với continuous collision detection.",
    },
    "collision-bruteforce": {
      title: "Cho 256 bóng thật sự va vào nhau",
      description:
        "Duyệt i<j, giải vài lượt hữu hạn, khóa lại tường sau lượt cuối và đếm đúng lượng công việc.",
    },
    "collision-validation": {
      title: "Kiểm chứng bể 2D trước khi sang 3D",
      description:
        "Kiểm bảo toàn theo đúng hệ đang xét, ghi mẫu sau từng bước và đo độ xuyên còn lại bằng lượt quét độc lập.",
    },
    "collision-spheres": {
      title: "Từ va chạm circle đến sphere trong 3D",
      description:
        "Mở rộng normal và vận tốc sang ba thành phần, giữ nguyên phương trình impulse và kiểm bằng ca va chạm xiên.",
    },
    "collision-camera": {
      title: "Dựng góc nhìn cho bể 3D",
      description:
        "Chiếu phối cảnh, tìm mặt trước sphere bằng ray và dùng depth buffer; camera thay đổi góc nhìn chứ không xoay state.",
    },
    "collision-final": {
      title: "Hoàn thiện spawn, input và nghiệm thu",
      description:
        "Ghép hai không gian, thêm vật thể có kiểm tra chỗ trống, xử lý capture và kiểm toàn bộ mã tải về.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
