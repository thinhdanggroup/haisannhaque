import { Fragment } from "react";
import { parseInline, parseSupportBody } from "@/src/features/cms/support-pages";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (part.type === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.type === "link")
          return (
            <a
              key={index}
              href={part.text}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-teal-700 underline"
            >
              {part.text}
            </a>
          );
        return <Fragment key={index}>{part.text}</Fragment>;
      })}
    </>
  );
}

/** Renders a support page body (plain text with light markers) as HTML. */
export function SupportPageBody({ body }: { body: string }) {
  const blocks = parseSupportBody(body);

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-500">Nội dung đang được cập nhật.</p>;
  }

  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-700">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={index} className="pt-2 text-lg font-bold text-slate-950">
                <Inline text={block.text} />
              </h2>
            );
          case "bullets":
            return (
              <ul key={index} className="list-disc space-y-1 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={index} className="list-decimal space-y-1 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
          case "paragraph":
            return (
              <p key={index}>
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    <Inline text={line} />
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
