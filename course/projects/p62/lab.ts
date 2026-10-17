import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "CHUNK STREAMING",
    title: "Đi tới đâu, tải world tới đó",
    description:
      "Theo dõi nhân vật, resident và hàng đợi; thử qua gốc âm, đổi hướng sát biên rồi teleport để kiểm bộ nhớ và mặt giáp ranh.",
  },
  modes: {
    "stream62-1": {
      title: "Đặt nhân vật lên khối đất đang chạy",
      description:
        "Chạy khung SDL3 có greedy mesh, thêm marker và dịch nhân vật trước khi tải nhiều chunk.",
    },
    "stream62-2": {
      title: "Đổi world sang chunk và local, kể cả tọa độ âm",
      description:
        "Dùng floor thay vì phép chia số nguyên về zero; tách chunk index, local và voxel index.",
    },
    "stream62-3": {
      title: "Tải một vùng chunk quanh nhân vật",
      description:
        "Tạo tập wanted hình vuông, lưu Entry theo Key và đưa mesh local về world khi vẽ.",
    },
    "stream62-4": {
      title: "Gỡ chunk xa và tạo lại đúng dữ liệu cũ",
      description: "Xóa Entry an toàn, giải phóng buffer và kiểm dữ liệu tái tạo bằng checksum.",
    },
    "stream62-5": {
      title: "Chia việc tải và gỡ thành các batch nhỏ",
      description:
        "Ưu tiên gỡ xa rồi tải gần, giới hạn 1–2 job mỗi tick thay vì xử lý cả world một lần.",
    },
    "stream62-6": {
      title: "Giữ thêm một vòng để khỏi tải đi tải lại",
      description: "Phân biệt wanted và retained, hủy kế hoạch cũ khi teleport hoặc đổi bán kính.",
    },
    "stream62-7": {
      title: "Không vẽ hai mặt ở đường giáp ranh",
      description: "Tra neighbor bằng tọa độ world; mặt nguồn chỉ thuộc chunk đang dựng mesh.",
    },
    "stream62-8": {
      title: "Chỉ dựng lại những mesh bị ảnh hưởng",
      description:
        "Invalidate chunk thay đổi cùng bốn hàng xóm, hoàn tất batch trước khi cập nhật ảnh.",
    },
    "stream62-9": {
      title: "Đi theo một hành trình và quan sát hàng đợi",
      description:
        "Thêm route hữu hạn theo mốc, teleport từ inspector, pause/reset và cleanup input.",
    },
    "stream62-10": {
      title: "Kiểm chứng streaming và hoàn thiện world",
      description:
        "Oracle bề mặt global, hành trình có giới hạn, regeneration và build Debug/Release.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
