import type { GlossaryTerm } from "./glossary";
export const mandelbulbGlossaryTerms: GlossaryTerm[] = [
  {
    id: "bulb-spherical-map",
    term: "Spherical-power recurrence của Mandelbulb",
    definition:
      "Project 43 dùng z₀=0 và zₙ₊₁=sphericalPower(zₙ,p)+c. Mapping giữ trục cực Z, nâng radius lên p và nhân góc cực/phương vị với p. r=0 trả vector 0, gần trục không gọi atan2(0,0). Bounded chỉ nghĩa chưa thoát trong iteration cap, không chứng minh membership vô hạn.",
    keywords: "Mandelbulb fractal spherical power recurrence escape bailout tọa độ cầu",
  },
  {
    id: "bulb-ray-bounds",
    term: "Ray trong vùng khảo sát Mandelbulb",
    definition:
      "Ray p(t)=eye+t·direction có direction đơn vị, t theo world units. Viewer cắt ray với sphere R=2 và far bound 32 trước khi hỏi fractal. Miss ngoài sphere có thể tốn 0 evaluator calls; dùng hết step budget chưa phải miss đã được chứng minh.",
    keywords: "Mandelbulb ray bounding sphere clipping far bound fixed steps",
  },
  {
    id: "bulb-distance-estimator",
    term: "Fractal DE và mặt epsilon shell",
    definition:
      "Với dr₀=1, cập nhật dr=p·r^(p−1)·dr+1; khi thoát bailout, DE=0.5·log(r)·r/dr. Đây là estimator, không phải exact SDF. Renderer hit mặt hữu hạn DE<epsilon hoặc vùng chưa thoát, dùng safety/budget/bounds và đối chiếu ray độc lập; không hứa không overshoot ở mọi điểm.",
    keywords: "Mandelbulb DE distance estimator derivative epsilon shell SDF overshoot",
  },
  {
    id: "bulb-field-normal",
    term: "Normal bằng central differences của field",
    definition:
      "Hỏi DE tại p±h theo ba trục, lấy ba hiệu rồi chuẩn hóa. Thừa số 1/(2h) chung có thể bỏ trước normalize. H có đơn vị world, khác hit epsilon; quá nhỏ nhạy precision, quá lớn mất nếp nhỏ. Gradient phẳng dùng fallback được đếm, invalid không được coi là normal đúng.",
    keywords: "Mandelbulb normals central differences gradient normal step fallback",
  },
  {
    id: "bulb-camera-inside",
    term: "Camera inside trong fractal viewer",
    definition:
      "Orbit đổi yaw/pitch quanh target; pan dời target theo camera right/up; dolly đổi khoảng cách, không đổi FOV. Nếu eye chưa thoát trong capped orbit, Project 43 báo inside và cho lùi camera; không dựng hit giả t=0 hay nhận đây là bằng chứng membership chính xác.",
    keywords: "Mandelbulb camera orbit pan dolly inside target pitch precision",
  },
  {
    id: "bulb-work-oracle",
    term: "Fractal work, oracle độc lập và GPU timing",
    definition:
      "Ray steps đếm vòng march chính; orbit bodies đếm mọi evaluator call kể cả normal/AO/shadow. Oracle CPU dùng mapping nhân số phức thay đường trig chính, ray đi bước đều thay bước DE. Elapsed GPU query sau fence/query-ready khác thời gian CPU enqueue; hai số không tự tạo một benchmark speedup.",
    keywords: "Mandelbulb work counters oracle independent evaluator GPU query enqueue timing",
  },
  {
    id: "bulb-image-generation",
    term: "Generation của ảnh progressive",
    definition:
      "Settings và Camera được chụp thành snapshot mang generation. Preview chỉ công bố khi đủ và còn là request mới nhất; tile final được dùng khi cùng generation. Pause dừng refinement, Cancel ngăn batch sau nhưng không ngắt dispatch đang chạy; last-good giữ cả dữ liệu lẫn nhãn của nó.",
    keywords: "Mandelbulb generation progressive tiled refinement preview cancel last good",
  },
  {
    id: "bulb-progressive-sampling",
    term: "Subpixel accumulation và orbit-trap palette",
    definition:
      "Một sample ở tâm, bốn sample đặt tại các cặp tọa độ ¼/¾ trong pixel; tính ray thật và trung bình linear RGB trước tone-map/gamma. Work cộng dồn, stop flags OR không cho biết số hit từng sample. Orbit trap chọn màu theo quỹ đạo, không đo nhiệt độ hoặc năng lượng.",
    keywords: "Mandelbulb anti aliasing subpixel samples accumulation orbit trap palette",
  },
  {
    id: "bulb-precision-policy",
    term: "Precision và phạm vi kiểm chứng fractal",
    definition:
      "Shader float32, CPU double và oracle dùng long double; trên MSVC long double vẫn có 53 bit mantissa như double. Uniform scanner bước 0,0005 và tolerance t 0,006 world units chỉ kiểm các ray hữu hạn trong clipping/epsilon shell đã công bố; feature nhỏ hơn bước hoặc biên nhạy precision chưa được bảo đảm. Ảnh đẹp không thay kiểm toàn buffer và source package.",
    keywords: "Mandelbulb float precision long double error tolerance silhouette validation",
  },
];
