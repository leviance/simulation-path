import { findLessonSection, nodeText } from "./lesson-sections.mjs";

export default function remarkExperimentProtocol() {
  return (tree) => {
    if (!Array.isArray(tree.children)) return;

    for (let index = 0; index < tree.children.length; index += 1) {
      const node = tree.children[index];
      if (
        node.type !== "heading" ||
        node.depth !== 2 ||
        findLessonSection(nodeText(node))?.key !== "experiments"
      ) {
        continue;
      }

      tree.children.splice(index + 1, 0, {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [
              { type: "strong", children: [{ type: "text", value: "Cách chạy thí nghiệm:" }] },
              {
                type: "text",
                value:
                  " dự đoán điều sẽ xảy ra, chỉ đổi một chi tiết, chạy lại và ghi điều quan sát được. Sau đó hoàn tác thay đổi trước khi thử lỗi tiếp theo.",
              },
            ],
          },
        ],
      });
      index += 1;
    }
  };
}
