export const boidsGlossaryTerms = [
  {
    id: "boids",
    term: "Boids",
    definition:
      "Mô hình hành vi đàn dựa trên tương tác cục bộ. Project 27 dùng bản 2D với vùng nhìn tròn: mỗi cá thể đọc hàng xóm rồi tính separation, alignment và cohesion. Chuyển động đàn không phải một quỹ đạo chung được dựng sẵn.",
  },
  {
    id: "boids-steering",
    term: "Steering (Boids)",
    definition:
      "Gia tốc điều khiển để velocity tiến về desiredVelocity trong responseTime. Project 27 dùng (desiredVelocity − velocity)/1 giây, giới hạn maxAcceleration trước/sau ghép trọng số; không gán trực tiếp một hướng mới mỗi frame.",
  },
  {
    id: "boids-separation",
    term: "Separation (Boids)",
    definition:
      "Quy tắc hướng ra xa hàng xóm: cộng −offset/distance² rồi tạo steering từ hướng tổng. Ca trùng vị trí có hướng đối nhau theo ID. Đây là tránh chen chúc bằng điều khiển, không phải collision solver bảo đảm không xuyên nhau.",
  },
  {
    id: "boids-alignment",
    term: "Alignment (Boids)",
    definition:
      "Quy tắc hướng velocity theo hướng tổng/trung bình velocity của hàng xóm. Bản Project 27 chuẩn hóa hướng đó tới maxSpeed trước khi tính steering; tổng bằng 0 trả vector 0, không tự phanh.",
  },
  {
    id: "boids-cohesion",
    term: "Cohesion (Boids)",
    definition:
      "Quy tắc hướng về tâm cục bộ của hàng xóm. Trong miền tuần hoàn, Project 27 cộng minimum-image displacement thay vì trung bình position tuyệt đối, tránh tâm sai ở hai mép world.",
  },
  {
    id: "boids-double-buffer",
    term: "Double-buffered simulation",
    definition:
      "Tách snapshot đọc với vùng ghi state mới. Mọi cá thể nhìn cùng thời điểm, rồi swap hai buffer sau toàn bước. Kiểm bằng đổi thứ tự lưu rồi ghép theo ID với tolerance số thực, không so quỹ đạo dài giống bit.",
  },
];
