export const sphGpuGlossaryTerms = [
  {
    id: "sph-kernel-3d",
    term: "SPH kernel 3D",
    definition:
      "Cubic spline chuẩn hóa theo thể tích với hệ số1/(πh³). Density có đơn vị kg/m³, mass=rho0*spacing³. Support sphere bán kính2h không phải vòng tròn2D hoặc kích thước chấm vẽ.",
  },
  {
    id: "sph-gpu-pipeline",
    term: "SPH GPU pipeline",
    definition:
      "Clear/count→scan→scatter→density→force→reduction→integration. Mỗi pass đọc state đã hoàn tất của pass trước, có SSBO barrier; position/velocity ghi sang bank khác và host chỉ commit sau fence.",
  },
  {
    id: "sph-csr-3d",
    term: "CSR spatial grid 3D",
    definition:
      "Counts/offsets chia các particle ID thành đoạn liên tiếp theo cell. Cell size2h cho phép duyệt27cell quanh hạt, nhưng vẫn phải lọc khoảng cách3D thật. Không có fixed cell capacity; vượt ngân sách ứng viên là lỗi chứ không được cắt ngầm hàng xóm.",
  },
  {
    id: "sph-gpu-workload",
    term: "Workload SPH và khả năng phản hồi",
    definition:
      "N lớn phải qua memory plan, giới hạnGL và xác nhận của người dùng. Một batch pending, poll fence không chặn và timeout hữu hạn ngăn gửi thêm work. Fence không thu hồi compute đã gửi; một triệu hạt không đồng nghĩa60FPS hay đã kiểm chứng độ chính xác vật lý.",
  },
];
