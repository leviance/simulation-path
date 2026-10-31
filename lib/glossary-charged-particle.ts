import type { GlossaryTerm } from "./glossary";

export const chargedParticleGlossaryTerms: GlossaryTerm[] = [
  {
    id: "lorentz-force",
    term: "Lorentz force",
    definition:
      "Lực q(E + v × B) tác dụng lên hạt mang điện trong trường ngoài. Trong Project 38, chia lực cho mass dương để có gia tốc; đổi thứ tự v và B làm sai dấu. Mô hình phi tương đối tính dùng đơn vị chuẩn hóa, không tính tương tác giữa các hạt.",
    keywords: "lực điện từ điện trường từ trường charged particle q mass",
  },
  {
    id: "boris-pusher",
    term: "Boris pusher",
    definition:
      "Cách tiến vận tốc bằng nửa xung điện, phép quay do từ trường rồi nửa xung điện còn lại. Project 38 ghép drift đối xứng để x/v cùng ở thời điểm đầy đủ; không trộn với implementation lưu v ở nửa bước. Giữ tốc độ trong trường chỉ B chưa bảo đảm pha/quỹ đạo chính xác ở mọi dt.",
    keywords: "integrator full time half step Boris dt convergence",
  },
  {
    id: "gyro-phase-error",
    term: "Gyro phase error",
    definition:
      "Độ lệch góc quay tích lũy so với nghiệm từ trường đều ở cùng thời điểm. Một integrator có thể giữ độ lớn vận tốc nhưng đưa hạt tới sai vị trí trên đường tròn. Kiểm giảm dt tại cùng T và so cả vector vị trí/vận tốc giúp phát hiện lỗi này.",
    keywords: "cyclotron tần số chu kỳ sai số pha quỹ đạo",
  },
  {
    id: "particle-probe",
    term: "Particle probe",
    definition:
      "Bản chụp có giới hạn của một số record GPU để đọc state hoặc vệt quỹ đạo. Probe phải đi kèm ID, generation và simulation time để dữ liệu về trễ không bị gắn nhầm vào state hiện tại. Probe nhỏ không thay phép validation toàn N.",
    keywords: "gather snapshot readback trail history",
  },
];
