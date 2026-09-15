import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "SHADER HOT RELOAD LAB",
    title: "Source lỗi có làm program đang chạy biến mất không?",
    description:
      "Sửa candidate fragment shader, quan sát compile/link diagnostics và kiểm tra last-good program qua từng generation.",
  },
  modes: {
    "shader-files": {
      title: "Shader file nào thực sự đang được executable đọc?",
      description:
        "Tách embedded strings thành hai file có đường dẫn rõ và giữ starter cube làm mốc quan sát.",
    },
    "compile-diagnostics": {
      title: "Compile error nằm ở stage và dòng nào?",
      description:
        "Chèn token sai, đọc stage/line diagnostics và phân biệt lỗi đọc file với lỗi GLSL compiler.",
    },
    "program-interface": {
      title: "Hai shader compile riêng có chắc link được với nhau?",
      description:
        "Đổi varying hoặc bỏ uniform bắt buộc để thấy candidate bị chặn trước lúc thay active program.",
    },
    "transactional-reload": {
      title: "Vì sao phải giữ last-good program đến bước cuối?",
      description:
        "Candidate lỗi làm attempts tăng nhưng generation, fingerprint và hình đang vẽ vẫn giữ nguyên.",
    },
    "file-watcher": {
      title: "Một lần bấm Save nên tạo bao nhiêu lần compile?",
      description:
        "Debounce đợi timestamp ổn định rồi phát đúng một reload, không block animation và không retry storm.",
    },
    "live-uniforms": {
      title: "Dữ liệu nào đổi mỗi frame mà không cần compile?",
      description:
        "Time, framebuffer resolution và mouse được upload vào active generation như một uniform snapshot.",
    },
    "procedural-shader": {
      title: "Một fragment tự tạo màu từ position, time và mouse thế nào?",
      description:
        "Thử solid, coordinate, pulse và rings; đổi source để quan sát công thức trở thành pixel color.",
    },
    "shader-validation": {
      title: "Hot reload đã an toàn từ file đến cleanup chưa?",
      description:
        "Rà path, log, interface, debounce, generation, high-DPI uniform và program lifetime trước Project 36.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
