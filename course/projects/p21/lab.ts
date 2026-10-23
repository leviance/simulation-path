import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "OBJ VIEWER LAB",
    title: "Một dòng OBJ trở thành pixel như thế nào?",
    description:
      "Đọc và sửa OBJ theo từng mốc: từ point cloud tới solid mesh. So model rotation với camera orbit, xem normals và kiểm Z-buffer; ứng dụng C++ tải về mới là sản phẩm đầy đủ.",
  },
  modes: {
    "obj-vertices": {
      title: "Record v tạo point cloud ra sao?",
      description:
        "Đổi preset hoặc sửa source để thấy mỗi dòng v thêm một position; face chưa tham gia ở mốc này.",
    },
    "obj-faces": {
      title: "OBJ 1-based index nối vertex nào?",
      description:
        "Chọn source face và nhìn ba index ngoài file được đổi thành ba vị trí 0-based trong vector.",
    },
    "obj-indices": {
      title: "Slash token và negative index được giải mã thế nào?",
      description:
        "So v, v/vt, v//vn, v/vt/vn và -1; phần position luôn được tách trước khi tra vector.",
    },
    "obj-triangulation": {
      title: "Một polygon N corner sinh ra bao nhiêu triangle?",
      description:
        "Chọn quad hoặc pentagon, bước qua triangle fan và nhìn anchor corner được giữ cố định.",
    },
    "obj-normalize": {
      title: "Bounds đưa model về origin mà không làm méo ra sao?",
      description:
        "Dịch và scale tọa độ trong source rồi nạp lại: model sau fit không đổi hình, chỉ uniform scale thay đổi.",
    },
    "obj-shading": {
      title: "Winding, face normal và ánh sáng liên hệ thế nào?",
      description:
        "Xoay model, bật normals hoặc culling và đọc intensity. Mốc này dùng painter, chưa có Z-buffer.",
    },
    "obj-render": {
      title: "Mesh đi qua clip, rasterizer và Z-buffer ra sao?",
      description:
        "Theo dõi source triangle, triangle sau clip, fragment pass/reject và thử đảo draw order.",
    },
    "obj-validation": {
      title: "OBJ viewer đã giữ đủ invariant chưa?",
      description:
        "Mở OBJ, chọn riêng xoay model/camera orbit, bật wireframe/normals và ẩn debug. So toàn buffer khi chủ động nhấn kiểm thứ tự.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
