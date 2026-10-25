import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "POINT CLOUD SURVEY",
    title: "Đi vào căn phòng và lấy dữ liệu bạn cần",
    description:
      "Xây công cụ khảo sát point cloud của căn phòng/nhà xưởng: mở CSV 100.000 điểm, đi vào dữ liệu 3D, chọn hộp/cầu, lọc chiều cao, đọc thống kê và xuất tập điểm. Octree hỗ trợ query và frustum culling; debug chỉ là lớp giải thích.",
  },
  modes: {
    "cloud-csv": {
      title: "Đọc CSV và vẽ căn phòng bằng point cloud",
      description: "Từ khung SDL đến dữ liệu phòng 100.000 điểm, có ID và đơn vị mét.",
    },
    "cloud-camera": {
      title: "Đi quanh và đi vào bên trong dữ liệu 3D",
      description:
        "Dùng cùng basis cho orbit, free-fly và phép chiếu; camera không sửa tọa độ điểm.",
    },
    "cloud-regions": {
      title: "Khoanh vùng quan tâm bằng hộp hoặc cầu",
      description: "Điều khiển vùng chọn trong world, dựng brute-force reference trước khi có cây.",
    },
    "cloud-build": {
      title: "Chia dữ liệu thành tám nhánh mà không mất điểm",
      description: "Node indices, ba bit octant và các giới hạn dừng split.",
    },
    "cloud-query": {
      title: "Tìm đúng vùng mà không quét cả căn phòng",
      description: "AABB–box/sphere broad phase rồi exact-test điểm trong leaf.",
    },
    "cloud-frustum": {
      title: "Chỉ vẽ phần dữ liệu nằm trong góc nhìn",
      description: "Sáu mặt frustum, phép thử node bảo thủ và depth-buffer presentation.",
    },
    "cloud-statistics": {
      title: "Từ một vùng điểm đến thông tin khảo sát",
      description: "Giao vùng hình học với khoảng Y, rồi tính count/bounds/centroid.",
    },
    "cloud-export": {
      title: "Xuất tập điểm đã chọn và kiểm bằng cách đọc lại",
      description: "Export ID/tọa độ, công bố precision và xử lý lỗi ghi file.",
    },
    "cloud-validation": {
      title: "Kiểm lại sau khi đã đổi vùng, lọc và camera",
      description: "Oracle độc lập, topology và job validation hữu hạn.",
    },
    "cloud-performance": {
      title: "Đo chi phí của công cụ thay vì chỉ đo cây",
      description:
        "Workload cố định, warm-up và nhiều mẫu; tách build/query/culling/render/bộ nhớ.",
    },
    "cloud-final": {
      title: "Chạy công cụ hoàn chỉnh và tự nghiệm thu",
      description:
        "Build ZIP độc lập và hoàn tất mở → khảo sát → chọn/lọc → thống kê → xuất → đọc lại.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
