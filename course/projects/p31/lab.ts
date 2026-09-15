import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "BARNES–HUT N-BODY LAB",
    title: "Một thiên hà, hai cách tính lực và một sai số phải đo được",
    description:
      "Chọn body, xoay camera, đổi theta/softening rồi so direct O(N²) với Mass Octree bằng force error, work counters, topology và scaling study.",
  },
  modes: {
    "nbody-scene": {
      title: "Pixel đang thấy có phải trạng thái vật lý không?",
      description:
        "Body giữ position, velocity và mass trong world space. Orbit camera chỉ chiếu chúng ra Canvas; đổi góc nhìn không làm đổi force hoặc center of mass.",
    },
    "nbody-pair-force": {
      title: "Softening thay đổi lực ở cự ly gần ra sao?",
      description:
        "Theo dõi vector gia tốc của một body và kéo epsilon. Softening chặn singularity nhưng quá lớn cũng làm yếu lực thật trên vùng gần.",
    },
    "nbody-direct": {
      title: "Direct N-body phải đọc bao nhiêu nguồn?",
      description:
        "Đổi N và xem một target luôn dùng N−1 pairs; full pass tạo N×(N−1) interactions, là baseline đơn giản để kiểm xấp xỉ.",
    },
    "nbody-fixed-step": {
      title: "Frame time có được đi thẳng vào physics không?",
      description:
        "Chạy, dừng và tiến từng fixed step 1/240 s. Step guard giữ một frame chậm không biến thành vòng lặp physics không giới hạn.",
    },
    "nbody-mass-tree": {
      title: "Một node đại diện cho cả cụm bằng dữ liệu nào?",
      description:
        "Các hộp là leaf của Mass Octree. Root và mọi internal node giữ tổng mass cùng center of mass được gộp từ children.",
    },
    "nbody-opening": {
      title: "Khi nào cả subtree trở thành một nguồn lực?",
      description:
        "Hạ theta để mở nhiều node và tăng exact work; tăng theta để nhận nhiều aggregate sources. Readout báo sai số lực cùng lượng việc tiết kiệm.",
    },
    "nbody-self-force": {
      title: "Vì sao node chứa target luôn phải mở tiếp?",
      description:
        "Aggregate của node chứa target cũng chứa mass của chính target. Cấm approximate node này là contract ngăn self-force, không phải mẹo tối ưu.",
    },
    "nbody-accuracy": {
      title: "Theta nào đủ chính xác cho workload này?",
      description:
        "Biểu đồ so mean force error với aggregate+exact work tại theta 0.25, 0.5, 0.8 và 1.1 trên cùng bodies, targets và softening.",
    },
    "nbody-scaling": {
      title: "Đường cong O(N²) bắt đầu lộ rõ ở đâu?",
      description:
        "Scaling study chạy full acceleration pass cho 128–1.024 bodies trong Canvas và báo cả milliseconds lẫn interaction work.",
    },
    "nbody-validation": {
      title: "Thiên hà đẹp đã đủ chứng minh Barnes–Hut đúng chưa?",
      description:
        "Nghiệm thu topology, zero self-force, theta error, work reduction, finite state, energy, momentum và interaction lifecycle bằng các phép đo tách biệt.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
