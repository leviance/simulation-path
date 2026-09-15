import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "3D PIPELINE LAB",
    title: "Một vertex thay đổi thế nào trên đường từ model tới pixel?",
    description:
      "Dừng ở từng stage, thay model/camera/lens và đọc riêng local, world, camera, clip, NDC cùng screen value bằng đúng quy ước của source C++.",
  },
  modes: {
    "pipeline-local": {
      title: "Máy soi cần giữ lại những trạng thái nào?",
      description:
        "Chọn một local vertex, đi dọc pipeline rail và phân biệt dữ liệu đầu vào với marker cuối trên viewport.",
    },
    "pipeline-homogeneous": {
      title: "Vì sao point dùng w=1 còn direction dùng w=0?",
      description:
        "So sánh cùng một Vec3 sau translation matrix để nhìn thấy homogeneous w quyết định phép tịnh tiến có tác dụng hay không.",
    },
    "pipeline-model": {
      title: "Model matrix đổi local space thành world space ra sao?",
      description:
        "Thay scale, yaw và position; local vertex đứng yên trong khi world vertex phản ánh đúng thứ tự scale → rotate → translate.",
    },
    "pipeline-view": {
      title: "Camera di chuyển nhưng world vertex có bị sửa không?",
      description:
        "Điều chỉnh camera position/yaw/pitch rồi theo dõi view matrix đưa world point sang camera space bằng pose nghịch đảo.",
    },
    "pipeline-projection": {
      title: "Projection matrix đặt gì vào clip.w?",
      description:
        "Thay FOV, near và far rồi quan sát clip vector trước phép chia; clip.w luôn mang camera-space depth.",
    },
    "pipeline-viewport": {
      title: "Khi nào một clip point được phép trở thành pixel?",
      description:
        "Thử visible/near/behind/far/outside, kiểm tra w và depth rồi mới chia sang NDC và ánh xạ vào viewport.",
    },
    "pipeline-validation": {
      title: "Ba matrix riêng và một MVP matrix có thật sự cho cùng kết quả?",
      description:
        "Bước qua toàn pipeline, đổi preset và theo dõi sai số giữa hai đường tính cùng các invariant của clip/NDC.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
