import { highlightCode, type HighlightLanguage } from "@/lib/syntax-highlighter";

interface HighlightedCodeProps {
  code: string;
  language: HighlightLanguage;
  className?: string;
}

export function HighlightedCode({ code, language, className }: HighlightedCodeProps) {
  const html = highlightCode(code.trimEnd(), language);

  return (
    <div
      className={["highlighted-code", className].filter(Boolean).join(" ")}
      data-language={language}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
