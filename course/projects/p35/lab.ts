import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  "base": {
    "label": "LIVE SHADER GALLERY",
    "title": "Sửa GLSL, thấy kết quả và giữ được bản tốt khi có lỗi",
    "description": "Gradient, circle, Mandelbrot và noise dùng cùng time/resolution/mouse/zoom. Canvas 2D minh họa công thức và last-good transaction, không chạy compiler GLSL."
  },
  "modes": {
    "shader-files": {
      "title": "Đưa GLSL ra file và phủ kín cửa sổ",
      "description": "Bỏ mesh/camera không cần thiết, dùng fullscreen triangle và nạp shader từ đúng thư mục của executable/checkpoint."
    },
    "compile-diagnostics": {
      "title": "Compile từng shader và đọc lỗi đúng stage",
      "description": "Đọc compile status và log thật, ghi rõ file và vertex/fragment stage; không đoán cú pháp bằng tìm token."
    },
    "program-interface": {
      "title": "Link program, kiểm interface bằng driver",
      "description": "Phân biệt compile với link; kiểm active uniform, kiểu và array size sau link thay vì chỉ thấy tên trong source."
    },
    "transactional-reload": {
      "title": "Thử bản mới, giữ bản tốt gần nhất",
      "description": "Build candidate bên cạnh active program, cập nhật locations khi thành công và giữ hình/metadata cũ khi thất bại."
    },
    "file-watcher": {
      "title": "Tự reload sau khi file đã ổn định",
      "description": "Theo dõi timestamp, size và trạng thái file; debounce không block, coalesce thay đổi và không retry storm."
    },
    "live-uniforms": {
      "title": "Time, pixel và mouse: dữ liệu đổi từng frame",
      "description": "Dùng một uniform snapshot; đổi logical input sang pixel OpenGL, pause/step và resize không compile lại."
    },
    "procedural-shader": {
      "title": "Gradient và vòng tròn: tạo hình từ tọa độ",
      "description": "Từ UV đến palette chuyển động, signed distance của circle, anti-alias và ánh sáng viền có công thức rõ."
    },
    "mandelbrot-shader": {
      "title": "Mandelbrot trong fragment shader",
      "description": "Biểu diễn số phức bằng vec2, lặp z²+c hữu hạn, kiểm escape và tô màu liên tục theo thời gian."
    },
    "noise-shader": {
      "title": "Noise và chuyển động procedural",
      "description": "Nội suy value noise, cộng năm octave fBm và domain warp; hash số nguyên lặp lại được."
    },
    "shader-validation": {
      "title": "Hoàn thiện gallery và kiểm hot reload",
      "description": "Ghép gallery bốn hiệu ứng, error overlay/showcase, kiểm GPU và cleanup, source/ZIP độc lập."
    }
  }
} satisfies ProjectLabMeta;

export default lab;
