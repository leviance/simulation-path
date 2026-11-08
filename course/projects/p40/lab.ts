import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "XƯỞNG VẢI 3D",
    title: "Kéo, ghim và quan sát một bề mặt đang biến dạng",
    description:
      "Canvas chiếu phối cảnh một mảnh vải CPU nhỏ. Các lớp giải thích dùng chung state XPBD, topology và vật cản; đây không phải compute shader, không đo GPU và không thay executable C++ có ít nhất 100.000 đỉnh động.",
  },
  modes: {
    surface: {
      title: "Mặt vải đầu tiên",
      description: "Orbit, pan và zoom để nhìn hai mặt của mesh tam giác đang treo.",
    },
    prediction: {
      title: "Dự đoán vị trí",
      description:
        "Theo vị trí cũ, velocity, trọng lực và vị trí dự đoán trước khi giải ràng buộc.",
    },
    xpbd: {
      title: "Một ràng buộc XPBD",
      description: "Đọc sai số khoảng cách, inverse mass, compliance và multiplier của một cạnh.",
    },
    topology: {
      title: "Từ cạnh đến tấm vải",
      description: "Phân biệt tam giác vẽ với stretch, shear và bend-distance trong topology.",
    },
    coloring: {
      title: "Ai được ghi vertex này?",
      description:
        "Xem các nhóm constraints có ownership không chồng lấp; Canvas giải CPU, không mô phỏng lịch GPU.",
    },
    timestep: {
      title: "Substep không phải iteration",
      description: "Đổi số vòng, theo residual và tách damping rate khỏi compliance.",
    },
    obstacles: {
      title: "Đỡ vải bằng vật cản",
      description: "Quan sát sphere, mặt bàn, thickness và chuyển động tiếp tuyến tại tiếp xúc.",
    },
    grid: {
      title: "Cell trong không gian 3D",
      description:
        "Đọc vị trí cell và phạm vi ứng viên quanh một đỉnh; hình chỉ vẽ subset cho dễ nhìn.",
    },
    csr: {
      title: "Count → scan → scatter",
      description: "Theo count, offset và ID để biết mỗi vertex thuộc đúng một cell.",
    },
    "self-contact": {
      title: "Hai lớp vải chạm nhau",
      description:
        "Loại đỉnh kề topology, kiểm khoảng cách và thấy giới hạn của contact theo đỉnh.",
    },
    normals: {
      title: "Đọc nếp gấp và độ giãn",
      description:
        "Normal, wireframe và strain cùng giải thích một bề mặt, không thay bề mặt bằng heatmap.",
    },
    interaction: {
      title: "Ghim, kéo và hủy an toàn",
      description:
        "Tách camera/drag/pin, thử Pause và đổi preset mà không giữ reference vertex cũ.",
    },
    validation: {
      title: "Kiểm chứng có điểm dừng",
      description:
        "Chạy hoặc hủy fixture CPU hữu hạn; không sinh số đo GPU hay chứng nhận scale giả.",
    },
    showcase: {
      title: "Xưởng vải hoàn chỉnh",
      description: "Đổi cảnh treo, phủ sphere hoặc rơi lên bàn; so hình sạch với các lớp debug.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
