import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "QUADTREE MAP EDITOR",
    title: "Một bản đồ để chọn, chỉnh sửa và khám phá",
    description:
      "Nhà, cây và công viên có AABB thật; dùng camera tìm vùng, chọn nhóm, di chuyển hoặc thêm/xóa trên dataset 100.000 đối tượng.",
  },
  modes: {
    "map-objects": {
      title: "Vẽ bản đồ có nhà, cây và công viên",
      description: "Từ khung SDL đến dataset 100.000 đối tượng có ID, vị trí và kích thước thật.",
    },
    "map-camera": {
      title: "Đi lại trên bản đồ bằng camera 2D",
      description: "Pan, zoom giữ điểm dưới con trỏ và đổi tọa độ window/board/world đúng một lần.",
    },
    "map-selection": {
      title: "Chọn đúng đối tượng, không chỉ chọn tâm",
      description:
        "Click lớp trên cùng và kéo vùng chọn theo giao AABB, kể cả chạm cạnh và kéo ngược.",
    },
    "map-insert": {
      title: "Đưa hình có diện tích vào Quadtree",
      description: "Node index, split có giới hạn và giữ đối tượng cắt đường chia ở node cha.",
    },
    "map-query": {
      title: "Bỏ qua nhánh xa rồi kiểm chính xác",
      description:
        "Duyệt cây theo AABB, kiểm cả bucket ở node cha và đo visited/pruned/candidates.",
    },
    "map-culling": {
      title: "Chỉ vẽ phần bản đồ đang nhìn thấy",
      description:
        "Dùng cùng index cho viewport culling, giữ paint order và tách culling khỏi render.",
    },
    "map-mutations": {
      title: "Thêm, xóa và cập nhật mà không để lại bản ghi cũ",
      description:
        "Lưu node theo ID, remove tại chỗ, insert lại và kiểm toàn bộ proposal trước khi ghi.",
    },
    "map-group-drag": {
      title: "Kéo cả nhóm: xem trước rồi mới áp dụng",
      description: "Pointer capture, preview không sửa data và rollback toàn nhóm khi vượt root.",
    },
    "map-validation": {
      title: "Kiểm cây sau khi bản đồ đã thay đổi",
      description: "Oracle độc lập, topology và query IDs trước/sau chuỗi thêm, di chuyển, xóa.",
    },
    "map-performance": {
      title: "Đo riêng query, update và culling",
      description: "Cùng dataset/query, hai warm-up + năm mẫu; thử layout dày và đối tượng lớn.",
    },
    "map-final": {
      title: "Chạy và nghiệm thu Map Editor hoàn chỉnh",
      description: "CMake độc lập, CTest Debug/Release và workflow đầy đủ trên 100.000 đối tượng.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
