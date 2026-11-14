import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "VOLUME SCULPTOR",
    title: "Từ scalar field tới khối có thể khoét và ghép",
    description:
      "Canvas 2D trích mesh CPU từ grid lưu thật, tối đa 32³ samples. Cọ nằm trên slice; bản C++ có surface picking, GPU 128³ và file I/O được kiểm riêng.",
  },
  modes: {
    tetra: {
      title: "Bốn scalar tạo mặt cắt ra sao?",
      description:
        "Đổi từng dấu, isovalue và nhìn giao điểm cạnh. Giá trị đúng isovalue thuộc outside; triangle suy biến được bỏ và đếm.",
    },
    cells: {
      title: "Nối cell mà không đổi đường chéo ở mặt chung",
      description:
        "Grid nhỏ 12³, sáu tetra mỗi cube và wireframe. Phân biệt số samples với cells trước khi tăng quy mô.",
    },
    normals: {
      title: "Đổi normal, giữ nguyên bề mặt",
      description:
        "So face normal với gradient normal trên cùng field; bật các đoạn normal để đọc hướng ra ngoài.",
    },
    brush: {
      title: "Cọ sửa dữ liệu nào bên trong khối?",
      description:
        "Đặt cọ bằng lát cắt 3D, đổi radius/strength và đọc F(probe). Camera không sửa field; đây không phải native surface picking.",
    },
    stroke: {
      title: "Nhiều stamp, một giao dịch Undo",
      description:
        "Kéo trên slice, thử Undo/Redo và bỏ capture giữa nét. Khoảng cách stamp theo radius, không theo FPS.",
    },
    field: {
      title: "Field mới và mesh last-good không phải cùng trạng thái",
      description:
        "Pause job rồi đặt cọ sau khi tiếp tục: đọc field revision/mesh revision và nhãn đang giữ. Lab tính CPU, không đo GPU.",
    },
    prefix: {
      title: "Mỗi cell cần một khoảng vertices riêng",
      description:
        "Pause, chạy một batch và chọn chunk có mặt để đọc count/offset. Đây là prefix CPU; bài C++ tự viết scan GPU.",
    },
    mesh: {
      title: "Đủ capacity rồi mới emit",
      description:
        "Bật inspector, chọn capacity chỉ 12 vertices và xem job bị từ chối mà mesh cũ vẫn còn nguyên.",
    },
    dirty: {
      title: "Một nét cọ lan tới những chunk nào?",
      description:
        "Xem hộp chunk kiểu x-ray, processed/reuse và generation. Orbit/pan/zoom không khởi động extraction.",
    },
    slice: {
      title: "Isovalue và resolution làm đổi hình theo hai cách khác nhau",
      description:
        "Đổi iso không ghi field; giảm rồi tăng N nội suy lại dữ liệu và không khôi phục chi tiết đã mất.",
    },
    archive: {
      title: "Bản lưu có bị sửa theo field đang nặn không?",
      description:
        "Giữ snapshot trong RAM, nặn tiếp rồi khôi phục. File .scl và OBJ thật thuộc ứng dụng C++, không được giả lập bằng nút này.",
    },
    validation: {
      title: "Khoét lỗ và nối hai khối bằng cọ thật",
      description:
        "Hai nét cọ mẫu thay scalar rồi trích lại mesh. Đối chiếu slice, Undo/Redo và topology; Canvas không thay nghiệm thu GPU 128³.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
