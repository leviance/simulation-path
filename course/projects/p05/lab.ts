import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "COORDINATE LAB",
    title: "Mặt phẳng tọa độ kéo-thả",
    description: "Đặt và kéo điểm, pan, zoom quanh con trỏ; đối chiếu screen/world và sai số.",
  },
  modes: {
    "coordinate-spaces": {
      title: "Điểm (2,1) nằm ở đâu trên màn hình?",
      description: "Camera được giữ cố định; chỉ đọc hai tọa độ và quan sát điểm đã vẽ.",
    },
    "coordinate-inverse": {
      title: "Từ vị trí chuột về world coordinate",
      description:
        "Di chuyển dấu chữ thập, đọc screen/world rồi tự tính lại bằng công thức nghịch.",
    },
    "coordinate-pan": {
      title: "Lưới đi theo tay, tọa độ điểm không đổi",
      description: "Kéo chuột phải, đổi preset; quan sát bước lưới và tâm camera.",
    },
    "coordinate-zoom": {
      title: "Giữ nguyên world point dưới con trỏ",
      description: "Pan và zoom bằng wheel hoặc +/-; theo dõi zoom-anchor error.",
    },
    "coordinate-points": {
      title: "Đặt và kéo nhiều điểm",
      description:
        "Click trái vùng trống để thêm điểm, kéo gần điểm để di chuyển; chọn điểm và thao tác bằng bàn phím.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
