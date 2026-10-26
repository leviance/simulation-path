import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "3D GRAVITY · BARNES–HUT LAB",
    title: "Một đĩa sao, hai cách tính lực",
    description:
      "4.096 vật thể với gravity thật. Chọn target, quan sát các node opened/accepted, đo force error và tách ảnh hưởng của timestep; không dùng animation định sẵn.",
  },
  modes: {
    "nbody-scene": {
      title: "Body nằm trong thế giới hay trong màn hình?",
      description: "Mở cửa sổ, vẽ state XYZ qua camera và sinh lại cùng đĩa sao bằng seed cố định.",
    },
    "nbody-pair-force": {
      title: "Softening thay đổi lực gần như thế nào?",
      description:
        "Tự suy ra vector gia tốc, phân biệt mass của nguồn với mass của target và xử lý cự ly gần bằng softening.",
    },
    "nbody-direct": {
      title: "Mỗi target phải đọc bao nhiêu nguồn?",
      description:
        "Viết direct summation đơn giản trước khi tối ưu; kiểm N−1 nguồn và các ca hai, ba vật thể tính tay.",
    },
    "nbody-fixed-step": {
      title: "Khi nào một bước thời gian được coi là xong?",
      description:
        "Tính xong gia tốc của cả snapshot rồi mới cập nhật velocity/position; chia việc theo target để UI vẫn phản hồi.",
    },
    "nbody-mass-tree": {
      title: "Tâm hộp có phải tâm khối lượng không?",
      description:
        "Thêm mass và tâm khối vào Octree; kiểm trung bình có trọng số, leaf storage và điểm trùng nhau.",
    },
    "nbody-opening": {
      title: "Target này đã mở/chấp nhận những node nào?",
      description:
        "Dùng s/d < theta nhưng buộc mở node chứa target; vẽ lại đúng các quyết định traversal. Preset cuối cập nhật đủ 4.096 body; thao tác camera không đổi state.",
    },
    "nbody-self-force": {
      title: "Làm sao phát hiện self-force và mass sai?",
      description:
        "Dùng fixture độc lập để phát hiện sai mass ở lá, trùng storage và cạnh trỏ về tổ tiên. Preset cuối cập nhật đủ 4.096 body; thao tác camera không đổi state.",
    },
    "nbody-accuracy": {
      title: "Theta thay đổi sai số lực ra sao?",
      description:
        "Giữ nguyên bodies và epsilon, quét nhiều theta; báo absolute/RMS error cùng exact/aggregate work. Preset cuối cập nhật đủ 4.096 body; thao tác camera không đổi state.",
    },
    "nbody-scaling": {
      title: "Bớt phép tương tác có chắc nhanh hơn không?",
      description:
        "Tách build, force pass và render; warm-up, median và khoảng min/max trên cùng workload có giới hạn. Preset cuối cập nhật đủ 4.096 body; thao tác camera không đổi state.",
    },
    "nbody-validation": {
      title: "Energy drift đến từ cây hay từ timestep?",
      description:
        "Đo năng lượng toàn hệ theo snapshot, thử giảm dt ở hệ có nghiệm tròn và bàn giao ứng dụng 4.096 vật thể. Preset cuối cập nhật đủ 4.096 body; thao tác camera không đổi state.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
