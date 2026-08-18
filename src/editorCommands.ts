export type FormatCommand =
  | "bold"
  | "italic"
  | "strike"
  | "link"
  | "inlineMath"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "code"
  | "list";

export function applyFormat(source: string, command: FormatCommand, selectionStart: number, selectionEnd: number) {
  const selected = source.slice(selectionStart, selectionEnd);
  const fallback = selected || "文本";
  const replace = (value: string, cursorOffset = value.length) => ({
    value: source.slice(0, selectionStart) + value + source.slice(selectionEnd),
    selectionStart: selectionStart + cursorOffset,
    selectionEnd: selectionStart + cursorOffset
  });
  const wrap = (before: string, after = before, placeholder = fallback) =>
    replace(`${before}${placeholder}${after}`, before.length + placeholder.length);

  if (command === "bold") return wrap("**", "**", "加粗文本");
  if (command === "italic") return wrap("*", "*", "斜体文本");
  if (command === "strike") return wrap("~~", "~~", "删除线文本");
  if (command === "link") return wrap("[", "](https://example.com)", "链接文本");
  if (command === "inlineMath") return wrap("$", "$", "E = mc^2");
  if (command === "code") return wrap("```python\n", "\n```", "print('hello EasyMD')");

  const lineStart = source.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEnd = selectionEnd;
  const block = source.slice(lineStart, lineEnd) || fallback;
  const prefix = command === "h1" ? "# " : command === "h2" ? "## " : command === "h3" ? "### " : command === "quote" ? "> " : "- ";
  const prefixed = block.split("\n").map((line) => `${prefix}${line.replace(/^#{1,6}\s+/, "")}`).join("\n");
  return {
    value: source.slice(0, lineStart) + prefixed + source.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length
  };
}
