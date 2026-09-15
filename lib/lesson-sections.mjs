// Titles may use natural Vietnamese; the seven teaching roles keep stable anchors.
// Add a title here when renaming a section, keeping existing aliases for old lessons.
export const lessonSections = [
  {
    key: "problem",
    id: "vấn-đề-cần-giải-quyết",
    title: "Vấn đề cần giải quyết",
    aliases: [
      "Bức hình này còn thiếu gì?",
      "Bài toán của chúng ta",
      "Ta cần giải quyết điều gì?",
      "Điều khó nằm ở đâu?",
      "Bài toán cần giải quyết",
    ],
  },
  {
    key: "model",
    id: "hiểu-ý-tưởng-trước-khi-viết-code",
    title: "Hiểu ý tưởng trước khi viết code",
    aliases: [
      "Hình dung đường đi của một pixel",
      "Theo dõi dữ liệu từ CPU sang GPU",
      "Theo chân một particle",
      "Đi qua thuật toán bằng một ví dụ nhỏ",
      "Theo dõi một particle đi qua grid",
    ],
  },
  {
    key: "code",
    id: "viết-code-từng-bước",
    title: "Viết code từng bước",
    aliases: [
      "Cùng sửa checkpoint",
      "Bắt tay vào code",
      "Bắt tay xây dựng",
      "Chuyển ý tưởng thành code",
      "Xây từng phần",
    ],
  },
  {
    key: "assembly",
    id: "ghép-các-phần-lại",
    title: "Ghép các phần lại",
    aliases: [
      "Chạy thử và quan sát",
      "Chạy checkpoint",
      "Nối lại thành một bước mô phỏng",
      "Chạy checkpoint và đọc kết quả",
      "Chạy cả chuỗi xử lý",
    ],
  },
  {
    key: "experiments",
    id: "thử-làm-sai-để-hiểu-đúng",
    title: "Thử làm sai để hiểu đúng",
    aliases: [
      "Cố tình làm sai",
      "Thử phá chương trình",
      "Thử tạo lỗi",
      "Cố tình phá thuật toán",
      "Cố tình làm hỏng grid",
    ],
  },
  {
    key: "validation",
    id: "tự-kiểm-tra-kết-quả",
    title: "Tự kiểm tra kết quả",
    aliases: [
      "Dấu hiệu cho thấy bài đã hoàn thành",
      "Tự nghiệm thu",
      "Kiểm tra trước khi sang bài mới",
      "Checklist hoàn thành",
    ],
  },
  {
    key: "extensions",
    id: "bài-tập-mở-rộng",
    title: "Bài tập mở rộng",
    aliases: [
      "Thử đi thêm một bước",
      "Bài tập tiếp theo",
      "Nếu muốn thử thêm",
      "Bài tập để hiểu sâu hơn",
      "Hướng mở rộng",
    ],
  },
];

const byTitle = new Map();
for (const section of lessonSections) {
  for (const title of [section.title, ...section.aliases]) {
    if (byTitle.has(title)) throw new Error(`Duplicate lesson section title: ${title}`);
    byTitle.set(title, section);
  }
}

export function findLessonSection(title) {
  return byTitle.get(title.trim());
}

export function nodeText(node) {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(nodeText).join("");
}
