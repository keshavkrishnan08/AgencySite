import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Dependency-free markdown-lite renderer for AI output. Handles headers, bold,
   italic, inline code, bullet/numbered lists, and paragraphs — so model text
   always renders as proper formatting (never raw ** or ## on screen). Safe:
   builds JSX, no dangerouslySetInnerHTML. */

// ----- inline: **bold**, *italic* / _italic_, `code` -----
function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Split on the inline tokens, keeping the delimiters via capture groups.
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__"))
      out.push(<strong key={`${keyBase}-b${i++}`} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`"))
      out.push(<code key={`${keyBase}-c${i++}`} className="rounded bg-bg-tint px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else
      out.push(<em key={`${keyBase}-i${i++}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}

/* Inline-only: renders **bold**, *italic*, `code` inside an existing line/bubble
   without imposing block layout. For short single-line AI strings. */
export function Inline({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return <span className={className}>{renderInline(text, "inl")}</span>;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className={cn("space-y-3 leading-relaxed text-ink-2", className)}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim());

        // heading
        const h = block.match(/^(#{1,4})\s+(.*)$/);
        if (h && lines.length === 1) {
          const level = h[1].length;
          const cls =
            level <= 2 ? "font-serif text-lg font-semibold text-ink" : "text-sm font-semibold uppercase tracking-wider text-ink-3";
          return <p key={bi} className={cls}>{renderInline(h[2], `h${bi}`)}</p>;
        }

        // bullet list
        if (lines.every((l) => /^[-*•]\s+/.test(l))) {
          return (
            <ul key={bi} className="ml-1 space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(l.replace(/^[-*•]\s+/, ""), `u${bi}-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // numbered list
        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return (
            <ol key={bi} className="ml-1 space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="font-mono text-sm font-semibold text-primary-ink">{li + 1}.</span>
                  <span>{renderInline(l.replace(/^\d+\.\s+/, ""), `o${bi}-${li}`)}</span>
                </li>
              ))}
            </ol>
          );
        }

        // paragraph (single-newlines become line breaks)
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `p${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
