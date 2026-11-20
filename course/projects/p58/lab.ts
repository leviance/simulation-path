import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["bank"],
    lessons: {},
    takes: {
      bank: {
        title: "Bờ suối đầu tiên",
        source: "Project 58 · Bản hoàn chỉnh",
        poster: "streambank.png",
        alt: "Nước xanh nằm giữa hai bờ cát thành bậc, phía trên là những thân cây voxel.",
        caption:
          "Lấy hai thân cây làm mốc. Các bậc cát mà bạn nhìn thấy chính là bề mặt của những cột block.",
      },
    },
  },
  base: {
    label: "BỜ SUỐI VOXEL",
    title: "Đứng trong mảnh đất đầu tiên",
    description: "Đi tới, quay nhìn và đối chiếu sơ đồ lớp với vật liệu ngay trước mắt.",
  },
  modes: {
    "voxel58-1": {
      title: "Viên đá đầu tiên bên bờ suối",
      description: "Từ cửa sổ có bầu trời đến sáu mặt của một viên đá.",
    },
    "voxel58-2": {
      title: "Một viên đá nằm ở đâu trong 4.096 ô?",
      description: "Từ vị trí trong thế giới đến một địa chỉ không trùng trong mảng.",
    },
    "voxel58-3": {
      title: "Vì sao một khối đất cần tới 49.152 tam giác?",
      description: "Dựng bản chưa tối ưu để có mốc đối chiếu trước khi bỏ mặt khuất.",
    },
    "voxel58-4": {
      title: "Khoét lòng suối bằng độ cao từng cột",
      description: "Lấp từng cột đất, thêm nước và đọc họa tiết riêng trên từng mặt.",
    },
    "voxel58-5": {
      title: "Tự bước tới một thân cây",
      description: "WASD đi trong thế giới thật; camera di chuyển nhưng dữ liệu đứng yên.",
    },
    "voxel58-6": {
      title: "Mở một lát ngang của bờ suối",
      description: "So lát x/z với cỏ, đất và nước dưới tầm mắt.",
    },
    "voxel58-7": {
      title: "Đi một vòng và kiểm tra bản hoàn chỉnh",
      description: "Đo hình học, kiểm depth rồi tự đi một vòng trong bản C++ hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
