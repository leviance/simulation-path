import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PIXEL MEMORY LAB",
    title: "Từ một ô pixel đến một phần tử trong RAM",
    description:
      "Thử cùng công thức C++ trên lưới phóng to: index, RGBA, bốn scene và phép ghi trong/ngoài biên.",
  },
  modes: {
    "pixel-memory": {
      title: "Tính tay index trên ảnh 4×3",
      description:
        "Đổi width/height, đi qua từng pixel và đọc số phần tử, index, pitch cùng byte offset.",
    },
    "pixel-rgba": {
      title: "Đóng gói màu rồi thử putPixel",
      description:
        "Đổi RGBA, ghi một tọa độ hợp lệ hoặc ngoài ảnh; so giá trị 0xRRGGBBAA với các byte little-endian.",
    },
    "pixel-patterns": {
      title: "Một vector, bốn công thức tạo ảnh",
      description:
        "Solid, gradient, checkerboard theo cell và noise theo seed dùng cùng công thức với native.",
    },
    "pixel-resize": {
      title: "Đổi kích thước ảnh, không chỉ kéo giãn hình",
      description: "Thay width/height để thấy số phần tử, index và pitch đổi; thử riêng ảnh 1×1.",
    },
    "pixel-validation": {
      title: "Tự đối chiếu vài kết quả trước khi chạy test",
      description:
        "Chọn preset nhỏ, kiểm hai góc, màu, seed và thử ghi ngoài biên; CTest vẫn là bước kiểm native riêng.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
