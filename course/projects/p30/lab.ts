import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "POINT CLOUD OCTREE LAB",
    title: "Xoay cả một rừng hộp, nhưng truy vấn vẫn diễn ra trong world space",
    description:
      "Quan sát 100.000 points qua orbit camera, di chuyển query volume và đối chiếu Octree với brute force bằng topology, exact work, checksum và capacity study.",
  },
  modes: {
    "octree-octants": {
      title: "Ba mặt phẳng giữa tạo ra tám vùng ra sao?",
      description:
        "Bit 0/1/2 biểu diễn positive X/Y/Z. Point đúng split plane đi về positive half nên mỗi index luôn có một octant duy nhất.",
    },
    "octree-root": {
      title: "Một root leaf chứa 100.000 indices đã tăng tốc chưa?",
      description:
        "Root là Octree hợp lệ về storage, nhưng query vẫn exact-test toàn bộ N. Leaf capacity chỉ phát huy tác dụng sau khi split.",
    },
    "octree-split": {
      title: "Vùng đông point cloud tự chia sâu thế nào?",
      description:
        "Đổi distribution và capacity để thấy clustered cloud sinh nhiều hộp nhỏ quanh cụm, còn vùng thưa dừng sớm hơn.",
    },
    "octree-topology": {
      title: "Wireframe đẹp có chứng minh tree đúng không?",
      description:
        "Inspector kiểm từng point count, internal storage, child index/bounds, capacity guard và statistics độc lập với renderer.",
    },
    "octree-query": {
      title: "Query volume đã loại được những subtree nào?",
      description:
        "Node không overlap bị prune; leaf overlap chỉ tạo candidates. Chỉ point qua exact test cả X, Y, Z mới đổi sang màu vàng.",
    },
    "octree-oracle": {
      title: "Một góc camera có thể che giấu lỗi query nào?",
      description:
        "Brute force nhìn dữ liệu world-space thay vì hình vẽ. Canonical hit sets phải khớp dù traversal order của Octree khác thứ tự index.",
    },
    "octree-benchmark": {
      title: "Octree nhanh hơn ở đâu và đã làm ít việc hơn bao nhiêu?",
      description:
        "Chạy Octree và brute force trên cùng points, query volumes, repetitions và warm-up; chỉ đọc timing sau khi checksum đã khớp.",
    },
    "octree-capacity": {
      title: "Capacity nhỏ nhất có phải lựa chọn tốt nhất?",
      description:
        "So 8, 16, 32 và 64 bằng node count, depth, rebuild, visited nodes, exact candidates và time/query trên cùng workload.",
    },
    "octree-validation": {
      title: "Point Cloud Octree đã đủ chắc để làm nền cho Barnes–Hut chưa?",
      description:
        "Nghiệm thu camera, topology, edge probes, oracle, checksum, exact work, timing và interaction bằng cùng source path.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
