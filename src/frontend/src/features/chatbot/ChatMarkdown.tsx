import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Hiển thị câu trả lời của chatbot: đoạn văn, danh sách, **đậm** và link hồ sơ `[Tên](/trees/…)`.
 * Tự viết vì chỉ cần vài cú pháp. Không render HTML thô, link ngoài trang chỉ hiện chữ.
 */
const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const [, bold, label, href] = match;
    if (bold !== undefined) nodes.push(<strong key={index}>{bold}</strong>);
    else if (href?.startsWith("/") && !href.startsWith("//"))
      nodes.push(
        <Link
          key={index}
          to={href}
          className="font-semibold text-accent-deep underline decoration-[#d7a95d]/60 underline-offset-2 hover:text-[#7a5016]"
        >
          {label}
        </Link>,
      );
    else nodes.push(label);
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^#{1,6}\s+/, "");
    const current = blocks.at(-1);
    if (!line.trim()) {
      blocks.push({ kind: "paragraph", lines: [] });
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = item[1] !== undefined;
      if (current?.kind === "list" && current.ordered === ordered)
        current.items.push(item[2]!);
      else blocks.push({ kind: "list", ordered, items: [item[2]!] });
    } else if (current?.kind === "paragraph") current.lines.push(line);
    else blocks.push({ kind: "paragraph", lines: [line] });
  }
  return blocks.filter((b) =>
    b.kind === "list" ? b.items.length : b.lines.length,
  );
}

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="grid gap-2 leading-relaxed">
      {toBlocks(text).map((block, i) =>
        block.kind === "list" ? (
          (() => {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={i}
                className={`m-0 grid gap-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </List>
            );
          })()
        ) : (
          <p key={i} className="m-0">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
